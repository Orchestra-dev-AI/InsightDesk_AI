"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UseApiOptions<T> {
  /** Function that returns the promise. */
  fetcher: () => Promise<T>;
  /** If true, fetch immediately on mount. Default: true */
  immediate?: boolean;
  /** Auto-poll interval in ms. 0 = disabled. */
  pollInterval?: number;
  /** Max retries on failure. Default: 2 */
  maxRetries?: number;
}

interface UseApiReturn<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  refetch: () => void;
}

export function useApi<T>({
  fetcher,
  immediate = true,
  pollInterval = 0,
  maxRetries = 2,
}: UseApiOptions<T>): UseApiReturn<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const retriesRef = useRef(0);
  const mountedRef = useRef(true);

  const execute = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await fetcher();
      if (mountedRef.current) {
        setData(result);
        retriesRef.current = 0;
      }
    } catch (err) {
      if (!mountedRef.current) return;

      const msg = err instanceof Error ? err.message : String(err);

      if (retriesRef.current < maxRetries) {
        retriesRef.current += 1;
        const delay = Math.min(1000 * 2 ** retriesRef.current, 8000);
        setTimeout(() => {
          if (mountedRef.current) execute();
        }, delay);
      } else {
        setError(msg);
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [fetcher, maxRetries]);

  useEffect(() => {
    mountedRef.current = true;
    if (immediate) execute();
    return () => {
      mountedRef.current = false;
    };
  }, [immediate, execute]);

  // Polling
  useEffect(() => {
    if (!pollInterval || pollInterval <= 0) return;
    const timer = setInterval(execute, pollInterval);
    return () => clearInterval(timer);
  }, [pollInterval, execute]);

  return { data, error, loading, refetch: execute };
}
