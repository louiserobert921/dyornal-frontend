import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Loader2, Plus, Search, X } from 'lucide-react';
import { FormField, inputClass } from '@/components/FormField';
import { useEscapeToClose } from '@/hooks/useEscapeToClose';
import { ApiError, api } from '@/lib/api';
import { formatAmount } from '@/lib/money';
import { useToast } from '@/lib/toast';
import type { Account, AccountType, KindOption, ListResponse } from '@/types';

const PAGE_SIZE = 10;

/**
 * Badge colors for each account type. The brand palette is navy, orange, and
 * white with no green, so this does not use the conventional
 * blue-asset/green-revenue/red-expense scheme — everything stays within the
 * two brand colors plus a neutral gray, distinguished by shade rather than hue.
 */
const TYPE_BADGE: Record<AccountType, string> = {
  ASSET: 'bg-peso-50 text-peso-700',
  LIABILITY: 'bg-record-50 text-record-700',
  EQUITY: 'bg-ledger-100 text-ledger-700',
  REVENUE: 'bg-peso-100 text-peso-700',
  EXPENSE: 'bg-record-100 text-record-700',
};

function TypeBadge({ type }: { type: AccountType }) {
  return (
    <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${TYPE_BADGE[type]}`}>
      {type}
    </span>
  );
}

/**
 * The account selector for step 2 of the record form: a dropdown filtered to
 * the accounts a transaction kind allows, with an inline "create new account"
 * form so a user never has to leave the flow to add one.
 *
 * Rendered only when `kind.category` is non-null — kinds with no category
 * choice (loan principal movements) always post to a fixed account and never
 * show this control at all.
 */
export function AccountPicker({
  companyId,
  kind,
  value,
  onChange,
  error,
}: {
  companyId: string;
  kind: KindOption;
  value: Account | null;
  onChange: (account: Account) => void;
  error?: string;
}) {
  const category = kind.category;
  const [open, setOpen] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (!category) return;
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams({
      companyId,
      transactionType: kind.kind,
      limit: String(PAGE_SIZE),
      offset: '0',
    });
    if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
    api
      .get<ListResponse<Account> & { meta: { total: number } }>(`/accounts?${params}`)
      .then((r) => {
        if (cancelled) return;
        setAccounts(r.data);
        setTotal(r.meta.total);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [companyId, kind.kind, category, debouncedSearch]);

  function loadMore() {
    if (loadingMore) return;
    setLoadingMore(true);
    const params = new URLSearchParams({
      companyId,
      transactionType: kind.kind,
      limit: String(PAGE_SIZE),
      offset: String(accounts.length),
    });
    if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
    api
      .get<ListResponse<Account> & { meta: { total: number } }>(`/accounts?${params}`)
      .then((r) => {
        setAccounts((prev) => [...prev, ...r.data]);
        setTotal(r.meta.total);
      })
      .finally(() => setLoadingMore(false));
  }

  // Click outside closes the dropdown, matching any native select.
  useEffect(() => {
    if (!open) return;
    function onClick(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  useEscapeToClose(() => setOpen(false), open);

  if (!category) return null;

  function addAccount(account: Account) {
    setAccounts((prev) => [...prev, account].sort((a, b) => a.code.localeCompare(b.code)));
    onChange(account);
    setCreating(false);
    setOpen(false);
  }

  return (
    <FormField
      label={`Select ${category.label} Account`}
      htmlFor="category-account"
      required
      error={error}
      hint={
        !error
          ? `Choose ${category.label.toLowerCase()} account (${category.rangeStart}–${category.rangeEnd})`
          : undefined
      }
    >
      <div ref={containerRef} className="relative">
        <button
          type="button"
          id="category-account"
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="listbox"
          aria-expanded={open}
          className={`${inputClass(!!error)} flex items-center justify-between gap-2 text-left`}
        >
          {value ? (
            <span className="flex items-center gap-2 truncate">
              <TypeBadge type={value.type} />
              <span className="tabular text-ledger-500">{value.code}</span>
              <span className="truncate text-ledger-900">{value.name}</span>
            </span>
          ) : (
            <span className="text-ledger-500">Choose an account…</span>
          )}
          <ChevronDown size={16} className="shrink-0 text-ledger-500" aria-hidden />
        </button>

        {open && (
          <>
            {/* Mobile: the picker takes the full screen, where a floating
                popover would be cramped and hard to tap accurately. */}
            <div className="fixed inset-0 z-40 bg-black/40 sm:hidden" onClick={() => setOpen(false)} />
            <div
              className={`fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:absolute sm:inset-x-0 sm:bottom-auto sm:top-full sm:z-20 sm:mt-1 sm:rounded-lg sm:border sm:border-ledger-200 sm:shadow-lg ${
                creating ? 'sm:max-h-[28rem]' : 'sm:max-h-80'
              }`}
            >
              <div className="flex items-center justify-between border-b border-ledger-100 p-3 sm:hidden">
                <span className="text-sm font-bold text-ledger-900">
                  Select {category.label} Account
                </span>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  className="cursor-pointer rounded border-none bg-transparent p-1 text-ledger-500 hover:bg-ledger-100"
                >
                  <X size={18} aria-hidden />
                </button>
              </div>

              <div
                className={`overflow-y-auto ${
                  creating ? 'max-h-[80vh] sm:max-h-[26rem]' : 'max-h-[60vh] sm:max-h-72'
                }`}
              >
                {!loading && !creating && (
                  <div className="sticky top-0 border-b border-ledger-100 bg-white p-2">
                    <span className="relative block">
                      <Search
                        size={14}
                        className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-ledger-500"
                        aria-hidden
                      />
                      <input
                        type="search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search accounts…"
                        className="w-full rounded-lg border border-ledger-200 bg-white py-1.5 pr-3 pl-8 text-sm outline-none focus:border-peso-500"
                      />
                    </span>
                  </div>
                )}
                {loading ? (
                  <p className="p-3 text-sm text-ledger-500">Loading accounts…</p>
                ) : creating ? (
                  <CreateAccountInline
                    companyId={companyId}
                    accountType={category.accountType}
                    accounts={accounts}
                    onCreated={addAccount}
                    onCancel={() => setCreating(false)}
                  />
                ) : (
                  <>
                    {accounts.length === 0 && (
                      <p className="p-3 text-sm text-ledger-500">
                        {search.trim()
                          ? `No accounts match "${search.trim()}".`
                          : `No ${category.label.toLowerCase()} accounts yet.`}
                      </p>
                    )}
                    <ul role="listbox" className="divide-y divide-ledger-50 py-1">
                      {accounts.map((a) => (
                        <li key={a.id}>
                          <button
                            type="button"
                            role="option"
                            aria-selected={value?.id === a.id}
                            onClick={() => {
                              onChange(a);
                              setOpen(false);
                            }}
                            className={`flex w-full items-center justify-between gap-2 border-none bg-transparent px-3 py-2.5 text-left text-sm hover:bg-ledger-50 ${
                              value?.id === a.id ? 'bg-peso-50' : ''
                            }`}
                          >
                            <span className="flex min-w-0 items-center gap-2">
                              <span className="tabular shrink-0 text-ledger-500">{a.code}</span>
                              <span className="truncate text-ledger-900">{a.name}</span>
                            </span>
                            <span className="tabular shrink-0 text-xs text-ledger-500">
                              {formatAmount(a.balance)}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                    {accounts.length < total && (
                      <button
                        type="button"
                        onClick={loadMore}
                        disabled={loadingMore}
                        className="w-full cursor-pointer border-none border-t border-ledger-100 bg-transparent py-2.5 text-center text-sm font-semibold text-peso-700 hover:bg-ledger-50 disabled:opacity-50"
                      >
                        {loadingMore ? 'Loading…' : `Load more (${total - accounts.length} remaining)`}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setCreating(true)}
                      className="flex w-full cursor-pointer items-center gap-1.5 border-none border-t border-ledger-100 bg-transparent px-3 py-2.5 text-left text-sm font-semibold text-peso-700 hover:bg-peso-50"
                    >
                      <Plus size={14} aria-hidden />
                      Create New {category.label}
                    </button>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </FormField>
  );
}

/** Inline "create new account" panel, shown in place of the account list. */
function CreateAccountInline({
  companyId,
  accountType,
  accounts,
  onCreated,
  onCancel,
}: {
  companyId: string;
  accountType: AccountType;
  accounts: Account[];
  onCreated: (account: Account) => void;
  onCancel: () => void;
}) {
  const toast = useToast();
  const [code, setCode] = useState<string | null>(null);
  const [codeLoading, setCodeLoading] = useState(true);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setCodeLoading(true);
    api
      .get<{ data: { code: string } }>(`/accounts/next-code?companyId=${companyId}&type=${accountType}`)
      .then((r) => {
        if (!cancelled) setCode(r.data.code);
      })
      .catch((err) => {
        if (!cancelled) {
          setCodeError(
            err instanceof ApiError ? err.message : 'Could not generate account code. Try again.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) setCodeLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [companyId, accountType]);

  const trimmedName = name.trim();
  const duplicateName = useMemo(
    () => accounts.some((a) => a.name.toLowerCase() === trimmedName.toLowerCase()),
    [accounts, trimmedName],
  );

  async function submit() {
    if (!code || !trimmedName) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await api.post<{ data: Account }>('/accounts', {
        companyId,
        code,
        name: trimmedName,
        type: accountType,
        parentId: parentId || null,
      });
      toast.success(`Account created: ${result.data.code} ${result.data.name}`);
      onCreated(result.data);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Could not save the account.';
      setError(message);
      toast.error(`Failed to save: ${message}`);
    } finally {
      setSubmitting(false);
    }
  }

  const parentOptions = accounts.filter((a) => a.type === accountType);

  return (
    <div className="flex flex-col gap-3 p-3">
      <FormField label="Code" htmlFor="new-acct-code" hint="Auto-generated. Fixed once created.">
        <div className={`${inputClass()} flex items-center gap-2 bg-ledger-50 text-ledger-700`}>
          {codeLoading ? (
            <>
              <Loader2 size={14} className="animate-spin" aria-hidden />
              Generating…
            </>
          ) : (
            (code ?? '—')
          )}
        </div>
      </FormField>

      <FormField
        label="Name"
        htmlFor="new-acct-name"
        required
        error={duplicateName ? 'This account already exists. Select it instead.' : undefined}
      >
        <input
          id="new-acct-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          placeholder="e.g. Online Sales"
          className={`${inputClass(duplicateName)} text-base`}
        />
      </FormField>

      {parentOptions.length > 0 && (
        <FormField label="Parent account" htmlFor="new-acct-parent" hint="Optional">
          <select
            id="new-acct-parent"
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
      )}

      {(error || codeError) && (
        <p role="alert" className="m-0 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          {error || codeError}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="cursor-pointer rounded-lg border border-ledger-200 bg-white px-3 py-2 text-sm font-semibold text-ledger-700 hover:bg-ledger-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={!code || !trimmedName || duplicateName || submitting}
          className="flex cursor-pointer items-center gap-1.5 rounded-lg border-none bg-peso-600 px-4 py-2 text-sm font-bold text-white hover:bg-peso-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting && <Loader2 size={14} className="animate-spin" aria-hidden />}
          Create
        </button>
      </div>
    </div>
  );
}
