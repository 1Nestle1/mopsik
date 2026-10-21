import { cn } from '@sharkord/ui';
import { Monitor } from 'lucide-react';
import { memo, useCallback } from 'react';
import type { TCaptureSource } from '../../shared/types';
import { useT } from '../lib/i18n';

type TSourceCardProps = {
  source: TCaptureSource;
  isSelected: boolean;
  isLive: boolean;
  onSelect: (sourceId: string) => void;
};

export const SourceCard = memo(
  ({ source, isSelected, isLive, onSelect }: TSourceCardProps) => {
    const t = useT();
    const onClick = useCallback(
      () => onSelect(source.id),
      [onSelect, source.id]
    );

    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={isSelected}
        className={cn(
          'group flex flex-col gap-2 rounded-xl p-2 text-left transition-colors duration-150 ease-emphasized',
          isSelected ? 'bg-primary/12' : 'hover:bg-foreground/[0.06]'
        )}
      >
        <div
          className={cn(
            'relative aspect-video w-full overflow-hidden rounded-lg bg-muted ring-2 ring-transparent transition-shadow',
            isSelected && 'ring-foreground/60',
            isLive && 'ring-live'
          )}
        >
          <img
            src={source.thumbnail}
            alt=""
            className="size-full object-contain"
            draggable={false}
          />
          {isLive && (
            <span className="absolute left-2 top-2 rounded-full bg-live px-2 py-0.5 text-[11px] font-semibold text-background">
              {t('sourcesSelected')}
            </span>
          )}
        </div>
        <div className="flex min-w-0 items-center gap-2 px-1">
          {source.appIcon ? (
            <img src={source.appIcon} alt="" className="size-4 shrink-0" />
          ) : (
            <Monitor className="size-4 shrink-0 text-muted-foreground" />
          )}
          <span className="truncate text-sm">{source.name}</span>
        </div>
      </button>
    );
  }
);
