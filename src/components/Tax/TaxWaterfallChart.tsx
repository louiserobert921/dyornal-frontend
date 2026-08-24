import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatAmount } from '@/lib/money';
import type { TaxWaterfallStep } from '@/types';

/**
 * Bar fill per step type — kept inside this app's two-color brand palette
 * (navy + orange, no green) rather than the generic blue/red/green a
 * finance dashboard might default to. Positive figures and running totals
 * both read as "money you have"; only deductions/tax owed read as the
 * orange "money leaving" color.
 */
const FILL: Record<TaxWaterfallStep['type'], string> = {
  positive: '#0d3868', // peso-600
  negative: '#fe5f07', // record-500
  total: '#002b5f', // peso-700 — a shade darker, so a running total still reads distinctly from a plain income bar
};

interface TooltipPayload {
  payload: TaxWaterfallStep;
}

function WaterfallTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) {
  if (!active || !payload?.length) return null;
  const step = payload[0].payload;
  return (
    <div className="rounded-lg border border-ledger-200 bg-white p-3 shadow-lg">
      <p className="m-0 text-sm font-semibold text-ledger-900">{step.name}</p>
      <p className="tabular m-0 text-sm text-ledger-700">
        {step.value < 0 ? '-' : ''}
        {formatAmount(String(Math.abs(step.value)))}
      </p>
      <p className="m-0 mt-1 text-xs text-ledger-500">{step.description}</p>
    </div>
  );
}

/**
 * A waterfall-style bar chart of one tax calculation: Gross Sales → Deduction
 * → Taxable Income → Tax → Tax Due. Each step's bar height is its own
 * amount (not a running-total offset) — simpler to read at the sizes this
 * chart renders at, and every step already carries its `cumulative` value
 * in the tooltip for anyone who wants the running total.
 */
/** Long step names ("Optional Standard Deduction (40%)") read fine in the
 * text breakdown but crowd the X-axis at chart width — this shortens just
 * the axis label, while the tooltip still shows the full name via `name`. */
function axisLabel(name: string): string {
  const short: Record<string, string> = {
    'Optional Standard Deduction (40%)': 'OSD (40%)',
    'Itemized Deductions (Total)': 'Itemized',
    'Itemized Deductions': 'Itemized',
    'No Deduction (8% Flat)': 'No Deduction',
    'Cost of Goods Sold': 'COGS',
    'Corporate Tax (25%)': 'Corp. Tax (25%)',
    'Tax (8% of Gross)': 'Tax (8%)',
    'Salary Tax Due': 'Salary Tax',
  };
  if (short[name]) return short[name];
  // "Tax (25% bracket)" -> "Tax (25%)" — the word "bracket" adds length
  // without adding information the tooltip's description doesn't already say.
  const bracketMatch = /^Tax \((\d+)% bracket\)$/.exec(name);
  if (bracketMatch) return `Tax (${bracketMatch[1]}%)`;
  return name.length > 18 ? `${name.slice(0, 16)}…` : name;
}

export function TaxWaterfallChart({ steps, method }: { steps: TaxWaterfallStep[]; method: string }) {
  const chartData = steps.map((step) => ({
    ...step,
    absValue: Math.abs(step.value),
    axisName: axisLabel(step.name),
  }));

  return (
    <div className="w-full">
      <div className="mb-3">
        <h4 className="m-0 text-sm font-semibold text-ledger-900">{method} — Step by Step</h4>
        <p className="m-0 mt-0.5 text-xs text-ledger-500">
          Watch how your gross sales becomes taxable income and finally, tax due
        </p>
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={chartData} margin={{ top: 16, right: 8, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="axisName"
            tick={{ fontSize: 10, fill: '#64748b' }}
            angle={-45}
            textAnchor="end"
            height={100}
            interval={0}
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#64748b' }}
            tickFormatter={(value: number) => `₱${(value / 1000).toFixed(0)}k`}
            width={42}
          />
          <Tooltip content={<WaterfallTooltip />} cursor={{ fill: 'rgba(100,116,139,0.08)' }} />
          <Bar dataKey="absValue" radius={[3, 3, 0, 0]}>
            {chartData.map((entry, i) => (
              <Cell key={i} fill={FILL[entry.type]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-3 flex flex-wrap gap-4 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm" style={{ backgroundColor: FILL.positive }} aria-hidden />
          <span className="text-ledger-600">Income / Starting Point</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm" style={{ backgroundColor: FILL.negative }} aria-hidden />
          <span className="text-ledger-600">Deductions / Tax</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm" style={{ backgroundColor: FILL.total }} aria-hidden />
          <span className="text-ledger-600">Running Total</span>
        </span>
      </div>
    </div>
  );
}
