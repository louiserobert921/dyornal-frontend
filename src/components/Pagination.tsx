import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { PageMeta } from '@/hooks/usePagination';

/**
 * Shared "Page X of Y (Z items total)" strip with Prev/Next buttons. Used by
 * every paginated list page so the affordance stays identical everywhere —
 * per the confirmed decision to use one buttoned pattern app-wide rather than
 * infinite scroll.
 */
export function Pagination({
  meta,
  page,
  onPageChange,
}: {
  meta: PageMeta | undefined;
  page: number;
  onPageChange: (page: number) => void;
}) {
  if (!meta || meta.total === 0) return null;

  const pageCount = Math.max(1, Math.ceil(meta.total / meta.limit));
  const from = meta.total === 0 ? 0 : meta.offset + 1;
  const to = Math.min(meta.offset + meta.limit, meta.total);

  return (
    <div className="mt-3 flex items-center justify-between gap-2 border-t border-ledger-100 pt-3">
      <p className="m-0 text-xs text-ledger-500">
        {from}–{to} of {meta.total}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 0}
          aria-label="Previous page"
          className="flex items-center gap-1 rounded-lg border border-ledger-200 bg-white px-2.5 py-1.5 text-sm font-medium text-ledger-700 hover:bg-ledger-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft size={14} aria-hidden />
          Prev
        </button>
        <span className="text-xs text-ledger-500">
          Page {page + 1} of {pageCount}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page + 1 >= pageCount}
          aria-label="Next page"
          className="flex items-center gap-1 rounded-lg border border-ledger-200 bg-white px-2.5 py-1.5 text-sm font-medium text-ledger-700 hover:bg-ledger-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
          <ChevronRight size={14} aria-hidden />
        </button>
      </div>
    </div>
  );
}
