import { describe, expect, test } from 'bun:test';
import { summarizeStats } from '../stats';

const makeReport = (
  videoBytes: number,
  audioBytes: number,
  encoderImplementation?: string
) => [
  {
    id: 'out-video',
    type: 'outbound-rtp',
    kind: 'video',
    bytesSent: videoBytes,
    frameWidth: 1920,
    frameHeight: 1080,
    framesPerSecond: 60,
    codecId: 'codec-video',
    encoderImplementation,
    qualityLimitationReason: 'none'
  },
  {
    id: 'out-audio',
    type: 'outbound-rtp',
    kind: 'audio',
    bytesSent: audioBytes
  },
  { id: 'codec-video', type: 'codec', mimeType: 'video/H264' },
  {
    id: 'remote-video',
    type: 'remote-inbound-rtp',
    kind: 'video',
    roundTripTime: 0.042,
    fractionLost: 0.02
  }
];

describe('summarizeStats', () => {
  test('should read size, frame rate, codec and network from one report', () => {
    const { summary } = summarizeStats(makeReport(0, 0), undefined, 1000);

    expect(summary.width).toBe(1920);
    expect(summary.height).toBe(1080);
    expect(summary.framesPerSecond).toBe(60);
    expect(summary.codec).toBe('H264');
    expect(summary.qualityLimitation).toBe('none');
    expect(summary.roundTripMs).toBe(42);
    expect(summary.packetLossPercent).toBe(2);
  });

  test('should report no bitrate until there are two reports', () => {
    const { summary } = summarizeStats(makeReport(500, 50), undefined, 1000);

    expect(summary.videoKbps).toBe(0);
    expect(summary.audioKbps).toBe(0);
  });

  test('should work out the bitrate between two reports', () => {
    const first = summarizeStats(makeReport(0, 0), undefined, 1000);
    const { summary } = summarizeStats(
      makeReport(750_000, 16_000),
      first.sample,
      2000
    );

    expect(summary.videoKbps).toBe(6000);
    expect(summary.audioKbps).toBe(128);
  });

  test('should recognise the graphics card encoder', () => {
    const { summary } = summarizeStats(
      makeReport(
        0,
        0,
        'MediaFoundationVideoEncodeAccelerator (NVIDIA H.264 Encoder MFT)'
      ),
      undefined,
      1000
    );

    expect(summary.isHardwareEncoder).toBe(true);
  });

  test('should call openh264 a cpu encoder', () => {
    const { summary } = summarizeStats(
      makeReport(0, 0, 'OpenH264'),
      undefined,
      1000
    );

    expect(summary.encoder).toBe('OpenH264');
    expect(summary.isHardwareEncoder).toBe(false);
  });

  test('should leave the encoder unknown when the browser hides it', () => {
    const { summary } = summarizeStats(makeReport(0, 0), undefined, 1000);

    expect(summary.encoder).toBeUndefined();
    expect(summary.isHardwareEncoder).toBe(false);
  });
});
