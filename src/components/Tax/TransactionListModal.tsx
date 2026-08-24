import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, X } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import { formatAmount } from '@/lib/money';
import { useTaxFilter } from '@/contexts/TaxFilterContext';

interface QuarterTransaction {
  id: string;
  date: string;
  description: string;
  amount: string;
}

type SortKey = 'date' | 'description' | 'amount';
type SortDir = 'asc' | 'desc';

export function TransactionListModal({
  companyId,
  taxYear,
  quarter,
  kind,
  onClose,
}: {
  companyId: string;
  taxYear: number;
  quarter: 1 | 2 | 3 | 4;
  kind: 'sales' | 'expenses';
  onClose: () => void;
}) {
  const { applyFilter, applying } = useTaxFilter();
  const list = useApi<{ data: QuarterTransaction[] }>(
    `/tax/analysis/quarterly/transactions?companyId=${companyId}&taxYear=${taxYear}&quarter=${quarter}&kind=${kind}`,
  );

  const [sortKey, setSortKey] = useState<SortKey>('amount');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const rows = list.data?.data ?? [];

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      let cmp: number;
      if (sortKey === 'amount') cmp = Number(a.amount) - Number(b.amount);
      else if (sortKey === 'date') cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
      else cmp = a.description.localeCompare(b.description);
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [rows, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(rows.map((r) => r.id)));
  }
  function deselectAll() {
    setSelected(new Set());
  }

  async function applyAmountFilter() {
    await applyFilter({
      companyId,
      taxYear,
      quarter,
      transactionType: kind,
      minAmount: minAmount.trim() ? Number(minAmount) : undefined,
      maxAmount: maxAmount.trim() ? Number(maxAmount) : undefined,
    });
    onClose();
  }

  const SortIcon = sortDir === 'asc' ? ArrowUp : ArrowDown;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={kind === 'sales' ? 'Sales transactions' : 'Expense transactions'}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-ledger-200 px-5 py-4">
          <h2 className="m-0 text-base font-bold text-ledger-900">
            {kind === 'sales' ? 'Sales' : 'Expenses'} — Q{quarter} {taxYear}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="cursor-pointer rounded-lg border-none bg-transparent p-1.5 text-ledger-500 hover:bg-ledger-100"
          >
            <X size={18} aria-hidden />
          </button>
        </div>

        <div className="flex flex-wrap items-end gap-3 border-b border-ledger-200 px-5 py-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-ledger-500 uppercase" htmlFor="min-amount">
              Min
            </label>
            <input
              id="min-amount"
              type="number"
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
              className="w-28 rounded-lg border border-ledger-200 px-2 py-1.5 text-sm"
              placeholder="0"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-ledger-500 uppercase" htmlFor="max-amount">
              Max
            </label>
            <input
              id="max-amount"
              type="number"
              value={maxAmount}
              onChange={(e) => setMaxAmount(e.target.value)}
              className="w-28 rounded-lg border border-ledger-200 px-2 py-1.5 text-sm"
              placeholder="99999"
            />
          </div>
          <button
            type="button"
            onClick={() => void applyAmountFilter()}
            disabled={applying || (!minAmount.trim() && !maxAmount.trim())}
            className="cursor-pointer rounded-lg border-none bg-peso-600 px-4 py-1.5 text-sm font-bold text-white hover:bg-peso-700 disabled:opacity-50"
          >
            {applying ? 'Applying…' : 'Apply Filter'}
          </button>
        </div>

        <div className="flex items-center justify-between px-5 py-2 text-xs text-ledger-500">
          <span>
            {selected.size} of {rows.length} transactions selected
          </span>
          <span className="flex gap-3">
            <button type="button" onClick={selectAll} className="cursor-pointer border-none bg-transparent p-0 font-semibold text-peso-700 hover:underline">
              Select All
            </button>
            <button type="button" onClick={deselectAll} className="cursor-pointer border-none bg-transparent p-0 font-semibold text-peso-700 hover:underline">
              Deselect All
            </button>
          </span>
        </div>

        <div className="overflow-y-auto px-5 pb-5">
          {list.loading && <p className="m-0 text-sm text-ledger-500">Loading…</p>}
          {!list.loading && rows.length === 0 && (
            <p className="m-0 text-sm text-ledger-500">No transactions this quarter.</p>
          )}
          {rows.length > 0 && (
            <table className="w-full min-w-[420px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-ledger-200 text-left text-xs text-ledger-500 uppercase">
                  <th className="py-2 pr-2 font-semibold">
                    <button type="button" onClick={() => toggleSort('date')} className="flex cursor-pointer items-center gap-1 border-none bg-transparent p-0 font-semibold text-ledger-500 uppercase hover:text-ledger-900">
                      Date {sortKey === 'date' && <SortIcon size={12} aria-hidden />}
                    </button>
                  </th>
                  <th className="py-2 pr-2 font-semibold">
                    <button type="button" onClick={() => toggleSort('description')} className="flex cursor-pointer items-center gap-1 border-none bg-transparent p-0 font-semibold text-ledger-500 uppercase hover:text-ledger-900">
                      Description {sortKey === 'description' && <SortIcon size={12} aria-hidden />}
                    </button>
                  </th>
                  <th className="py-2 pr-2 text-right font-semibold">
                    <button type="button" onClick={() => toggleSort('amount')} className="ml-auto flex cursor-pointer items-center gap-1 border-none bg-transparent p-0 font-semibold text-ledger-500 uppercase hover:text-ledger-900">
                      Amount {sortKey === 'amount' && <SortIcon size={12} aria-hidden />}
                    </button>
                  </th>
                  <th className="py-2 text-right font-semibold">Select</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((t) => (
                  <tr key={t.id} className="border-b border-ledger-100">
                    <td className="py-2 pr-2 text-ledger-700">
                      {new Date(t.date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="py-2 pr-2 text-ledger-700">{t.description}</td>
                    <td className="tabular py-2 pr-2 text-right font-semibold text-ledger-900">
                      {formatAmount(t.amount)}
                    </td>
                    <td className="py-2 text-right">
                      <input
                        type="checkbox"
                        checked={selected.has(t.id)}
                        onChange={() => toggleSelected(t.id)}
                        aria-label={`Select ${t.description}`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
