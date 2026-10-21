import { Toaster } from '@sharkord/ui';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Resolution, type TStreamSettings } from '../shared/types';
import { AudioSection } from './components/audio-section';
import { ConnectionSection } from './components/connection-section';
import { GoLiveBar } from './components/go-live-bar';
import { Header } from './components/header';
import { SourcePicker } from './components/source-picker';
import { VideoSection } from './components/video-section';
import { useSettings } from './hooks/use-settings';
import { useSources } from './hooks/use-sources';
import { useStreamer } from './hooks/use-streamer';
import {
  getDefaultLanguage,
  LanguageContext,
  useT,
  type TLanguage
} from './lib/i18n';

const LANGUAGE_STORAGE_KEY = 'mopscord-stream-language';

const readStoredLanguage = (): TLanguage | undefined => {
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);

    return stored === 'en' || stored === 'ru' ? stored : undefined;
  } catch {
    return undefined;
  }
};

type TStreamAppProps = {
  language: TLanguage;
  onLanguageChange: (language: TLanguage) => void;
};

const StreamApp = memo(({ language, onLanguageChange }: TStreamAppProps) => {
  const t = useT();
  const { settings, update, saveStreamKey } = useSettings();
  const { sources, refresh } = useSources();
  const streamer = useStreamer();
  const [selectedId, setSelectedId] = useState<string>();

  const isLive = streamer.status === 'live';
  const isBusy = isLive || streamer.status === 'starting';

  // the last screen or window comes back on the next start, if it is still open
  const lastSourceId = settings?.lastSourceId;
  const rememberedId =
    lastSourceId && sources.some((source) => source.id === lastSourceId)
      ? lastSourceId
      : undefined;
  const effectiveSelectedId = selectedId ?? rememberedId;

  const selectedSource = sources.find(
    (source) => source.id === effectiveSelectedId
  );

  const onSelectSource = useCallback(
    (sourceId: string) => {
      setSelectedId(sourceId);
      update({ lastSourceId: sourceId });

      if (isLive && settings) streamer.switchSource(sourceId, settings);
    },
    [isLive, settings, streamer, update]
  );

  const onChange = useCallback(
    (changes: Partial<TStreamSettings>) => {
      if (!settings) return;

      update(changes);

      if (isLive) streamer.applySettings({ ...settings, ...changes }, settings);
    },
    [isLive, settings, streamer, update]
  );

  const onServerUrlChange = useCallback(
    (serverUrl: string) => update({ serverUrl }),
    [update]
  );

  const onStart = useCallback(() => {
    if (!settings) return;

    if (!effectiveSelectedId) {
      toast.error(t('pickSourceFirst'));

      return;
    }

    if (!settings.serverUrl || !settings.hasStreamKey) {
      toast.error(t('addServerFirst'));

      return;
    }

    streamer.start(effectiveSelectedId, settings);
  }, [effectiveSelectedId, settings, streamer, t]);

  const onStop = useCallback(() => {
    streamer.stop();
  }, [streamer]);

  const summary = useMemo(() => {
    if (!settings) return '';

    if (!selectedSource) return t('pickSourceFirst');

    return t('summary', {
      source: selectedSource.name,
      resolution:
        settings.resolution === Resolution.SOURCE
          ? t('resolutionSource')
          : settings.resolution,
      fps: settings.frameRate,
      bitrate: `${(settings.videoBitrateKbps / 1000).toFixed(1)} Mbit/s`
    });
  }, [selectedSource, settings, t]);

  return (
    <div className="flex h-full flex-col">
      <Header
        status={streamer.status}
        startedAt={streamer.startedAt}
        language={language}
        onLanguageChange={onLanguageChange}
      />

      <main className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_380px] gap-4 p-4">
        <div className="flex min-h-0 flex-col rounded-xl bg-card p-4">
          <SourcePicker
            sources={sources}
            selectedId={effectiveSelectedId}
            liveId={streamer.liveSourceId}
            isLive={isLive}
            onSelect={onSelectSource}
            onRefresh={refresh}
          />
        </div>

        {settings && (
          <div className="min-h-0 space-y-4 overflow-y-auto pr-1">
            <ConnectionSection
              serverUrl={settings.serverUrl}
              hasStreamKey={settings.hasStreamKey}
              disabled={isBusy}
              onServerUrlChange={onServerUrlChange}
              onSaveStreamKey={saveStreamKey}
            />
            <VideoSection
              settings={settings}
              isLive={isLive}
              onChange={onChange}
            />
            <AudioSection
              audio={settings.audio}
              audioBitrateKbps={settings.audioBitrateKbps}
              sourceKind={selectedSource?.kind}
              onChange={onChange}
            />
          </div>
        )}
      </main>

      <GoLiveBar
        status={streamer.status}
        stats={streamer.stats}
        previewTrack={streamer.previewTrack}
        summary={summary}
        error={streamer.error}
        onStart={onStart}
        onStop={onStop}
        onDismissError={streamer.clearError}
      />

      <Toaster theme="dark" position="top-center" />
    </div>
  );
});

export const App = () => {
  const [language, setLanguage] = useState<TLanguage>(
    () => readStoredLanguage() ?? getDefaultLanguage()
  );

  const onLanguageChange = useCallback((next: TLanguage) => {
    setLanguage(next);

    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
    } catch {
      // the language falls back to the system's next time, which is fine
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  return (
    <LanguageContext.Provider value={language}>
      <StreamApp language={language} onLanguageChange={onLanguageChange} />
    </LanguageContext.Provider>
  );
};
