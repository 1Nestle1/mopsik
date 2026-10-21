import { useCallback, useEffect, useState } from 'react';
import type { TAudioApp } from '../../shared/types';
import { api } from '../lib/api';

// one entry per app, even when it has several windows open
const dedupeByProcess = (apps: TAudioApp[]) => {
  const seen = new Set<number>();

  return apps.filter((app) => {
    if (seen.has(app.pid)) return false;

    seen.add(app.pid);

    return true;
  });
};

export const useAudioApps = (enabled: boolean) => {
  const [apps, setApps] = useState<TAudioApp[]>([]);
  const [available, setAvailable] = useState(true);

  const refresh = useCallback(async () => {
    const [isAvailable, listed] = await Promise.all([
      api.isAppAudioAvailable(),
      api.listAudioApps()
    ]);

    setAvailable(isAvailable);
    setApps(dedupeByProcess(listed));
  }, []);

  useEffect(() => {
    if (enabled) refresh();
  }, [enabled, refresh]);

  return { apps, available, refresh };
};
