import { useCallback, useEffect, useRef, useState } from 'react';
import type { TSettingsUpdate, TStreamSettings } from '../../shared/types';
import { api } from '../lib/api';

// a slider sends a value per pixel, the file only needs the last one
const SAVE_DELAY_MS = 400;

export const useSettings = () => {
  const [settings, setSettings] = useState<TStreamSettings>();
  const pendingRef = useRef<TSettingsUpdate>({});
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    let cancelled = false;

    api.loadSettings().then((loaded) => {
      if (!cancelled) setSettings(loaded);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const flush = useCallback(async () => {
    clearTimeout(timerRef.current);

    const pending = pendingRef.current;

    pendingRef.current = {};

    if (Object.keys(pending).length === 0) return;

    await api.saveSettings(pending);
  }, []);

  const update = useCallback(
    (changes: Omit<TSettingsUpdate, 'streamKey'>) => {
      setSettings((current) =>
        current ? { ...current, ...changes } : current
      );

      pendingRef.current = { ...pendingRef.current, ...changes };

      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(flush, SAVE_DELAY_MS);
    },
    [flush]
  );

  // the key is saved at once and never kept in the window afterwards
  const saveStreamKey = useCallback(async (streamKey: string) => {
    const saved = await api.saveSettings({ streamKey });

    setSettings((current) =>
      current ? { ...current, hasStreamKey: saved.hasStreamKey } : saved
    );
  }, []);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return { settings, update, saveStreamKey, flush };
};
