import { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import { useEscapeToClose } from '@/hooks/useEscapeToClose';
import { Card, PageHeading } from '@/components/Card';
import { Pagination } from '@/components/Pagination';
import { useApi } from '@/hooks/useApi';
import type { PageMeta } from '@/hooks/usePagination';
import { formatAmount } from '@/lib/money';
import type { Company, Contact, ContactHistoryEntry, ListResponse } from '@/types';

type Kind = 'CUSTOMER' | 'SUPPLIER';
const PER_PAGE = 25;

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-PH', { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * Customers and suppliers, read from the names typed on past transactions.
 * There is no Contact table yet — see backend/src/routes/contacts.ts — so this
 * is a view over transaction history, not an editable roster. That is why
 * there is no add/edit/delete here: a "contact" only exists because it was
 * used on a sale or purchase.
 */
export function ContactsPage() {
  const [kind, setKind] = useState<Kind>('CUSTOMER');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);

  const companies = useApi<ListResponse<Company>>('/companies');
  const company = companies.data?.data[0] ?? null;

  // Debounce the search box so every keystroke doesn't refetch.
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(0);
  }, [kind, debouncedSearch]);

  const list = useApi<{ data: Contact[]; meta: PageMeta }>(
    company
      ? `/contacts?companyId=${company.id}&kind=${kind}&limit=${PER_PAGE}&offset=${page * PER_PAGE}${
          debouncedSearch.trim() ? `&search=${encodeURIComponent(debouncedSearch.trim())}` : ''
        }`
      : null,
  );

  const filtered = list.data?.data ?? [];

  if (companies.loading) {
    return (
      <div>
        <PageHeading title="Contacts" />
        <SkeletonCards />
      </div>
    );
  }

  if (!company) {
    return (
      <div>
        <PageHeading title="Contacts">No company yet.</PageHeading>
      </div>
    );
  }

  return (
    <div>
      <PageHeading title="Contacts">Customers and suppliers from your recorded transactions.</PageHeading>

      <div className="mb-3 inline-flex rounded-lg border border-ledger-200 bg-white p-0.5">
        {(['CUSTOMER', 'SUPPLIER'] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            aria-pressed={kind === k}
            className={`cursor-pointer rounded-md border-none px-3 py-1.5 text-sm font-semibold ${
              kind === k ? 'bg-peso-600 text-white' : 'bg-transparent text-ledger-500'
            }`}
          >
            {k === 'CUSTOMER' ? 'Customers' : 'Suppliers'}
          </button>
        ))}
      </div>

      <label className="mb-3 flex max-w-sm flex-col gap-1">
        <span className="sr-only">Search</span>
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
            placeholder={`Search ${kind === 'CUSTOMER' ? 'customers' : 'suppliers'}`}
            className="w-full rounded-lg border border-ledger-200 bg-white py-2 pr-3 pl-8 text-base outline-none focus:border-peso-500 focus:ring-2 focus:ring-peso-100 sm:text-sm"
          />
        </span>
      </label>

      {list.loading ? (
        <SkeletonCards />
      ) : filtered.length === 0 ? (
        <Card>
          <p className="m-0 text-center text-sm text-ledger-500">
            {debouncedSearch.trim()
              ? 'No contacts match this search.'
              : 'Record a transaction with a new contact to see them here.'}
          </p>
        </Card>
      ) : (
        <>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <button
              key={c.name}
              type="button"
              onClick={() => setSelected(c.name)}
              className="cursor-pointer rounded-xl border border-ledger-200 bg-white p-4 text-left hover:border-peso-500 hover:bg-peso-50"
            >
              <div className="font-semibold text-ledger-900">{c.name}</div>
              <div className="mt-0.5 text-xs text-ledger-500">
                {c.transactionCount} {c.transactionCount === 1 ? 'transaction' : 'transactions'} ·
                last {shortDate(c.lastTransactionDate)}
              </div>
              <div className="tabular mt-2 text-lg font-bold text-ledger-900">
                {formatAmount(c.outstanding)}
              </div>
              <div className="mt-1 text-[10px] text-ledger-500">
                {kind === 'CUSTOMER' ? 'Outstanding receivable' : 'Outstanding payable'}
              </div>
              {Number(c.outstanding) > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {(['current', 'd30', 'd60', 'd90'] as const)
                    .filter((b) => Number(c.aging[b]) > 0)
                    .map((b) => (
                      <span
                        key={b}
                        className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                          b === 'd60' || b === 'd90'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-ledger-100 text-ledger-600'
                        }`}
                      >
                        {b === 'current' ? 'Current' : b === 'd30' ? '31–60d' : b === 'd60' ? '61–90d' : '90d+'}{' '}
                        {formatAmount(c.aging[b])}
                      </span>
                    ))}
                </div>
              )}
            </button>
          ))}
        </div>
        <Pagination meta={list.data?.meta} page={page} onPageChange={setPage} />
        </>
      )}

      {selected && company && (
        <ContactHistoryModal
          companyId={company.id}
          kind={kind}
          name={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function ContactHistoryModal({
  companyId,
  kind,
  name,
  onClose,
}: {
  companyId: string;
  kind: Kind;
  name: string;
  onClose: () => void;
}) {
  const history = useApi<{ data: ContactHistoryEntry[] }>(
    `/contacts/history?companyId=${companyId}&kind=${kind}&name=${encodeURIComponent(name)}`,
  );

  useEscapeToClose(onClose);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-5 shadow-xl"
      >
        <div className="mb-3 flex items-start justify-between">
          <h2 className="m-0 text-base font-bold text-ledger-900">{name}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="cursor-pointer rounded border-none bg-transparent p-1 text-ledger-500 hover:bg-ledger-100"
          >
            <X size={16} aria-hidden />
          </button>
        </div>

        {history.loading ? (
          <div className="h-40 animate-pulse rounded bg-ledger-100" />
        ) : (
          <div className="flex flex-col divide-y divide-ledger-100">
            {(history.data?.data ?? []).map((t) => (
              <div key={t.id} className="py-2.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-semibold text-ledger-900">{shortDate(t.date)}</span>
                  <span className="tabular text-sm font-bold text-ledger-900">
                    {formatAmount(t.totalAmount)}
                  </span>
                </div>
                <div className="text-xs text-ledger-500">
                  {t.type} {t.invoiceNumber && `· ${t.invoiceNumber}`}
                  {t.journalEntries[0] && ` · ${t.journalEntries[0].entryNumber}`}
                </div>
                {t.description && <div className="mt-0.5 text-xs text-ledger-500">{t.description}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SkeletonCards() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="h-28 animate-pulse rounded-xl bg-ledger-100" />
      ))}
    </div>
  );
}
