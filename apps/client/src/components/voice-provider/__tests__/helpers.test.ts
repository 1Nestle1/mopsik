import { ScreenContentHint } from '@/types';
import { StreamKind } from '@sharkord/shared';
import { describe, expect, mock, test } from 'bun:test';
import type { RtpCapabilities } from 'mediasoup-client/types';
import {
  applyScreenDegradationPreference,
  getAutoScreenCodec,
  isOwnProducerEvent
} from '../helpers';

describe('isOwnProducerEvent', () => {
  test('should treat a producer with our own user id as ours', () => {
    expect(isOwnProducerEvent(1, 1, StreamKind.AUDIO)).toBe(true);
    expect(isOwnProducerEvent(1, 1, StreamKind.VIDEO)).toBe(true);
    expect(isOwnProducerEvent(1, 1, StreamKind.SCREEN)).toBe(true);
    expect(isOwnProducerEvent(1, 1, StreamKind.SCREEN_AUDIO)).toBe(true);
  });

  test('should treat another user as not ours', () => {
    expect(isOwnProducerEvent(2, 1, StreamKind.AUDIO)).toBe(false);
  });

  // the runtime hands out external stream ids from a counter starting at zero, so the
  // second stream in a channel is id 1, which is also the first user id. treating that as
  // our own producer drops the plugin's audio for exactly one unlucky listener
  test('should never treat an external stream as ours, even on an id collision', () => {
    expect(isOwnProducerEvent(1, 1, StreamKind.EXTERNAL_AUDIO)).toBe(false);
    expect(isOwnProducerEvent(1, 1, StreamKind.EXTERNAL_VIDEO)).toBe(false);
    expect(isOwnProducerEvent(0, 0, StreamKind.EXTERNAL_AUDIO)).toBe(false);
  });

  test('should treat nothing as ours before the own user id is known', () => {
    expect(isOwnProducerEvent(1, undefined, StreamKind.AUDIO)).toBe(false);
  });
});

const routerCapabilities = {
  codecs: [
    { kind: 'video', mimeType: 'video/VP9', clockRate: 90000 },
    { kind: 'video', mimeType: 'video/VP8', clockRate: 90000 },
    { kind: 'video', mimeType: 'video/H264', clockRate: 90000 },
    { kind: 'audio', mimeType: 'audio/opus', clockRate: 48000 }
  ]
} as RtpCapabilities;

describe('getAutoScreenCodec', () => {
  test('should pick h264 for motion', () => {
    const codec = getAutoScreenCodec(
      routerCapabilities,
      ScreenContentHint.MOTION
    );

    expect(codec?.mimeType).toBe('video/H264');
  });

  test('should leave detail to the router order', () => {
    expect(
      getAutoScreenCodec(routerCapabilities, ScreenContentHint.DETAIL)
    ).toBeUndefined();
  });

  test('should give up quietly when the router has no h264', () => {
    const withoutH264 = {
      codecs: routerCapabilities.codecs?.filter(
        (codec) => codec.mimeType !== 'video/H264'
      )
    } as RtpCapabilities;

    expect(
      getAutoScreenCodec(withoutH264, ScreenContentHint.MOTION)
    ).toBeUndefined();
    expect(getAutoScreenCodec(null, ScreenContentHint.MOTION)).toBeUndefined();
  });
});

describe('applyScreenDegradationPreference', () => {
  const createSender = () => {
    const setParameters = mock(async () => {});
    const sender = {
      getParameters: () => ({ encodings: [{ active: true }] }),
      setParameters
    } as unknown as RTCRtpSender;

    return { sender, setParameters };
  };

  test('should keep the frame rate for motion', async () => {
    const { sender, setParameters } = createSender();

    await applyScreenDegradationPreference(sender, ScreenContentHint.MOTION);

    expect(setParameters).toHaveBeenCalledWith({
      encodings: [{ active: true }],
      degradationPreference: 'maintain-framerate'
    });
  });

  test('should keep the resolution for detail', async () => {
    const { sender, setParameters } = createSender();

    await applyScreenDegradationPreference(sender, ScreenContentHint.DETAIL);

    expect(setParameters).toHaveBeenCalledWith({
      encodings: [{ active: true }],
      degradationPreference: 'maintain-resolution'
    });
  });

  test('should do nothing without a sender', async () => {
    await expect(
      applyScreenDegradationPreference(undefined, ScreenContentHint.MOTION)
    ).resolves.toBeUndefined();
  });
});
