import { useEffect, useState } from 'react';
import { getHealth } from '../api/client';
import type { Health } from '../api/types';

export const HEALTH_POLL_MS = 30_000;

/** Checks `GET /health` on mount and every 30 seconds. An error of any kind means "offline". */
export function useHealth(): { data: Health | null; isLoading: boolean } {
  const [data, setData] = useState<Health | null>(null);
  // True only until the first answer; later checks keep showing the last known state.
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function check(): Promise<void> {
      let result: Health | null = null;
      try {
        result = await getHealth();
      } catch {
        result = null;
      }
      // An answer that arrives after unmount is harmless: React ignores updates to a gone component.
      setData(result);
      setIsLoading(false);
    }

    void check();
    const timer = setInterval(() => void check(), HEALTH_POLL_MS);
    // Cleanup: without it the interval would keep polling after the page is gone.
    return () => clearInterval(timer);
  }, []);

  return { data, isLoading };
}
