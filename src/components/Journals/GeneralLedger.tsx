import { useEffect, useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { BalanceProof, Paper, PaperFooter, PaperHeading } from './Paper';
import { useDownload } from '@/hooks/useDownload';
import { ApiError, api } from '@/lib/api';
import { formatAmount } from '@/lib/money';
import type { Account, LedgerAccount, ListResponse } from '@/types';

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-PH', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * The general ledger: one page per account, each posting followed by the
 * balance it leaves behind. This is the view that answers "what is in this
 * account and how did it get there", which the journal — ordered by date across
 * all accounts — cannot.
 */
export function GeneralLedger({
  companyId,
  accounts,
}: {
  companyId: string;
  accounts: Account[];
}) {
  const [accountCode, setAccountCode] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [data, setData] = useState<LedgerAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const query = useMemo(() => {
    const params = new URLSearchParams({ companyId, limit: '500' });
    if (accountCode) params.set('accountCode', accountCode);
    if (from) params.set('dateFrom', from);
    if (to) params.set('dateTo', to);
    return params.toString();
  }, [companyId, accountCode, from, to]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get<ListResponse<LedgerAccount>>(`/journals/gl?${query}`)
      .then((r) => {
        if (cancelled) return;
        setData(r.data);
        setError(null);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Could not load ledger.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [query]);

  const exportHref = `/api/exports/gl.csv?${new URLSearchParams({
    companyId,
    ...(accountCode ? { accountCode } : {}),
    ...(from ? { dateFrom: from } : {}),
    ...(to ? { dateTo: to } : {}),
  }).toString()}`;
  const { download, downloading } = useDownload();

  return (
    <div className="flex flex-col gap-3">
      <div className="no-print flex flex-wrap items-end gap-2">
        <label className="flex min-w-50 flex-1 flex-col gap-1">
          <span className="text-[11px] font-semibold text-ledger-500 uppercase">Account</span>
          <select
            value={accountCode}
            onChange={(e) => setAccountCode(e.target.value)}
            className="rounded-lg border border-ledger-200 bg-white px-2 py-2 text-sm outline-none focus:border-peso-500"
          >
            <option value="">All accounts with activity</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.code}>
                {a.code} — {a.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-ledger-500 uppercase">From</span>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-lg border border-ledger-200 bg-white px-2 py-2 text-sm outline-none focus:border-peso-500"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-ledger-500 uppercase">To</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-lg border border-ledger-200 bg-white px-2 py-2 text-sm outline-none focus:border-peso-500"
          />
        </label>

        <button
          type="button"
          onClick={() => void download(exportHref)}
          disabled={downloading}
          className="flex cursor-pointer items-center gap-1.5 rounded-lg border-none bg-peso-600 px-3 py-2 text-sm font-bold text-white hover:bg-peso-700 disabled:opacity-50"
        >
          <Download size={15} aria-hidden />
          Export
        </button>
      </div>

      {error && (
        <p role="alert" className="m-0 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {loading && <p className="py-8 text-center text-sm text-ledger-500">Reading the ledger…</p>}

      {!loading && data.length === 0 && !error && (
        <Paper>
          <p className="ledger-serif py-8 text-center text-sm text-ink-700/60 italic">
            Nothing posted in this range.
          </p>
        </Paper>
      )}

      {!loading &&
        data.map((ledger) => (
          <Paper key={ledger.account.id}>
            <PaperHeading
              title={`${ledger.account.code} — ${ledger.account.name}`}
              subtitle={`${ledger.account.type} · ${ledger.rows.length} ${
                ledger.rows.length === 1 ? 'posting' : 'postings'
              }`}
              right={
                <span className="ledger-mono text-right">
                  <span className="block text-[10px] tracking-wide text-ink-700/60 uppercase">
                    Balance
                  </span>
                  <span className="text-base font-bold text-navy-700">
                    {formatAmount(ledger.closingBalance)}
                  </span>
                </span>
              }
            />

            <div className="hidden border-b border-rule-300 pb-1 text-[10px] font-bold tracking-wider text-navy-700 uppercase sm:grid sm:grid-cols-[104px_88px_1fr_106px_106px_120px] sm:gap-2">
              <span>Date</span>
              <span>Entry</span>
              <span>Particulars</span>
              <span className="text-right">Debit</span>
              <span className="text-right">Credit</span>
              <span className="text-right">Balance</span>
            </div>

            {/* An opening balance is only meaningful when a date filter hides
                earlier activity; otherwise the ledger starts at zero. */}
            {Number(ledger.openingBalance) !== 0 && (
              <div className="ledger-row grid grid-cols-[1fr_auto] items-baseline gap-2 border-b border-rule-200 py-1 sm:grid-cols-[104px_88px_1fr_106px_106px_120px]">
                <span className="ledger-serif text-[13px] text-ink-700 italic sm:col-span-3">
                  Balance brought forward
                </span>
                <span className="hidden sm:block" />
                <span className="hidden sm:block" />
                <span className="ledger-mono text-right text-ink-900">
                  {formatAmount(ledger.openingBalance)}
                </span>
              </div>
            )}

            <div className="divide-y divide-rule-200">
              {ledger.rows.map((row) => (
                <div
                  key={row.lineId}
                  className="ledger-row grid grid-cols-[1fr_auto] items-baseline gap-x-2 gap-y-0.5 py-1 sm:grid-cols-[104px_88px_1fr_106px_106px_120px] sm:gap-2"
                >
                  <span className="ledger-mono text-[12px] whitespace-nowrap text-ink-700 sm:col-auto">
                    {shortDate(row.date)}
                  </span>
                  <span className="ledger-mono text-right text-[11px] whitespace-nowrap text-navy-700 sm:text-left">
                    {row.entryNumber}
                  </span>
                  <span className="ledger-serif col-span-2 text-[13px] text-ink-900 sm:col-span-1">
                    {row.description}
                  </span>
                  <span className="ledger-mono hidden text-right text-ink-900 sm:block">
                    {row.debit ? formatAmount(row.debit) : ''}
                  </span>
                  <span className="ledger-mono hidden text-right text-ink-900 sm:block">
                    {row.credit ? formatAmount(row.credit) : ''}
                  </span>
                  {/* Phones get one money column, labelled by side. */}
                  <span className="ledger-mono text-[12px] text-ink-700 sm:hidden">
                    {row.debit ? `Dr ${formatAmount(row.debit)}` : `Cr ${formatAmount(row.credit ?? '0')}`}
                  </span>
                  <span className="ledger-mono text-right font-semibold text-ink-900">
                    {formatAmount(row.balance)}
                  </span>
                </div>
              ))}
            </div>

            <BalanceProof
              debit={formatAmount(ledger.debitTotal)}
              credit={formatAmount(ledger.creditTotal)}
              // Per-account debits and credits are not expected to match; the
              // proof here is that the postings produce the closing balance.
              balanced
              label="Account totals"
            />

            <PaperFooter
              left={`Closing balance ${formatAmount(ledger.closingBalance)}`}
              right={ledger.account.type}
            />
          </Paper>
        ))}
    </div>
  );
}
