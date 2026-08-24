import { Filter, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTaxFilter } from '@/contexts/TaxFilterContext';
import { formatAmount } from '@/lib/money';

const KIND_LABEL: Record<string, string> = {
  sales: 'Sales',
  expenses: 'Expenses',
  all: 'Transactions',
};

/** Persistent, visible everywhere while a Tax Analysis what-if filter is
 * active — GL, financial statements, and reports all reflect the filtered
 * subset until this is dismissed with Reset. */
export function TaxFilterBanner() {
  const { active, criteria, result, activeSavedFilterName, reset } = useTaxFilter();
  if (!active || !criteria || !result) return null;

  const rangeLabel = [
    criteria.minAmount !== undefined ? `≥ ₱${criteria.minAmount.toLocaleString('en-PH')}` : null,
    criteria.maxAmount !== undefined ? `≤ ₱${criteria.maxAmount.toLocaleString('en-PH')}` : null,
  ]
    .filter(Boolean)
    .join(' and ');

  const taxDue = 'totalTaxDue' in result.recalculatedTax
    ? result.recalculatedTax.totalTaxDue
    : result.recalculatedTax.taxDue;

  return (
    <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-record-300 bg-record-50 px-4 py-3">
      <div className="flex items-center gap-2.5">
        <Filter size={16} className="shrink-0 text-record-600" aria-hidden />
        <p className="m-0 text-sm font-semibold text-record-700">
          {activeSavedFilterName ? (
            <>Filter Active: "{activeSavedFilterName}"</>
          ) : (
            <>
              Filter Applied — Q{criteria.quarter} {criteria.taxYear} {KIND_LABEL[criteria.transactionType]}
              {rangeLabel ? ` ${rangeLabel}` : ''}
            </>
          )}
          <span className="ml-1.5 font-normal text-record-700/80">
            ({result.includedCount} of {result.totalCount} included) · Tax: {formatAmount(taxDue)}
          </span>
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Link
          to="/tax/analysis"
          className="rounded-lg border border-record-300 bg-white px-3 py-1.5 text-xs font-bold text-record-700 no-underline hover:bg-record-50"
        >
          View All Scenarios
        </Link>
        <button
          type="button"
          onClick={reset}
          className="flex cursor-pointer items-center gap-1 rounded-lg border-none bg-record-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-record-700"
        >
          <X size={13} aria-hidden />
          Reset Filter
        </button>
      </div>
    </div>
  );
}
