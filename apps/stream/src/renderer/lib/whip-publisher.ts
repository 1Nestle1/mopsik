import {
  ContentHint,
  VideoCodecPreference,
  type TStreamSettings
} from '../../shared/types';
import { api } from './api';
import { setVideoStartBitrate, tuneOpus } from './sdp';

export class PublishError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
  }
}

type TDegradationPreference = 'maintain-framerate' | 'maintain-resolution';

type TSendParameters = RTCRtpSendParameters & {
  degradationPreference?: TDegradationPreference;
};

const ICE_GATHERING_TIMEOUT_MS = 2_000;

// hardware encoders on most graphics cards do h264, which keeps the cpu free for the game
const AUTO_CODEC = VideoCodecPreference.H264;

const getPreferredCodecs = (preference: VideoCodecPreference) => {
  const capabilities = RTCRtpSender.getCapabilities('video');

  if (!capabilities) return undefined;

  const wanted = (
    preference === VideoCodecPreference.AUTO ? AUTO_CODEC : preference
  ).toLowerCase();

  const preferred = capabilities.codecs.filter(
    (codec) => codec.mimeType.toLowerCase() === wanted
  );

  if (preferred.length === 0) return undefined;

  const rest = capabilities.codecs.filter(
    (codec) => codec.mimeType.toLowerCase() !== wanted
  );

  return [...preferred, ...rest];
};

const waitForIceGathering = (pc: RTCPeerConnection) =>
  new Promise<void>((resolve) => {
    if (pc.iceGatheringState === 'complete') {
      resolve();

      return;
    }

    const timer = setTimeout(resolve, ICE_GATHERING_TIMEOUT_MS);

    pc.addEventListener('icegatheringstatechange', () => {
      if (pc.iceGatheringState !== 'complete') return;

      clearTimeout(timer);
      resolve();
    });
  });

// bitrate and frame rate can change on a running stream, so both start and live updates use this
export const applyVideoEncoding = async (
  sender: RTCRtpSender,
  settings: Pick<
    TStreamSettings,
    'videoBitrateKbps' | 'frameRate' | 'contentHint'
  >
) => {
  const parameters = sender.getParameters() as TSendParameters;

  for (const encoding of parameters.encodings ?? []) {
    encoding.maxBitrate = settings.videoBitrateKbps * 1000;
    encoding.maxFramerate = settings.frameRate;
  }

  parameters.degradationPreference =
    settings.contentHint === ContentHint.MOTION
      ? 'maintain-framerate'
      : 'maintain-resolution';

  await sender.setParameters(parameters);
};

export type TPublisher = {
  pc: RTCPeerConnection;
  videoSender: RTCRtpSender;
  audioSender: RTCRtpSender;
  stop: () => Promise<void>;
};

export const publish = async ({
  videoTrack,
  audioTrack,
  settings,
  onConnectionStateChange
}: {
  videoTrack: MediaStreamTrack;
  audioTrack: MediaStreamTrack | undefined;
  settings: TStreamSettings;
  onConnectionStateChange: (state: RTCPeerConnectionState) => void;
}): Promise<TPublisher> => {
  const pc = new RTCPeerConnection({ bundlePolicy: 'max-bundle' });

  pc.addEventListener('connectionstatechange', () =>
    onConnectionStateChange(pc.connectionState)
  );

  const videoTransceiver = pc.addTransceiver(videoTrack, {
    direction: 'sendonly',
    sendEncodings: [
      {
        maxBitrate: settings.videoBitrateKbps * 1000,
        maxFramerate: settings.frameRate
      }
    ]
  });

  const preferredCodecs = getPreferredCodecs(settings.codec);

  if (preferredCodecs) {
    videoTransceiver.setCodecPreferences(preferredCodecs);
  }

  // the sound slot exists even with no sound picked: whip can't add one to a running stream,
  // and with the slot in place sound can be switched on or changed while live
  const audioTransceiver = pc.addTransceiver(audioTrack ?? 'audio', {
    direction: 'sendonly',
    sendEncodings: [{ maxBitrate: settings.audioBitrateKbps * 1000 }]
  });

  const stop = async () => {
    pc.close();
    await api.whipStop();
  };

  try {
    const offer = await pc.createOffer();

    await pc.setLocalDescription({
      type: 'offer',
      sdp: tuneOpus(offer.sdp ?? '', settings.audioBitrateKbps)
    });

    // whip sends the whole offer once, so it waits for the candidates to be in it
    await waitForIceGathering(pc);

    const result = await api.whipPublish(pc.localDescription?.sdp ?? '');

    if (!result.ok) throw new PublishError(result.message, result.status);

    await pc.setRemoteDescription({
      type: 'answer',
      sdp: setVideoStartBitrate(result.answerSdp, settings.videoBitrateKbps)
    });
    await applyVideoEncoding(videoTransceiver.sender, settings);

    return {
      pc,
      videoSender: videoTransceiver.sender,
      audioSender: audioTransceiver.sender,
      stop
    };
  } catch (error) {
    pc.close();

    throw error;
  }
};
