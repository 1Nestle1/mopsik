import { describe, expect, test } from 'bun:test';
import { setVideoStartBitrate, tuneOpus } from '../sdp';

const OFFER = [
  'v=0',
  'm=audio 9 UDP/TLS/RTP/SAVPF 111',
  'a=rtpmap:111 opus/48000/2',
  'a=fmtp:111 minptime=10;useinbandfec=1;usedtx=1',
  'm=video 9 UDP/TLS/RTP/SAVPF 96 102',
  'a=rtpmap:96 VP8/90000',
  'a=rtpmap:102 H264/90000',
  'a=fmtp:102 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=42e01f',
  ''
].join('\r\n');

const getFmtp = (sdp: string, payloadType: number) =>
  sdp.match(new RegExp(`a=fmtp:${payloadType} ([^\\r\\n]*)`))?.[1];

describe('tuneOpus', () => {
  test('should ask for stereo at the chosen bitrate', () => {
    const fmtp = getFmtp(tuneOpus(OFFER, 160), 111);

    expect(fmtp).toContain('stereo=1');
    expect(fmtp).toContain('sprop-stereo=1');
    expect(fmtp).toContain('maxaveragebitrate=160000');
  });

  test('should keep the existing parameters and override dtx', () => {
    const fmtp = getFmtp(tuneOpus(OFFER, 128), 111);

    expect(fmtp).toContain('minptime=10');
    expect(fmtp).toContain('usedtx=0');
    expect(fmtp).not.toContain('usedtx=1');
  });

  test('should add an fmtp line when opus has none', () => {
    const bare = OFFER.replace(/a=fmtp:111 [^\r\n]*\r\n/, '');
    const fmtp = getFmtp(tuneOpus(bare, 96), 111);

    expect(fmtp).toContain('maxaveragebitrate=96000');
  });

  test('should leave an sdp without opus alone', () => {
    const noOpus = 'v=0\r\nm=video 9 UDP/TLS/RTP/SAVPF 96\r\n';

    expect(tuneOpus(noOpus, 128)).toBe(noOpus);
  });
});

describe('setVideoStartBitrate', () => {
  test('should set the start bitrate on every video codec', () => {
    const sdp = setVideoStartBitrate(OFFER, 6000);

    expect(getFmtp(sdp, 96)).toBe('x-google-start-bitrate=6000');
    expect(getFmtp(sdp, 102)).toContain('profile-level-id=42e01f');
    expect(getFmtp(sdp, 102)).toContain('x-google-start-bitrate=6000');
  });

  test('should not touch the audio codec', () => {
    const sdp = setVideoStartBitrate(OFFER, 6000);

    expect(getFmtp(sdp, 111)).not.toContain('x-google-start-bitrate');
  });
});
