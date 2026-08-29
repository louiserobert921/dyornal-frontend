import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Line as RLine,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ArrowDown, ArrowRight, ArrowUp, Upload } from 'lucide-react';
import { Card } from '@/components/Card';
import { formatAmount } from '@/lib/money';
import type { ConsistencyRating, FriendlyKpiValue, Kpis, ProductTurnoverReport, TurnoverRank } from '@/types';

/**
 * A categorical ramp for the expense pie, built from the brand's navy and
 * orange rather than a generic categorical palette — kept strictly to that
 * family (plus neutral grays) so a chart never introduces a color the rest
 * of the app does not use.
 */
const SLICE_COLORS = ['#002b5f', '#fe5f07', '#5b7ca8', '#ffa25e', '#0d3868', '#94a3b8', '#c2410c'];

/** "2026-08" → "Aug 26", short enough for an axis tick. */
function monthLabel(month: string): string {
  const [year, m] = month.split('-');
  const name = new Date(Date.UTC(Number(year), Number(m) - 1, 1)).toLocaleDateString('en-PH', {
    month: 'short',
  });
  return `${name} ${year.slice(2)}`;
}

/** Compact peso for axis ticks: 54333 → "₱54k". */
function compactPeso(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `₱${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `₱${Math.round(value / 1_000)}k`;
  return `₱${value.toFixed(0)}`;
}

const tooltipStyle = {
  contentStyle: {
    borderRadius: 8,
    border: '1px solid #e2e8f0',
    fontSize: 12,
    fontVariantNumeric: 'tabular-nums' as const,
  },
  // Recharts passes undefined for gaps in a series — the forecast rows carry
  // nulls where actual and projected do not overlap.
  formatter: (value: unknown) =>
    value === null || value === undefined ? '—' : formatAmount(Number(value).toFixed(2)),
};

/** The headline tiles, ratio gauges, and charts. */
export function KpiDashboard({ data }: { data: Kpis }) {
  const netIncome = Number(data.headline.netIncome);

  const tiles = [
    { label: 'Revenue', value: data.headline.revenue, tone: 'neutral' as const },
    { label: 'Expenses', value: data.headline.expenses, tone: 'neutral' as const },
    {
      label: 'Net income',
      value: data.headline.netIncome,
      tone: netIncome > 0 ? ('good' as const) : netIncome < 0 ? ('bad' as const) : ('neutral' as const),
    },
    { label: 'Cash position', value: data.headline.cash, tone: 'neutral' as const },
    { label: 'Receivables', value: data.headline.receivables, tone: 'neutral' as const },
    { label: 'Payables', value: data.headline.payables, tone: 'neutral' as const },
  ];

  const series = data.series.map((s) => ({
    month: monthLabel(s.month),
    revenue: Number(s.revenue),
    expenses: Number(s.expenses),
    netIncome: Number(s.netIncome),
    cash: Number(s.cash),
  }));

  const pie = data.expenseBreakdown.map((e) => ({ name: e.name, value: Number(e.amount) }));

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {tiles.map((t) => (
          <Card key={t.label}>
            <div className="text-[11px] font-semibold tracking-wide text-ledger-500 uppercase">
              {t.label}
            </div>
            <div
              className={`tabular mt-1 text-xl font-bold ${
                t.tone === 'good'
                  ? 'text-peso-700'
                  : t.tone === 'bad'
                    ? 'text-red-700'
                    : 'text-ledger-900'
              }`}
            >
              {formatAmount(t.value)}
            </div>
          </Card>
        ))}
      </div>

      <FriendlyKpiPanel kpis={data.friendlyKpis} />

      {series.length > 0 && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <ChartCard title="Revenue and expenses" hint="Monthly, over the selected period">
            <LineChart data={series}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <YAxis tickFormatter={compactPeso} tick={{ fontSize: 11 }} stroke="#94a3b8" width={56} />
              <Tooltip {...tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <RLine
                type="monotone"
                dataKey="revenue"
                name="Revenue"
                stroke="#002b5f"
                strokeWidth={2}
                dot={false}
              />
              <RLine
                type="monotone"
                dataKey="expenses"
                name="Expenses"
                stroke="#fe5f07"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ChartCard>

          <ChartCard title="Net income" hint="Revenue less expenses, by month">
            <LineChart data={series}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <YAxis tickFormatter={compactPeso} tick={{ fontSize: 11 }} stroke="#94a3b8" width={56} />
              <Tooltip {...tooltipStyle} />
              <RLine
                type="monotone"
                dataKey="netIncome"
                name="Net income"
                stroke="#002b5f"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ChartCard>

          <ChartCard title="Cash position" hint="Running balance of cash accounts">
            <AreaChart data={series}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <YAxis tickFormatter={compactPeso} tick={{ fontSize: 11 }} stroke="#94a3b8" width={56} />
              <Tooltip {...tooltipStyle} />
              <Area
                type="monotone"
                dataKey="cash"
                name="Cash"
                stroke="#002b5f"
                fill="#002b5f"
                fillOpacity={0.12}
                strokeWidth={2}
              />
            </AreaChart>
          </ChartCard>

          {pie.length > 0 && (
            <ChartCard title="Where the money went" hint="Expenses by account">
              <PieChart>
                <Pie
                  data={pie}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="45%"
                  outerRadius="75%"
                  paddingAngle={2}
                >
                  {pie.map((slice, i) => (
                    <Cell key={slice.name} fill={SLICE_COLORS[i % SLICE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip {...tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ChartCard>
          )}
        </div>
      )}
    </div>
  );
}

function ChartCard({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactElement;
}) {
  return (
    <Card>
      <div className="mb-2">
        <h3 className="m-0 text-sm font-bold text-ledger-900">{title}</h3>
        {hint && <p className="m-0 text-[11px] text-ledger-500">{hint}</p>}
      </div>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

/**
 * The 5 KPIs kept from the old 12-ratio panel, each reframed as the plain
 * question a non-accountant would actually ask. `format` controls both the
 * displayed unit and which direction of change is "good" (handled by the
 * backend's trend calculation, not here) — this table only owns presentation.
 */
const KPI_SPECS = [
  {
    key: 'netMargin' as const,
    icon: '📈',
    question: 'From every ₱100 in sales, how much is pure profit?',
    metric: 'Net Profit Margin',
    format: 'percentage' as const,
    benchmark: '15–20% is healthy',
    description: 'After all expenses, this share of your revenue is profit.',
  },
  {
    key: 'daysToCollect' as const,
    icon: '⏱️',
    question: 'How long does it take to collect payment?',
    metric: 'Days to Collect',
    format: 'days' as const,
    benchmark: '30 days is typical',
    description: 'Average days between invoicing a customer and getting paid.',
  },
  {
    key: 'currentRatio' as const,
    icon: '💰',
    question: 'Can I pay my bills due soon?',
    metric: 'Liquidity Position',
    format: 'ratio' as const,
    benchmark: 'Above 1.5 is safe',
    description: 'Current assets ÷ current liabilities — higher means safer.',
  },
  {
    key: 'returnOnEquity' as const,
    icon: '🎯',
    question: 'With ₱1 I invested, how much profit did it generate?',
    metric: 'Return on Equity',
    format: 'percentage' as const,
    benchmark: '15%+ is strong',
    description: 'Every peso of your own investment generated this much profit.',
  },
  {
    key: 'debtToEquity' as const,
    icon: '⚖️',
    question: 'How much am I borrowing vs. owning?',
    metric: 'Debt to Equity',
    format: 'ratio' as const,
    benchmark: 'Below 1.0 is healthy',
    description: 'Debt ÷ equity — lower means less financial risk.',
  },
];

function formatKpiValue(value: number | null, format: 'percentage' | 'ratio' | 'days'): string {
  if (value === null) return 'N/A';
  if (format === 'percentage') return `${value.toFixed(1)}%`;
  if (format === 'ratio') return `${value.toFixed(2)}×`;
  return `${Math.round(value)} days`;
}

function TrendBadge({ trend }: { trend: FriendlyKpiValue['trend'] }) {
  if (trend === 'up') {
    return (
      <span className="flex items-center gap-1 text-xs font-semibold text-peso-700">
        <ArrowUp size={13} aria-hidden /> Improving
      </span>
    );
  }
  if (trend === 'down') {
    return (
      <span className="flex items-center gap-1 text-xs font-semibold text-red-600">
        <ArrowDown size={13} aria-hidden /> Declining
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-xs font-semibold text-ledger-500">
      <ArrowRight size={13} aria-hidden /> Stable
    </span>
  );
}

/**
 * The 5-KPI dashboard that replaced the 12-ratio panel: friendly question
 * titles, one big number, a trend arrow versus the prior period of equal
 * length, a rule-of-thumb benchmark, and a plain-English explanation.
 */
function FriendlyKpiPanel({ kpis }: { kpis: Kpis['friendlyKpis'] }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {KPI_SPECS.map((spec) => {
          const kpi = kpis[spec.key];
          return (
            <Card key={spec.key} className="flex flex-col">
              <span className="text-2xl" aria-hidden>
                {spec.icon}
              </span>
              <p className="m-0 mt-2 h-10 text-xs font-medium leading-tight text-ledger-600">
                {spec.question}
              </p>
              <p className="tabular m-0 mt-2 text-2xl font-bold text-peso-600">
                {formatKpiValue(kpi.value, spec.format)}
              </p>
              <p className="m-0 mt-0.5 text-xs text-ledger-500">{spec.metric}</p>
              <div className="mt-2">
                <TrendBadge trend={kpi.trend} />
              </div>
              <div className="mt-2 rounded-lg bg-ledger-50 p-2">
                <p className="m-0 text-xs text-ledger-700">
                  <strong>Healthy range:</strong> {spec.benchmark}
                </p>
              </div>
              <p className="m-0 mt-2 text-xs leading-tight text-ledger-600">{spec.description}</p>
            </Card>
          );
        })}
      </div>

      <Card className="border-peso-100 bg-peso-50">
        <h3 className="m-0 text-sm font-semibold text-peso-700">💡 What These Numbers Mean</h3>
        <div className="mt-2 flex flex-col gap-1.5 text-xs text-peso-700/90">
          <p className="m-0">
            <strong>Profit Margin:</strong> your "profit per sale." Higher means a more profitable
            business.
          </p>
          <p className="m-0">
            <strong>Days to Collect:</strong> how long your money sits uncollected. Lower means
            faster cash.
          </p>
          <p className="m-0">
            <strong>Liquidity:</strong> whether you can pay bills. Above 1.5 means you hold 1.5×
            more current assets than current liabilities.
          </p>
          <p className="m-0">
            <strong>Return on Equity:</strong> how hard your own money is working for you.
          </p>
          <p className="m-0">
            <strong>Debt to Equity:</strong> the balance between what you owe and what you own.
          </p>
        </div>
      </Card>

      <Card>
        <h3 className="m-0 mb-3 text-sm font-bold text-ledger-900">Your Business Health Summary</h3>
        <div className="flex flex-col gap-2.5 text-sm">
          <HealthRow label="Profitability" score={kpis.healthScores.profitabilityScore} />
          <HealthRow label="Cash Health" score={kpis.healthScores.cashHealthScore} />
          <HealthRow label="Financial Stability" score={kpis.healthScores.stabilityScore} />
        </div>
      </Card>
    </div>
  );
}

function HealthRow({ label, score }: { label: string; score: number | null }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-ledger-600">{label}</span>
      <HealthIndicator score={score} />
    </div>
  );
}

function HealthIndicator({ score }: { score: number | null }) {
  if (score === null) {
    return <span className="text-xs font-semibold text-ledger-400">N/A</span>;
  }
  if (score >= 80) return <span className="text-sm font-bold text-peso-700">✓ Strong</span>;
  if (score >= 60) return <span className="text-sm font-bold text-amber-600">⚠ Fair</span>;
  return <span className="text-sm font-bold text-red-600">✗ Weak</span>;
}

const RANK_STYLE: Record<TurnoverRank, string> = {
  HIGH: 'bg-peso-50 text-peso-700',
  MID: 'bg-ledger-100 text-ledger-600',
  LOW: 'bg-red-50 text-red-700',
};
const RANK_LABEL: Record<TurnoverRank, string> = { HIGH: 'High', MID: 'Mid', LOW: 'Low' };

const CONSISTENCY_STYLE: Record<ConsistencyRating, string> = {
  STABLE: 'bg-peso-50 text-peso-700',
  MODERATE: 'bg-amber-50 text-amber-700',
  VARIABLE: 'bg-red-50 text-red-700',
};
const CONSISTENCY_LABEL: Record<ConsistencyRating, string> = {
  STABLE: 'Stable',
  MODERATE: 'Moderate',
  VARIABLE: 'Variable',
};

/** Menu item sales velocity, ranked into high/low turnover — from a
 * POS-sourced import (see ImportMenuSalesModal), independent of GL data. */
export function ProductTurnoverView({
  data,
  onImportClick,
}: {
  data: ProductTurnoverReport;
  onImportClick: () => void;
}) {
  const needsMoreData = data.meta.weeksOfData < 4;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="m-0 text-sm text-ledger-500">
          {data.meta.weeksOfData} week{data.meta.weeksOfData === 1 ? '' : 's'} of data ·{' '}
          {data.items.length} menu item{data.items.length === 1 ? '' : 's'}
        </p>
        <button
          type="button"
          onClick={onImportClick}
          className="flex cursor-pointer items-center gap-1.5 rounded-lg border-none bg-peso-600 px-3 py-2 text-sm font-bold text-white hover:bg-peso-700"
        >
          <Upload size={15} aria-hidden />
          Import POS Sales Data
        </button>
      </div>

      {needsMoreData && (
        <p className="m-0 rounded-lg bg-amber-50 px-3 py-2.5 text-sm text-amber-700">
          Turnover ranking is most reliable with at least 4 weeks of data — {data.meta.weeksOfData} week
          {data.meta.weeksOfData === 1 ? '' : 's'} collected so far.
        </p>
      )}

      {data.items.length === 0 ? (
        <Card>
          <p className="m-0 text-center text-sm text-ledger-500">
            No sales data yet.{' '}
            <button
              type="button"
              onClick={onImportClick}
              className="cursor-pointer border-none bg-transparent p-0 font-semibold text-peso-700 underline"
            >
              Import POS Sales Data
            </button>
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden !p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-4xl border-collapse text-sm">
              <thead>
                <tr className="border-b border-ledger-200 bg-ledger-50 text-left">
                  <th className="px-4 py-2 text-xs font-bold text-ledger-500 uppercase">Menu Item</th>
                  <th className="px-4 py-2 text-right text-xs font-bold text-ledger-500 uppercase">Daily Qty</th>
                  <th className="px-4 py-2 text-right text-xs font-bold text-ledger-500 uppercase">Weekly Qty</th>
                  <th className="px-4 py-2 text-right text-xs font-bold text-ledger-500 uppercase">Monthly Qty</th>
                  <th className="px-4 py-2 text-right text-xs font-bold text-ledger-500 uppercase">Monthly Sales</th>
                  <th className="px-4 py-2 text-xs font-bold text-ledger-500 uppercase">Turnover</th>
                  <th className="px-4 py-2 text-xs font-bold text-ledger-500 uppercase">Consistency</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => (
                  <tr key={item.menuItemName} className="border-b border-ledger-100 hover:bg-ledger-50">
                    <td className="px-4 py-2 text-ledger-900">{item.menuItemName}</td>
                    <td className="tabular px-4 py-2 text-right text-ledger-900">{item.dailyQty}</td>
                    <td className="tabular px-4 py-2 text-right text-ledger-900">{item.weeklyQty}</td>
                    <td className="tabular px-4 py-2 text-right font-semibold text-ledger-900">{item.monthlyQty}</td>
                    <td className="tabular px-4 py-2 text-right text-ledger-900">{formatAmount(item.monthlySales)}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                          needsMoreData ? 'bg-ledger-100 text-ledger-400' : RANK_STYLE[item.turnoverRank]
                        }`}
                      >
                        {needsMoreData ? '—' : RANK_LABEL[item.turnoverRank]}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      {item.consistency ? (
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${CONSISTENCY_STYLE[item.consistency]}`}>
                          {CONSISTENCY_LABEL[item.consistency]}
                        </span>
                      ) : (
                        <span className="text-xs text-ledger-400">Needs more data</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
