import { Group, Line, Proof, StatementHeader, StatementPaper } from './Statement';
import { formatAmount } from '@/lib/money';
import type { BalanceSheet, CashFlow, IncomeStatement, TrialBalance } from '@/types';

/** Statement of financial position. Assets against liabilities and equity. */
export function BalanceSheetView({ data }: { data: BalanceSheet }) {
  return (
    <StatementPaper>
      <StatementHeader meta={data.meta} />

      <Group title="Assets">
        {data.assets.current.items.map((i) => (
          <Line key={i.code} code={i.code} label={i.name} amount={i.amount} indent={1} />
        ))}
        <Line label="Total current assets" amount={data.assets.current.total} rule="single" bold />

        {data.assets.fixed.items.length > 0 && (
          <div className="mt-2">
            {data.assets.fixed.items.map((i) => (
              <Line key={i.code} code={i.code} label={i.name} amount={i.amount} indent={1} />
            ))}
            <Line label="Total non-current assets" amount={data.assets.fixed.total} rule="single" bold />
          </div>
        )}

        <Line label="TOTAL ASSETS" amount={data.assets.total} rule="double" bold />
      </Group>

      <Group title="Liabilities">
        {data.liabilities.current.items.map((i) => (
          <Line key={i.code} code={i.code} label={i.name} amount={i.amount} indent={1} />
        ))}
        <Line
          label="Total current liabilities"
          amount={data.liabilities.current.total}
          rule="single"
          bold
        />

        {data.liabilities.longTerm.items.length > 0 && (
          <div className="mt-2">
            {data.liabilities.longTerm.items.map((i) => (
              <Line key={i.code} code={i.code} label={i.name} amount={i.amount} indent={1} />
            ))}
            <Line
              label="Total non-current liabilities"
              amount={data.liabilities.longTerm.total}
              rule="single"
              bold
            />
          </div>
        )}

        <Line label="Total liabilities" amount={data.liabilities.total} rule="single" bold />
      </Group>

      <Group title="Equity">
        {data.equity.items.map((i) => (
          <Line
            key={i.code}
            code={i.code}
            label={i.derived ? `${i.name} *` : i.name}
            amount={i.amount}
            indent={1}
          />
        ))}
        <Line label="Total equity" amount={data.equity.total} rule="single" bold />
        <Line
          label="TOTAL LIABILITIES AND EQUITY"
          amount={data.check.liabilitiesAndEquity}
          rule="double"
          bold
        />
      </Group>

      <Proof
        ok={data.check.balanced}
        okLabel="Assets equal liabilities plus equity"
        failLabel="The statement does not balance"
        detail={data.check.balanced ? undefined : `Out by ${formatAmount(data.check.difference)}`}
      />

      {data.equity.items.some((i) => i.derived) && (
        <p className="mt-3 text-[11px] text-ledger-500 italic">
          * Retained earnings is the accumulated profit to date, computed from the nominal accounts.
          Closing entries have not been posted, so no balance sits in account 3300 itself.
        </p>
      )}
    </StatementPaper>
  );
}

/** Statement of comprehensive income, with each line as a share of revenue. */
export function IncomeStatementView({ data }: { data: IncomeStatement }) {
  const cogsZero = Number(data.costOfGoodsSold.total) === 0;

  return (
    <StatementPaper>
      <StatementHeader meta={data.meta} />

      <div className="mb-1 hidden grid-cols-[1fr_140px_72px] gap-3 border-b border-ledger-300 pb-1 sm:grid">
        <span />
        <span className="text-right text-[10px] font-bold tracking-wider text-ledger-500 uppercase">
          Amount
        </span>
        <span className="text-right text-[10px] font-bold tracking-wider text-ledger-500 uppercase">
          % of rev.
        </span>
      </div>

      <Group title="Revenue">
        {data.revenue.items.map((i) => (
          <Line
            key={i.code}
            code={i.code}
            label={i.name}
            amount={i.amount}
            percent={i.percentOfRevenue}
            indent={1}
          />
        ))}
        <Line label="Total revenue" amount={data.revenue.total} rule="single" bold percent={100} />
      </Group>

      <Group title="Cost of sales">
        {data.costOfGoodsSold.items.map((i) => (
          <Line key={i.code} code={i.code} label={i.name} amount={i.amount} indent={1} />
        ))}
        {cogsZero && (
          <Line label="No cost of sales posted" amount="0.00" indent={1} muted />
        )}
        <Line
          label="Gross profit"
          amount={data.grossProfit.total}
          percent={data.grossProfit.percentOfRevenue}
          rule="single"
          bold
        />
      </Group>

      <Group title="Operating expenses">
        {data.operatingExpenses.items.map((i) => (
          <Line
            key={i.code}
            code={i.code}
            label={i.name}
            amount={i.amount}
            percent={i.percentOfRevenue}
            indent={1}
          />
        ))}
        <Line
          label="Total operating expenses"
          amount={data.operatingExpenses.total}
          percent={data.operatingExpenses.percentOfRevenue}
          rule="single"
          bold
        />
        <Line
          label="Operating income"
          amount={data.operatingIncome.total}
          percent={data.operatingIncome.percentOfRevenue}
          rule="single"
          bold
        />
      </Group>

      {data.otherExpenses.items.length > 0 && (
        <Group title="Other income and expenses">
          {data.otherExpenses.items.map((i) => (
            <Line key={i.code} code={i.code} label={i.name} amount={i.amount} indent={1} />
          ))}
          <Line label="Total other expenses" amount={data.otherExpenses.total} rule="single" bold />
        </Group>
      )}

      <Line
        label="NET INCOME"
        amount={data.netIncome.total}
        percent={data.netIncome.percentOfRevenue}
        rule="double"
        bold
      />

      {/* Prior period, when there is one to compare against. */}
      {data.comparative && (
        <div className="mt-5 border-t border-ledger-200 pt-3">
          <h3 className="m-0 mb-2 text-[11px] font-bold tracking-wider text-ledger-900 uppercase">
            Compared with the preceding period
          </h3>
          <Line label="Revenue" amount={data.comparative.revenue} indent={1} />
          <Line label="Net income" amount={data.comparative.netIncome} indent={1} />
          <div className="mt-2 flex flex-wrap gap-4 text-xs">
            <Growth label="Revenue growth" value={data.comparative.revenueGrowth} />
            <Growth label="Net income growth" value={data.comparative.netIncomeGrowth} />
          </div>
        </div>
      )}

      {cogsZero && (
        <p className="mt-3 text-[11px] text-ledger-500 italic">
          {data.costOfGoodsSold.note} Purchases are held in inventory until a cost of sales entry
          moves them, so gross margin reads as 100% until then.
        </p>
      )}
    </StatementPaper>
  );
}

function Growth({ label, value }: { label: string; value: number | null }) {
  if (value === null) {
    return (
      <span className="text-ledger-500">
        {label}: <span className="font-semibold">n/a</span>
      </span>
    );
  }
  const up = value >= 0;
  return (
    <span className="text-ledger-500">
      {label}:{' '}
      <span className={`font-bold ${up ? 'text-peso-700' : 'text-red-700'}`}>
        {up ? '▲' : '▼'} {Math.abs(value).toFixed(1)}%
      </span>
    </span>
  );
}

/** Statement of cash flows, indirect method. */
export function CashFlowView({ data }: { data: CashFlow }) {
  return (
    <StatementPaper>
      <StatementHeader meta={data.meta} />

      <Group title="Operating activities">
        {data.operating.items.map((i) => (
          <Line key={i.label} label={i.label} amount={i.amount} indent={1} />
        ))}
        <Line label="Net cash from operating" amount={data.operating.total} rule="single" bold />
      </Group>

      <Group title="Investing activities">
        {data.investing.items.map((i) => (
          <Line key={i.label} label={i.label} amount={i.amount} indent={1} />
        ))}
        <Line label="Net cash from investing" amount={data.investing.total} rule="single" bold />
      </Group>

      <Group title="Financing activities">
        {data.financing.items.map((i) => (
          <Line key={i.label} label={i.label} amount={i.amount} indent={1} />
        ))}
        <Line label="Net cash from financing" amount={data.financing.total} rule="single" bold />
      </Group>

      <Line label="NET CHANGE IN CASH" amount={data.summary.netChange} rule="double" bold />
      <Line label="Cash at beginning of period" amount={data.summary.cashOpening} indent={1} />
      <Line label="Cash at end of period" amount={data.summary.cashClosing} rule="single" bold />

      <Proof
        ok={data.summary.reconciled}
        okLabel="Reconciles to the movement in the cash accounts"
        failLabel="Does not reconcile to the cash accounts"
        detail={
          data.summary.reconciled
            ? undefined
            : `${formatAmount(data.summary.unexplained)} unaccounted for`
        }
      />

      <p className="mt-3 text-[11px] text-ledger-500 italic">
        Prepared by the indirect method. Depreciation is included only where a depreciation entry
        has been posted; the system does not compute it automatically.
      </p>
    </StatementPaper>
  );
}

/** Trial balance: the ledger's own proof, account by account. */
export function TrialBalanceView({ data }: { data: TrialBalance }) {
  return (
    <StatementPaper>
      <StatementHeader meta={data.meta} />

      <div className="overflow-x-auto">
        <table className="w-full min-w-md border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-ledger-900">
              <th
                scope="col"
                className="pb-1.5 text-left text-[10px] font-bold tracking-wider text-ledger-500 uppercase"
              >
                Code
              </th>
              <th
                scope="col"
                className="pb-1.5 text-left text-[10px] font-bold tracking-wider text-ledger-500 uppercase"
              >
                Account
              </th>
              <th
                scope="col"
                className="pb-1.5 text-right text-[10px] font-bold tracking-wider text-ledger-500 uppercase"
              >
                Debit
              </th>
              <th
                scope="col"
                className="pb-1.5 text-right text-[10px] font-bold tracking-wider text-ledger-500 uppercase"
              >
                Credit
              </th>
            </tr>
          </thead>
          <tbody>
            {data.accounts.map((a) => (
              <tr key={a.code} className="border-b border-ledger-100">
                <td className="tabular py-1 text-[12px] text-ledger-500">{a.code}</td>
                <td className="py-1 text-ledger-900">{a.name}</td>
                <td className="tabular py-1 text-right text-ledger-900">
                  {a.debit ? formatAmount(a.debit) : ''}
                </td>
                <td className="tabular py-1 text-right text-ledger-900">
                  {a.credit ? formatAmount(a.credit) : ''}
                </td>
              </tr>
            ))}
            <tr className="border-t-[3px] border-double border-t-ledger-900 font-bold">
              <td className="py-1.5" />
              <td className="py-1.5 text-ledger-900">TOTAL</td>
              <td className="tabular py-1.5 text-right text-ledger-900">
                {formatAmount(data.totals.debit)}
              </td>
              <td className="tabular py-1.5 text-right text-ledger-900">
                {formatAmount(data.totals.credit)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <Proof
        ok={data.totals.balanced}
        okLabel="GL balanced — debits equal credits"
        failLabel="GL out of balance"
        detail={
          data.totals.balanced ? undefined : `Difference ${formatAmount(data.totals.difference)}`
        }
      />
    </StatementPaper>
  );
}
