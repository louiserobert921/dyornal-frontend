import { useState } from 'react';
import { Loader2, Pencil } from 'lucide-react';
import { Card, PageHeading } from '@/components/Card';
import { FormField, inputClass } from '@/components/FormField';
import { useApi } from '@/hooks/useApi';
import { ApiError, api } from '@/lib/api';
import { useToast } from '@/lib/toast';
import type { CompanyDetail } from '@/types';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface FormState {
  name: string;
  tin: string;
  ownerName: string;
  establishedDate: string;
  fiscalYearStart: number;
  address: string;
  phone: string;
  email: string;
}

function toForm(c: CompanyDetail): FormState {
  return {
    name: c.name,
    tin: c.tin ?? '',
    ownerName: c.ownerName ?? '',
    establishedDate: c.establishedDate ? c.establishedDate.slice(0, 10) : '',
    fiscalYearStart: c.fiscalYearStart,
    address: c.address ?? '',
    phone: c.phone ?? '',
    email: c.email ?? '',
  };
}

/** Business details: view read-only, edit in place, confirm the diff before saving. */
export function MyBusinessPage() {
  const companies = useApi<{ data: CompanyDetail[] }>('/companies');
  const company = companies.data?.data[0] ?? null;
  const toast = useToast();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<FormState | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (companies.loading) {
    return (
      <div>
        <PageHeading title="My Business" />
        <Card>
          <div className="h-40 animate-pulse rounded bg-ledger-100" />
        </Card>
      </div>
    );
  }

  if (!company) {
    return (
      <div>
        <PageHeading title="My Business">No company yet.</PageHeading>
      </div>
    );
  }

  function startEdit() {
    setForm(toForm(company!));
    setEditing(true);
    setError(null);
  }

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => (f ? { ...f, [key]: value } : f));
  }

  const tinError =
    form && form.tin && !/^\d{3}-\d{3}-\d{3}-\d{3}$/.test(form.tin)
      ? 'Format: 123-456-789-123'
      : null;

  const changed = form
    ? Object.entries(form).filter(([k, v]) => {
        const before = toForm(company!)[k as keyof FormState];
        return String(before) !== String(v);
      })
    : [];

  async function save() {
    if (!form) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.patch(`/companies/${company!.id}`, {
        name: form.name,
        tin: form.tin || null,
        ownerName: form.ownerName || null,
        establishedDate: form.establishedDate || null,
        fiscalYearStart: form.fiscalYearStart,
        address: form.address || null,
        phone: form.phone || null,
        email: form.email || null,
      });
      toast.success('Changes saved');
      setEditing(false);
      setConfirming(false);
      void companies.reload();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Could not save changes.';
      setError(message);
      toast.error(`Failed to save: ${message}`);
    } finally {
      setSubmitting(false);
    }
  }

  const FIELD_LABELS: Record<keyof FormState, string> = {
    name: 'Business Name',
    tin: 'Tax ID / TIN',
    ownerName: 'Owner Name',
    establishedDate: 'Date Established',
    fiscalYearStart: 'Fiscal Year Start',
    address: 'Address',
    phone: 'Phone',
    email: 'Email',
  };

  return (
    <div>
      <PageHeading title="My Business">Company profile and registration details.</PageHeading>

      <Card>
        {!editing ? (
          <>
            <div className="flex items-start justify-between">
              <h3 className="m-0 text-sm font-bold text-ledger-900">Business information</h3>
              <button
                type="button"
                onClick={startEdit}
                className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-ledger-200 bg-white px-3 py-1.5 text-sm font-semibold text-ledger-700 hover:bg-ledger-50"
              >
                <Pencil size={14} aria-hidden />
                Edit
              </button>
            </div>

            <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
              <Field label="Business name" value={company.name} />
              <Field label="Tax ID / TIN" value={company.tin ?? '—'} />
              <Field label="Owner" value={company.ownerName ?? '—'} />
              <Field
                label="Date established"
                value={
                  company.establishedDate
                    ? new Date(company.establishedDate).toLocaleDateString('en-PH', {
                        year: 'numeric', month: 'long', day: 'numeric',
                      })
                    : '—'
                }
              />
              <Field label="Fiscal year start" value={MONTHS[company.fiscalYearStart - 1]} />
              <Field label="Address" value={company.address ?? '—'} />
              <Field label="Phone" value={company.phone ?? '—'} />
              <Field label="Email" value={company.email ?? '—'} />
            </dl>
          </>
        ) : (
          form && (
            <>
              <h3 className="m-0 mb-3 text-sm font-bold text-ledger-900">Edit business information</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FormField label="Business Name" htmlFor="biz-name" required>
                  <input
                    id="biz-name"
                    value={form.name}
                    onChange={(e) => set('name', e.target.value)}
                    className={`${inputClass()} text-base`}
                  />
                </FormField>
                <FormField label="Tax ID / TIN" htmlFor="biz-tin" error={tinError ?? undefined} hint="123-456-789-123">
                  <input
                    id="biz-tin"
                    value={form.tin}
                    onChange={(e) => set('tin', e.target.value)}
                    className={`${inputClass(!!tinError)} text-base`}
                  />
                </FormField>
                <FormField label="Owner Name" htmlFor="biz-owner">
                  <input
                    id="biz-owner"
                    value={form.ownerName}
                    onChange={(e) => set('ownerName', e.target.value)}
                    className={`${inputClass()} text-base`}
                  />
                </FormField>
                <FormField label="Date Established" htmlFor="biz-date">
                  <input
                    id="biz-date"
                    type="date"
                    value={form.establishedDate}
                    onChange={(e) => set('establishedDate', e.target.value)}
                    className={`${inputClass()} text-base`}
                  />
                </FormField>
                <FormField label="Fiscal Year Start" htmlFor="biz-fys">
                  <select
                    id="biz-fys"
                    value={form.fiscalYearStart}
                    onChange={(e) => set('fiscalYearStart', Number(e.target.value))}
                    className={`${inputClass()} text-base`}
                  >
                    {MONTHS.map((m, i) => (
                      <option key={m} value={i + 1}>
                        {m}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Phone" htmlFor="biz-phone" hint="Optional">
                  <input
                    id="biz-phone"
                    value={form.phone}
                    onChange={(e) => set('phone', e.target.value)}
                    className={`${inputClass()} text-base`}
                  />
                </FormField>
                <FormField label="Email" htmlFor="biz-email" hint="Optional">
                  <input
                    id="biz-email"
                    type="email"
                    value={form.email}
                    onChange={(e) => set('email', e.target.value)}
                    className={`${inputClass()} text-base`}
                  />
                </FormField>
                <div className="sm:col-span-2">
                  <FormField label="Address" htmlFor="biz-address" hint="Optional">
                    <textarea
                      id="biz-address"
                      rows={2}
                      value={form.address}
                      onChange={(e) => set('address', e.target.value)}
                      className={`${inputClass()} text-base`}
                    />
                  </FormField>
                </div>
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    setError(null);
                  }}
                  className="cursor-pointer rounded-lg border border-ledger-200 bg-white px-3 py-2 text-sm font-semibold text-ledger-700 hover:bg-ledger-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(true)}
                  disabled={!form.name.trim() || !!tinError || changed.length === 0}
                  className="cursor-pointer rounded-lg border-none bg-peso-600 px-4 py-2 text-sm font-bold text-white hover:bg-peso-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Review changes
                </button>
              </div>
            </>
          )
        )}
      </Card>

      <Card className="mt-4">
        <h3 className="m-0 mb-3 text-sm font-bold text-ledger-900">Account</h3>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
          <Field
            label="Created"
            value={new Date(company.createdAt).toLocaleDateString('en-PH', {
              year: 'numeric', month: 'long', day: 'numeric',
            })}
          />
          <Field label="Plan" value="Starter" hint="Billing is not wired up yet." />
        </dl>
        <p className="m-0 mt-3 text-xs text-ledger-500">
          User accounts, subscriptions, and billing are not implemented in this build — Dyornal
          currently runs as a single-user ledger with no login. That infrastructure is a
          prerequisite for the multi-user features under Settings.
        </p>
      </Card>

      {/* Confirm: show what changed before writing it. */}
      {confirming && form && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !submitting && setConfirming(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl"
          >
            <h2 className="m-0 mb-1 text-base font-bold text-ledger-900">Confirm changes</h2>
            <p className="m-0 mb-3 text-sm text-ledger-500">
              {changed.length} {changed.length === 1 ? 'field' : 'fields'} will change.
            </p>

            <div className="flex flex-col gap-2">
              {changed.map(([key]) => {
                const k = key as keyof FormState;
                const before = toForm(company)[k];
                const after = form[k];
                return (
                  <div key={key} className="rounded-lg bg-ledger-50 p-2.5">
                    <div className="text-xs font-semibold text-ledger-700">{FIELD_LABELS[k]}</div>
                    <div className="mt-0.5 flex items-center gap-2 text-sm">
                      <span className="text-red-600 line-through">
                        {k === 'fiscalYearStart' ? MONTHS[Number(before) - 1] : String(before) || '(empty)'}
                      </span>
                      <span className="text-ledger-400">→</span>
                      <span className="font-semibold text-peso-700">
                        {k === 'fiscalYearStart' ? MONTHS[Number(after) - 1] : String(after) || '(empty)'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {error && (
              <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={submitting}
                className="cursor-pointer rounded-lg border border-ledger-200 bg-white px-3 py-2 text-sm font-semibold text-ledger-700 hover:bg-ledger-50"
              >
                Back
              </button>
              <button
                type="button"
                onClick={save}
                disabled={submitting}
                className="flex cursor-pointer items-center gap-1.5 rounded-lg border-none bg-peso-600 px-4 py-2 text-sm font-bold text-white hover:bg-peso-700 disabled:opacity-60"
              >
                {submitting && <Loader2 size={14} className="animate-spin" aria-hidden />}
                Save changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold tracking-wide text-ledger-500 uppercase">{label}</dt>
      <dd className="m-0 mt-0.5 text-sm text-ledger-900">{value}</dd>
      {hint && <p className="m-0 mt-0.5 text-[11px] text-ledger-400">{hint}</p>}
    </div>
  );
}
