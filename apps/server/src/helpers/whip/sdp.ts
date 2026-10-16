import type {
  DtlsParameters,
  IceCandidate,
  IceParameters,
  MediaKind,
  RtpCapabilities,
  RtpCodecParameters,
  RtpEncodingParameters,
  RtpHeaderExtensionParameters,
  RtpParameters
} from 'mediasoup/types';
import {
  parse,
  parseParams,
  write,
  type MediaDescription,
  type SessionDescription
} from 'sdp-transform';

// an offer the endpoint can't use. its message goes back to the streaming app as is
class WhipOfferError extends Error {}

type TWhipOfferSection = {
  media: MediaDescription;
  mid: string;
  kind: MediaKind | undefined;
  // codec choices in order of preference, each ready to hand to transport.produce
  candidates: RtpParameters[];
};

type TWhipOffer = {
  remoteDtlsParameters: DtlsParameters;
  answerSetup: 'active' | 'passive';
  sections: TWhipOfferSection[];
};

type TWhipTransportParameters = {
  iceParameters: IceParameters;
  iceCandidates: IceCandidate[];
  dtlsParameters: DtlsParameters;
};

// hardware encoders and every browser decoder handle h264, so it wins when the app offers
// several; the rest are there for apps that only send one of them
const VIDEO_CODEC_PREFERENCE = ['h264', 'av1', 'vp9', 'vp8'];

const getCodecParameters = (media: MediaDescription, payload: number) => {
  const fmtp = media.fmtp.find((entry) => entry.payload === payload);

  return fmtp ? parseParams(fmtp.config) : {};
};

const getRtcpFeedback = (media: MediaDescription, payload: number) =>
  (media.rtcpFb ?? [])
    .filter(
      (feedback) =>
        feedback.payload === '*' || Number(feedback.payload) === payload
    )
    .map((feedback) => ({
      type: feedback.type,
      parameter: feedback.subtype ?? ''
    }));

const toCodecParameters = (
  kind: MediaKind,
  media: MediaDescription,
  rtp: MediaDescription['rtp'][number]
): RtpCodecParameters => {
  const codec: RtpCodecParameters = {
    mimeType: `${kind}/${rtp.codec}`,
    payloadType: rtp.payload,
    clockRate: rtp.rate ?? (kind === 'audio' ? 48000 : 90000),
    parameters: getCodecParameters(media, rtp.payload),
    rtcpFeedback: getRtcpFeedback(media, rtp.payload)
  };

  if (kind === 'audio') {
    codec.channels = Number(rtp.encoding ?? 1);
  }

  return codec;
};

const getRtxCodec = (media: MediaDescription, payload: number) => {
  const rtx = media.rtp.find(
    (rtp) =>
      rtp.codec.toLowerCase() === 'rtx' &&
      Number(getCodecParameters(media, rtp.payload).apt) === payload
  );

  if (!rtx) return undefined;

  return {
    mimeType: 'video/rtx',
    payloadType: rtx.payload,
    clockRate: rtx.rate ?? 90000,
    parameters: { apt: payload },
    rtcpFeedback: []
  } satisfies RtpCodecParameters;
};

// only extensions the router knows survive, with the ids the app picked, since those ids are
// what its packets carry
const getHeaderExtensions = (
  kind: MediaKind,
  media: MediaDescription,
  routerCapabilities: RtpCapabilities
): RtpHeaderExtensionParameters[] => {
  const supportedUris = new Set(
    (routerCapabilities.headerExtensions ?? [])
      .filter((extension) => extension.kind === kind)
      .map((extension) => extension.uri)
  );

  return (media.ext ?? [])
    .filter((extension) => supportedUris.has(extension.uri as never))
    .map((extension) => ({
      uri: extension.uri as RtpHeaderExtensionParameters['uri'],
      id: extension.value,
      encrypt: false,
      parameters: {}
    }));
};

const getSsrcs = (media: MediaDescription) => {
  const ssrcs = [...new Set((media.ssrcs ?? []).map(({ id }) => Number(id)))];
  const fid = (media.ssrcGroups ?? []).find(
    (group) => group.semantics === 'FID'
  );

  if (fid) {
    const [primary, rtx] = fid.ssrcs.split(' ').map(Number);

    return { primary, rtx };
  }

  return { primary: ssrcs[0], rtx: undefined };
};

const getCname = (media: MediaDescription) =>
  (media.ssrcs ?? []).find((ssrc) => ssrc.attribute === 'cname')?.value;

const buildCandidates = (
  kind: MediaKind,
  media: MediaDescription,
  routerCapabilities: RtpCapabilities
): RtpParameters[] => {
  const headerExtensions = getHeaderExtensions(kind, media, routerCapabilities);
  const { primary, rtx } = getSsrcs(media);
  const cname = getCname(media);

  const mainCodecs = media.rtp.filter((rtp) => {
    const name = rtp.codec.toLowerCase();

    if (kind === 'audio') return name === 'opus';

    return VIDEO_CODEC_PREFERENCE.includes(name);
  });

  const ordered =
    kind === 'video'
      ? [...mainCodecs].sort(
          (a, b) =>
            VIDEO_CODEC_PREFERENCE.indexOf(a.codec.toLowerCase()) -
            VIDEO_CODEC_PREFERENCE.indexOf(b.codec.toLowerCase())
        )
      : mainCodecs;

  return ordered.map((rtp) => {
    const codecs = [toCodecParameters(kind, media, rtp)];
    const rtxCodec =
      kind === 'video' ? getRtxCodec(media, rtp.payload) : undefined;

    if (rtxCodec) codecs.push(rtxCodec);

    const encoding: RtpEncodingParameters = {};

    if (primary !== undefined) encoding.ssrc = primary;
    if (rtxCodec && rtx !== undefined) encoding.rtx = { ssrc: rtx };

    return {
      mid: media.mid === undefined ? undefined : String(media.mid),
      codecs,
      headerExtensions,
      encodings: [encoding],
      rtcp: { cname, reducedSize: !!media.rtcpRsize }
    };
  });
};

const parseWhipOffer = (
  sdp: string,
  routerCapabilities: RtpCapabilities
): TWhipOffer => {
  let session: SessionDescription;

  try {
    session = parse(sdp);
  } catch {
    throw new WhipOfferError('The offer is not a valid SDP');
  }

  if (!session.media?.length) {
    throw new WhipOfferError('The offer has no media to stream');
  }

  const firstMedia = session.media[0]!;
  const fingerprint = firstMedia.fingerprint ?? session.fingerprint;
  const setup = firstMedia.setup ?? session.setup ?? 'actpass';

  if (!fingerprint) {
    throw new WhipOfferError('The offer has no DTLS fingerprint');
  }

  if (!(firstMedia.iceUfrag ?? session.iceUfrag)) {
    throw new WhipOfferError('The offer has no ICE credentials');
  }

  // whoever answers "passive" waits for the other side to start the dtls handshake. the
  // app's own preference only matters when it insists on being the one that waits
  const remoteRole = setup === 'passive' ? 'server' : 'client';

  const sections = session.media.map((media, index): TWhipOfferSection => {
    const mid = media.mid === undefined ? String(index) : String(media.mid);
    const isRtp = media.protocol.includes('RTP');
    let kind: MediaKind | undefined;

    if (isRtp && (media.type === 'audio' || media.type === 'video')) {
      kind = media.type;
    }

    return {
      media,
      mid,
      kind,
      candidates: kind ? buildCandidates(kind, media, routerCapabilities) : []
    };
  });

  return {
    remoteDtlsParameters: {
      role: remoteRole,
      fingerprints: [
        {
          algorithm:
            fingerprint.type as DtlsParameters['fingerprints'][number]['algorithm'],
          value: fingerprint.hash
        }
      ]
    },
    answerSetup: remoteRole === 'server' ? 'active' : 'passive',
    sections
  };
};

const formatCodecParameters = (parameters: RtpCodecParameters['parameters']) =>
  Object.entries(parameters ?? {})
    .map(([key, value]) => `${key}=${value}`)
    .join(';');

const createAcceptedMedia = (
  section: TWhipOfferSection,
  rtpParameters: RtpParameters,
  transport: TWhipTransportParameters,
  setup: TWhipOffer['answerSetup']
): MediaDescription => {
  const fingerprint =
    transport.dtlsParameters.fingerprints.find(
      ({ algorithm }) => algorithm === 'sha-256'
    ) ?? transport.dtlsParameters.fingerprints[0]!;

  const { codecs } = rtpParameters;

  return {
    type: section.media.type,
    port: 9,
    protocol: section.media.protocol,
    payloads: codecs.map(({ payloadType }) => payloadType).join(' '),
    connection: { version: 4, ip: '0.0.0.0' },
    mid: section.mid,
    direction: 'recvonly',
    iceUfrag: transport.iceParameters.usernameFragment,
    icePwd: transport.iceParameters.password,
    fingerprint: { type: fingerprint.algorithm, hash: fingerprint.value },
    setup,
    rtcpMux: 'rtcp-mux',
    rtcpRsize: section.media.rtcpRsize ? 'rtcp-rsize' : undefined,
    candidates: transport.iceCandidates.map((candidate) => ({
      foundation: candidate.foundation,
      component: 1,
      transport: candidate.protocol,
      priority: candidate.priority,
      ip: candidate.address,
      port: candidate.port,
      type: candidate.type,
      tcptype: candidate.tcpType
    })),
    endOfCandidates: 'end-of-candidates',
    rtp: codecs.map((codec) => ({
      payload: codec.payloadType,
      codec: codec.mimeType.split('/')[1]!,
      rate: codec.clockRate,
      encoding:
        codec.channels && codec.channels > 1 ? codec.channels : undefined
    })),
    fmtp: codecs
      .filter((codec) => Object.keys(codec.parameters ?? {}).length > 0)
      .map((codec) => ({
        payload: codec.payloadType,
        config: formatCodecParameters(codec.parameters)
      })),
    rtcpFb: codecs.flatMap((codec) =>
      (codec.rtcpFeedback ?? []).map((feedback) => ({
        payload: String(codec.payloadType),
        type: feedback.type,
        subtype: feedback.parameter || undefined
      }))
    ),
    ext: (rtpParameters.headerExtensions ?? []).map((extension) => ({
      value: extension.id,
      uri: extension.uri
    }))
  };
};

// a section the endpoint doesn't take, a data channel or a second video, is declined with
// port 0, which keeps the answer's sections lined up with the offer's as sdp requires
const createRejectedMedia = (section: TWhipOfferSection): MediaDescription => ({
  type: section.media.type,
  port: 0,
  protocol: section.media.protocol,
  payloads: section.media.payloads,
  mid: section.mid,
  direction: 'inactive',
  rtp: [],
  fmtp: []
});

const createWhipAnswer = ({
  offer,
  transport,
  accepted
}: {
  offer: TWhipOffer;
  transport: TWhipTransportParameters;
  accepted: Map<string, RtpParameters>;
}) => {
  const acceptedMids = offer.sections
    .filter(({ mid }) => accepted.has(mid))
    .map(({ mid }) => mid);

  const answer: SessionDescription = {
    version: 0,
    origin: {
      username: 'sharkord',
      sessionId: Date.now(),
      sessionVersion: 1,
      netType: 'IN',
      ipVer: 4,
      address: '0.0.0.0'
    },
    name: '-',
    timing: { start: 0, stop: 0 },
    icelite: 'ice-lite',
    groups: [{ type: 'BUNDLE', mids: acceptedMids.join(' ') }],
    media: offer.sections.map((section) => {
      const rtpParameters = accepted.get(section.mid);

      if (!rtpParameters) return createRejectedMedia(section);

      return createAcceptedMedia(
        section,
        rtpParameters,
        transport,
        offer.answerSetup
      );
    })
  };

  return write(answer);
};

export { createWhipAnswer, parseWhipOffer, WhipOfferError };
export type { TWhipOffer, TWhipOfferSection, TWhipTransportParameters };
