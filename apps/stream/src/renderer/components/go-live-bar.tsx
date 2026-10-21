import { Button, cn, Spinner } from '@sharkord/ui';
import { Radio, Square, X } from 'lucide-react';
import { memo, useEffect, useRef } from 'react';
import type { TStreamStatus } from '../hooks/use-streamer';
import { useT } from '../lib/i18n';
import type { TStreamStats } from '../lib/stats';

const Preview = memo(({ track }: { track: MediaStreamTrack | undefined }) => {
  const t = useT();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;

    if (!video) return;

    video.srcObject = track ? new MediaStream([track]) : null;
  }, [track]);

  return (
    <div className="relative aspect-video w-44 shrink-0 overflow-hidden rounded-lg bg-muted">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        aria-label={t('previewAlt')}
        className={cn('size-full object-contain', !track && 'hidden')}
      />
      {!track && (
        <Radio className="absolute left-1/2 top-1/2 size-6 -translate-x-1/2 -translate-y-1/2 text-muted-foreground/50" />
      )}
    </div>
  );
});

type TChipProps = {
  children: string;
  tone?: 'live' | 'warning';
  title?: string;
};

const Chip = memo(({ children, tone, title }: TChipProps) => (
  <span
    title={title}
    className={cn(
      'rounded-full bg-muted px-2.5 py-1 font-mono text-xs tabular-nums',
      tone === 'live' && 'bg-live/15 text-live',
      tone === 'warning' && 'bg-warning/15 text-warning'
    )}
  >
    {children}
  </span>
));

const StatsChips = memo(({ stats }: { stats: TStreamStats }) => {
  const t = useT();
  const limitation = stats.qualityLimitation;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {stats.width && stats.height && (
        <Chip>{`${stats.width}×${stats.height}`}</Chip>
      )}
      {stats.framesPerSecond !== undefined && (
        <Chip>{`${Math.round(stats.framesPerSecond)} fps`}</Chip>
      )}
      <Chip>{`${((stats.videoKbps + stats.audioKbps) / 1000).toFixed(1)} Mbit/s`}</Chip>
      {stats.codec && <Chip>{stats.codec}</Chip>}
      {stats.encoder && (
        <Chip
          tone={stats.isHardwareEncoder ? 'live' : undefined}
          title={stats.encoder}
        >
          {stats.isHardwareEncoder ? t('statsGpu') : t('statsCpu')}
        </Chip>
      )}
      {limitation === 'cpu' && (
        <Chip tone="warning">{t('statsLimitedCpu')}</Chip>
      )}
      {limitation === 'bandwidth' && (
        <Chip tone="warning">{t('statsLimitedNetwork')}</Chip>
      )}
      {stats.roundTripMs !== undefined && (
        <Chip>{t('statsRtt', { value: stats.roundTripMs })}</Chip>
      )}
      {stats.packetLossPercent !== undefined && stats.packetLossPercent > 0 && (
        <Chip tone="warning">
          {t('statsLoss', { value: stats.packetLossPercent })}
        </Chip>
      )}
    </div>
  );
});

type TStartButtonProps = {
  isStarting: boolean;
  onStart: () => void;
};

const StartButton = memo(({ isStarting, onStart }: TStartButtonProps) => {
  const t = useT();

  if (isStarting) {
    return (
      <Button size="lg" disabled className="min-w-36">
        <Spinner size="xxs" />
        {t('starting')}
      </Button>
    );
  }

  return (
    <Button size="lg" onClick={onStart} className="min-w-36">
      <Radio />
      {t('goLive')}
    </Button>
  );
});

type TGoLiveBarProps = {
  status: TStreamStatus;
  stats: TStreamStats | undefined;
  previewTrack: MediaStreamTrack | undefined;
  summary: string;
  error: string | undefined;
  onStart: () => void;
  onStop: () => void;
  onDismissError: () => void;
};

export const GoLiveBar = memo(
  ({
    status,
    stats,
    previewTrack,
    summary,
    error,
    onStart,
    onStop,
    onDismissError
  }: TGoLiveBarProps) => {
    const t = useT();
    const isLive = status === 'live';
    const isStarting = status === 'starting';

    return (
      <footer className="shrink-0 bg-sidebar px-5 py-3">
        {error && (
          <div
            role="alert"
            className="mb-3 flex items-start justify-between gap-3 rounded-lg bg-destructive/12 px-3 py-2 text-sm text-destructive"
          >
            <span>{error}</span>
            <button
              type="button"
              onClick={onDismissError}
              aria-label={t('dismiss')}
              className="shrink-0 opacity-70 hover:opacity-100"
            >
              <X className="size-4" />
            </button>
          </div>
        )}
        <div className="flex items-center gap-4">
          <Preview track={previewTrack} />
          <div className="min-w-0 flex-1 space-y-2">
            <p className="truncate text-sm font-medium">{summary}</p>
            {isLive && stats && <StatsChips stats={stats} />}
          </div>
          {isLive ? (
            <Button
              size="lg"
              variant="destructive"
              onClick={onStop}
              className="min-w-36"
            >
              <Square className="fill-current" />
              {t('stop')}
            </Button>
          ) : (
            <StartButton isStarting={isStarting} onStart={onStart} />
          )}
        </div>
      </footer>
    );
  }
);
