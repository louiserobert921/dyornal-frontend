import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronUp, Lightbulb } from 'lucide-react';
import { Card, PageHeading } from '@/components/Card';
import { TaxBreakdown } from '@/components/Tax/TaxBreakdown';
import { TaxWaterfallChart } from '@/components/Tax/TaxWaterfallChart';
import { useApi } from '@/hooks/useApi';
import { formatAmount } from '@/lib/money';
import type { Company, ListResponse, TaxAnalysis, TaxpayerType } from '@/types';

const TAXPAYER_LABEL: Record<TaxpayerType, string> = {
  SOLE_PROP: 'Sole Proprietor',
  CORPORATION: 'Corporation',
  MIXED_INCOME: 'Mixed Income Earner',
};

const METHOD_LABEL: Record<string, string> = {
  OSD_40: 'Optional Standard Deduction (40%)',
  ITEMIZED: 'Itemized Deductions',
  FLAT_8: '8% Flat Tax Rate',
};

const BRACKETS = [
  { range: '₱0 – ₱250,000', rate: '15%' },
  { range: '₱250,001 – ₱400,000', rate: '20%' },
  { range: '₱400,001 – ₱800,000', rate: '25%' },
  { range: '₱800,001 – ₱2,000,000', rate: '30%' },
  { range: '₱2,000,001 – ₱8,000,000', rate: '32%' },
  { range: 'Over ₱8,000,000', rate: '35%' },
];

function Collapsible({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center justify-between border-none bg-transparent p-0 text-left"
      >
        <h2 className="m-0 text-base font-bold text-ledger-900">{title}</h2>
        {open ? (
          <ChevronUp size={18} className="text-ledger-500" aria-hidden />
        ) : (
          <ChevronDown size={18} className="text-ledger-500" aria-hidden />
        )}
      </button>
      {open && <div className="mt-3">{children}</div>}
    </Card>
  );
}

/** "totalTaxDue" narrows a mixed-income result from a plain TaxResult. */
function isMixedIncomeResult(
  choice: TaxAnalysis['currentChoice'],
): choice is Extract<TaxAnalysis['currentChoice'], { totalTaxDue: string }> {
  return 'totalTaxDue' in choice;
}

export function TaxAnalysisDashboard() {
  const companies = useApi<ListResponse<Company>>('/companies');
  const company = companies.data?.data[0] ?? null;

  const analysis = useApi<{ data: TaxAnalysis }>(
    company ? `/tax/analysis?companyId=${company.id}` : null,
  );

  if (companies.loading || analysis.loading) {
    return (
      <div>
        <PageHeading title="Tax Analysis" />
        <div className="flex flex-col gap-4">
          {Array.from({ length: 3 }, (_, i) => (
            <Card key={i}>
              <div className="h-24 animate-pulse rounded bg-ledger-100" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (analysis.error) {
    return (
      <div>
        <PageHeading title="Tax Analysis" />
        <Card>
          <p className="m-0 text-sm text-ledger-500">
            No tax setup found for this company yet.{' '}
            <Link to="/tax/setup" className="font-semibold text-peso-700 no-underline hover:underline">
              Start tax setup
            </Link>
            .
          </p>
        </Card>
      </div>
    );
  }

  const data = analysis.data?.data;
  if (!data) return null;

  const currentTaxDue = isMixedIncomeResult(data.currentChoice)
    ? data.currentChoice.totalTaxDue
    : data.currentChoice.taxDue;
  const bestOption = data.allOptions[0];
  const currentIsBest = bestOption?.method === (isMixedIncomeResult(data.currentChoice) ? data.currentChoice.business.method : data.currentChoice.method);

  return (
    <div>
      <PageHeading title="Tax Analysis">
        What you owe, how it's calculated, and whether a different choice would save you money.
      </PageHeading>

      <div className="flex flex-col gap-4">
        {/* ── Card 1: current choice ──────────────────────────────────── */}
        <Card>
          <p className="m-0 text-xs font-semibold tracking-wide text-ledger-500 uppercase">
            Your Current Choice
          </p>
          <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-lg font-bold text-ledger-900">
              {METHOD_LABEL[
                isMixedIncomeResult(data.currentChoice)
                  ? data.currentChoice.business.method
                  : data.currentChoice.method
              ] ?? '—'}
            </span>
            <span className="tabular text-2xl font-bold text-ledger-900">
              {formatAmount(currentTaxDue)}
            </span>
          </div>
          <p className="m-0 mt-1 text-xs text-ledger-500">Estimated tax due for the year</p>

          <div className="mt-4 rounded-lg bg-ledger-50 p-4">
            <TaxWaterfallChart
              steps={
                isMixedIncomeResult(data.currentChoice)
                  ? data.currentChoice.business.waterfall
                  : data.currentChoice.waterfall
              }
              method={
                METHOD_LABEL[
                  isMixedIncomeResult(data.currentChoice)
                    ? data.currentChoice.business.method
                    : data.currentChoice.method
                ] ?? '—'
              }
            />
          </div>

          <div className="mt-4">
            <TaxBreakdown
              breakdown={
                isMixedIncomeResult(data.currentChoice)
                  ? data.currentChoice.business.breakdown
                  : data.currentChoice.breakdown
              }
            />
          </div>
        </Card>

        {/* ── Card 2: quick insight ───────────────────────────────────── */}
        {!currentIsBest && bestOption && (
          <Card className="border-record-200 bg-record-50">
            <div className="flex items-start gap-2">
              <Lightbulb size={18} className="mt-0.5 shrink-0 text-record-600" aria-hidden />
              <div>
                <p className="m-0 text-sm font-semibold text-record-700">
                  Switching to {METHOD_LABEL[bestOption.method]} could save you{' '}
                  {formatAmount(bestOption.savingsVsCurrent)}.
                </p>
                <p className="m-0 mt-0.5 text-xs text-record-700/80">{data.reason}</p>
              </div>
            </div>
          </Card>
        )}

        {/* ── Card 3: detailed comparison ─────────────────────────────── */}
        <Collapsible title="Compare All Deduction Methods" defaultOpen>
          <div className="flex flex-col gap-3">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-ledger-200 text-left text-xs text-ledger-500 uppercase">
                    <th className="py-2 pr-2 font-semibold">Method</th>
                    <th className="py-2 pr-2 text-right font-semibold">Taxable Income</th>
                    <th className="py-2 pr-2 text-right font-semibold">Tax Due</th>
                    <th className="py-2 text-right font-semibold">Savings</th>
                  </tr>
                </thead>
                <tbody>
                  {data.allOptions.map((opt) => (
                    <tr key={opt.method} className="border-b border-ledger-100">
                      <td className="py-2 pr-2 font-medium text-ledger-900">
                        {METHOD_LABEL[opt.method]}
                        {opt.method === data.recommendation && (
                          <span className="ml-1.5 rounded bg-peso-50 px-1.5 py-0.5 text-[10px] font-bold text-peso-700 uppercase">
                            Best
                          </span>
                        )}
                      </td>
                      <td className="tabular py-2 pr-2 text-right text-ledger-700">
                        {formatAmount(opt.taxableIncome)}
                      </td>
                      <td className="tabular py-2 pr-2 text-right font-semibold text-ledger-900">
                        {formatAmount(opt.taxDue)}
                      </td>
                      <td
                        className={`tabular py-2 text-right font-semibold ${
                          Number(opt.savingsVsCurrent) > 0
                            ? 'text-peso-700'
                            : Number(opt.savingsVsCurrent) < 0
                              ? 'text-red-600'
                              : 'text-ledger-500'
                        }`}
                      >
                        {Number(opt.savingsVsCurrent) > 0 ? '+' : ''}
                        {formatAmount(opt.savingsVsCurrent)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {data.allOptions.map((opt) => (
              <details key={opt.method} className="group">
                <summary className="cursor-pointer list-none text-xs font-semibold text-ledger-500 hover:text-ledger-700">
                  <span className="inline-flex items-center gap-1">
                    <ChevronDown size={12} className="transition group-open:rotate-180" aria-hidden />
                    Show calculation — {METHOD_LABEL[opt.method]}
                  </span>
                </summary>
                <div className="mt-2 flex flex-col gap-3">
                  <div className="rounded-lg bg-ledger-50 p-4">
                    <TaxWaterfallChart steps={opt.waterfall} method={METHOD_LABEL[opt.method]} />
                  </div>
                  <TaxBreakdown breakdown={opt.breakdown} />
                </div>
              </details>
            ))}
          </div>
        </Collapsible>

        {/* ── Card 4: incorporation analysis ──────────────────────────── */}
        {data.incorporationAnalysis && (
          <Collapsible title="Should You Incorporate?">
            <div className="flex flex-col gap-3">
              <p className="m-0 text-sm font-semibold text-ledger-900">
                {data.incorporationAnalysis.shouldIncorporate ? '✓ Worth It' : '✗ Not Yet'}
              </p>
              <p className="m-0 text-sm text-ledger-700">{data.incorporationAnalysis.summary}</p>

              <dl className="grid grid-cols-1 gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
                <dt className="text-ledger-500">Current sole prop tax</dt>
                <dd className="m-0 font-medium text-ledger-900">
                  {formatAmount(data.incorporationAnalysis.currentSolePropTax)}
                </dd>
                <dt className="text-ledger-500">Corporate tax if incorporated</dt>
                <dd className="m-0 font-medium text-ledger-900">
                  {formatAmount(data.incorporationAnalysis.corporateTaxIfIncorporated)}
                </dd>
                <dt className="text-ledger-500">Break-even gross sales</dt>
                <dd className="m-0 font-medium text-ledger-900">
                  {data.incorporationAnalysis.breakEvenGrossSales
                    ? formatAmount(data.incorporationAnalysis.breakEvenGrossSales)
                    : 'Not reached at any realistic scale'}
                </dd>
              </dl>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-lg bg-ledger-50 p-3">
                  <p className="m-0 mb-2 text-sm font-semibold text-ledger-900">
                    Current (Sole Proprietor)
                  </p>
                  <TaxWaterfallChart
                    steps={data.incorporationAnalysis.currentSetupWaterfall}
                    method="Sole Proprietor"
                  />
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-ledger-500 hover:text-ledger-700">
                      Show breakdown
                    </summary>
                    <div className="mt-2">
                      <TaxBreakdown breakdown={data.incorporationAnalysis.currentSetupBreakdown} />
                    </div>
                  </details>
                </div>

                <div className="rounded-lg bg-peso-50 p-3">
                  <p className="m-0 mb-2 text-sm font-semibold text-peso-700">If Incorporated</p>
                  <TaxWaterfallChart
                    steps={data.incorporationAnalysis.ifIncorporatedWaterfall}
                    method="Corporation"
                  />
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-peso-700/80 hover:text-peso-700">
                      Show breakdown
                    </summary>
                    <div className="mt-2">
                      <TaxBreakdown breakdown={data.incorporationAnalysis.ifIncorporatedBreakdown} />
                    </div>
                  </details>
                </div>
              </div>

              <p className="m-0 border-t border-ledger-200 pt-3 text-sm font-semibold text-ledger-900">
                {data.incorporationAnalysis.recommendation}
              </p>
            </div>
          </Collapsible>
        )}

        {/* ── Card 5: YTD projection ──────────────────────────────────── */}
        {data.ytdProjection && (
          <Card>
            <p className="m-0 text-xs font-semibold tracking-wide text-ledger-500 uppercase">
              Your Actual Projection
            </p>
            <p className="m-0 mt-1 text-xs text-ledger-500">
              Annualized estimate based on {data.ytdProjection.monthsOfData}{' '}
              {data.ytdProjection.monthsOfData === 1 ? 'month' : 'months'} of posted sales
            </p>
            <p className="tabular m-0 mt-2 text-center text-2xl font-bold text-ledger-900">
              {formatAmount(data.ytdProjection.projectedAnnual)}
            </p>

            <div className="mt-4">
              <TaxBreakdown breakdown={data.ytdProjection.breakdown} />
            </div>

            <p className="m-0 mt-2 text-xs text-ledger-500">
              vs. your baseline estimate: {formatAmount(data.ytdProjection.baselineExpected)}
            </p>
          </Card>
        )}

        {/* ── Card 6: bracket reference ────────────────────────────────── */}
        <Collapsible title="2026 Tax Brackets (Reference)">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-ledger-200 text-left text-xs text-ledger-500 uppercase">
                <th className="py-2 pr-2 font-semibold">Taxable Income</th>
                <th className="py-2 text-right font-semibold">Rate</th>
              </tr>
            </thead>
            <tbody>
              {BRACKETS.map((b) => (
                <tr key={b.range} className="border-b border-ledger-100">
                  <td className="py-2 pr-2 text-ledger-700">{b.range}</td>
                  <td className="tabular py-2 text-right font-medium text-ledger-900">{b.rate}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="m-0 mt-2 text-xs text-ledger-500">
            Corporations pay a flat 25% of taxable income regardless of bracket. The 8% flat rate
            replaces graduated rates entirely and is only available below ₱3,000,000 gross sales.
          </p>
        </Collapsible>
      </div>
    </div>
  );
}
