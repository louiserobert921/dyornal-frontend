import { Upload } from 'lucide-react';
import { Card } from '@/components/Card';
import { formatAmount } from '@/lib/money';
import type { ConsistencyRating, ProductTurnoverReport, TurnoverRank } from '@/types';

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
