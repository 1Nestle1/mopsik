import { cn } from '@/lib/utils';
import { Resolution } from '@/types';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

type TScreenSharePreset = {
  id: string;
  labelKey: 'screenPresetSmooth' | 'screenPresetSharp' | 'screenPresetBest';
  resolution: Resolution;
  framerate: number;
  bitrate: number;
};

// bitrates in kbps, sized for h264 at that resolution and frame rate. the server's own cap
// still applies on top, see applyScreenPreset in the devices screen
const SCREEN_SHARE_PRESETS: TScreenSharePreset[] = [
  {
    id: 'smooth',
    labelKey: 'screenPresetSmooth',
    resolution: Resolution['720p'],
    framerate: 60,
    bitrate: 4000
  },
  {
    id: 'sharp',
    labelKey: 'screenPresetSharp',
    resolution: Resolution['1080p'],
    framerate: 30,
    bitrate: 6000
  },
  {
    id: 'best',
    labelKey: 'screenPresetBest',
    resolution: Resolution['1080p'],
    framerate: 60,
    bitrate: 8000
  }
];

type TPresetChipProps = {
  preset: TScreenSharePreset;
  isActive: boolean;
  onApply: (preset: TScreenSharePreset) => void;
};

const PresetChip = memo(({ preset, isActive, onApply }: TPresetChipProps) => {
  const { t } = useTranslation('settings');

  const onClick = useCallback(() => onApply(preset), [onApply, preset]);

  return (
    <button
      type="button"
      aria-pressed={isActive}
      onClick={onClick}
      className={cn(
        'rounded-full px-3 py-1.5 text-sm transition-colors duration-150 ease-emphasized',
        isActive
          ? 'bg-primary/12 font-medium text-foreground'
          : 'bg-muted text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground'
      )}
    >
      {t(preset.labelKey)}
    </button>
  );
});

type TScreenSharePresetsProps = {
  resolution: Resolution;
  framerate: number;
  onApply: (preset: TScreenSharePreset) => void;
};

const ScreenSharePresets = memo(
  ({ resolution, framerate, onApply }: TScreenSharePresetsProps) => (
    <div className="flex flex-wrap gap-2">
      {SCREEN_SHARE_PRESETS.map((preset) => (
        <PresetChip
          key={preset.id}
          preset={preset}
          isActive={
            preset.resolution === resolution && preset.framerate === framerate
          }
          onApply={onApply}
        />
      ))}
    </div>
  )
);

export { ScreenSharePresets, type TScreenSharePreset };
