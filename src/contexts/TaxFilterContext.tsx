import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { ApiError, api } from '@/lib/api';
import type { MixedIncomeTaxResult, TaxResult } from '@/types';

export interface TaxFilterCriteria {
  companyId: string;
  taxYear: number;
  quarter: 1 | 2 | 3 | 4;
  minAmount?: number;
  maxAmount?: number;
  transactionType: 'sales' | 'expenses' | 'all';
}

interface TaxFilterResult {
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
  active: boolean;
  criteria: TaxFilterCriteria | null;
  result: TaxFilterResult | null;
  /** Set when the active filter was loaded from a saved scenario rather than
   * entered ad-hoc — the banner and panel use this to show the scenario's
   * name and highlight it as selected. */
  activeSavedFilterId: string | null;
  activeSavedFilterName: string | null;
  applying: boolean;
  error: string | null;
  /** Excluded transaction IDs, comma-joined, ready to append to any /reports/*
   * or /tax/* query as `excludeTransactionIds` — empty string when no filter
   * is active, so callers can splice it in unconditionally. */
  excludeTransactionIdsParam: string;
  applyFilter: (criteria: TaxFilterCriteria) => Promise<void>;
  applySavedFilter: (filterId: string) => Promise<void>;
  reset: () => void;
}

const TaxFilterContext = createContext<TaxFilterContextValue | null>(null);

interface SavedFilterApplyResponse extends TaxFilterResult {
  filterId: string;
  filterName: string;
  criteria: TaxFilterCriteria;
}

export function TaxFilterProvider({ children }: { children: ReactNode }) {
  const [criteria, setCriteria] = useState<TaxFilterCriteria | null>(null);
  const [result, setResult] = useState<TaxFilterResult | null>(null);
  const [activeSavedFilterId, setActiveSavedFilterId] = useState<string | null>(null);
  const [activeSavedFilterName, setActiveSavedFilterName] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyFilter = useCallback(async (next: TaxFilterCriteria) => {
    setApplying(true);
    setError(null);
    try {
      const res = await api.post<{ data: TaxFilterResult }>('/tax/analysis/filter', next);
      setCriteria(next);
      setResult(res.data);
      setActiveSavedFilterId(null);
      setActiveSavedFilterName(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not apply this filter.');
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
      setCriteria(res.data.criteria);
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
    setCriteria(null);
    setResult(null);
    setActiveSavedFilterId(null);
    setActiveSavedFilterName(null);
    setError(null);
  }, []);

  const value = useMemo<TaxFilterContextValue>(
    () => ({
      active: !!result,
      criteria,
      result,
      activeSavedFilterId,
      activeSavedFilterName,
      applying,
      error,
      excludeTransactionIdsParam: result?.excludedTransactionIds.length
        ? result.excludedTransactionIds.join(',')
        : '',
      applyFilter,
      applySavedFilter,
      reset,
    }),
    [
      criteria,
      result,
      activeSavedFilterId,
      activeSavedFilterName,
      applying,
      error,
      applyFilter,
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
