import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import { FormField, inputClass } from '@/components/FormField';
import { useEscapeToClose } from '@/hooks/useEscapeToClose';
import { api } from '@/lib/api';
import { formatAmount } from '@/lib/money';
import type { KindOption, ListResponse, OpenTransaction } from '@/types';

const PAGE_SIZE = 10;

const POOL_LABEL: Record<'CUSTOMER' | 'SUPPLIER' | 'LOAN', string> = {
  CUSTOMER: 'Invoice',
  SUPPLIER: 'Bill',
  LOAN: 'Loan',
};

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-PH', { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * The picker for step 2 of the record form when a kind must settle a specific
 * open transaction: a payment against a customer invoice, a payment against a
 * supplier bill, or a payment or interest charge against a loan.
 *
 * Rendered only when `kind.appliedToPool` is non-null. Unlike AccountPicker,
 * there is no "create new" option here — a payment can only ever apply
 * against something that was recorded first, never invent its own target.
 */
export function InvoicePicker({
  companyId,
  kind,
  value,
  onChange,
  error,
}: {
  companyId: string;
  kind: KindOption;
  value: OpenTransaction | null;
  onChange: (transaction: OpenTransaction) => void;
  error?: string;
}) {
  const pool = kind.appliedToPool;
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<OpenTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounce so search-as-you-type doesn't refetch on every keystroke.
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (!pool) return;
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams({ companyId, kind: pool, limit: String(PAGE_SIZE), offset: '0' });
    if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
    api
      .get<ListResponse<OpenTransaction> & { meta: { total: number } }>(`/transactions/open?${params}`)
      .then((r) => {
        if (cancelled) return;
        setItems(r.data);
        setTotal(r.meta.total);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [companyId, pool, debouncedSearch]);

  function loadMore() {
    if (!pool || loadingMore) return;
    setLoadingMore(true);
    const params = new URLSearchParams({
      companyId,
      kind: pool,
      limit: String(PAGE_SIZE),
      offset: String(items.length),
    });
    if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
    api
      .get<ListResponse<OpenTransaction> & { meta: { total: number } }>(`/transactions/open?${params}`)
      .then((r) => {
        setItems((prev) => [...prev, ...r.data]);
        setTotal(r.meta.total);
      })
      .finally(() => setLoadingMore(false));
  }

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

  if (!pool) return null;
  const label = POOL_LABEL[pool];

  return (
    <FormField
      label={`Select ${label}`}
      htmlFor="applied-to"
      required
      error={error}
      hint={!error ? `Only ${label.toLowerCase()}s with a remaining balance are shown.` : undefined}
    >
      <div ref={containerRef} className="relative">
        <button
          type="button"
          id="applied-to"
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="listbox"
          aria-expanded={open}
          className={`${inputClass(!!error)} flex items-center justify-between gap-2 text-left`}
        >
          {value ? (
            <span className="flex min-w-0 items-center gap-2 truncate">
              <span className="truncate text-ledger-900">
                {value.invoiceNumber ? `#${value.invoiceNumber}` : value.counterpartyName || label}
              </span>
              <span className="tabular shrink-0 text-xs text-ledger-500">
                {formatAmount(value.outstanding)} due
              </span>
            </span>
          ) : (
            <span className="text-ledger-500">
              {loading ? 'Loading…' : `Choose a${label === 'Invoice' ? 'n' : ''} ${label.toLowerCase()}…`}
            </span>
          )}
          <ChevronDown size={16} className="shrink-0 text-ledger-500" aria-hidden />
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-40 bg-black/40 sm:hidden" onClick={() => setOpen(false)} />
            <div className="fixed inset-x-0 bottom-0 z-50 max-h-[80vh] overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:absolute sm:inset-x-0 sm:bottom-auto sm:top-full sm:z-20 sm:mt-1 sm:max-h-80 sm:rounded-lg sm:border sm:border-ledger-200 sm:shadow-lg">
              <div className="flex items-center justify-between border-b border-ledger-100 p-3 sm:hidden">
                <span className="text-sm font-bold text-ledger-900">Select {label}</span>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  className="cursor-pointer rounded border-none bg-transparent p-1 text-ledger-500 hover:bg-ledger-100"
                >
                  <X size={18} aria-hidden />
                </button>
              </div>

              <div className="border-b border-ledger-100 p-2">
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
                    placeholder={`Search ${label.toLowerCase()}s…`}
                    className="w-full rounded-lg border border-ledger-200 bg-white py-1.5 pr-3 pl-8 text-sm outline-none focus:border-peso-500"
                  />
                </span>
              </div>

              <div className="max-h-[60vh] overflow-y-auto sm:max-h-72">
                {loading ? (
                  <p className="p-3 text-sm text-ledger-500">Loading…</p>
                ) : items.length === 0 ? (
                  <p className="p-3 text-sm text-ledger-500">
                    {search.trim()
                      ? `No ${label.toLowerCase()}s match "${search.trim()}".`
                      : `No ${label.toLowerCase()}s with a balance due yet.`}
                  </p>
                ) : (
                  <ul role="listbox" className="divide-y divide-ledger-50 py-1">
                    {items.map((t) => (
                      <li key={t.id}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={value?.id === t.id}
                          onClick={() => {
                            onChange(t);
                            setOpen(false);
                          }}
                          className={`flex w-full items-center justify-between gap-2 border-none bg-transparent px-3 py-2.5 text-left text-sm hover:bg-ledger-50 ${
                            value?.id === t.id ? 'bg-peso-50' : ''
                          }`}
                        >
                          <span className="flex min-w-0 flex-col">
                            <span className="truncate font-medium text-ledger-900">
                              {t.invoiceNumber ? `#${t.invoiceNumber}` : t.counterpartyName || label}
                              {t.counterpartyName && t.invoiceNumber && (
                                <span className="ml-1.5 font-normal text-ledger-500">
                                  {t.counterpartyName}
                                </span>
                              )}
                            </span>
                            <span className="text-xs text-ledger-500">{shortDate(t.date)}</span>
                          </span>
                          <span className="tabular shrink-0 text-right text-sm font-semibold text-ledger-900">
                            {formatAmount(t.outstanding)}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {!loading && items.length < total && (
                  <button
                    type="button"
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="w-full cursor-pointer border-none bg-transparent py-2.5 text-center text-sm font-semibold text-peso-700 hover:bg-ledger-50 disabled:opacity-50"
                  >
                    {loadingMore ? 'Loading…' : `Load more (${total - items.length} remaining)`}
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </FormField>
  );
}
