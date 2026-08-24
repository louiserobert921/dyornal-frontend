import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { Card } from '@/components/Card';
import { SaveFilterModal } from '@/components/Tax/SaveFilterModal';
import { useTaxFilter } from '@/contexts/TaxFilterContext';
import { useApi } from '@/hooks/useApi';
import { formatAmount } from '@/lib/money';
import type { Company } from '@/types';

interface QuarterTransaction {
  id: string;
  date: string;
  kind: 'sales' | 'expenses';
  description: string;
  amount: string;
}

type SortKey = 'date' | 'description' | 'amount';
type SortDir = 'asc' | 'desc';

/** Debounce delay for auto-recalculating tax after a checkbox toggle — long
 * enough that a quick run of clicks (e.g. Select All) coalesces into one
 * request, short enough to still feel close to real-time. */
const RECALC_DEBOUNCE_MS = 500;

export function TransactionsTab({
  company,
  taxYear,
  quarter,
}: {
  company: Company;
  taxYear: number;
  quarter: 1 | 2 | 3 | 4;
}) {
  const { selection, result, applySelection, applying } = useTaxFilter();
  const list = useApi<{ data: QuarterTransaction[] }>(
    `/tax/analysis/quarterly/transactions?companyId=${company.id}&taxYear=${taxYear}&quarter=${quarter}&kind=all`,
  );

  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'sales' | 'expenses'>('all');
  const [selected, setSelected] = useState<Set<string> | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const rows = list.data?.data ?? [];

  // Initialize selection: everything selected by default, or restore from an
  // already-active filter for this exact quarter (e.g. after loading a saved
  // scenario, or navigating back to this tab).
  useEffect(() => {
    if (rows.length === 0) return;
    if (selection && selection.taxYear === taxYear && selection.quarter === quarter) {
      setSelected(new Set(selection.selectedTransactionIds));
    } else {
      setSelected(new Set(rows.map((r) => r.id)));
    }
    // Only re-derive when the transaction list itself changes — once the
    // user starts checking/unchecking boxes, `selected` is locally owned.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows.map((r) => r.id).join(',')]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (typeFilter !== 'all' && r.kind !== typeFilter) return false;
      const amount = Number(r.amount);
      if (minAmount.trim() && amount < Number(minAmount)) return false;
      if (maxAmount.trim() && amount > Number(maxAmount)) return false;
      return true;
    });
  }, [rows, typeFilter, minAmount, maxAmount]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      let cmp: number;
      if (sortKey === 'amount') cmp = Number(a.amount) - Number(b.amount);
      else if (sortKey === 'date') cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
      else cmp = a.description.localeCompare(b.description);
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [filtered, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  function scheduleRecalc(nextSelected: Set<string>) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void applySelection({
        companyId: company.id,
        taxYear,
        quarter,
        selectedTransactionIds: [...nextSelected],
      });
    }, RECALC_DEBOUNCE_MS);
  }

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev ?? []);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      scheduleRecalc(next);
      return next;
    });
  }

  function selectAll() {
    const next = new Set(rows.map((r) => r.id));
    setSelected(next);
    scheduleRecalc(next);
  }

  function deselectAll() {
    const next = new Set<string>();
    setSelected(next);
    scheduleRecalc(next);
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const SortIcon = sortDir === 'asc' ? ArrowUp : ArrowDown;
  const selectedCount = selected?.size ?? rows.length;
  const deselectedCount = rows.length - selectedCount;
  const taxDue = result?.recalculatedTax
    ? 'totalTaxDue' in result.recalculatedTax
      ? result.recalculatedTax.totalTaxDue
      : result.recalculatedTax.taxDue
    : null;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <p className="m-0 text-xs font-semibold tracking-wide text-ledger-500 uppercase">
          Transactions — Q{quarter} {taxYear}
        </p>

        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-ledger-500 uppercase" htmlFor="min-amount">
              Amount Min
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
              Amount Max
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
          <div>
            <label className="mb-1 block text-xs font-semibold text-ledger-500 uppercase" htmlFor="type-filter">
              Transaction Type
            </label>
            <select
              id="type-filter"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as 'all' | 'sales' | 'expenses')}
              className="rounded-lg border border-ledger-200 px-2 py-1.5 text-sm"
            >
              <option value="all">All</option>
              <option value="sales">Sales</option>
              <option value="expenses">Expenses</option>
            </select>
          </div>
          <button
            type="button"
            onClick={selectAll}
            className="cursor-pointer rounded-lg border border-ledger-200 bg-white px-3 py-1.5 text-sm font-semibold text-ledger-700 hover:bg-ledger-50"
          >
            Select All
          </button>
          <button
            type="button"
            onClick={deselectAll}
            className="cursor-pointer rounded-lg border border-ledger-200 bg-white px-3 py-1.5 text-sm font-semibold text-ledger-700 hover:bg-ledger-50"
          >
            Deselect All
          </button>
        </div>
      </Card>

      <Card>
        {list.loading && <p className="m-0 text-sm text-ledger-500">Loading…</p>}
        {!list.loading && rows.length === 0 && (
          <p className="m-0 text-sm text-ledger-500">No transactions this quarter.</p>
        )}
        {rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-sm">
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
                  <th className="py-2 text-center font-semibold">Select</th>
                  <th className="py-2 pl-2 text-right font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((t) => {
                  const isSelected = selected?.has(t.id) ?? true;
                  return (
                    <tr key={t.id} className="border-b border-ledger-100">
                      <td className="py-2 pr-2 text-ledger-700">
                        {new Date(t.date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="py-2 pr-2 text-ledger-700">{t.description}</td>
                      <td className="tabular py-2 pr-2 text-right font-semibold text-ledger-900">
                        {formatAmount(t.amount)}
                      </td>
                      <td className="py-2 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelected(t.id)}
                          aria-label={`Select ${t.description}`}
                        />
                      </td>
                      <td className="py-2 pl-2 text-right">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                            isSelected ? 'bg-peso-50 text-peso-700' : 'bg-ledger-100 text-ledger-500'
                          }`}
                        >
                          {isSelected ? 'Included' : 'Excluded'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {rows.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-ledger-200 pt-4">
            <div className="text-sm text-ledger-700">
              <p className="m-0">
                Deselected: {deselectedCount} / Total: {rows.length}
                {applying && <span className="ml-2 text-xs text-ledger-400">Recalculating…</span>}
              </p>
              {taxDue !== null && (
                <p className="m-0 mt-1 text-base font-bold text-ledger-900">
                  Current Tax Due: {formatAmount(taxDue)}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowSaveModal(true)}
                disabled={!result}
                className="cursor-pointer rounded-lg border-none bg-peso-600 px-4 py-2 text-sm font-bold text-white hover:bg-peso-700 disabled:opacity-50"
              >
                Save This Selection as Filter
              </button>
              <button
                type="button"
                onClick={selectAll}
                className="cursor-pointer rounded-lg border border-ledger-200 bg-white px-4 py-2 text-sm font-semibold text-ledger-700 hover:bg-ledger-50"
              >
                Reset All
              </button>
            </div>
          </div>
        )}
      </Card>

      {showSaveModal && (
        <SaveFilterModal onClose={() => setShowSaveModal(false)} onSaved={() => {}} />
      )}
    </div>
  );
}
