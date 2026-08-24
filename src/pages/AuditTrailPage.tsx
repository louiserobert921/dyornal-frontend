import { useEffect, useMemo, useState } from 'react';
import { Download, ShieldCheck } from 'lucide-react';
import { Card, PageHeading } from '@/components/Card';
import { DependencyGraph } from '@/components/AuditTrail/DependencyGraph';
import { Pagination } from '@/components/Pagination';
import { TransactionActionPanel } from '@/components/AuditTrail/TransactionActionPanel';
import { useDownload } from '@/hooks/useDownload';
import { useApi } from '@/hooks/useApi';
import type { PageMeta } from '@/hooks/usePagination';
import type { AuditEntry, Company, ListResponse, TransactionDependencies } from '@/types';

const PER_PAGE = 20;

const ACTIONS = ['CREATE', 'UPDATE', 'DELETE'] as const;

function fullTimestamp(iso: string): string {
  return new Date(iso).toLocaleString('en-PH', {
    year: 'numeric', month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    timeZoneName: 'short',
  });
}

/** Short form for the collapsed row: date + time, no year or timezone — the
 * full stamp only matters once a row is expanded. */
function shortTimestamp(iso: string): string {
  return new Date(iso).toLocaleString('en-PH', {
    month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

/** Diffs two JSON snapshots down to the fields that actually changed. */
function diffFields(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
): { key: string; before: unknown; after: unknown }[] {
  const keys = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]);
  const skip = new Set(['updatedAt', 'createdAt', 'id', 'companyId', 'glImpact']);
  const out: { key: string; before: unknown; after: unknown }[] = [];
  for (const key of keys) {
    if (skip.has(key)) continue;
    const b = before?.[key];
    const a = after?.[key];
    if (JSON.stringify(b) !== JSON.stringify(a)) out.push({ key, before: b, after: a });
  }
  return out;
}

function fmt(value: unknown): string {
  if (value === null || value === undefined) return '(none)';
  if (typeof value === 'object') {
    // A nested snapshot (e.g. the journal entry captured on delete) renders
    // as a long JSON blob that swamps the diff line it sits on — truncated,
    // it still shows something changed without drowning out the rest.
    const text = JSON.stringify(value);
    return text.length > 60 ? `${text.slice(0, 57)}…` : text;
  }
  return String(value);
}

/** CREATE = navy (brand primary), UPDATE = orange (brand accent), DELETE = red (the one safety color kept outside the brand palette). */
const ACTION_STYLE: Record<string, string> = {
  CREATE: 'bg-peso-50 text-peso-700',
  UPDATE: 'bg-record-50 text-record-700',
  DELETE: 'bg-red-50 text-red-700',
};
const ACTION_DOT: Record<string, string> = {
  CREATE: 'bg-peso-600',
  UPDATE: 'bg-record-500',
  DELETE: 'bg-red-600',
};

/**
 * The audit log: an immutable record of what changed in the company's data,
 * when, and by what it changed from. This reflects real writes — account,
 * company, and transaction changes — logged by the routes that perform them.
 *
 * Selecting a Transaction entry loads its dependency graph (the journal entry
 * and lines it posted, and any payment applied to or from it) and an
 * edit/delete panel. The log itself is never edited or deleted from here —
 * editing or deleting the underlying transaction writes a *new* log entry;
 * the history stays append-only.
 */
export function AuditTrailPage() {
  const [action, setAction] = useState<(typeof ACTIONS)[number] | ''>('');
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [selected, setSelected] = useState<AuditEntry | null>(null);
  const [page, setPage] = useState(0);
  const { download, downloading } = useDownload();

  const companies = useApi<ListResponse<Company>>('/companies');
  const company = companies.data?.data[0] ?? null;

  // Any filter change makes the current offset potentially stale (fewer
  // matching rows could put it past the end), so reset to page 1.
  useEffect(() => {
    setPage(0);
  }, [action, search, from, to]);

  const query = useMemo(() => {
    if (!company) return null;
    const params = new URLSearchParams({
      companyId: company.id,
      limit: String(PER_PAGE),
      offset: String(page * PER_PAGE),
    });
    if (action) params.set('action', action);
    if (search.trim()) params.set('search', search.trim());
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    return `/audit-trail?${params.toString()}`;
  }, [company, action, search, from, to, page]);

  const trail = useApi<{ data: AuditEntry[]; meta: PageMeta }>(query);

  const isTransactionEntry = selected?.entity === 'Transaction';
  const selectedTxnId = isTransactionEntry ? selected.entityId : null;

  const dependencies = useApi<{ data: TransactionDependencies }>(
    selectedTxnId ? `/transactions/${selectedTxnId}/dependencies` : null,
  );

  if (companies.loading) {
    return (
      <div>
        <PageHeading title="Audit Trail" />
        <SkeletonList />
      </div>
    );
  }

  if (!company) {
    return (
      <div>
        <PageHeading title="Audit Trail">No company yet.</PageHeading>
      </div>
    );
  }

  const csvHref = `/api/audit-trail.csv?companyId=${company.id}`;
  const entries = trail.data?.data ?? [];

  return (
    <div>
      <PageHeading title="Audit Trail">
        Every recorded change to your company's data, in the order it happened.
      </PageHeading>

      <div className="mb-3 flex items-start gap-2 rounded-lg border border-ledger-200 bg-ledger-50 px-3 py-2.5">
        <ShieldCheck size={16} className="mt-0.5 shrink-0 text-ledger-500" aria-hidden />
        <p className="m-0 text-xs text-ledger-500">
          This log is immutable and intended for regulatory compliance — entries here are never
          edited or removed. Editing or deleting a transaction below writes a new entry recording
          that change; it does not alter history.
        </p>
      </div>

      <div className="mb-3 flex flex-wrap items-end gap-2">
        <label className="flex min-w-40 flex-1 flex-col gap-1">
          <span className="text-[11px] font-semibold text-ledger-500 uppercase">Search</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Entity or reason"
            className="rounded-lg border border-ledger-200 bg-white px-2 py-2 text-base outline-none focus:border-peso-500 sm:text-sm"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-ledger-500 uppercase">Action</span>
          <select
            value={action}
            onChange={(e) => setAction(e.target.value as (typeof ACTIONS)[number] | '')}
            className="rounded-lg border border-ledger-200 bg-white px-2 py-2 text-base outline-none focus:border-peso-500 sm:text-sm"
          >
            <option value="">All actions</option>
            {ACTIONS.map((a) => (
              <option key={a} value={a}>
                {a}
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
            className="rounded-lg border border-ledger-200 bg-white px-2 py-2 text-base outline-none focus:border-peso-500 sm:text-sm"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-ledger-500 uppercase">To</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-lg border border-ledger-200 bg-white px-2 py-2 text-base outline-none focus:border-peso-500 sm:text-sm"
          />
        </label>
        <button
          type="button"
          onClick={() => void download(csvHref)}
          disabled={downloading}
          className="ml-auto flex cursor-pointer items-center gap-1.5 rounded-lg border-none bg-peso-600 px-3 py-2 text-sm font-bold text-white hover:bg-peso-700 disabled:opacity-50"
        >
          <Download size={15} aria-hidden />
          Download CSV
        </button>
      </div>

      {trail.loading ? (
        <SkeletonList />
      ) : entries.length === 0 ? (
        <Card>
          <p className="m-0 text-center text-sm text-ledger-500">No activity yet.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* ── Timeline ─────────────────────────────────────────────────── */}
          <Card className="!p-0">
            <div className="max-h-[70vh] divide-y divide-ledger-100 overflow-y-auto font-mono">
              {entries.map((e) => {
                const changes = diffFields(e.oldValue, e.newValue);
                const active = selected?.id === e.id;
                return (
                  <div key={e.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(active ? null : e)}
                      aria-pressed={active}
                      aria-expanded={active}
                      className={`flex w-full cursor-pointer items-center gap-2 border-none px-3 py-2 text-left text-xs ${
                        active ? 'bg-peso-50' : 'bg-transparent hover:bg-ledger-50'
                      }`}
                    >
                      <span className={`size-1.5 shrink-0 rounded-full ${ACTION_DOT[e.action]}`} aria-hidden />
                      <span className="shrink-0 text-ledger-400">{shortTimestamp(e.timestamp)}</span>
                      <span className={`shrink-0 rounded px-1.5 py-0.5 font-semibold ${ACTION_STYLE[e.action]}`}>
                        {e.action}
                      </span>
                      <span className="min-w-0 flex-1 truncate font-sans font-medium text-ledger-900">
                        {e.summary}
                      </span>
                    </button>

                    {active && (
                      <div className="border-t border-ledger-100 bg-peso-50 px-3 py-2.5">
                        <p className="m-0 text-[11px] text-ledger-500">
                          {fullTimestamp(e.timestamp)} · {e.actor}
                        </p>
                        {e.reason && (
                          <p className="m-0 mt-1 text-[11px] font-sans text-ledger-500 italic">"{e.reason}"</p>
                        )}
                        {changes.length > 0 && (
                          <div className="mt-2 flex flex-col gap-0.5">
                            {changes.map((c) => (
                              <div key={c.key} className="text-[11px]">
                                <span className="text-ledger-500">{c.key}:</span>{' '}
                                <span className="text-red-600 line-through">{fmt(c.before)}</span>{' '}
                                <span className="text-ledger-400">→</span>{' '}
                                <span className="text-peso-700">{fmt(c.after)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="px-3">
              <Pagination meta={trail.data?.meta} page={page} onPageChange={setPage} />
            </div>
          </Card>

          {/* ── Dependency graph + action panel ─────────────────────────── */}
          <Card className="!p-0">
            <div className="max-h-[70vh] overflow-y-auto">
              {isTransactionEntry ? (
                <>
                  <DependencyGraph dependencies={dependencies.data?.data ?? null} />
                  {selectedTxnId && (
                    <TransactionActionPanel
                      transactionId={selectedTxnId}
                      dependencies={dependencies.data?.data ?? null}
                      dependenciesError={dependencies.error}
                      onClose={() => setSelected(null)}
                      onChanged={() => {
                        void trail.reload();
                        void dependencies.reload();
                      }}
                    />
                  )}
                </>
              ) : (
                <div className="flex h-64 items-center justify-center p-8 text-center text-sm text-ledger-500">
                  {selected
                    ? `${selected.entity} entries do not have a dependency graph — this view is for transactions.`
                    : 'Select an entry from the timeline to see its connections.'}
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function SkeletonList() {
  return (
    <Card>
      <div className="flex flex-col gap-2">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-6 animate-pulse rounded bg-ledger-100" />
        ))}
      </div>
    </Card>
  );
}
