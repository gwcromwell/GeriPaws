import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { toErrorMessage } from '@/lib/errors';

interface ScreenLoadResult {
  isLoading: boolean;
  error: string | null;
  /** Exposed (not just internal) because several screens also report a
   * later mutation's failure through this same error banner — see e.g.
   * ailments/[ailmentId]/index.tsx's handleAddNote/handleDelete/etc. */
  setError: (error: string | null) => void;
  /** Re-runs `load`, tracking isLoading/error around it — call this
   * directly after a mutation (it's the same function useFocusEffect calls
   * on every focus). */
  reload: () => Promise<void>;
}

/**
 * The load/error/reload skeleton nearly every screen in this app repeats:
 * fetch on focus, track a human-readable error, expose a way to reload
 * after a mutation. Callers keep their own state for whatever `load`
 * actually fetches (and their own guard clauses, e.g. `if (!id) return`),
 * and `load` itself should simply let errors propagate rather than catching
 * them — this hook does the catching. Previously this exact shape —
 * isLoading/error state, a try/catch/finally, useFocusEffect wiring — was
 * hand-duplicated across a dozen screens.
 *
 * `load` should already be caller-memoized (`useCallback(..., [id])`,
 * exactly as these screens already do) — this hook re-runs whenever that
 * reference changes, same as the useFocusEffect call it replaces.
 */
export function useScreenLoad(load: () => Promise<void>, fallbackErrorMessage = 'Something went wrong'): ScreenLoadResult {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setIsLoading(true);
    try {
      await load();
      setError(null);
    } catch (err) {
      setError(toErrorMessage(err, fallbackErrorMessage));
    } finally {
      setIsLoading(false);
    }
  }, [load, fallbackErrorMessage]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  return { isLoading, error, setError, reload };
}
