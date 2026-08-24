import { formatAmount } from '@/lib/money';
import type { TaxBreakdown as TaxBreakdownData } from '@/types';

/**
 * A breakdown step's value is one of: a plain fixed-2 money string
 * ("900000.00"), a signed money string ("-360000.00"), or free text that
 * isn't money at all ("11.39%", "8 months", "No deduction applies"). Only the
 * first two get peso-formatted; the sign is preserved and moved in front of
 * the ₱ symbol so it still reads as "-₱360,000.00" rather than "₱-360,000.00".
 */
function formatStepValue(value: string): string {
  const match = /^([+-]?)(\d+(?:\.\d+)?)$/.exec(value);
  if (!match) return value;
  const [, sign, amount] = match;
  return `${sign}${formatAmount(amount)}`;
}

/** Renders one calculation's step-by-step math and plain-English summary —
 * the "show your work" behind a single tax figure. */
export function TaxBreakdown({ breakdown }: { breakdown: TaxBreakdownData }) {
  return (
    <div className="rounded-lg border border-ledger-200 bg-ledger-50 p-4">
      <h4 className="m-0 text-sm font-semibold text-ledger-900">How it's calculated</h4>

      <div className="mt-3 flex flex-col gap-2.5">
        {breakdown.steps.map((step, i) => (
          <div key={i} className="text-sm">
            <div className="flex items-start justify-between gap-3">
              <span className="font-medium text-ledger-700">{step.label}</span>
              <span className="tabular shrink-0 text-right font-semibold text-ledger-900">
                {formatStepValue(step.value)}
              </span>
            </div>
            {step.note && <p className="m-0 mt-0.5 text-xs text-ledger-500">{step.note}</p>}
          </div>
        ))}
      </div>

      <div className="mt-3 border-t border-ledger-200 pt-3">
        <p className="m-0 text-xs text-ledger-600 italic">{breakdown.summary}</p>
      </div>
    </div>
  );
}
