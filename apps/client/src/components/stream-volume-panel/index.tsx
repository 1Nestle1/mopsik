import {
  useStreamVolumeControl,
  type TStreamVolumeTarget
} from '@/components/voice-provider/hooks/use-stream-volume-control';
import { Button, Slider } from '@sharkord/ui';
import { Volume2, VolumeX } from 'lucide-react';
import { memo, useCallback, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

type TStreamVolumePanelProps = {
  target: TStreamVolumeTarget;
  header?: ReactNode;
};

const StreamVolumePanel = memo(
  ({ target, header }: TStreamVolumePanelProps) => {
    const { t } = useTranslation('sidebar');
    const { volume, isMuted, setVolume, toggleMute } =
      useStreamVolumeControl(target);

    const onValueChange = useCallback(
      ([value]: number[]) => setVolume(value ?? 0),
      [setVolume]
    );

    return (
      <div className="px-2 py-2">
        {header && <div className="mb-3 flex items-center gap-2">{header}</div>}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleMute}
            aria-pressed={isMuted}
            aria-label={t('muteForMe')}
            title={t('muteForMe')}
            className="size-7 shrink-0"
          >
            {isMuted ? (
              <VolumeX className="size-4 text-muted-foreground" />
            ) : (
              <Volume2 className="size-4" />
            )}
          </Button>
          <Slider
            value={[volume]}
            onValueChange={onValueChange}
            min={0}
            max={100}
            step={1}
            aria-label={t('userVolume')}
            className="flex-1"
          />
          <span className="w-9 shrink-0 text-right font-mono text-xs tabular-nums text-muted-foreground">
            {volume}%
          </span>
        </div>
      </div>
    );
  }
);

export { StreamVolumePanel };
