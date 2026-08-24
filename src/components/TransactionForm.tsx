import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowDownLeft, ArrowLeft, ArrowUpRight, Check, Loader2 } from 'lucide-react';
import { AccountPicker } from '@/components/AccountPicker';
import { InvoicePicker } from '@/components/InvoicePicker';
import { FormField, inputClass } from '@/components/FormField';
import { ApiError, api } from '@/lib/api';
import { formatPeso, fromCentavos, toCentavos, vatOf } from '@/lib/money';
import type { Account, ItemResponse, KindOption, ListResponse, OpenTransaction, RecordedTransaction } from '@/types';

/** Today in the local timezone, as the yyyy-mm-dd a date input expects. */
function todayISO(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

interface Details {
  date: string;
  invoiceNumber: string;
  counterpartyName: string;
  description: string;
  netAmount: string;
  vatAmount: string;
  /**
   * VAT is on by default for kinds that can carry it, but it is never
   * mandatory — zero-rated sales, VAT-exempt suppliers, and non-VAT
   * registered businesses are all common in practice. Turning this off is
   * how a transaction is recorded with no VAT at all, distinct from a VAT
   * amount that merely happens to be zero.
   */
  includeVat: boolean;
  isPaid: boolean;
}

const EMPTY: Details = {
  date: todayISO(),
  invoiceNumber: '',
  counterpartyName: '',
  description: '',
  netAmount: '',
  vatAmount: '',
  includeVat: true,
  isPaid: true,
};

type Errors = Partial<Record<keyof Details, string>> & { categoryAccount?: string; appliedTo?: string };

/**
 * Validates step 2. Returns field-keyed messages so each one renders beside the
 * input that caused it rather than as one combined message at the top.
 */
function validate(
  details: Details,
  kind: KindOption,
  categoryAccount: Account | null,
  appliedTo: OpenTransaction | null,
): Errors {
  const errors: Errors = {};

  if (kind.category && !categoryAccount) {
    errors.categoryAccount = `Choose a ${kind.category.label.toLowerCase()} account.`;
  }
  if (kind.appliedToPool && !appliedTo) {
    errors.appliedTo = `Choose which ${
      kind.appliedToPool === 'LOAN' ? 'loan' : kind.appliedToPool === 'CUSTOMER' ? 'invoice' : 'bill'
    } this settles.`;
  }

  if (!details.date) {
    errors.date = 'Pick a date.';
  } else if (Number.isNaN(Date.parse(details.date))) {
    errors.date = 'That is not a valid date.';
  } else if (details.date > todayISO()) {
    // A future-dated entry usually means a typo in the year.
    errors.date = 'The date cannot be in the future.';
  }

  const net = toCentavos(details.netAmount);
  if (details.netAmount.trim() === '') {
    errors.netAmount = 'Enter an amount.';
  } else if (net === null) {
    errors.netAmount = 'Use numbers only, up to two decimal places.';
  } else if (net <= 0) {
    errors.netAmount = 'The amount must be more than zero.';
  } else if (appliedTo) {
    const outstanding = toCentavos(appliedTo.outstanding);
    if (outstanding !== null && net > outstanding) {
      errors.netAmount = `Cannot exceed the outstanding balance of ${formatPeso(outstanding)}.`;
    }
  }

  if (kind.supportsVat && details.includeVat && details.vatAmount.trim() !== '') {
    const vat = toCentavos(details.vatAmount);
    if (vat === null) {
      errors.vatAmount = 'Use numbers only, up to two decimal places.';
    } else if (vat < 0) {
      errors.vatAmount = 'VAT cannot be negative.';
    } else if (net !== null && vat > net) {
      errors.vatAmount = 'VAT cannot be more than the net amount.';
    }
  }

  if (details.invoiceNumber.length > 60) {
    errors.invoiceNumber = 'Keep this under 60 characters.';
  }
  if (details.counterpartyName.length > 200) {
    errors.counterpartyName = 'Keep this under 200 characters.';
  }
  if (details.description.length > 500) {
    errors.description = 'Keep this under 500 characters.';
  }

  return errors;
}

export function TransactionForm({
  companyId,
  onDone,
  onCancel,
}: {
  companyId: string;
  onDone: (result: RecordedTransaction) => void;
  onCancel: () => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [kinds, setKinds] = useState<KindOption[]>([]);
  const [kind, setKind] = useState<KindOption | null>(null);
  const [details, setDetails] = useState<Details>(EMPTY);
  const [categoryAccount, setCategoryAccount] = useState<Account | null>(null);
  const [appliedTo, setAppliedTo] = useState<OpenTransaction | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  /** Set once the user edits VAT, after which it stops tracking the net amount. */
  const vatTouched = useRef(false);

  useEffect(() => {
    api
      .get<ListResponse<KindOption>>('/transactions/kinds')
      .then((r) => setKinds(r.data))
      .catch(() => setSubmitError('Could not load transaction types.'));
  }, []);

  const netCentavos = toCentavos(details.netAmount);
  const vatCentavos = useMemo(() => {
    if (!kind?.supportsVat || !details.includeVat) return 0;
    if (details.vatAmount.trim() === '') return 0;
    return toCentavos(details.vatAmount) ?? 0;
  }, [details.vatAmount, details.includeVat, kind]);
  const totalCentavos = (netCentavos ?? 0) + vatCentavos;

  /**
   * VAT follows the net amount until the user types their own figure. Once they
   * do, it is left alone — overriding it is how zero-rated and exempt sales are
   * recorded, and recomputing would silently undo that.
   */
  function setNet(value: string) {
    setDetails((d) => {
      const next = { ...d, netAmount: value };
      if (!vatTouched.current && kind?.supportsVat && d.includeVat) {
        const centavos = toCentavos(value);
        next.vatAmount = centavos === null || centavos <= 0 ? '' : fromCentavos(vatOf(centavos));
      }
      return next;
    });
  }

  /** Toggling VAT off does not discard the typed figure — switching back on
      restores it, rather than forcing the user to recompute by hand. */
  function setIncludeVat(includeVat: boolean) {
    setDetails((d) => ({ ...d, includeVat }));
  }

  function chooseKind(option: KindOption) {
    setKind(option);
    setCategoryAccount(null);
    setAppliedTo(null);
    vatTouched.current = false;
    // Loans and interest carry no VAT; clear any figure carried over.
    setDetails((d) => ({
      ...d,
      vatAmount: option.supportsVat ? d.vatAmount : '',
      includeVat: true,
    }));
    setStep(2);
  }

  function pickAppliedTo(t: OpenTransaction) {
    setAppliedTo(t);
    setDetails((d) => ({
      ...d,
      counterpartyName: t.counterpartyName ?? d.counterpartyName,
      // Defaults to the full outstanding balance — the common case — but
      // stays editable for a partial payment.
      netAmount: d.netAmount.trim() === '' ? t.outstanding : d.netAmount,
    }));
  }

  function toReview() {
    if (!kind) return;
    const found = validate(details, kind, categoryAccount, appliedTo);
    setErrors(found);
    if (Object.keys(found).length === 0) setStep(3);
  }

  async function submit() {
    if (!kind || netCentavos === null) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await api.post<ItemResponse<RecordedTransaction>>('/transactions', {
        companyId,
        kind: kind.kind,
        date: details.date,
        invoiceNumber: details.invoiceNumber.trim() || null,
        counterpartyName: details.counterpartyName.trim() || null,
        description: details.description.trim() || null,
        netAmount: fromCentavos(netCentavos),
        // Sent explicitly so an overridden or excluded zero is preserved
        // rather than recomputed at 12% by the server.
        vatAmount: kind.supportsVat && details.includeVat ? fromCentavos(vatCentavos) : '0',
        isPaid: kind.supportsCredit ? details.isPaid : true,
        categoryAccountId: categoryAccount?.id ?? null,
        appliedToId: appliedTo?.id ?? null,
      });
      onDone(result.data);
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : 'Could not save. Please try again.');
      setSubmitting(false);
    }
  }

  const inflow = kinds.filter((k) => k.direction === 'INFLOW');
  const outflow = kinds.filter((k) => k.direction === 'OUTFLOW');

  return (
    <div className="flex flex-col gap-5">
      <Steps step={step} />

      <AnimatePresence mode="wait">
        {/* ── Step 1: what kind of transaction ─────────────────────────── */}
        {step === 1 && (
          <Pane key="step1">
            {kinds.length === 0 && <p className="text-sm text-ledger-500">Loading types…</p>}
            <KindGroup
              title="Money in"
              icon={<ArrowDownLeft size={15} aria-hidden />}
              tone="text-peso-700"
              options={inflow}
              onPick={chooseKind}
            />
            <KindGroup
              title="Money out"
              icon={<ArrowUpRight size={15} aria-hidden />}
              tone="text-record-600"
              options={outflow}
              onPick={chooseKind}
            />
          </Pane>
        )}

        {/* ── Step 2: the details ──────────────────────────────────────── */}
        {step === 2 && kind && (
          <Pane key="step2">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Date" htmlFor="date" required error={errors.date}>
                <input
                  id="date"
                  type="date"
                  max={todayISO()}
                  value={details.date}
                  onChange={(e) => setDetails((d) => ({ ...d, date: e.target.value }))}
                  className={inputClass(!!errors.date)}
                  aria-describedby={errors.date ? 'date-error' : undefined}
                />
              </FormField>

              <FormField
                label="Invoice / OR number"
                htmlFor="invoice"
                error={errors.invoiceNumber}
                hint="Optional"
              >
                <input
                  id="invoice"
                  type="text"
                  value={details.invoiceNumber}
                  onChange={(e) => setDetails((d) => ({ ...d, invoiceNumber: e.target.value }))}
                  placeholder="INV-0001"
                  className={inputClass(!!errors.invoiceNumber)}
                />
              </FormField>
            </div>

            {kind.category && (
              <AccountPicker
                companyId={companyId}
                kind={kind}
                value={categoryAccount}
                onChange={setCategoryAccount}
                error={errors.categoryAccount}
              />
            )}

            {kind.appliedToPool && (
              <InvoicePicker
                companyId={companyId}
                kind={kind}
                value={appliedTo}
                onChange={pickAppliedTo}
                error={errors.appliedTo}
              />
            )}

            {/* A settlement's counterparty comes from what it is applied to,
                not typed separately — the two would otherwise disagree. Only
                shown once something is picked, as a read-only confirmation. */}
            {kind.appliedToPool && appliedTo && details.counterpartyName && (
              <p className="m-0 -mt-2 text-xs text-ledger-500">
                {kind.appliedToPool === 'LOAN' ? 'Lender' : 'Counterparty'}: {details.counterpartyName}
              </p>
            )}

            {kind.counterparty && !kind.appliedToPool && (
              <FormField
                label={kind.counterparty === 'CUSTOMER' ? 'Customer' : 'Supplier'}
                htmlFor="counterparty"
                error={errors.counterpartyName}
                hint="Type any name — new ones are saved with the transaction."
              >
                <input
                  id="counterparty"
                  type="text"
                  list="known-counterparties"
                  value={details.counterpartyName}
                  onChange={(e) => setDetails((d) => ({ ...d, counterpartyName: e.target.value }))}
                  placeholder={kind.counterparty === 'CUSTOMER' ? 'Juan Dela Cruz' : 'Acme Trading'}
                  className={inputClass(!!errors.counterpartyName)}
                />
              </FormField>
            )}

            <FormField
              label="Net amount"
              htmlFor="net"
              required
              error={errors.netAmount}
              hint={kind.supportsVat ? 'Amount before VAT' : undefined}
            >
              <div className="relative">
                <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm font-semibold text-ledger-500">
                  ₱
                </span>
                <input
                  id="net"
                  type="text"
                  inputMode="decimal"
                  value={details.netAmount}
                  onChange={(e) => setNet(e.target.value)}
                  placeholder="0.00"
                  className={`${inputClass(!!errors.netAmount)} tabular pl-7`}
                  aria-describedby={errors.netAmount ? 'net-error' : undefined}
                />
              </div>
            </FormField>

            {kind.supportsVat && (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span id="vat-toggle-label" className="text-sm font-semibold text-ledger-700">
                    VAT
                  </span>
                  {/* VAT is on by default but is never mandatory — this is the
                      explicit way to record a transaction with no VAT at all,
                      distinct from typing a VAT amount of zero. */}
                  <div className="flex gap-1.5" role="group" aria-labelledby="vat-toggle-label">
                    <Toggle
                      active={details.includeVat}
                      onClick={() => setIncludeVat(true)}
                      label="Include VAT (12%)"
                    />
                    <Toggle
                      active={!details.includeVat}
                      onClick={() => setIncludeVat(false)}
                      label="No VAT"
                    />
                  </div>
                </div>

                {details.includeVat && (
                  <FormField
                    label="VAT amount"
                    htmlFor="vat"
                    error={errors.vatAmount}
                    hint="Computed automatically. Override for a lower or zero-rated amount."
                  >
                    <div className="relative">
                      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm font-semibold text-ledger-500">
                        ₱
                      </span>
                      <input
                        id="vat"
                        type="text"
                        inputMode="decimal"
                        value={details.vatAmount}
                        onChange={(e) => {
                          vatTouched.current = true;
                          setDetails((d) => ({ ...d, vatAmount: e.target.value }));
                        }}
                        placeholder="0.00"
                        className={`${inputClass(!!errors.vatAmount)} tabular pl-7`}
                      />
                    </div>
                  </FormField>
                )}
              </div>
            )}

            {/* Running total, so the figure is confirmed before step 3. */}
            {netCentavos !== null && netCentavos > 0 && (
              <div className="tabular rounded-lg bg-ledger-50 px-4 py-3 text-sm text-ledger-700">
                Net {formatPeso(netCentavos)}
                {kind.supportsVat && details.includeVat && <> + VAT {formatPeso(vatCentavos)}</>}
                {kind.supportsVat && !details.includeVat && (
                  <span className="text-ledger-500"> (no VAT)</span>
                )}{' '}
                = <span className="font-bold text-ledger-900">{formatPeso(totalCentavos)}</span>
              </div>
            )}

            {kind.supportsCredit && (
              <FormField label="Settlement" htmlFor="paid">
                <div id="paid" className="flex gap-2" role="group">
                  <Toggle
                    active={details.isPaid}
                    onClick={() => setDetails((d) => ({ ...d, isPaid: true }))}
                    label="Paid in cash"
                  />
                  <Toggle
                    active={!details.isPaid}
                    onClick={() => setDetails((d) => ({ ...d, isPaid: false }))}
                    label={kind.counterparty === 'CUSTOMER' ? 'On account (receivable)' : 'On account (payable)'}
                  />
                </div>
              </FormField>
            )}

            <FormField label="Description" htmlFor="description" error={errors.description} hint="Optional">
              <textarea
                id="description"
                rows={2}
                value={details.description}
                onChange={(e) => setDetails((d) => ({ ...d, description: e.target.value }))}
                placeholder="What was this for?"
                className={`${inputClass(!!errors.description)} resize-y`}
              />
            </FormField>

            <Actions
              onBack={() => setStep(1)}
              backLabel="Change type"
              onNext={toReview}
              nextLabel="Review"
            />
          </Pane>
        )}

        {/* ── Step 3: confirm ──────────────────────────────────────────── */}
        {step === 3 && kind && (
          <Pane key="step3">
            <div className="overflow-hidden rounded-xl border border-ledger-200">
              <Row label="Type" value={kind.label} />
              {categoryAccount && (
                <Row
                  label={kind.category?.label ?? 'Account'}
                  value={`${categoryAccount.code} ${categoryAccount.name}`}
                />
              )}
              {appliedTo && (
                <Row
                  label={kind.appliedToPool === 'LOAN' ? 'Loan' : kind.appliedToPool === 'CUSTOMER' ? 'Invoice' : 'Bill'}
                  value={appliedTo.invoiceNumber ? `#${appliedTo.invoiceNumber}` : appliedTo.counterpartyName || 'Loan'}
                />
              )}
              <Row label="Date" value={details.date} />
              {details.invoiceNumber && <Row label="Invoice / OR" value={details.invoiceNumber} />}
              {kind.counterparty && details.counterpartyName && (
                <Row
                  label={kind.counterparty === 'CUSTOMER' ? 'Customer' : 'Supplier'}
                  value={details.counterpartyName}
                />
              )}
              {details.description && <Row label="Description" value={details.description} />}
              <Row label="Net amount" value={formatPeso(netCentavos ?? 0)} mono />
              {kind.supportsVat && (
                <Row
                  label="VAT"
                  value={details.includeVat ? formatPeso(vatCentavos) : 'None'}
                  mono={details.includeVat}
                />
              )}
              {kind.supportsCredit && (
                <Row label="Settlement" value={details.isPaid ? 'Paid in cash' : 'On account'} />
              )}
              <div className="tabular flex items-center justify-between bg-peso-50 px-4 py-3">
                <span className="text-sm font-bold text-ledger-900">Total</span>
                <span className="text-lg font-extrabold text-peso-700">
                  {formatPeso(totalCentavos)}
                </span>
              </div>
            </div>

            <p className="m-0 text-xs text-ledger-500">
              Saving posts this to the general journal automatically as a balanced entry.
            </p>

            {submitError && (
              <p role="alert" className="m-0 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                {submitError}
              </p>
            )}

            <Actions
              onBack={() => setStep(2)}
              backLabel="Edit"
              onNext={submit}
              nextLabel={submitting ? 'Saving…' : 'Save transaction'}
              busy={submitting}
              icon={
                submitting ? (
                  <Loader2 size={16} className="animate-spin" aria-hidden />
                ) : (
                  <Check size={16} aria-hidden />
                )
              }
            />
          </Pane>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={onCancel}
        className="cursor-pointer self-start border-none bg-transparent p-0 text-sm font-medium text-ledger-500 underline hover:text-ledger-700"
      >
        Cancel
      </button>
    </div>
  );
}

/* ── Small pieces ───────────────────────────────────────────────────────── */

function Pane({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -16 }}
      transition={{ duration: 0.18 }}
      className="flex flex-col gap-4"
    >
      {children}
    </motion.div>
  );
}

function Steps({ step }: { step: 1 | 2 | 3 }) {
  const labels = ['Type', 'Details', 'Confirm'];
  return (
    <ol className="m-0 flex list-none gap-2 p-0">
      {labels.map((label, i) => {
        const n = (i + 1) as 1 | 2 | 3;
        const done = n < step;
        const active = n === step;
        return (
          <li key={label} className="flex flex-1 items-center gap-2">
            <span
              aria-current={active ? 'step' : undefined}
              className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                active
                  ? 'bg-peso-600 text-white'
                  : done
                    ? 'bg-peso-100 text-peso-700'
                    : 'bg-ledger-100 text-ledger-500'
              }`}
            >
              {done ? <Check size={13} aria-hidden /> : n}
            </span>
            <span
              className={`text-xs font-semibold ${active ? 'text-ledger-900' : 'text-ledger-500'}`}
            >
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function KindGroup({
  title,
  icon,
  tone,
  options,
  onPick,
}: {
  title: string;
  icon: React.ReactNode;
  tone: string;
  options: KindOption[];
  onPick: (o: KindOption) => void;
}) {
  if (options.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <h3 className={`m-0 flex items-center gap-1.5 text-xs font-bold tracking-wide uppercase ${tone}`}>
        {icon}
        {title}
      </h3>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {options.map((o) => (
          <button
            key={o.kind}
            type="button"
            onClick={() => onPick(o)}
            className="cursor-pointer rounded-xl border border-ledger-200 bg-white p-3 text-left transition hover:border-peso-500 hover:bg-peso-50 focus-visible:ring-2 focus-visible:ring-peso-500"
          >
            <div className="text-sm font-bold text-ledger-900">{o.label}</div>
            <div className="mt-0.5 text-xs text-ledger-500">{o.hint}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function Toggle({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex-1 cursor-pointer rounded-lg border px-3 py-2 text-xs font-semibold transition ${
        active
          ? 'border-peso-500 bg-peso-50 text-peso-700'
          : 'border-ledger-200 bg-white text-ledger-500 hover:bg-ledger-50'
      }`}
    >
      {label}
    </button>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-ledger-200 px-4 py-2.5 last:border-b-0">
      <span className="text-xs font-semibold tracking-wide text-ledger-500 uppercase">{label}</span>
      <span className={`text-right text-sm font-medium text-ledger-900 ${mono ? 'tabular' : ''}`}>
        {value}
      </span>
    </div>
  );
}

function Actions({
  onBack,
  backLabel,
  onNext,
  nextLabel,
  busy,
  icon,
}: {
  onBack: () => void;
  backLabel: string;
  onNext: () => void;
  nextLabel: string;
  busy?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <button
        type="button"
        onClick={onBack}
        disabled={busy}
        className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-ledger-200 bg-white px-4 py-2.5 text-sm font-semibold text-ledger-700 hover:bg-ledger-50 disabled:opacity-50"
      >
        <ArrowLeft size={15} aria-hidden />
        {backLabel}
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={busy}
        className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border-none bg-peso-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-peso-700 disabled:opacity-60"
      >
        {icon}
        {nextLabel}
      </button>
    </div>
  );
}
