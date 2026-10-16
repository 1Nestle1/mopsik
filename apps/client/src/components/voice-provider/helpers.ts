import {
  getLocalStorageItemAsJSON,
  LocalStorageKey,
  setLocalStorageItemAsJSON
} from '@/helpers/storage';
import { ScreenContentHint, VideoCodec, type TStreamQuality } from '@/types';
import {
  StreamKind,
  type ConsumerType,
  type TStreamQualityLayer
} from '@sharkord/shared';
import type {
  RtpCapabilities,
  RtpCodecCapability
} from 'mediasoup-client/types';
import {
  SIMULCAST_HIGH_LAYER_SCALE,
  SIMULCAST_LOW_LAYER_BITRATE_RATIO,
  SIMULCAST_LOW_LAYER_MAX_BITRATE,
  SIMULCAST_LOW_LAYER_MAX_FRAMERATE,
  SIMULCAST_LOW_LAYER_SCALE,
  SIMULCAST_MID_LAYER_BITRATE_RATIO,
  SIMULCAST_MID_LAYER_MAX_BITRATE,
  SIMULCAST_MID_LAYER_MAX_FRAMERATE,
  SIMULCAST_MID_LAYER_SCALE,
  SIMULCAST_MIN_MAX_BITRATE,
  SIMULCAST_SCREEN_LOW_LAYER_BITRATE_RATIO,
  SIMULCAST_SCREEN_LOW_LAYER_MAX_BITRATE,
  SIMULCAST_SCREEN_LOW_LAYER_MAX_FRAMERATE,
  SIMULCAST_SCREEN_MID_LAYER_BITRATE_RATIO,
  SIMULCAST_SCREEN_MID_LAYER_MAX_BITRATE,
  SIMULCAST_SCREEN_MID_LAYER_MAX_FRAMERATE
} from './statics';

type TStreamQualitySettings = Record<string, TStreamQuality>;
type TRemoteConsumerTypes = Record<string, ConsumerType | undefined>;
type TRemoteQualityLayers = Record<string, TStreamQualityLayer[] | undefined>;

const loadStreamQualitiesFromStorage = (): TStreamQualitySettings => {
  try {
    return (
      getLocalStorageItemAsJSON<TStreamQualitySettings>(
        LocalStorageKey.STREAM_QUALITY_SETTINGS
      ) ?? {}
    );
  } catch {
    return {};
  }
};

const saveStreamQualitiesToStorage = (qualities: TStreamQualitySettings) => {
  try {
    setLocalStorageItemAsJSON(
      LocalStorageKey.STREAM_QUALITY_SETTINGS,
      qualities
    );
  } catch {
    // ignore
  }
};

const getStreamQualityStorageKey = (remoteId: number, kind: StreamKind) => {
  switch (kind) {
    case StreamKind.EXTERNAL_VIDEO:
      return `external-video-${remoteId}`;
    case StreamKind.SCREEN:
      return `user-screen-${remoteId}`;
    case StreamKind.VIDEO:
      return `user-video-${remoteId}`;
    default:
      return `${remoteId}-${kind}`;
  }
};

const getRemoteConsumerTypeKey = (remoteId: number, kind: StreamKind) => {
  return `${remoteId}-${kind}`;
};

const normalizeStreamQuality = (
  quality: TStreamQuality | undefined,
  layers: TStreamQualityLayer[]
): TStreamQuality => {
  if (!quality) return { mode: 'auto' };

  if (
    quality.mode === 'layer' &&
    layers.length > 0 &&
    !layers.some((layer) => layer.spatialLayer === quality.spatialLayer)
  ) {
    return { mode: 'auto' };
  }

  return quality;
};

const getStreamQualityDropdownValue = (quality: TStreamQuality) => {
  return quality.mode === 'auto' ? 'auto' : `layer-${quality.spatialLayer}`;
};

const parseStreamQualityDropdownValue = (value: string): TStreamQuality => {
  if (value === 'auto') return { mode: 'auto' };

  return {
    mode: 'layer',
    spatialLayer: Number(value.replace('layer-', ''))
  };
};

const getStoredStreamQuality = (
  remoteId: number,
  kind: StreamKind,
  layers: TStreamQualityLayer[]
): TStreamQuality => {
  const qualities = loadStreamQualitiesFromStorage();

  return normalizeStreamQuality(
    qualities[getStreamQualityStorageKey(remoteId, kind)],
    layers
  );
};

const getSimulcastEncodings = (
  maxBitrate: number
): RTCRtpEncodingParameters[] => {
  const safeMaxBitrate = Math.max(SIMULCAST_MIN_MAX_BITRATE, maxBitrate);

  return [
    {
      maxBitrate: Math.min(
        SIMULCAST_LOW_LAYER_MAX_BITRATE,
        Math.round(safeMaxBitrate * SIMULCAST_LOW_LAYER_BITRATE_RATIO)
      ),
      maxFramerate: SIMULCAST_LOW_LAYER_MAX_FRAMERATE,
      scaleResolutionDownBy: SIMULCAST_LOW_LAYER_SCALE
    },
    {
      maxBitrate: Math.min(
        SIMULCAST_MID_LAYER_MAX_BITRATE,
        Math.round(safeMaxBitrate * SIMULCAST_MID_LAYER_BITRATE_RATIO)
      ),
      maxFramerate: SIMULCAST_MID_LAYER_MAX_FRAMERATE,
      scaleResolutionDownBy: SIMULCAST_MID_LAYER_SCALE
    },
    {
      maxBitrate: safeMaxBitrate,
      scaleResolutionDownBy: SIMULCAST_HIGH_LAYER_SCALE
    }
  ];
};

const getScreenShareSimulcastEncodings = (
  maxBitrate: number
): RTCRtpEncodingParameters[] => {
  const safeMaxBitrate = Math.max(SIMULCAST_MIN_MAX_BITRATE, maxBitrate);

  return [
    {
      maxBitrate: Math.min(
        SIMULCAST_SCREEN_LOW_LAYER_MAX_BITRATE,
        Math.round(safeMaxBitrate * SIMULCAST_SCREEN_LOW_LAYER_BITRATE_RATIO)
      ),
      maxFramerate: SIMULCAST_SCREEN_LOW_LAYER_MAX_FRAMERATE,
      scaleResolutionDownBy: SIMULCAST_LOW_LAYER_SCALE
    },
    {
      maxBitrate: Math.min(
        SIMULCAST_SCREEN_MID_LAYER_MAX_BITRATE,
        Math.round(safeMaxBitrate * SIMULCAST_SCREEN_MID_LAYER_BITRATE_RATIO)
      ),
      maxFramerate: SIMULCAST_SCREEN_MID_LAYER_MAX_FRAMERATE,
      scaleResolutionDownBy: SIMULCAST_MID_LAYER_SCALE
    },
    {
      maxBitrate: safeMaxBitrate,
      scaleResolutionDownBy: SIMULCAST_HIGH_LAYER_SCALE
    }
  ];
};

const getSimulcastQualityLayers = (
  encodings: RTCRtpEncodingParameters[]
): TStreamQualityLayer[] => {
  return encodings.map((_, index) => {
    return {
      spatialLayer: index,
      label:
        index === 0 ? 'Low' : index === encodings.length - 1 ? 'High' : 'Medium'
    };
  });
};

const EXTERNAL_STREAM_KINDS: StreamKind[] = [
  StreamKind.EXTERNAL_AUDIO,
  StreamKind.EXTERNAL_VIDEO
];

const isOwnProducerEvent = (
  remoteId: number,
  ownUserId: number | undefined,
  kind: StreamKind
): boolean => {
  if (EXTERNAL_STREAM_KINDS.includes(kind)) return false;

  return ownUserId !== undefined && remoteId === ownUserId;
};

const getSimulcastCodec = (
  rtpCapabilities: RtpCapabilities | null
): RtpCodecCapability | undefined =>
  rtpCapabilities?.codecs?.find(
    (c) => c.mimeType.toLowerCase() === VideoCodec.VP8.toLowerCase()
  );

// most graphics cards encode h264 in hardware, which keeps fast motion smooth where a
// software vp9 encoder starts dropping frames. text keeps the router's first choice, whose
// sharper compression of screen content is worth the extra cpu
const getAutoScreenCodec = (
  rtpCapabilities: RtpCapabilities | null,
  contentHint: ScreenContentHint
): RtpCodecCapability | undefined => {
  if (contentHint !== ScreenContentHint.MOTION) return undefined;

  return rtpCapabilities?.codecs?.find(
    (c) => c.mimeType.toLowerCase() === VideoCodec.H264.toLowerCase()
  );
};

type TDegradationPreference = 'maintain-framerate' | 'maintain-resolution';

// missing from the dom typings, though chromium and firefox both honour it
type TSendParametersWithDegradation = RTCRtpSendParameters & {
  degradationPreference?: TDegradationPreference;
};

const DEGRADATION_BY_CONTENT_HINT: Record<
  ScreenContentHint,
  TDegradationPreference
> = {
  [ScreenContentHint.MOTION]: 'maintain-framerate',
  [ScreenContentHint.DETAIL]: 'maintain-resolution'
};

// chromium defaults screen capture to maintain-resolution whatever the content hint says,
// which is what turns a shared game or film into a slideshow once the encoder falls behind
const applyScreenDegradationPreference = async (
  sender: RTCRtpSender | undefined,
  contentHint: ScreenContentHint
) => {
  if (!sender) return;

  const parameters = sender.getParameters() as TSendParametersWithDegradation;

  parameters.degradationPreference = DEGRADATION_BY_CONTENT_HINT[contentHint];

  await sender.setParameters(parameters);
};

export {
  applyScreenDegradationPreference,
  getAutoScreenCodec,
  getRemoteConsumerTypeKey,
  getScreenShareSimulcastEncodings,
  getSimulcastCodec,
  getSimulcastEncodings,
  getSimulcastQualityLayers,
  getStoredStreamQuality,
  getStreamQualityDropdownValue,
  getStreamQualityStorageKey,
  isOwnProducerEvent,
  loadStreamQualitiesFromStorage,
  normalizeStreamQuality,
  parseStreamQualityDropdownValue,
  saveStreamQualitiesToStorage
};

export type {
  TRemoteConsumerTypes,
  TRemoteQualityLayers,
  TStreamQualitySettings
};
