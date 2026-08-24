import { useMemo, useState } from 'react';
import { AlertTriangle, Loader2, Pencil, Trash2, X } from 'lucide-react';
import { FormField, inputClass } from '@/components/FormField';
import { useApi } from '@/hooks/useApi';
import { ApiError, api } from '@/lib/api';
import { formatAmount } from '@/lib/money';
import { useToast } from '@/lib/toast';
import type { TransactionDependencies, TransactionImpact } from '@/types';

/**
 * The edit/delete panel for one transaction, selected from the audit
 * timeline.
 *
 * This edits the transaction itself, not the audit log — the log stays
 * append-only; every change made here writes a *new* audit entry with the
 * before/after snapshot, rather than altering history. The two safety rules
 * from the spec (no edit/delete once a payment is applied, no edit/delete
 * past the compliance window) are enforced server-side; this panel reads and
 * displays what the server already decided rather than re-deriving it.
 */
export function TransactionActionPanel({
  transactionId,
  dependencies: dep,
  dependenciesError,
  onClose,
  onChanged,
}: {
  transactionId: string;
  /** Already loaded by the page for the flowchart — reused here rather than
   * fetched a second time. */
  dependencies: TransactionDependencies | null;
  dependenciesError: string | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [mode, setMode] = useState<'view' | 'edit' | 'delete'>('view');
  const impact = useApi<{ data: TransactionImpact }>(`/transactions/${transactionId}/impact`);

  const imp = impact.data?.data;

  // Deleting is never blocked — the warning banner below is what stands in
  // for a block, and the user decides after seeing it. Editing keeps its own
  // separate rule (PUT still refuses server-side): a settled or 90+ day
  // entry cannot be edited in place, since editing a paid invoice would leave
  // its payment applied against a now-wrong amount, which deleting the whole
  // thing does not — this mirrors the same two checks PUT enforces, computed
  // here so the button reflects them without a second round trip.
  const settled = dep ? dep.settlements.length > 0 : false;
  // Captured once via a lazy useState initializer — the one idiomatic place
  // to read an impure value (Date.now()) without it running on every render.
  // This is a same-session display of age, not a live countdown, so freezing
  // "now" at mount is correct: the panel does not need to notice midnight
  // passing while it happens to be open.
  const [now] = useState(() => Date.now());
  const ageDays = useMemo(
    () => (dep ? Math.floor((now - new Date(dep.transaction.date).getTime()) / 86_400_000) : 0),
    [dep, now],
  );
  const editLocked = settled || ageDays > 90;

  // A selected entry can point at a transaction that was itself deleted since
  // — the audit row for that deletion is exactly the case where this happens.
  // There is nothing left to edit or delete, so the panel says so plainly
  // rather than spinning on a request that will never resolve to data.
  if (dependenciesError) {
    return (
      <div className="flex flex-col gap-2 border-t border-ledger-200 bg-white p-4 sm:rounded-b-xl">
        <div className="flex items-start justify-between">
          <p className="m-0 text-sm text-ledger-500">This transaction no longer exists.</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="cursor-pointer rounded border-none bg-transparent p-1 text-ledger-500 hover:bg-ledger-100"
          >
            <X size={16} aria-hidden />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 border-t border-ledger-200 bg-white p-4 sm:rounded-b-xl">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="m-0 text-sm font-bold text-ledger-900">
            {dep ? formatAmount(dep.transaction.totalAmount) : 'Loading…'}
          </h3>
          {dep && (
            <p className="m-0 text-xs text-ledger-500">
              {dep.transaction.type} · {new Date(dep.transaction.date).toLocaleDateString('en-PH')}
              {dep.transaction.invoiceNumber && ` · #${dep.transaction.invoiceNumber}`}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="cursor-pointer rounded border-none bg-transparent p-1 text-ledger-500 hover:bg-ledger-100"
        >
          <X size={16} aria-hidden />
        </button>
      </div>

      {/* Informational only — deleting proceeds regardless; this is what
          the delete dialog itself expands on with full detail. */}
      {editLocked && (
        <div className="flex items-start gap-2 rounded-lg bg-record-50 px-3 py-2 text-xs text-record-700">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden />
          <p className="m-0">
            {settled
              ? 'This invoice has a payment applied, so it cannot be edited in place — deleting it removes the payment too.'
              : 'This entry is more than 90 days old, so it cannot be edited in place — it can still be deleted.'}
          </p>
        </div>
      )}

      {mode === 'view' && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMode('edit')}
            disabled={editLocked}
            className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-ledger-200 bg-white px-3 py-2 text-sm font-semibold text-ledger-700 hover:bg-ledger-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Pencil size={14} aria-hidden />
            Edit
          </button>
          <button
            type="button"
            onClick={() => setMode('delete')}
            className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
          >
            <Trash2 size={14} aria-hidden />
            Delete
          </button>
        </div>
      )}

      {mode === 'edit' && dep && (
        <EditForm
          transactionId={transactionId}
          dependencies={dep}
          onCancel={() => setMode('view')}
          onSaved={() => {
            setMode('view');
            onChanged();
          }}
        />
      )}

      {mode === 'delete' && dep && imp && (
        <DeleteConfirm
          transactionId={transactionId}
          dependencies={dep}
          impact={imp}
          onCancel={() => setMode('view')}
          onDeleted={() => {
            onChanged();
            onClose();
          }}
        />
      )}
    </div>
  );
}

/** Scales one existing line the same way the backend's PUT does, so the
 * preview shown here matches what the server will actually compute. */
function scaledLine(
  amount: string,
  oldNet: string,
  oldVat: string,
  oldTotal: string,
  newNet: number,
  newVat: number,
  newTotal: number,
): number {
  const a = Number(amount);
  if (a === Number(oldVat) && Number(oldVat) !== 0) return newVat;
  if (a === Number(oldNet)) return newNet;
  if (a === Number(oldTotal)) return newTotal;
  return Number(oldTotal) === 0 ? a : (a * newTotal) / Number(oldTotal);
}

function EditForm({
  transactionId,
  dependencies,
  onCancel,
  onSaved,
}: {
  transactionId: string;
  dependencies: TransactionDependencies;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [netAmount, setNetAmount] = useState(dependencies.transaction.netAmount);
  const [reason, setReason] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const changed = netAmount !== dependencies.transaction.netAmount;
  const entry = dependencies.journalEntries[0];

  // A straight amount correction keeps VAT proportional to the old net/VAT
  // ratio — the same rule the server applies — so the preview below matches
  // what PUT will actually compute.
  const oldNet = Number(dependencies.transaction.netAmount);
  const oldVat = Number(dependencies.transaction.vatAmount);
  const newNetNum = Number(netAmount) || 0;
  const newVatNum = oldNet === 0 ? 0 : (newNetNum * oldVat) / oldNet;
  const newTotalNum = newNetNum + newVatNum;
  const oldTotal = oldNet + oldVat;

  const preview = entry?.lines.map((l) => ({
    ...l,
    newAmount: scaledLine(
      l.amount,
      dependencies.transaction.netAmount,
      dependencies.transaction.vatAmount,
      String(oldTotal),
      newNetNum,
      newVatNum,
      newTotalNum,
    ),
  }));

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      await api.put(`/transactions/${transactionId}`, {
        netAmount: changed ? netAmount : undefined,
        reason: reason.trim() || undefined,
      });
      toast.success('Transaction updated');
      onSaved();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Could not save the edit.';
      setError(message);
      toast.error(`Failed to save: ${message}`);
      setReviewing(false);
    } finally {
      setSaving(false);
    }
  }

  if (reviewing && preview) {
    return (
      <div className="flex flex-col gap-3">
        <p className="m-0 text-sm font-semibold text-ledger-900">Review before confirming</p>
        <div className="rounded-lg bg-ledger-50 p-3 text-xs">
          <p className="m-0 mb-1.5 font-bold text-ledger-700">GL impact:</p>
          {preview.map((l) => (
            <p key={l.id} className="m-0 text-ledger-700">
              {l.account.code} {l.account.name}: {formatAmount(l.amount)} →{' '}
              <span className="font-bold text-peso-700">{formatAmount(l.newAmount.toFixed(2))}</span>
            </p>
          ))}
          <p className="m-0 mt-2 text-[11px] text-ledger-500">
            Debits and credits move together — the entry stays balanced.
          </p>
        </div>

        {error && (
          <p role="alert" className="m-0 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setReviewing(false)}
            disabled={saving}
            className="cursor-pointer rounded-lg border border-ledger-200 bg-white px-3 py-2 text-sm font-semibold text-ledger-700 hover:bg-ledger-50"
          >
            Back
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={saving}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg border-none bg-peso-600 px-4 py-2 text-sm font-bold text-white hover:bg-peso-700 disabled:opacity-60"
          >
            {saving && <Loader2 size={14} className="animate-spin" aria-hidden />}
            Confirm Edit
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <FormField label="Net amount" htmlFor="edit-net" hint="VAT recalculates proportionally.">
        <div className="relative">
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm font-semibold text-ledger-500">
            ₱
          </span>
          <input
            id="edit-net"
            type="text"
            inputMode="decimal"
            value={netAmount}
            onChange={(e) => setNetAmount(e.target.value)}
            className={`${inputClass()} tabular pl-7`}
          />
        </div>
      </FormField>

      {changed && (
        <div className="rounded-lg bg-ledger-50 p-3 text-xs">
          <p className="m-0 mb-1 font-bold text-ledger-700">This will change:</p>
          <p className="m-0 text-ledger-700">
            Net {formatAmount(dependencies.transaction.netAmount)} →{' '}
            <span className="font-bold text-peso-700">{formatAmount(netAmount || '0')}</span>
          </p>
          <p className="m-0 mt-1 text-ledger-500">
            Every account this entry posted to will scale with it — accounts receivable/payable,
            revenue or expense, and VAT all move together so the entry stays balanced.
          </p>
        </div>
      )}

      <FormField label="Reason" htmlFor="edit-reason" hint="Optional — recorded in the audit log.">
        <input
          id="edit-reason"
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Corrected invoice amount"
          className={inputClass()}
        />
      </FormField>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="cursor-pointer rounded-lg border border-ledger-200 bg-white px-3 py-2 text-sm font-semibold text-ledger-700 hover:bg-ledger-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => setReviewing(true)}
          disabled={!changed || !entry}
          className="cursor-pointer rounded-lg border-none bg-peso-600 px-4 py-2 text-sm font-bold text-white hover:bg-peso-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Preview Impact
        </button>
      </div>
    </div>
  );
}

function DeleteConfirm({
  transactionId,
  dependencies,
  impact,
  onCancel,
  onDeleted,
}: {
  transactionId: string;
  dependencies: TransactionDependencies;
  impact: TransactionImpact;
  onCancel: () => void;
  onDeleted: () => void;
}) {
  const toast = useToast();
  const [reason, setReason] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmDelete() {
    setDeleting(true);
    setError(null);
    try {
      await api.del(`/transactions/${transactionId}${reason.trim() ? `?reason=${encodeURIComponent(reason.trim())}` : ''}`);
      toast.success('Deleted with cascade');
      onDeleted();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Could not delete the transaction.';
      setError(message);
      toast.error(`Failed to delete: ${message}`);
      setDeleting(false);
    }
  }

  const { cascade } = impact;

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="m-0 text-sm font-bold text-ledger-900">
          Delete {dependencies.transaction.type} {formatAmount(dependencies.transaction.totalAmount)}
        </p>
        <p className="m-0 text-xs text-ledger-500">
          {new Date(dependencies.transaction.date).toLocaleDateString('en-PH', {
            year: 'numeric', month: 'long', day: 'numeric',
          })}
        </p>
      </div>

      <div className="flex items-start gap-2 rounded-lg bg-record-50 px-3 py-2 text-xs font-semibold text-record-700">
        <AlertTriangle size={15} className="mt-0.5 shrink-0" aria-hidden />
        Cascade delete — this will permanently delete every item below.
      </div>

      <div className="rounded-lg border border-ledger-200 p-3 text-xs">
        <p className="m-0 mb-2 font-bold text-ledger-700">This will permanently delete:</p>

        <div className="flex flex-col gap-1.5">
          <p className="m-0 text-ledger-900">
            <span className="text-peso-700">✓</span> Invoice: {dependencies.transaction.type}{' '}
            {formatAmount(dependencies.transaction.totalAmount)}
          </p>
          <p className="m-0 text-ledger-900">
            <span className="text-peso-700">✓</span> {cascade.journalEntries} journal{' '}
            {cascade.journalEntries === 1 ? 'entry' : 'entries'}, {cascade.journalLines} journal lines
          </p>

          {cascade.settlements.map((s) => (
            <p key={s.id} className="m-0 text-record-700">
              <span>⚠</span> Payment: {s.type} {formatAmount(s.totalAmount)}
              {s.invoiceNumber && ` (#${s.invoiceNumber})`}
              <span className="block pl-4 text-[11px] text-ledger-500">
                payment matched to this invoice — deleted along with it
              </span>
            </p>
          ))}

          {cascade.counterparty && !cascade.counterparty.remainsAfterDelete && (
            <p className="m-0 text-record-700">
              <span>⚠</span> {cascade.counterparty.kind === 'CUSTOMER' ? 'Customer' : 'Supplier'}:{' '}
              {cascade.counterparty.name}
              <span className="block pl-4 text-[11px] text-ledger-500">
                no other transactions reference them — they will no longer appear in Contacts
              </span>
            </p>
          )}
          {cascade.counterparty && cascade.counterparty.remainsAfterDelete && (
            <p className="m-0 text-ledger-500">
              {cascade.counterparty.kind === 'CUSTOMER' ? 'Customer' : 'Supplier'}:{' '}
              {cascade.counterparty.name} — not removed, other transactions still reference them
            </p>
          )}
        </div>

        <p className="m-0 mt-3 mb-1.5 font-bold text-ledger-700">Reports will recalculate:</p>
        <div className="flex flex-col gap-0.5">
          {impact.reportImpact.map((r) => (
            <p key={r.accountCode} className="m-0 text-ledger-700">
              {r.accountCode} {r.accountName}: {r.side === 'DEBIT' ? '−' : '−'}
              {formatAmount(r.amount)}
            </p>
          ))}
          {cascade.settlements.flatMap((s) =>
            s.reportImpact.map((r) => (
              <p key={`${s.id}-${r.accountCode}`} className="m-0 text-ledger-700">
                {r.accountCode} {r.accountName}: {r.side === 'DEBIT' ? '−' : '−'}
                {formatAmount(r.amount)}
              </p>
            )),
          )}
        </div>

        {impact.warnings.length > 0 && (
          <div className="mt-3 flex flex-col gap-0.5 border-t border-ledger-200 pt-2">
            {impact.warnings.map((w) => (
              <p key={w} className="m-0 text-[11px] text-ledger-500">
                {w}
              </p>
            ))}
          </div>
        )}
      </div>

      <FormField
        label="Reason for deletion"
        htmlFor="delete-reason"
        hint="Optional — e.g. duplicate entry, wrong date, supplier error. Recorded in the audit log."
      >
        <textarea
          id="delete-reason"
          rows={2}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Duplicate entry, entered wrong date, supplier error"
          className={`${inputClass()} resize-y text-base`}
        />
      </FormField>

      <p className="m-0 text-xs font-medium text-ledger-500">
        This action cannot be undone. The audit trail will record the deletion with your reason.
      </p>

      {error && (
        <p role="alert" className="m-0 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={deleting}
          className="cursor-pointer rounded-lg border border-ledger-200 bg-white px-3 py-2 text-sm font-semibold text-ledger-700 hover:bg-ledger-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={confirmDelete}
          disabled={deleting}
          className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border-none bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60"
        >
          {deleting && <Loader2 size={14} className="animate-spin" aria-hidden />}
          Confirm Delete All
        </button>
      </div>
    </div>
  );
}
