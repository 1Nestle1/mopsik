import { Resolution, type TStreamSettings } from '../../shared/types';

export const RESOLUTION_SIZES: Record<
  Exclude<Resolution, Resolution.SOURCE>,
  { width: number; height: number }
> = {
  [Resolution.P1440]: { width: 2560, height: 1440 },
  [Resolution.P1080]: { width: 1920, height: 1080 },
  [Resolution.P900]: { width: 1600, height: 900 },
  [Resolution.P720]: { width: 1280, height: 720 },
  [Resolution.P480]: { width: 854, height: 480 }
};

// the largest a source is allowed to be when "source size" is picked
export const SOURCE_MAX_SIZE = { width: 3840, height: 2160 };

export const FRAME_RATES = [15, 24, 30, 60];

export const VIDEO_BITRATE_RANGE = { min: 1000, max: 20000, step: 500 };

export const AUDIO_BITRATES = [64, 96, 128, 160, 192, 256];

export type TQualityPreset = {
  id: string;
  resolution: Resolution;
  frameRate: number;
  videoBitrateKbps: number;
};

// bitrates sized for h264: enough that fast motion doesn't smear, not so much that friends
// on a slow connection fall behind
export const QUALITY_PRESETS: TQualityPreset[] = [
  {
    id: 'light',
    resolution: Resolution.P720,
    frameRate: 30,
    videoBitrateKbps: 2500
  },
  {
    id: 'smooth',
    resolution: Resolution.P720,
    frameRate: 60,
    videoBitrateKbps: 4500
  },
  {
    id: 'sharp',
    resolution: Resolution.P1080,
    frameRate: 30,
    videoBitrateKbps: 6000
  },
  {
    id: 'best',
    resolution: Resolution.P1080,
    frameRate: 60,
    videoBitrateKbps: 8000
  },
  {
    id: 'ultra',
    resolution: Resolution.P1440,
    frameRate: 60,
    videoBitrateKbps: 14000
  }
];

export const getMatchingPreset = (
  settings: Pick<
    TStreamSettings,
    'resolution' | 'frameRate' | 'videoBitrateKbps'
  >
) =>
  QUALITY_PRESETS.find(
    (preset) =>
      preset.resolution === settings.resolution &&
      preset.frameRate === settings.frameRate &&
      preset.videoBitrateKbps === settings.videoBitrateKbps
  );

export const getCaptureSize = (resolution: Resolution) => {
  if (resolution === Resolution.SOURCE) return SOURCE_MAX_SIZE;

  return RESOLUTION_SIZES[resolution];
};

// window sources carry the window handle in their id: "window:<hwnd>:<n>"
export const getWindowHandle = (sourceId: string) => {
  const [kind, handle] = sourceId.split(':');

  if (kind !== 'window' || !handle) return undefined;

  const hwnd = Number(handle);

  return Number.isFinite(hwnd) ? hwnd : undefined;
};
