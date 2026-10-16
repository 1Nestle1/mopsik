import { describe, expect, test } from 'bun:test';
import type { RtpCapabilities, RtpParameters } from 'mediasoup/types';
import { parse } from 'sdp-transform';
import {
  createWhipAnswer,
  parseWhipOffer,
  WhipOfferError,
  type TWhipTransportParameters
} from '../sdp';
import { lines, OBS_OFFER } from './fixtures';

// what a browser sends: several video codecs with retransmission, header extensions and a
// data channel the endpoint has no use for
const BROWSER_OFFER = lines(
  'v=0',
  'o=- 1 2 IN IP4 127.0.0.1',
  's=-',
  't=0 0',
  'a=group:BUNDLE 0 1 2',
  'm=audio 9 UDP/TLS/RTP/SAVPF 111',
  'c=IN IP4 0.0.0.0',
  'a=ice-ufrag:abcd',
  'a=ice-pwd:efghijklmnopqrstuvwxyz12',
  'a=fingerprint:sha-256 AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99',
  'a=setup:active',
  'a=mid:0',
  'a=extmap:1 urn:ietf:params:rtp-hdrext:ssrc-audio-level',
  'a=extmap:4 urn:ietf:params:rtp-hdrext:sdes:mid',
  'a=extmap:9 urn:example:not-supported',
  'a=sendonly',
  'a=rtcp-mux',
  'a=rtcp-rsize',
  'a=rtpmap:111 opus/48000/2',
  'a=ssrc:11 cname:browser',
  'm=video 9 UDP/TLS/RTP/SAVPF 96 97 102 103',
  'c=IN IP4 0.0.0.0',
  'a=mid:1',
  'a=extmap:4 urn:ietf:params:rtp-hdrext:sdes:mid',
  'a=extmap:3 http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01',
  'a=sendonly',
  'a=rtcp-mux',
  'a=rtpmap:96 VP8/90000',
  'a=rtcp-fb:96 nack pli',
  'a=rtpmap:97 rtx/90000',
  'a=fmtp:97 apt=96',
  'a=rtpmap:102 H264/90000',
  'a=rtcp-fb:102 transport-cc',
  'a=fmtp:102 profile-level-id=640032;packetization-mode=1;level-asymmetry-allowed=1',
  'a=rtpmap:103 rtx/90000',
  'a=fmtp:103 apt=102',
  'a=ssrc-group:FID 21 22',
  'a=ssrc:21 cname:browser',
  'a=ssrc:22 cname:browser',
  'm=application 9 UDP/DTLS/SCTP webrtc-datachannel',
  'c=IN IP4 0.0.0.0',
  'a=mid:2',
  'a=sctp-port:5000'
);

const ROUTER_CAPABILITIES = {
  codecs: [],
  headerExtensions: [
    {
      kind: 'audio',
      uri: 'urn:ietf:params:rtp-hdrext:sdes:mid',
      preferredId: 1
    },
    {
      kind: 'audio',
      uri: 'urn:ietf:params:rtp-hdrext:ssrc-audio-level',
      preferredId: 10
    },
    {
      kind: 'video',
      uri: 'urn:ietf:params:rtp-hdrext:sdes:mid',
      preferredId: 1
    },
    {
      kind: 'video',
      uri: 'http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01',
      preferredId: 5
    }
  ]
} as RtpCapabilities;

const TRANSPORT: TWhipTransportParameters = {
  iceParameters: {
    usernameFragment: 'serverufrag',
    password: 'serverpassword1234567890',
    iceLite: true
  },
  iceCandidates: [
    {
      foundation: 'udpcandidate',
      priority: 1076302079,
      ip: '203.0.113.10',
      address: '203.0.113.10',
      protocol: 'udp',
      port: 40000,
      type: 'host'
    },
    {
      foundation: 'tcpcandidate',
      priority: 1076276479,
      ip: '203.0.113.10',
      address: '203.0.113.10',
      protocol: 'tcp',
      port: 40000,
      type: 'host',
      tcpType: 'passive'
    }
  ],
  dtlsParameters: {
    role: 'auto',
    fingerprints: [
      { algorithm: 'sha-1', value: '00:11' },
      { algorithm: 'sha-256', value: 'AB:CD:EF' }
    ]
  }
};

describe('parseWhipOffer', () => {
  test('should read an obs offer into one audio and one h264 choice', () => {
    const offer = parseWhipOffer(OBS_OFFER, ROUTER_CAPABILITIES);
    const [audio, video] = offer.sections;

    expect(offer.remoteDtlsParameters.role).toBe('client');
    expect(offer.answerSetup).toBe('passive');
    expect(offer.remoteDtlsParameters.fingerprints[0]?.algorithm).toBe(
      'sha-256'
    );

    expect(audio?.kind).toBe('audio');
    expect(audio?.candidates).toHaveLength(1);
    expect(audio?.candidates[0]?.codecs[0]).toMatchObject({
      mimeType: 'audio/opus',
      payloadType: 111,
      clockRate: 48000,
      channels: 2,
      parameters: { minptime: 10, stereo: 1, useinbandfec: 1 }
    });
    expect(audio?.candidates[0]?.encodings).toEqual([{ ssrc: 1406187211 }]);
    expect(audio?.candidates[0]?.rtcp?.cname).toBe('CbgP8Q1R0pDl9oMB');

    expect(video?.kind).toBe('video');
    expect(video?.candidates[0]?.codecs).toHaveLength(1);
    expect(video?.candidates[0]?.codecs[0]).toMatchObject({
      mimeType: 'video/H264',
      payloadType: 96,
      parameters: {
        'profile-level-id': '42e01f',
        'packetization-mode': 1
      },
      rtcpFeedback: [
        { type: 'nack', parameter: '' },
        { type: 'nack', parameter: 'pli' }
      ]
    });
  });

  test('should prefer h264 with its retransmission stream over the other codecs', () => {
    const offer = parseWhipOffer(BROWSER_OFFER, ROUTER_CAPABILITIES);
    const video = offer.sections[1]!;
    const [first, second] = video.candidates;

    expect(first?.codecs.map(({ mimeType }) => mimeType)).toEqual([
      'video/H264',
      'video/rtx'
    ]);
    expect(first?.codecs[1]?.parameters).toEqual({ apt: 102 });
    expect(first?.encodings).toEqual([{ ssrc: 21, rtx: { ssrc: 22 } }]);
    expect(second?.codecs[0]?.mimeType).toBe('video/VP8');
  });

  test('should keep only the header extensions the router supports, with the offered ids', () => {
    const offer = parseWhipOffer(BROWSER_OFFER, ROUTER_CAPABILITIES);
    const audio = offer.sections[0]!;

    expect(audio.candidates[0]?.headerExtensions).toEqual([
      {
        uri: 'urn:ietf:params:rtp-hdrext:ssrc-audio-level',
        id: 1,
        encrypt: false,
        parameters: {}
      },
      {
        uri: 'urn:ietf:params:rtp-hdrext:sdes:mid',
        id: 4,
        encrypt: false,
        parameters: {}
      }
    ]);
    expect(audio.candidates[0]?.rtcp?.reducedSize).toBe(true);
  });

  test('should answer passive to an app that insists on being active', () => {
    const offer = parseWhipOffer(BROWSER_OFFER, ROUTER_CAPABILITIES);

    expect(offer.remoteDtlsParameters.role).toBe('client');
    expect(offer.answerSetup).toBe('passive');
  });

  test('should take the dtls server role when the app wants to wait', () => {
    const offer = parseWhipOffer(
      OBS_OFFER.replace('a=setup:actpass', 'a=setup:passive'),
      ROUTER_CAPABILITIES
    );

    expect(offer.remoteDtlsParameters.role).toBe('server');
    expect(offer.answerSetup).toBe('active');
  });

  test('should leave a data channel without codec choices', () => {
    const offer = parseWhipOffer(BROWSER_OFFER, ROUTER_CAPABILITIES);
    const dataChannel = offer.sections[2]!;

    expect(dataChannel.kind).toBeUndefined();
    expect(dataChannel.candidates).toEqual([]);
  });

  test('should refuse an offer without media', () => {
    expect(() =>
      parseWhipOffer(lines('v=0', 's=-', 't=0 0'), ROUTER_CAPABILITIES)
    ).toThrow(new WhipOfferError('The offer has no media to stream'));
  });

  test('should refuse an offer without a fingerprint', () => {
    const withoutFingerprint = OBS_OFFER.split('\r\n')
      .filter((line) => !line.startsWith('a=fingerprint'))
      .join('\r\n');

    expect(() =>
      parseWhipOffer(withoutFingerprint, ROUTER_CAPABILITIES)
    ).toThrow(new WhipOfferError('The offer has no DTLS fingerprint'));
  });

  test('should refuse an offer without ice credentials', () => {
    const withoutIce = OBS_OFFER.split('\r\n')
      .filter((line) => !line.startsWith('a=ice-'))
      .join('\r\n');

    expect(() => parseWhipOffer(withoutIce, ROUTER_CAPABILITIES)).toThrow(
      new WhipOfferError('The offer has no ICE credentials')
    );
  });
});

describe('createWhipAnswer', () => {
  const answerFor = (sdp: string, acceptedMids: string[]) => {
    const offer = parseWhipOffer(sdp, ROUTER_CAPABILITIES);
    const accepted = new Map<string, RtpParameters>();

    for (const section of offer.sections) {
      if (acceptedMids.includes(section.mid) && section.candidates[0]) {
        accepted.set(section.mid, section.candidates[0]);
      }
    }

    return parse(createWhipAnswer({ offer, transport: TRANSPORT, accepted }));
  };

  test('should answer as an ice-lite receiver bundled on one transport', () => {
    const answer = answerFor(OBS_OFFER, ['0', '1']);

    expect(answer.icelite).toBe('ice-lite');
    expect(answer.groups).toEqual([{ type: 'BUNDLE', mids: '0 1' }]);
    expect(answer.media.map(({ direction }) => direction)).toEqual([
      'recvonly',
      'recvonly'
    ]);

    const video = answer.media[1]!;

    expect(video.iceUfrag).toBe('serverufrag');
    expect(video.icePwd).toBe('serverpassword1234567890');
    expect(video.fingerprint).toEqual({ type: 'sha-256', hash: 'AB:CD:EF' });
    expect(video.setup).toBe('passive');
    expect(video.rtcpMux).toBe('rtcp-mux');
    // sdp-transform hands back numeric looking values as numbers when it reads the answer
    expect(String(video.payloads)).toBe('96');
    expect(video.rtp).toEqual([{ payload: 96, codec: 'H264', rate: 90000 }]);
    expect(
      video.candidates?.map(({ transport, port }) => [transport, port])
    ).toEqual([
      ['udp', 40000],
      ['tcp', 40000]
    ]);
    expect(video.candidates?.[1]?.tcptype).toBe('passive');
  });

  test('should keep stereo opus in the answer', () => {
    const answer = answerFor(OBS_OFFER, ['0', '1']);
    const audio = answer.media[0]!;

    expect(audio.rtp).toEqual([
      { payload: 111, codec: 'opus', rate: 48000, encoding: 2 }
    ]);
    expect(audio.fmtp[0]?.config).toBe('minptime=10;stereo=1;useinbandfec=1');
  });

  test('should decline the sections it does not take, keeping their place', () => {
    const answer = answerFor(BROWSER_OFFER, ['0', '1']);
    const dataChannel = answer.media[2]!;

    expect(answer.media).toHaveLength(3);
    expect(answer.groups).toEqual([{ type: 'BUNDLE', mids: '0 1' }]);
    expect(dataChannel.port).toBe(0);
    expect(String(dataChannel.mid)).toBe('2');
    expect(dataChannel.direction).toBe('inactive');
  });

  test('should answer the retransmission codec next to the one it repairs', () => {
    const answer = answerFor(BROWSER_OFFER, ['0', '1']);
    const video = answer.media[1]!;

    expect(String(video.payloads)).toBe('102 103');
    expect(video.fmtp).toContainEqual({ payload: 103, config: 'apt=102' });
    expect(video.ext).toEqual([
      { value: 4, uri: 'urn:ietf:params:rtp-hdrext:sdes:mid' },
      {
        value: 3,
        uri: 'http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01'
      }
    ]);
  });
});
