import { useEffect, useState } from 'react';

/**
 * Ticks every `intervalMs` and returns the current timestamp, purely to force
 * a re-render. Screens that call `formatRelativeTime` inline (e.g. "3h ago")
 * only recompute it when React re-renders for some other reason — without
 * this, the text freezes at whatever it happened to say when data was last
 * fetched, since nothing else triggers a render as real time passes.
 */
export function useNow(intervalMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}
