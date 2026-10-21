import pcmPlayerSource from '@/audio-worklets/pcm-player.js?raw';
import type { ContentHint, Resolution } from '../../shared/types';
import { api } from './api';
import { getCaptureSize } from './presets';

export type TCapturedAudio = {
  track: MediaStreamTrack;
  stop: () => Promise<void>;
};

// chromium's desktop capture still speaks the old mandatory constraint dialect, and it is the
// one that takes a specific screen or window id
type TDesktopConstraints = {
  mandatory: Record<string, string | number>;
};

const getUserMedia = (constraints: {
  audio: boolean | TDesktopConstraints | MediaTrackConstraints;
  video: boolean | TDesktopConstraints;
}) =>
  navigator.mediaDevices.getUserMedia(
    constraints as unknown as MediaStreamConstraints
  );

export const captureVideo = async (
  sourceId: string,
  options: {
    resolution: Resolution;
    frameRate: number;
    contentHint: ContentHint;
  }
) => {
  const size = getCaptureSize(options.resolution);

  const stream = await getUserMedia({
    audio: false,
    video: {
      mandatory: {
        chromeMediaSource: 'desktop',
        chromeMediaSourceId: sourceId,
        maxWidth: size.width,
        maxHeight: size.height,
        maxFrameRate: options.frameRate
      }
    }
  });

  const [track] = stream.getVideoTracks();

  if (!track) throw new Error('The screen or window gave no picture.');

  track.contentHint = options.contentHint;

  return track;
};

const stopTrack = async (track: MediaStreamTrack) => {
  track.stop();
};

// everything the speakers play. windows only hands it out next to a screen capture, so a
// throwaway screen track is requested with it
export const captureSystemAudio = async (): Promise<TCapturedAudio> => {
  const stream = await getUserMedia({
    audio: { mandatory: { chromeMediaSource: 'desktop' } },
    video: { mandatory: { chromeMediaSource: 'desktop' } }
  });

  stream.getVideoTracks().forEach((track) => track.stop());

  const [track] = stream.getAudioTracks();

  if (!track) throw new Error('Windows gave no system sound.');

  return { track, stop: () => stopTrack(track) };
};

export const captureDeviceAudio = async (
  deviceId: string
): Promise<TCapturedAudio> => {
  const stream = await getUserMedia({
    audio: {
      deviceId: { exact: deviceId },
      // a capture card or music needs its sound untouched, which voice processing would not
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
      channelCount: 2,
      sampleRate: 48000
    },
    video: false
  });

  const [track] = stream.getAudioTracks();

  if (!track) throw new Error('The input device gave no sound.');

  return { track, stop: () => stopTrack(track) };
};

// one app's sound, or everything but one app, captured by the AppAudio helper and played into a
// track here
export const captureAppAudio = async (
  pid: number,
  mode: 'include' | 'exclude'
): Promise<TCapturedAudio> => {
  const context = new AudioContext({
    sampleRate: 48000,
    latencyHint: 'interactive'
  });

  // chromium won't load a worklet module from a local file, so it goes in as a blob
  const workletUrl = URL.createObjectURL(
    new Blob([pcmPlayerSource], { type: 'application/javascript' })
  );

  try {
    await context.audioWorklet.addModule(workletUrl);
  } finally {
    URL.revokeObjectURL(workletUrl);
  }

  const player = new AudioWorkletNode(context, 'pcm-player', {
    numberOfInputs: 0,
    outputChannelCount: [2]
  });
  const destination = context.createMediaStreamDestination();

  destination.channelCount = 2;
  player.connect(destination);

  const unsubscribe = api.onAppAudioData((chunk) => {
    player.port.postMessage(chunk, [chunk.buffer]);
  });

  const result = await api.startAppAudio(pid, mode);

  if (!result.ok) {
    unsubscribe();
    await context.close();

    throw new Error(result.message);
  }

  const [track] = destination.stream.getAudioTracks();

  return {
    track: track!,
    stop: async () => {
      unsubscribe();
      track?.stop();
      await api.stopAppAudio();
      await context.close();
    }
  };
};
