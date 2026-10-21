import { cn } from '@sharkord/ui';
import { Radio } from 'lucide-react';
import { memo, useCallback, useEffect, useState } from 'react';
import type { TStreamStatus } from '../hooks/use-streamer';
import { useT, type TLanguage } from '../lib/i18n';

const formatDuration = (milliseconds: number) => {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value: number) => String(value).padStart(2, '0');

  if (hours > 0) return `${hours}:${pad(minutes)}:${pad(seconds)}`;

  return `${pad(minutes)}:${pad(seconds)}`;
};

const LiveTimer = memo(({ startedAt }: { startedAt: number }) => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <span className="font-mono tabular-nums">
      {formatDuration(now - startedAt)}
    </span>
  );
});

type TStatusPillProps = {
  status: TStreamStatus;
  startedAt: number | undefined;
};

const StatusPill = memo(({ status, startedAt }: TStatusPillProps) => {
  const t = useT();

  if (status === 'live') {
    return (
      <span className="inline-flex items-center gap-2 rounded-full bg-live/15 px-3 py-1 text-xs font-semibold text-live">
        <span className="size-2 animate-pulse rounded-full bg-live motion-reduce:animate-none" />
        {t('statusLive')}
        {startedAt && <LiveTimer startedAt={startedAt} />}
      </span>
    );
  }

  const labels: Record<Exclude<TStreamStatus, 'live'>, string> = {
    idle: t('statusReady'),
    starting: t('statusStarting'),
    error: t('statusStopped')
  };

  return (
    <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
      {labels[status]}
    </span>
  );
});

type TLanguageButtonProps = {
  language: TLanguage;
  current: TLanguage;
  onSelect: (language: TLanguage) => void;
};

const LanguageButton = memo(
  ({ language, current, onSelect }: TLanguageButtonProps) => {
    const onClick = useCallback(() => onSelect(language), [onSelect, language]);

    return (
      <button
        type="button"
        aria-pressed={language === current}
        onClick={onClick}
        className={cn(
          'rounded-full px-2.5 py-1 text-xs font-medium uppercase transition-colors',
          language === current
            ? 'bg-primary/12 text-foreground'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        {language}
      </button>
    );
  }
);

type THeaderProps = {
  status: TStreamStatus;
  startedAt: number | undefined;
  language: TLanguage;
  onLanguageChange: (language: TLanguage) => void;
};

export const Header = memo(
  ({ status, startedAt, language, onLanguageChange }: THeaderProps) => {
    const t = useT();

    return (
      <header className="flex h-14 shrink-0 items-center justify-between bg-sidebar px-5">
        <div className="flex items-center gap-2.5">
          <Radio className="size-5 text-live" />
          <h1 className="text-base font-semibold">{t('appName')}</h1>
        </div>
        <div className="flex items-center gap-3">
          <div
            className="flex items-center rounded-full bg-muted p-0.5"
            role="group"
            aria-label={t('language')}
          >
            <LanguageButton
              language="en"
              current={language}
              onSelect={onLanguageChange}
            />
            <LanguageButton
              language="ru"
              current={language}
              onSelect={onLanguageChange}
            />
          </div>
          <StatusPill status={status} startedAt={startedAt} />
        </div>
      </header>
    );
  }
);
