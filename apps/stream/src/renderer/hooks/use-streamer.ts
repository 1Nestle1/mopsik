import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AudioSourceKind,
  type TAudioSettings,
  type TStreamSettings
} from '../../shared/types';
import { api } from '../lib/api';
import {
  captureAppAudio,
  captureDeviceAudio,
  captureSystemAudio,
  captureVideo,
  type TCapturedAudio
} from '../lib/capture';
import { useT } from '../lib/i18n';
import { getWindowHandle } from '../lib/presets';
import {
  summarizeStats,
  type TStatsSample,
  type TStreamStats
} from '../lib/stats';
import {
  applyVideoEncoding,
  publish,
  type TPublisher
} from '../lib/whip-publisher';

export type TStreamStatus = 'idle' | 'starting' | 'live' | 'error';

type TSession = {
  publisher: TPublisher;
  sourceId: string;
  videoTrack: MediaStreamTrack;
  audio: TCapturedAudio | undefined;
  statsSample?: TStatsSample;
};

const STATS_INTERVAL_MS = 1_000;

const getMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

const isSameAudio = (a: TAudioSettings, b: TAudioSettings) =>
  a.kind === b.kind && a.appPid === b.appPid && a.deviceId === b.deviceId;

export const useStreamer = () => {
  const t = useT();
  const [status, setStatus] = useState<TStreamStatus>('idle');
  const [error, setError] = useState<string>();
  const [stats, setStats] = useState<TStreamStats>();
  const [startedAt, setStartedAt] = useState<number>();
  const [liveSourceId, setLiveSourceId] = useState<string>();
  const [previewTrack, setPreviewTrack] = useState<MediaStreamTrack>();
  const sessionRef = useRef<TSession | undefined>(undefined);
  // every change to a live stream runs after the one before, so two quick clicks can't race
  const queueRef = useRef<Promise<unknown>>(Promise.resolve());

  const enqueue = useCallback(<T>(work: () => Promise<T>) => {
    const next = queueRef.current.then(work);

    queueRef.current = next.catch(() => undefined);

    return next;
  }, []);

  const captureAudio = useCallback(
    async (sourceId: string, audio: TAudioSettings) => {
      switch (audio.kind) {
        case AudioSourceKind.NONE:
          return undefined;
        case AudioSourceKind.SYSTEM:
          return captureSystemAudio();
        case AudioSourceKind.DEVICE:
          if (!audio.deviceId) throw new Error(t('pickDeviceFirst'));

          return captureDeviceAudio(audio.deviceId);
        case AudioSourceKind.APP:
        case AudioSourceKind.ALL_EXCEPT:
          if (!audio.appPid) throw new Error(t('pickAppFirst'));

          return captureAppAudio(
            audio.appPid,
            audio.kind === AudioSourceKind.APP ? 'include' : 'exclude'
          );
        case AudioSourceKind.WINDOW_APP: {
          const hwnd = getWindowHandle(sourceId);

          if (hwnd === undefined) throw new Error(t('needWindowForAudio'));

          const apps = await api.listAudioApps();
          const app = apps.find((candidate) => candidate.hwnd === hwnd);

          if (!app) throw new Error(t('appNotFound'));

          return captureAppAudio(app.pid, 'include');
        }
      }
    },
    [t]
  );

  const teardown = useCallback(async () => {
    const session = sessionRef.current;

    sessionRef.current = undefined;

    if (!session) return;

    session.videoTrack.stop();
    await session.audio?.stop();
    await session.publisher.stop();
  }, []);

  const resetLiveState = useCallback(() => {
    setStats(undefined);
    setStartedAt(undefined);
    setLiveSourceId(undefined);
    setPreviewTrack(undefined);
  }, []);

  const fail = useCallback(
    async (message: string) => {
      await teardown();
      resetLiveState();
      setStatus('error');
      setError(message);
    },
    [teardown, resetLiveState]
  );

  const failRef = useRef(fail);

  useEffect(() => {
    failRef.current = fail;
  }, [fail]);

  const start = useCallback(
    (sourceId: string, settings: TStreamSettings) =>
      enqueue(async () => {
        if (sessionRef.current) return;

        setStatus('starting');
        setError(undefined);
        setStats(undefined);

        let videoTrack: MediaStreamTrack | undefined;
        let audio: TCapturedAudio | undefined;

        try {
          videoTrack = await captureVideo(sourceId, settings);
          audio = await captureAudio(sourceId, settings.audio);

          const publisher = await publish({
            videoTrack,
            audioTrack: audio?.track,
            settings,
            onConnectionStateChange: (state) => {
              if (state === 'failed') failRef.current(t('connectionLost'));
            }
          });

          sessionRef.current = { publisher, sourceId, videoTrack, audio };

          setPreviewTrack(videoTrack);
          setLiveSourceId(sourceId);
          setStartedAt(Date.now());
          setStatus('live');
        } catch (startError) {
          videoTrack?.stop();
          await audio?.stop();

          setStatus('error');
          setError(getMessage(startError));
        }
      }),
    [enqueue, captureAudio, t]
  );

  const stop = useCallback(
    () =>
      enqueue(async () => {
        await teardown();
        resetLiveState();
        setStatus('idle');
      }),
    [enqueue, teardown, resetLiveState]
  );

  const replaceAudio = useCallback(
    async (session: TSession, sourceId: string, audio: TAudioSettings) => {
      // the helper captures one thing at a time, so the old capture ends before the new one
      await session.audio?.stop();
      session.audio = undefined;

      const next = await captureAudio(sourceId, audio);

      session.audio = next;
      await session.publisher.audioSender.replaceTrack(next?.track ?? null);
    },
    [captureAudio]
  );

  const switchSource = useCallback(
    (sourceId: string, settings: TStreamSettings) =>
      enqueue(async () => {
        const session = sessionRef.current;

        if (!session || session.sourceId === sourceId) return;

        try {
          const videoTrack = await captureVideo(sourceId, settings);

          await session.publisher.videoSender.replaceTrack(videoTrack);
          session.videoTrack.stop();
          session.videoTrack = videoTrack;
          session.sourceId = sourceId;

          setPreviewTrack(videoTrack);
          setLiveSourceId(sourceId);

          if (settings.audio.kind === AudioSourceKind.WINDOW_APP) {
            await replaceAudio(session, sourceId, settings.audio);
          }
        } catch (switchError) {
          setError(getMessage(switchError));
        }
      }),
    [enqueue, replaceAudio]
  );

  const applySettings = useCallback(
    (next: TStreamSettings, previous: TStreamSettings) =>
      enqueue(async () => {
        const session = sessionRef.current;

        if (!session) return;

        try {
          const needsNewCapture =
            next.resolution !== previous.resolution ||
            next.frameRate !== previous.frameRate;

          if (needsNewCapture) {
            const videoTrack = await captureVideo(session.sourceId, next);

            await session.publisher.videoSender.replaceTrack(videoTrack);
            session.videoTrack.stop();
            session.videoTrack = videoTrack;
            setPreviewTrack(videoTrack);
          } else {
            session.videoTrack.contentHint = next.contentHint;
          }

          await applyVideoEncoding(session.publisher.videoSender, next);

          if (next.audioBitrateKbps !== previous.audioBitrateKbps) {
            const parameters = session.publisher.audioSender.getParameters();

            for (const encoding of parameters.encodings ?? []) {
              encoding.maxBitrate = next.audioBitrateKbps * 1000;
            }

            await session.publisher.audioSender.setParameters(parameters);
          }

          if (!isSameAudio(next.audio, previous.audio)) {
            await replaceAudio(session, session.sourceId, next.audio);
          }

          setError(undefined);
        } catch (applyError) {
          setError(getMessage(applyError));
        }
      }),
    [enqueue, replaceAudio]
  );

  const clearError = useCallback(() => {
    setError(undefined);

    if (!sessionRef.current) setStatus('idle');
  }, []);

  // the helper can quit on its own, when the app it listens to closes for example
  useEffect(
    () =>
      api.onAppAudioEnded((message) => {
        if (!message || !sessionRef.current) return;

        setError(t('soundStopped', { message }));
      }),
    [t]
  );

  useEffect(() => {
    if (status !== 'live') return;

    const timer = setInterval(async () => {
      const session = sessionRef.current;

      if (!session) return;

      const report = await session.publisher.pc.getStats();
      const { summary, sample } = summarizeStats(
        [...report.values()],
        session.statsSample,
        Date.now()
      );

      session.statsSample = sample;
      setStats(summary);
    }, STATS_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [status]);

  // closing the window mid stream should still tell the server
  useEffect(
    () => () => {
      teardown();
    },
    [teardown]
  );

  return {
    status,
    error,
    stats,
    startedAt,
    liveSourceId,
    previewTrack,
    start,
    stop,
    switchSource,
    applySettings,
    clearError
  };
};
