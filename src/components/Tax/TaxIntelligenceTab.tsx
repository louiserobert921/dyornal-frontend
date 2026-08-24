import { useState } from 'react';
import { ChevronDown, TrendingUp } from 'lucide-react';
import { Card } from '@/components/Card';
import { TaxBreakdown } from '@/components/Tax/TaxBreakdown';
import { TaxWaterfallChart } from '@/components/Tax/TaxWaterfallChart';
import { useApi } from '@/hooks/useApi';
import { formatAmount } from '@/lib/money';
import type { Company, QuarterlyTaxProjection } from '@/types';

const METHOD_SHORT_LABEL: Record<string, string> = {
  OSD_40: 'OSD 40%',
  ITEMIZED: 'Itemized Deductions',
  FLAT_8: 'Flat 8%',
};

export function TaxIntelligenceTab({
  company,
  taxYear,
  quarter,
}: {
  company: Company;
  taxYear: number;
  quarter: 1 | 2 | 3 | 4;
}) {
  const projection = useApi<{ data: QuarterlyTaxProjection }>(
    `/tax/analysis/quarterly/projection?companyId=${company.id}&taxYear=${taxYear}&quarter=${quarter}`,
  );
  const [showIncorporation, setShowIncorporation] = useState(false);

  if (projection.loading) {
    return (
      <Card>
        <div className="h-40 animate-pulse rounded bg-ledger-100" />
      </Card>
    );
  }

  if (projection.error) {
    return (
      <Card>
        <p className="m-0 text-sm text-ledger-500">
          No tax setup found for this company yet — set up your tax profile to see projections.
        </p>
      </Card>
    );
  }

  const data = projection.data?.data;
  if (!data) return null;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <p className="m-0 text-xs font-semibold tracking-wide text-ledger-500 uppercase">
          Tax Deduction Options
        </p>
        <p className="m-0 mt-1 text-sm text-ledger-500">
          Estimated annual impact, projected from Q{quarter} {taxYear}'s actual sales of{' '}
          {formatAmount(data.quarterGrossSales)} (× 4 = {formatAmount(data.projectedAnnualGrossSales)})
        </p>
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {data.allOptions.map((opt) => {
          const isBest = opt.method === data.recommendation;
          return (
            <Card key={opt.method} className={isBest ? 'border-peso-300 bg-peso-50' : undefined}>
              <p className="m-0 text-xs font-semibold text-ledger-500 uppercase">
                {METHOD_SHORT_LABEL[opt.method]}
              </p>
              <p className="tabular m-0 mt-2 text-2xl font-bold text-ledger-900">
                {formatAmount(opt.taxDue)}
              </p>
              <p className="m-0 mt-1 text-xs text-ledger-500">Estimated Tax</p>
              {isBest && (
                <span className="mt-2 inline-flex items-center gap-1 rounded bg-peso-600 px-1.5 py-0.5 text-[10px] font-bold text-white uppercase">
                  ✓ Best Option
                </span>
              )}
              {!isBest && Number(opt.savingsVsCurrent) < 0 && (
                <p className="m-0 mt-2 text-xs font-semibold text-red-600">
                  {formatAmount(String(Math.abs(Number(opt.savingsVsCurrent))))} more than your current method
                </p>
              )}
            </Card>
          );
        })}
      </div>

      {data.incorporationAnalysis && (
        <Card>
          <button
            type="button"
            onClick={() => setShowIncorporation((v) => !v)}
            aria-expanded={showIncorporation}
            className="flex w-full cursor-pointer items-center justify-between border-none bg-transparent p-0 text-left"
          >
            <span className="flex items-center gap-2">
              <TrendingUp size={16} className="text-ledger-500" aria-hidden />
              <span>
                <span className="block text-sm font-bold text-ledger-900">Should I Incorporate?</span>
                <span className="block text-xs text-ledger-500">
                  Projected {data.incorporationAnalysis.shouldIncorporate ? 'savings' : 'cost'}:{' '}
                  {formatAmount(data.incorporationAnalysis.savingsIfIncorporated.replace('-', ''))}
                </span>
              </span>
            </span>
            <ChevronDown
              size={18}
              className={`text-ledger-500 transition-transform ${showIncorporation ? 'rotate-180' : ''}`}
              aria-hidden
            />
          </button>

          {showIncorporation && (
            <div className="mt-4 flex flex-col gap-3">
              <p className="m-0 text-sm font-semibold text-ledger-900">
                {data.incorporationAnalysis.shouldIncorporate ? '✓ Worth It' : '✗ Not Yet'}
              </p>
              <p className="m-0 text-sm text-ledger-700">{data.incorporationAnalysis.summary}</p>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-lg bg-ledger-50 p-3">
                  <p className="m-0 mb-2 text-sm font-semibold text-ledger-900">
                    Current (Sole Proprietor)
                  </p>
                  <TaxWaterfallChart
                    steps={data.incorporationAnalysis.currentSetupWaterfall}
                    method="Sole Proprietor"
                  />
                </div>
                <div className="rounded-lg bg-peso-50 p-3">
                  <p className="m-0 mb-2 text-sm font-semibold text-peso-700">If Incorporated</p>
                  <TaxWaterfallChart
                    steps={data.incorporationAnalysis.ifIncorporatedWaterfall}
                    method="Corporation"
                  />
                </div>
              </div>

              <TaxBreakdown breakdown={data.incorporationAnalysis.ifIncorporatedBreakdown} />

              <p className="m-0 border-t border-ledger-200 pt-3 text-sm font-semibold text-ledger-900">
                {data.incorporationAnalysis.recommendation}
              </p>
            </div>
          )}
        </Card>
      )}

      <Card>
        <p className="m-0 text-xs text-ledger-400">
          Projections annualize this quarter's actual sales (× 4) and are estimates, not filings —
          they don't account for seasonal variation across quarters.
        </p>
      </Card>
    </div>
  );
}
