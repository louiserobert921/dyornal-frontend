import { useState } from 'react';
import { Card } from '@/components/Card';
import { TaxBreakdown } from '@/components/Tax/TaxBreakdown';
import { TaxWaterfallChart } from '@/components/Tax/TaxWaterfallChart';
import { SavedFiltersPanel } from '@/components/Tax/SavedFiltersPanel';
import { useTaxFilter } from '@/contexts/TaxFilterContext';
import { useApi } from '@/hooks/useApi';
import { formatAmount } from '@/lib/money';
import type { Company, MixedIncomeTaxResult, QuarterlyTaxAnalysisAll, TaxResult } from '@/types';

const METHOD_LABEL: Record<string, string> = {
  OSD_40: 'Optional Standard Deduction (40%)',
  ITEMIZED: 'Itemized Deductions',
  FLAT_8: '8% Flat Tax Rate',
};

/** "totalTaxDue" narrows a mixed-income result from a plain TaxResult. */
function isMixedIncomeResult(
  result: TaxResult | MixedIncomeTaxResult,
): result is MixedIncomeTaxResult {
  return 'totalTaxDue' in result;
}

export function TaxDueTab({
  company,
  taxYear,
  quarter,
  onQuarterChange,
  onViewTransactions,
}: {
  company: Company;
  taxYear: number;
  quarter: 1 | 2 | 3 | 4;
  onQuarterChange: (quarter: 1 | 2 | 3 | 4) => void;
  onViewTransactions: () => void;
}) {
  const [showScenarios, setShowScenarios] = useState(false);
  const { active: filterActive, selection, result: filterResult } = useTaxFilter();

  const analysis = useApi<{ data: QuarterlyTaxAnalysisAll }>(
    `/tax/analysis/quarterly/all?companyId=${company.id}&taxYear=${taxYear}`,
  );

  const filterAppliesHere =
    filterActive && selection?.quarter === quarter && selection.taxYear === taxYear;

  if (analysis.loading) {
    return (
      <Card>
        <div className="h-40 animate-pulse rounded bg-ledger-100" />
      </Card>
    );
  }

  if (analysis.error) {
    return (
      <Card>
        <p className="m-0 text-sm text-ledger-500">
          No tax setup found for this company yet — set up your tax profile to see quarterly tax due.
        </p>
      </Card>
    );
  }

  const data = analysis.data?.data;
  if (!data) return null;

  const current = data.quarters.find((q) => q.quarter === quarter);
  if (!current) return null;

  const effectiveResult = filterAppliesHere && filterResult ? filterResult.recalculatedTax : current.result;
  const effectiveGrossSales = filterAppliesHere && filterResult ? filterResult.grossSales : current.grossSales;

  const taxDue = isMixedIncomeResult(effectiveResult) ? effectiveResult.totalTaxDue : effectiveResult.taxDue;
  const waterfall = isMixedIncomeResult(effectiveResult)
    ? effectiveResult.business.waterfall
    : effectiveResult.waterfall;
  const breakdown = isMixedIncomeResult(effectiveResult)
    ? effectiveResult.business.breakdown
    : effectiveResult.breakdown;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="m-0 text-xs font-semibold tracking-wide text-ledger-500 uppercase">
            Your Tax Payable — Q{quarter} {taxYear}
          </p>
          <select
            value={quarter}
            onChange={(e) => onQuarterChange(Number(e.target.value) as 1 | 2 | 3 | 4)}
            className="rounded-lg border border-ledger-200 px-2 py-1 text-sm font-medium text-ledger-900"
          >
            {data.quarters.map((q) => (
              <option key={q.quarter} value={q.quarter}>
                Q{q.quarter} {taxYear}
              </option>
            ))}
          </select>
        </div>

        <p className="tabular m-0 mt-3 text-center text-4xl font-bold text-ledger-900">
          {formatAmount(taxDue)}
        </p>
        <p className="m-0 mt-1 text-center text-sm text-ledger-500">
          {METHOD_LABEL[data.deductionMethod] ?? data.deductionMethod}
        </p>
        <p className="m-0 mt-1 text-center text-xs text-ledger-400">
          Based on {formatAmount(effectiveGrossSales)} in posted sales this quarter
          {filterAppliesHere ? ' (filtered)' : ''}
        </p>
        <p className="m-0 mt-2 text-center text-xs text-ledger-400">
          Click the "Transactions" tab to view and filter individual transactions.
        </p>

        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={onViewTransactions}
            className="cursor-pointer rounded-lg border-none bg-peso-600 px-3 py-1.5 text-sm font-bold text-white hover:bg-peso-700"
          >
            View Transactions
          </button>
          <button
            type="button"
            onClick={() => setShowScenarios(true)}
            className="cursor-pointer rounded-lg border border-ledger-200 bg-white px-3 py-1.5 text-sm font-semibold text-ledger-700 hover:bg-ledger-50"
          >
            View Saved Scenarios
          </button>
        </div>
      </Card>

      <Card>
        <div className="rounded-lg bg-ledger-50 p-4">
          <TaxWaterfallChart steps={waterfall} method={METHOD_LABEL[data.deductionMethod] ?? data.deductionMethod} />
        </div>
        <div className="mt-4">
          <TaxBreakdown breakdown={breakdown} />
        </div>
      </Card>

      {showScenarios && (
        <SavedFiltersPanel companyId={company.id} onClose={() => setShowScenarios(false)} />
      )}
    </div>
  );
}
