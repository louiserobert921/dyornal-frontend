import { useCallback, useEffect, useState } from 'react';
import { ApiError, api } from '@/lib/api';

interface State<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * GET a path and track loading/error state. `reload` refetches — used after a
 * mutation so the screen reflects what was just written.
 */
export function useApi<T>(path: string | null) {
  const [state, setState] = useState<State<T>>({ data: null, loading: true, error: null });

  const load = useCallback(async () => {
    if (!path) {
      setState({ data: null, loading: false, error: null });
      return;
    }
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      setState({ data: await api.get<T>(path), loading: false, error: null });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Something went wrong.';
      setState({ data: null, loading: false, error: message });
    }
  }, [path]);

  useEffect(() => {
    void load();
  }, [load]);

  return { ...state, reload: load };
}
