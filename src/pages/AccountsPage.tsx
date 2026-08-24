import { useState } from 'react';
import { Loader2, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useEscapeToClose } from '@/hooks/useEscapeToClose';
import { Card, PageHeading } from '@/components/Card';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { FormField, inputClass } from '@/components/FormField';
import { useApi } from '@/hooks/useApi';
import { ApiError, api } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { formatAmount } from '@/lib/money';
import type { Account, AccountType, Company, ListResponse } from '@/types';

const TYPES: AccountType[] = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'];
const TYPE_PREFIX: Record<AccountType, string> = {
  ASSET: '1',
  LIABILITY: '2',
  EQUITY: '3',
  REVENUE: '4',
  EXPENSE: '5',
};

/** The chart of accounts: browse, create, edit, and retire accounts. */
export function AccountsPage() {
  const companies = useApi<ListResponse<Company>>('/companies');
  const company = companies.data?.data[0] ?? null;

  const accountsQuery = useApi<ListResponse<Account>>(
    company ? `/accounts?companyId=${company.id}&includeInactive=true` : null,
  );

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<AccountType | ''>('');
  const [showInactive, setShowInactive] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [deleting, setDeleting] = useState<Account | null>(null);

  const toast = useToast();

  const accounts = accountsQuery.data?.data ?? [];
  // ~44 rows: filtering on every render is cheap enough that memoizing it
  // would only add the cost of comparing dependencies.
  const q = search.trim().toLowerCase();
  const filtered = accounts
    .filter((a) => showInactive || a.isActive)
    .filter((a) => !typeFilter || a.type === typeFilter)
    .filter((a) => !q || a.code.includes(q) || a.name.toLowerCase().includes(q));

  const customCount = accounts.filter((a) => !a.isSystem).length;

  if (companies.loading || (company && accountsQuery.loading)) {
    return (
      <div>
        <PageHeading title="Chart of Accounts" />
        <SkeletonTable />
      </div>
    );
  }

  if (!company) {
    return (
      <div>
        <PageHeading title="Chart of Accounts">
          No company yet. Record a transaction and the chart will appear here.
        </PageHeading>
      </div>
    );
  }

  async function handleDelete(account: Account) {
    try {
      await api.del(`/accounts/${account.id}`);
      toast.success(`${account.code} ${account.name} deleted`);
      setDeleting(null);
      void accountsQuery.reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not delete the account.');
    }
  }

  return (
    <div>
      <PageHeading title="Chart of Accounts">
        {company.name} · {accounts.length} accounts, {customCount} custom
      </PageHeading>

      <div className="mb-3 flex flex-wrap items-end gap-2">
        <label className="flex min-w-45 flex-1 flex-col gap-1">
          <span className="text-[11px] font-semibold text-ledger-500 uppercase">Search</span>
          <span className="relative">
            <Search
              size={14}
              className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-ledger-500"
              aria-hidden
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Code or name"
              className="w-full rounded-lg border border-ledger-200 bg-white py-2 pr-3 pl-8 text-base outline-none focus:border-peso-500 focus:ring-2 focus:ring-peso-100 sm:text-sm"
            />
          </span>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-ledger-500 uppercase">Type</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as AccountType | '')}
            className="rounded-lg border border-ledger-200 bg-white px-2 py-2 text-base outline-none focus:border-peso-500 sm:text-sm"
          >
            <option value="">All types</option>
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>

        <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-ledger-200 bg-white px-3 py-2 text-sm font-medium text-ledger-700">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
          />
          Show inactive
        </label>

        <button
          type="button"
          onClick={() => setCreating(true)}
          className="flex cursor-pointer items-center gap-1.5 rounded-lg border-none bg-peso-600 px-3 py-2 text-sm font-bold text-white hover:bg-peso-700"
        >
          <Plus size={15} aria-hidden />
          Add Account
        </button>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <p className="m-0 text-center text-sm text-ledger-500">
            {accounts.length === 0
              ? 'No accounts yet.'
              : customCount === 0 && !search && !typeFilter
                ? 'No custom accounts yet.'
                : 'No accounts match this filter.'}{' '}
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="cursor-pointer border-none bg-transparent p-0 font-semibold text-peso-700 underline"
            >
              Add Account
            </button>
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden !p-0">
          {/* Desktop: a table. Phones: cards — a five-column table cannot fit
              390px without either scrolling or unreadable text. */}
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full min-w-2xl border-collapse text-sm">
              <thead>
                <tr className="border-b border-ledger-200 bg-ledger-50 text-left">
                  <th className="px-4 py-2 text-xs font-bold text-ledger-500 uppercase">Code</th>
                  <th className="px-4 py-2 text-xs font-bold text-ledger-500 uppercase">Name</th>
                  <th className="px-4 py-2 text-xs font-bold text-ledger-500 uppercase">Type</th>
                  <th className="px-4 py-2 text-right text-xs font-bold text-ledger-500 uppercase">
                    Balance
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-bold text-ledger-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr
                    key={a.id}
                    className={`border-b border-ledger-100 hover:bg-ledger-50 ${!a.isActive ? 'opacity-50' : ''}`}
                  >
                    <td className="tabular px-4 py-2 text-ledger-500">{a.code}</td>
                    <td className="px-4 py-2 text-ledger-900">
                      {a.name}
                      {a.isSystem && (
                        <span className="ml-2 rounded bg-ledger-100 px-1.5 py-0.5 text-[10px] font-semibold text-ledger-500 uppercase">
                          default
                        </span>
                      )}
                      {!a.isActive && (
                        <span className="ml-2 rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-600 uppercase">
                          inactive
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-ledger-500">{a.type}</td>
                    <td className="tabular px-4 py-2 text-right text-ledger-900">
                      {formatAmount(a.balance)}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => setEditing(a)}
                        title="Edit"
                        className="cursor-pointer rounded border-none bg-transparent p-1.5 text-ledger-500 hover:bg-ledger-100 hover:text-ledger-900"
                      >
                        <Pencil size={14} aria-hidden />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleting(a)}
                        disabled={a.isSystem}
                        title={a.isSystem ? 'Default accounts cannot be deleted' : 'Delete'}
                        className="cursor-pointer rounded border-none bg-transparent p-1.5 text-ledger-500 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-ledger-500"
                      >
                        <Trash2 size={14} aria-hidden />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-ledger-100 sm:hidden">
            {filtered.map((a) => (
              <div key={a.id} className={`p-4 ${!a.isActive ? 'opacity-50' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="tabular text-xs text-ledger-500">{a.code}</div>
                    <div className="font-semibold text-ledger-900">{a.name}</div>
                    <div className="mt-0.5 flex gap-1 text-[10px] text-ledger-500">
                      <span>{a.type}</span>
                      {a.isSystem && <span>· default</span>}
                      {!a.isActive && <span className="text-red-600">· inactive</span>}
                    </div>
                  </div>
                  <div className="tabular text-right text-sm font-semibold text-ledger-900">
                    {formatAmount(a.balance)}
                  </div>
                </div>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditing(a)}
                    className="flex-1 cursor-pointer rounded-lg border border-ledger-200 bg-white py-1.5 text-xs font-semibold text-ledger-700"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleting(a)}
                    disabled={a.isSystem}
                    className="flex-1 cursor-pointer rounded-lg border border-ledger-200 bg-white py-1.5 text-xs font-semibold text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {creating && (
        <AccountFormModal
          companyId={company.id}
          accounts={accounts}
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            void accountsQuery.reload();
          }}
        />
      )}

      {editing && (
        <AccountFormModal
          companyId={company.id}
          accounts={accounts}
          account={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void accountsQuery.reload();
          }}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        title="Delete this account?"
        message={
          deleting
            ? `This will permanently remove ${deleting.code} ${deleting.name}. This cannot be undone.`
            : ''
        }
        onCancel={() => setDeleting(null)}
        onConfirm={() => deleting && handleDelete(deleting)}
      />
    </div>
  );
}

/** Create or edit an account. Code is fixed once an account exists. */
function AccountFormModal({
  companyId,
  accounts,
  account,
  onClose,
  onSaved,
}: {
  companyId: string;
  accounts: Account[];
  account?: Account;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const isEdit = !!account;

  const [code, setCode] = useState(account?.code ?? '');
  const [name, setName] = useState(account?.name ?? '');
  const [type, setType] = useState<AccountType>(account?.type ?? 'ASSET');
  const [parentId, setParentId] = useState(account?.parentId ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const codeError =
    !isEdit && code && !/^\d{4,5}$/.test(code) ? 'Code must be 4 or 5 digits.' : null;
  const prefixError =
    !isEdit && code && !codeError && !code.startsWith(TYPE_PREFIX[type])
      ? `${type} codes start with ${TYPE_PREFIX[type]} (e.g. ${TYPE_PREFIX[type]}xxx).`
      : null;
  const duplicateError =
    !isEdit && code && !codeError
      ? accounts.some((a) => a.code === code)
        ? 'That code is already in use.'
        : null
      : null;

  useEscapeToClose(onClose);

  const parentOptions = accounts.filter(
    (a) => a.type === type && a.id !== account?.id && a.isActive,
  );

  const canSubmit =
    name.trim().length > 0 &&
    (isEdit || (!!code && !codeError && !prefixError && !duplicateError));

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      if (isEdit && account) {
        await api.put(`/accounts/${account.id}`, {
          name: name.trim(),
          type,
          parentId: parentId || null,
        });
        toast.success('Account updated');
      } else {
        await api.post('/accounts', {
          companyId,
          code,
          name: name.trim(),
          type,
          parentId: parentId || null,
        });
        toast.success('Account created');
      }
      onSaved();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Could not save the account.';
      setError(message);
      toast.error(`Failed to save: ${message}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl"
      >
        <h2 className="m-0 mb-4 text-base font-bold text-ledger-900">
          {isEdit ? `Edit ${account?.code}` : 'Add Account'}
        </h2>

        <div className="flex flex-col gap-3">
          <FormField
            label="Code"
            htmlFor="acct-code"
            required
            error={codeError ?? prefixError ?? duplicateError ?? undefined}
            hint={isEdit ? 'Fixed once an account exists, to keep the GL consistent.' : '4–5 digits'}
          >
            <input
              id="acct-code"
              type="text"
              inputMode="numeric"
              value={code}
              disabled={isEdit}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              className={`${inputClass(!!(codeError || prefixError || duplicateError))} text-base disabled:bg-ledger-50 disabled:text-ledger-500`}
            />
          </FormField>

          <FormField label="Name" htmlFor="acct-name" required>
            <input
              id="acct-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`${inputClass()} text-base`}
            />
          </FormField>

          <FormField
            label="Type"
            htmlFor="acct-type"
            hint={isEdit && account && account.type !== type ? 'Cannot change once entries exist.' : undefined}
          >
            <select
              id="acct-type"
              value={type}
              onChange={(e) => {
                setType(e.target.value as AccountType);
                setParentId('');
              }}
              className={`${inputClass()} text-base`}
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Parent account" htmlFor="acct-parent" hint="Optional">
            <select
              id="acct-parent"
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className={`${inputClass()} text-base`}
            >
              <option value="">None</option>
              {parentOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} — {p.name}
                </option>
              ))}
            </select>
          </FormField>

          {error && (
            <p role="alert" className="m-0 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="cursor-pointer rounded-lg border border-ledger-200 bg-white px-3 py-2 text-sm font-semibold text-ledger-700 hover:bg-ledger-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit || submitting}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg border-none bg-peso-600 px-4 py-2 text-sm font-bold text-white hover:bg-peso-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting && <Loader2 size={14} className="animate-spin" aria-hidden />}
            {isEdit ? 'Save' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

function SkeletonTable() {
  return (
    <Card>
      <div className="flex flex-col gap-2">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="h-8 animate-pulse rounded bg-ledger-100" />
        ))}
      </div>
    </Card>
  );
}
