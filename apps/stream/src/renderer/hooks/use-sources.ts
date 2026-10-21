import { useCallback, useEffect, useState } from 'react';
import type { TCaptureSource } from '../../shared/types';
import { api } from '../lib/api';

// thumbnails go stale as windows change, so the list refreshes on its own every few seconds
const REFRESH_INTERVAL_MS = 4_000;

export const useSources = () => {
  const [sources, setSources] = useState<TCaptureSource[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setSources(await api.listSources());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();

    const timer = setInterval(refresh, REFRESH_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [refresh]);

  return { sources, loading, refresh };
};
