import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Download, Search, Volume2, VolumeX } from 'lucide-react';
import { JournalPageView } from './JournalPageView';
import { useDownload } from '@/hooks/useDownload';
import { usePageTurn } from '@/hooks/usePageTurn';
import { ApiError, api } from '@/lib/api';
import type { Account, JournalEntry, ListResponse } from '@/types';

const PAGE_SIZE = 50;

/** Debounces a value so typing filters live without a request per keystroke. */
function useDebounced<T>(value: T, delay = 300): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return settled;
}

export function GeneralJournal({
  companyId,
  accounts,
}: {
  companyId: string;
  accounts: Account[];
}) {
  const [page, setPage] = useState(0);
  const [direction, setDirection] = useState(1);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [keyword, setKeyword] = useState('');
  const [accountCode, setAccountCode] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const debouncedKeyword = useDebounced(keyword);
  const { enabled: soundOn, setEnabled: setSoundOn, play } = usePageTurn();
  const { download, downloading } = useDownload();

  const query = useMemo(() => {
    const params = new URLSearchParams({
      companyId,
      limit: String(PAGE_SIZE),
      offset: String(page * PAGE_SIZE),
    });
    if (debouncedKeyword.trim()) params.set('q', debouncedKeyword.trim());
    if (accountCode) params.set('accountCode', accountCode);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    return params.toString();
  }, [companyId, page, debouncedKeyword, accountCode, from, to]);

  // Any filter change invalidates the current page number.
  const filterKey = `${debouncedKeyword}|${accountCode}|${from}|${to}`;
  const lastFilterKey = useRef(filterKey);
  useEffect(() => {
    if (lastFilterKey.current !== filterKey) {
      lastFilterKey.current = filterKey;
      setPage(0);
    }
  }, [filterKey]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get<ListResponse<JournalEntry>>(`/journals/general?${query}`)
      .then((r) => {
        if (cancelled) return;
        setEntries(r.data);
        setTotal(r.meta?.total ?? r.data.length);
        setError(null);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Could not load entries.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [query]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function turn(delta: number) {
    const next = page + delta;
    if (next < 0 || next >= pageCount) return;
    setDirection(delta);
    setPage(next);
    play();
  }

  // Arrow keys turn pages, the way they would in any document viewer.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|SELECT|TEXTAREA)$/.test(target.tagName)) return;
      if (event.key === 'ArrowLeft') turn(-1);
      if (event.key === 'ArrowRight') turn(1);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const exportHref = `/api/exports/journal.csv?${new URLSearchParams({
    companyId,
    ...(from ? { dateFrom: from } : {}),
    ...(to ? { dateTo: to } : {}),
  }).toString()}`;

  return (
    <div className="flex flex-col gap-3">
      {/* ── Filters ────────────────────────────────────────────────────── */}
      <div className="no-print flex flex-wrap items-end gap-2">
        <label className="flex min-w-45 flex-1 flex-col gap-1">
          <span className="text-[11px] font-semibold text-ledger-500 uppercase">Search</span>
          <span className="relative">
            <Search
              size={14}
              className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-ledger-500"
              aria-hidden
            />
            <input
              type="search"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Description or entry no."
              className="w-full rounded-lg border border-ledger-200 bg-white py-2 pr-3 pl-8 text-sm outline-none focus:border-peso-500 focus:ring-2 focus:ring-peso-100"
            />
          </span>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-ledger-500 uppercase">Account</span>
          <select
            value={accountCode}
            onChange={(e) => setAccountCode(e.target.value)}
            className="rounded-lg border border-ledger-200 bg-white px-2 py-2 text-sm outline-none focus:border-peso-500"
          >
            <option value="">All accounts</option>
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
          onClick={() => setSoundOn(!soundOn)}
          aria-pressed={soundOn}
          title={soundOn ? 'Page-turn sound on' : 'Page-turn sound off'}
          className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-ledger-200 bg-white px-3 py-2 text-sm font-medium text-ledger-700 hover:bg-ledger-50"
        >
          {soundOn ? <Volume2 size={15} aria-hidden /> : <VolumeX size={15} aria-hidden />}
          <span className="sr-only">Toggle page-turn sound</span>
        </button>

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

      {/* ── The page ───────────────────────────────────────────────────── */}
      <div style={{ perspective: 1800 }}>
        <AnimatePresence mode="wait" initial={false}>
          {loading ? (
            <p key="loading" className="py-10 text-center text-sm text-ledger-500">
              Opening the book…
            </p>
          ) : (
            <JournalPageView
              key={page}
              entries={entries}
              pageNumber={page + 1}
              pageCount={pageCount}
              direction={direction}
              onSwipe={turn}
            />
          )}
        </AnimatePresence>
      </div>

      {/* ── Page turn ──────────────────────────────────────────────────── */}
      <div className="no-print flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => turn(-1)}
          disabled={page === 0}
          className="flex cursor-pointer items-center gap-1 rounded-lg border border-ledger-200 bg-white px-3 py-2 text-sm font-semibold text-ledger-700 hover:bg-ledger-50 disabled:cursor-default disabled:opacity-40"
        >
          <ChevronLeft size={16} aria-hidden />
          Previous
        </button>

        <span className="ledger-serif text-sm text-ledger-500 italic">
          Page {page + 1} of {pageCount}
          {total > 0 && <span className="ml-2 not-italic">({total} entries)</span>}
        </span>

        <button
          type="button"
          onClick={() => turn(1)}
          disabled={page + 1 >= pageCount}
          className="flex cursor-pointer items-center gap-1 rounded-lg border border-ledger-200 bg-white px-3 py-2 text-sm font-semibold text-ledger-700 hover:bg-ledger-50 disabled:cursor-default disabled:opacity-40"
        >
          Next
          <ChevronRight size={16} aria-hidden />
        </button>
      </div>
    </div>
  );
}
