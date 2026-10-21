import {
  cn,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Slider
} from '@sharkord/ui';
import { memo, useCallback } from 'react';
import {
  ContentHint,
  Resolution,
  VideoCodecPreference,
  type TStreamSettings
} from '../../shared/types';
import { useT, type TKey } from '../lib/i18n';
import {
  FRAME_RATES,
  getMatchingPreset,
  QUALITY_PRESETS,
  VIDEO_BITRATE_RANGE,
  type TQualityPreset
} from '../lib/presets';
import { Field, Section } from './section';

type TVideoChanges = Partial<
  Pick<
    TStreamSettings,
    'resolution' | 'frameRate' | 'videoBitrateKbps' | 'codec' | 'contentHint'
  >
>;

const PRESET_LABELS: Record<string, TKey> = {
  light: 'presetLight',
  smooth: 'presetSmooth',
  sharp: 'presetSharp',
  best: 'presetBest',
  ultra: 'presetUltra'
};

const RESOLUTION_OPTIONS = [
  Resolution.SOURCE,
  Resolution.P1440,
  Resolution.P1080,
  Resolution.P900,
  Resolution.P720,
  Resolution.P480
];

const CODEC_OPTIONS = [
  VideoCodecPreference.H264,
  VideoCodecPreference.AV1,
  VideoCodecPreference.VP9,
  VideoCodecPreference.VP8
];

const formatMbps = (kbps: number) => `${(kbps / 1000).toFixed(1)} Mbit/s`;

type TPresetChipProps = {
  preset: TQualityPreset;
  isActive: boolean;
  onApply: (preset: TQualityPreset) => void;
};

const PresetChip = memo(({ preset, isActive, onApply }: TPresetChipProps) => {
  const t = useT();
  const onClick = useCallback(() => onApply(preset), [onApply, preset]);

  return (
    <button
      type="button"
      aria-pressed={isActive}
      onClick={onClick}
      className={cn(
        'rounded-full px-3 py-1.5 text-xs transition-colors duration-150 ease-emphasized',
        isActive
          ? 'bg-primary/12 font-medium text-foreground'
          : 'bg-muted text-muted-foreground hover:bg-foreground/[0.08] hover:text-foreground'
      )}
    >
      {t(PRESET_LABELS[preset.id] ?? 'presetBest')}
    </button>
  );
});

type TVideoSectionProps = {
  settings: TStreamSettings;
  isLive: boolean;
  onChange: (changes: TVideoChanges) => void;
};

export const VideoSection = memo(
  ({ settings, isLive, onChange }: TVideoSectionProps) => {
    const t = useT();
    const activePreset = getMatchingPreset(settings);

    const onApplyPreset = useCallback(
      (preset: TQualityPreset) =>
        onChange({
          resolution: preset.resolution,
          frameRate: preset.frameRate,
          videoBitrateKbps: preset.videoBitrateKbps
        }),
      [onChange]
    );

    const onResolution = useCallback(
      (value: string) => onChange({ resolution: value as Resolution }),
      [onChange]
    );

    const onFrameRate = useCallback(
      (value: string) => onChange({ frameRate: Number(value) }),
      [onChange]
    );

    const onBitrate = useCallback(
      ([value]: number[]) =>
        onChange({ videoBitrateKbps: value ?? settings.videoBitrateKbps }),
      [onChange, settings.videoBitrateKbps]
    );

    const onCodec = useCallback(
      (value: string) => onChange({ codec: value as VideoCodecPreference }),
      [onChange]
    );

    const onContentHint = useCallback(
      (value: string) => onChange({ contentHint: value as ContentHint }),
      [onChange]
    );

    return (
      <Section title={t('videoTitle')}>
        <Field label={t('presets')}>
          <div className="flex flex-wrap gap-1.5">
            {QUALITY_PRESETS.map((preset) => (
              <PresetChip
                key={preset.id}
                preset={preset}
                isActive={activePreset?.id === preset.id}
                onApply={onApplyPreset}
              />
            ))}
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label={t('resolution')}>
            <Select value={settings.resolution} onValueChange={onResolution}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {RESOLUTION_OPTIONS.map((resolution) => (
                    <SelectItem key={resolution} value={resolution}>
                      {resolution === Resolution.SOURCE
                        ? t('resolutionSource')
                        : resolution}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>

          <Field label={t('frameRate')}>
            <Select
              value={String(settings.frameRate)}
              onValueChange={onFrameRate}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {FRAME_RATES.map((frameRate) => (
                    <SelectItem key={frameRate} value={String(frameRate)}>
                      {t('frameRateValue', { value: frameRate })}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
        </div>

        <Field label={t('bitrate')} hint={t('bitrateHint')}>
          <Slider
            min={VIDEO_BITRATE_RANGE.min}
            max={VIDEO_BITRATE_RANGE.max}
            step={VIDEO_BITRATE_RANGE.step}
            value={[settings.videoBitrateKbps]}
            onValueChange={onBitrate}
            rightSlot={
              <span className="w-20 text-right font-mono text-xs tabular-nums text-muted-foreground">
                {formatMbps(settings.videoBitrateKbps)}
              </span>
            }
          />
        </Field>

        <Field label={t('codec')}>
          <Select value={settings.codec} onValueChange={onCodec}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value={VideoCodecPreference.AUTO}>
                  {t('codecAuto')}
                </SelectItem>
                {CODEC_OPTIONS.map((codec) => (
                  <SelectItem key={codec} value={codec}>
                    {codec.replace('video/', '').replace('H264', 'H.264')}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>

        <Field label={t('optimizeFor')} hint={t('optimizeHint')}>
          <Select value={settings.contentHint} onValueChange={onContentHint}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value={ContentHint.MOTION}>
                  {t('optimizeMotion')}
                </SelectItem>
                <SelectItem value={ContentHint.DETAIL}>
                  {t('optimizeDetail')}
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>

        {isLive && (
          <p className="text-xs text-muted-foreground">{t('liveChangeHint')}</p>
        )}
      </Section>
    );
  }
);
