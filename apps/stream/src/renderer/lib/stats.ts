export type TStreamStats = {
  width?: number;
  height?: number;
  framesPerSecond?: number;
  videoKbps: number;
  audioKbps: number;
  codec?: string;
  // the encoder's own name, e.g. "MediaFoundationVideoEncodeAccelerator" or "OpenH264"
  encoder?: string;
  isHardwareEncoder: boolean;
  // why the encoder is holding back: "cpu", "bandwidth", or "none"
  qualityLimitation?: string;
  roundTripMs?: number;
  packetLossPercent?: number;
};

export type TStatsSample = {
  timestamp: number;
  videoBytes: number;
  audioBytes: number;
};

type TStat = Record<string, unknown> & { type: string; id: string };

const HARDWARE_ENCODER_PATTERN =
  /MediaFoundation|NVENC|Nvidia|AMF|QuickSync|VaapiVideoEncode|VideoToolbox|EncodeAccelerator/i;

const asNumber = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

const toKbps = (bytes: number, seconds: number) =>
  seconds > 0 ? Math.round((bytes * 8) / 1000 / seconds) : 0;

// turns one getStats() report, and the sample from the previous one, into what the go-live
// bar shows. bitrates need two reports, so the first call only reads the rest
export const summarizeStats = (
  stats: Iterable<TStat>,
  previous: TStatsSample | undefined,
  now: number
) => {
  const byId = new Map<string, TStat>();

  for (const stat of stats) byId.set(stat.id, stat);

  const all = [...byId.values()];
  const video = all.find(
    (stat) => stat.type === 'outbound-rtp' && stat.kind === 'video'
  );
  const audio = all.find(
    (stat) => stat.type === 'outbound-rtp' && stat.kind === 'audio'
  );
  const remoteVideo = all.find(
    (stat) => stat.type === 'remote-inbound-rtp' && stat.kind === 'video'
  );
  const pair = all.find(
    (stat) => stat.type === 'candidate-pair' && stat.nominated === true
  );

  const videoBytes = asNumber(video?.bytesSent) ?? 0;
  const audioBytes = asNumber(audio?.bytesSent) ?? 0;
  const seconds = previous ? (now - previous.timestamp) / 1000 : 0;

  const codecStat = video?.codecId
    ? byId.get(String(video.codecId))
    : undefined;
  const encoder =
    typeof video?.encoderImplementation === 'string'
      ? video.encoderImplementation
      : undefined;
  const roundTrip =
    asNumber(remoteVideo?.roundTripTime) ??
    asNumber(pair?.currentRoundTripTime);
  const fractionLost = asNumber(remoteVideo?.fractionLost);

  const summary: TStreamStats = {
    width: asNumber(video?.frameWidth),
    height: asNumber(video?.frameHeight),
    framesPerSecond: asNumber(video?.framesPerSecond),
    videoKbps: previous
      ? toKbps(Math.max(0, videoBytes - previous.videoBytes), seconds)
      : 0,
    audioKbps: previous
      ? toKbps(Math.max(0, audioBytes - previous.audioBytes), seconds)
      : 0,
    codec:
      typeof codecStat?.mimeType === 'string'
        ? codecStat.mimeType.replace(/^video\//, '')
        : undefined,
    encoder,
    isHardwareEncoder: !!encoder && HARDWARE_ENCODER_PATTERN.test(encoder),
    qualityLimitation:
      typeof video?.qualityLimitationReason === 'string'
        ? video.qualityLimitationReason
        : undefined,
    roundTripMs:
      roundTrip === undefined ? undefined : Math.round(roundTrip * 1000),
    packetLossPercent:
      fractionLost === undefined
        ? undefined
        : Math.round(fractionLost * 1000) / 10
  };

  return {
    summary,
    sample: { timestamp: now, videoBytes, audioBytes } satisfies TStatsSample
  };
};
