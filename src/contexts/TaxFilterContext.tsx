import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { ApiError, api } from '@/lib/api';
import type { MixedIncomeTaxResult, TaxResult } from '@/types';

export interface TaxFilterSelection {
  companyId: string;
  taxYear: number;
  quarter: 1 | 2 | 3 | 4;
  /** The transaction IDs to include — everything else of a sale/expense type
   * in the quarter is treated as deselected. */
  selectedTransactionIds: string[];
}

interface TaxFilterResult {
  selectedTransactionIds: string[];
  excludedTransactionIds: string[];
  includedCount: number;
  totalCount: number;
  grossSales: string;
  recalculatedTax: TaxResult | MixedIncomeTaxResult;
  recalculatedStatements: {
    balanceSheet: unknown;
    incomeStatement: unknown;
    cashFlow: unknown;
  };
}

interface TaxFilterContextValue {
  /** True once at least one transaction has been deselected — an unmodified
   * "everything selected" state is not an active filter. */
  active: boolean;
  selection: TaxFilterSelection | null;
  result: TaxFilterResult | null;
  /** Set when the active filter was loaded from a saved scenario rather than
   * built ad-hoc — the banner and panel use this to show the scenario's name
   * and highlight it as selected. Editing the selection after loading clears
   * this, since the result no longer matches the saved scenario exactly. */
  activeSavedFilterId: string | null;
  activeSavedFilterName: string | null;
  applying: boolean;
  error: string | null;
  /** Excluded transaction IDs, comma-joined, ready to append to any /reports/*
   * or /tax/* query as `excludeTransactionIds` — empty string when no filter
   * is active, so callers can splice it in unconditionally. */
  excludeTransactionIdsParam: string;
  applySelection: (selection: TaxFilterSelection) => Promise<void>;
  applySavedFilter: (filterId: string) => Promise<void>;
  reset: () => void;
}

const TaxFilterContext = createContext<TaxFilterContextValue | null>(null);

interface SavedFilterApplyResponse extends TaxFilterResult {
  filterId: string;
  filterName: string;
  selection: TaxFilterSelection;
}

export function TaxFilterProvider({ children }: { children: ReactNode }) {
  const [selection, setSelection] = useState<TaxFilterSelection | null>(null);
  const [result, setResult] = useState<TaxFilterResult | null>(null);
  const [activeSavedFilterId, setActiveSavedFilterId] = useState<string | null>(null);
  const [activeSavedFilterName, setActiveSavedFilterName] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applySelection = useCallback(async (next: TaxFilterSelection) => {
    setApplying(true);
    setError(null);
    try {
      const res = await api.post<{ data: TaxFilterResult }>('/tax/analysis/filter', next);
      setSelection(next);
      setResult(res.data);
      // A saved scenario stays "active" only while its exact selection is
      // still in effect — editing checkboxes after loading one detaches it.
      setActiveSavedFilterId(null);
      setActiveSavedFilterName(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not apply this selection.');
    } finally {
      setApplying(false);
    }
  }, []);

  const applySavedFilter = useCallback(async (filterId: string) => {
    setApplying(true);
    setError(null);
    try {
      const res = await api.post<{ data: SavedFilterApplyResponse }>(
        `/tax/saved-filters/${filterId}/apply`,
        {},
      );
      setSelection(res.data.selection);
      setResult(res.data);
      setActiveSavedFilterId(res.data.filterId);
      setActiveSavedFilterName(res.data.filterName);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load this scenario.');
    } finally {
      setApplying(false);
    }
  }, []);

  const reset = useCallback(() => {
    setSelection(null);
    setResult(null);
    setActiveSavedFilterId(null);
    setActiveSavedFilterName(null);
    setError(null);
  }, []);

  const value = useMemo<TaxFilterContextValue>(
    () => ({
      active: !!result && result.excludedTransactionIds.length > 0,
      selection,
      result,
      activeSavedFilterId,
      activeSavedFilterName,
      applying,
      error,
      excludeTransactionIdsParam: result?.excludedTransactionIds.length
        ? result.excludedTransactionIds.join(',')
        : '',
      applySelection,
      applySavedFilter,
      reset,
    }),
    [
      selection,
      result,
      activeSavedFilterId,
      activeSavedFilterName,
      applying,
      error,
      applySelection,
      applySavedFilter,
      reset,
    ],
  );

  return <TaxFilterContext.Provider value={value}>{children}</TaxFilterContext.Provider>;
}

export function useTaxFilter(): TaxFilterContextValue {
  const ctx = useContext(TaxFilterContext);
  if (!ctx) throw new Error('useTaxFilter must be used within a TaxFilterProvider');
  return ctx;
}
