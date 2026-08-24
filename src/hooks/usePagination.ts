import { useEffect, useMemo, useState } from 'react';

/** The `meta` block every paginated list endpoint returns. */
export interface PageMeta {
  total: number;
  limit: number;
  offset: number;
}

/**
 * Page/search state for one paginated list, plus the query string to append
 * to that endpoint's URL. Does not fetch anything itself — pair it with
 * `useApi(path ? \`/thing?\${pagination.query}\` : null)` so the two stay
 * decoupled: this hook only ever needs to know page numbers and a search
 * term, never the shape of what it is paging through.
 */
export function usePagination({ perPage = 20 }: { perPage?: number } = {}) {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // A fresh keystroke re-queries after a short pause rather than on every
  // character — the same debounce pattern used by the journal's own search.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Any search change resets to page 1 — a stale offset into a shorter,
  // filtered result set would otherwise land past the end of it.
  useEffect(() => {
    setPage(0);
  }, [debouncedSearch]);

  const query = useMemo(() => {
    const params = new URLSearchParams({ limit: String(perPage), offset: String(page * perPage) });
    if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
    return params.toString();
  }, [perPage, page, debouncedSearch]);

  function pageCount(meta: PageMeta | undefined): number {
    return meta ? Math.max(1, Math.ceil(meta.total / meta.limit)) : 1;
  }

  return { page, setPage, search, setSearch, query, pageCount, perPage };
}
