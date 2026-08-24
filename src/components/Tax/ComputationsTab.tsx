import { Card } from '@/components/Card';
import { TaxBreakdown } from '@/components/Tax/TaxBreakdown';
import { TaxWaterfallChart } from '@/components/Tax/TaxWaterfallChart';
import { useTaxFilter } from '@/contexts/TaxFilterContext';
import { useApi } from '@/hooks/useApi';
import { formatAmount } from '@/lib/money';
import type { Company, MixedIncomeTaxResult, QuarterlyTaxAnalysisAll, TaxResult } from '@/types';

const METHOD_LABEL: Record<string, string> = {
  OSD_40: 'Optional Standard Deduction (40%)',
  ITEMIZED: 'Itemized Deductions',
  FLAT_8: '8% Flat Tax Rate',
};

function isMixedIncomeResult(
  result: TaxResult | MixedIncomeTaxResult,
): result is MixedIncomeTaxResult {
  return 'totalTaxDue' in result;
}

/** Same underlying figures as Tab 1 — this just walks through them step by
 * step instead of leading with the headline number. */
export function ComputationsTab({
  company,
  taxYear,
  quarter,
}: {
  company: Company;
  taxYear: number;
  quarter: 1 | 2 | 3 | 4;
}) {
  const { active: filterActive, criteria: filterCriteria, result: filterResult } = useTaxFilter();
  const analysis = useApi<{ data: QuarterlyTaxAnalysisAll }>(
    `/tax/analysis/quarterly/all?companyId=${company.id}&taxYear=${taxYear}`,
  );

  const filterAppliesHere =
    filterActive && filterCriteria?.quarter === quarter && filterCriteria.taxYear === taxYear;

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
          No tax setup found for this company yet — set up your tax profile to see the computation.
        </p>
      </Card>
    );
  }

  const data = analysis.data?.data;
  if (!data) return null;

  const current = data.quarters.find((q) => q.quarter === quarter);
  if (!current) return null;

  const effectiveResult = filterAppliesHere && filterResult ? filterResult.recalculatedTax : current.result;

  const taxDue = isMixedIncomeResult(effectiveResult) ? effectiveResult.totalTaxDue : effectiveResult.taxDue;
  const waterfall = isMixedIncomeResult(effectiveResult)
    ? effectiveResult.business.waterfall
    : effectiveResult.waterfall;
  const breakdown = isMixedIncomeResult(effectiveResult)
    ? effectiveResult.business.breakdown
    : effectiveResult.breakdown;
  const methodLabel = METHOD_LABEL[data.deductionMethod] ?? data.deductionMethod;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <p className="m-0 text-xs font-semibold tracking-wide text-ledger-500 uppercase">
          Breakdown of {formatAmount(taxDue)} Tax Due — Q{quarter} {taxYear}
        </p>
        <p className="m-0 mt-1 text-sm text-ledger-500">
          {methodLabel}
          {filterAppliesHere ? ' — using the active what-if filter' : ''}
        </p>
      </Card>

      <Card>
        <div className="rounded-lg bg-ledger-50 p-4">
          <TaxWaterfallChart steps={waterfall} method={methodLabel} />
        </div>
      </Card>

      <Card>
        <TaxBreakdown breakdown={breakdown} />
      </Card>

      {isMixedIncomeResult(effectiveResult) && (
        <Card>
          <p className="m-0 mb-3 text-xs font-semibold tracking-wide text-ledger-500 uppercase">
            Compensation Income (Separate)
          </p>
          <div className="rounded-lg bg-ledger-50 p-4">
            <TaxWaterfallChart steps={effectiveResult.salaryWaterfall} method="Compensation Income" />
          </div>
          <div className="mt-4">
            <TaxBreakdown breakdown={effectiveResult.salaryBreakdown} />
          </div>
        </Card>
      )}
    </div>
  );
}
