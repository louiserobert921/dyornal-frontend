import { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, Download } from 'lucide-react';
import { Paper, PaperFooter, PaperHeading } from './Paper';
import { useDownload } from '@/hooks/useDownload';
import { ApiError, api } from '@/lib/api';
import { formatAmount } from '@/lib/money';
import type { SubsidiaryResponse } from '@/types';

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-PH', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

const BUCKETS = [
  { key: 'current', label: 'Current' },
  { key: 'd30', label: '31–60' },
  { key: 'd60', label: '61–90' },
  { key: 'd90', label: 'Over 90' },
] as const;

/**
 * The subsidiary ledger for receivables or payables: who owes what, how old it
 * is, and the postings behind each balance.
 *
 * The totals here reconcile to the control account (1201 for A/R, 2101 for
 * A/P) — that agreement is what makes a subsidiary ledger trustworthy, so the
 * control account's own balance is printed alongside.
 */
export function SubsidiaryLedger({
  companyId,
  kind,
}: {
  companyId: string;
  kind: 'AR' | 'AP';
}) {
  const [result, setResult] = useState<SubsidiaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { download, downloading } = useDownload();
  const [open, setOpen] = useState<string | null>(null);

  const path = kind === 'AR' ? 'ar' : 'ap';
  const partyLabel = kind === 'AR' ? 'Customer' : 'Supplier';
  const title = kind === 'AR' ? 'Accounts Receivable' : 'Accounts Payable';

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get<SubsidiaryResponse>(`/journals/${path}?companyId=${companyId}`)
      .then((r) => {
        if (cancelled) return;
        setResult(r);
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
  }, [companyId, path]);

  if (loading) {
    return <p className="py-8 text-center text-sm text-ledger-500">Totting up balances…</p>;
  }

  if (error) {
    return (
      <p role="alert" className="m-0 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
        {error}
      </p>
    );
  }

  if (!result) return null;

  const empty = result.data.length === 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="no-print flex justify-end">
        <button
          type="button"
          onClick={() => void download(`/api/exports/${path}.csv?companyId=${companyId}`)}
          disabled={downloading}
          className="flex cursor-pointer items-center gap-1.5 rounded-lg border-none bg-peso-600 px-3 py-2 text-sm font-bold text-white hover:bg-peso-700 disabled:opacity-50"
        >
          <Download size={15} aria-hidden />
          Export {kind}
        </button>
      </div>

      <Paper>
        <PaperHeading
          title={title}
          subtitle={`Control account ${result.control.code} — ${result.control.name} · as of ${shortDate(
            result.meta.asOf,
          )}`}
          right={
            <span className="ledger-mono text-right">
              <span className="block text-[10px] tracking-wide text-ink-700/60 uppercase">
                Outstanding
              </span>
              <span className="text-base font-bold text-navy-700">
                {formatAmount(result.totals.outstanding)}
              </span>
            </span>
          }
        />

        {empty ? (
          <p className="ledger-serif py-8 text-center text-sm text-ink-700/60 italic">
            {kind === 'AR' ? 'No outstanding receivables.' : 'No outstanding payables.'}
          </p>
        ) : (
          <>
            {/* Aging summary — the columns this report is read for. */}
            <div className="hidden border-b border-rule-300 pb-1 text-[10px] font-bold tracking-wider text-navy-700 uppercase sm:grid sm:grid-cols-[1fr_repeat(5,104px)] sm:gap-2">
              <span>{partyLabel}</span>
              <span className="text-right">Outstanding</span>
              {BUCKETS.map((b) => (
                <span key={b.key} className="text-right">
                  {b.label}
                </span>
              ))}
            </div>

            <div className="divide-y divide-rule-200">
              {result.data.map((party) => {
                const expanded = open === party.name;
                return (
                  <div key={party.name}>
                    <button
                      type="button"
                      onClick={() => setOpen(expanded ? null : party.name)}
                      aria-expanded={expanded}
                      className="ledger-row grid w-full cursor-pointer grid-cols-[1fr_auto] items-baseline gap-x-2 gap-y-1 border-none bg-transparent py-1.5 text-left hover:bg-paper-200 sm:grid-cols-[1fr_repeat(5,104px)] sm:gap-2"
                    >
                      <span className="ledger-serif flex items-center gap-1 text-[13px] font-semibold text-ink-900">
                        {expanded ? (
                          <ChevronDown size={13} aria-hidden />
                        ) : (
                          <ChevronRight size={13} aria-hidden />
                        )}
                        {party.name}
                      </span>
                      <span className="ledger-mono text-right font-bold text-ink-900">
                        {formatAmount(party.outstanding)}
                      </span>
                      {BUCKETS.map((b) => {
                        const value = party.aging[b.key];
                        const isZero = Number(value) === 0;
                        return (
                          <span
                            key={b.key}
                            className={`ledger-mono hidden text-right sm:block ${
                              isZero
                                ? 'text-ink-700/25'
                                : // Anything past 60 days is what a reader is
                                  // scanning for, so it is the one thing coloured.
                                  b.key === 'd60' || b.key === 'd90'
                                  ? 'font-semibold text-red-700'
                                  : 'text-ink-900'
                            }`}
                          >
                            {formatAmount(value)}
                          </span>
                        );
                      })}
                      {/* Phones: the bands as one line rather than five columns. */}
                      <span className="ledger-mono col-span-2 text-[11px] text-ink-700/70 sm:hidden">
                        {BUCKETS.filter((b) => Number(party.aging[b.key]) !== 0)
                          .map((b) => `${b.label} ${formatAmount(party.aging[b.key])}`)
                          .join(' · ') || 'Current'}
                      </span>
                    </button>

                    {expanded && (
                      <div className="mb-2 ml-4 border-l-2 border-rule-300 pl-3">
                        {party.rows.map((row) => (
                          <div
                            key={`${row.entryId}-${row.date}-${row.balance}`}
                            className="ledger-row grid grid-cols-[1fr_auto] items-baseline gap-x-2 py-0.5 sm:grid-cols-[104px_1fr_104px_104px_112px] sm:gap-2"
                          >
                            <span className="ledger-mono text-[12px] whitespace-nowrap text-ink-700">
                              {shortDate(row.date)}
                            </span>
                            <span className="ledger-serif col-span-2 text-[12px] text-ink-900 sm:col-span-1">
                              {row.invoiceNumber ? `${row.invoiceNumber} · ` : ''}
                              {row.description}
                            </span>
                            <span className="ledger-mono hidden text-right text-[12px] text-ink-900 sm:block">
                              {row.charged ? formatAmount(row.charged) : ''}
                            </span>
                            <span className="ledger-mono hidden text-right text-[12px] text-ink-900 sm:block">
                              {row.settled ? formatAmount(row.settled) : ''}
                            </span>
                            <span className="ledger-mono text-right text-[12px] font-semibold text-ink-900">
                              {formatAmount(row.balance)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Totals row, which is what ties back to the control account. */}
            <div className="ledger-row mt-1 grid grid-cols-[1fr_auto] items-baseline gap-x-2 border-t-2 border-navy-700 py-2 sm:grid-cols-[1fr_repeat(5,104px)] sm:gap-2">
              <span className="text-[11px] font-bold tracking-wide text-ink-700 uppercase">
                Total
              </span>
              <span className="ledger-mono text-right font-bold text-navy-700">
                {formatAmount(result.totals.outstanding)}
              </span>
              {BUCKETS.map((b) => (
                <span key={b.key} className="ledger-mono hidden text-right font-bold text-navy-700 sm:block">
                  {formatAmount(result.totals[b.key])}
                </span>
              ))}
            </div>
          </>
        )}

        <PaperFooter
          left={`${result.data.length} ${result.data.length === 1 ? 'account' : 'accounts'} with a balance`}
          right={`Reconciles to ${result.control.code}`}
        />
      </Paper>
    </div>
  );
}
