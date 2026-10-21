const VIDEO_RTPMAP_PATTERN = /a=rtpmap:(\d+) (?:H264|VP8|VP9|AV1)\/90000/gi;

// sets parameters on one codec's fmtp line, keeping the ones already there, and adds the line
// when the codec has none
const mergeFmtp = (
  sdp: string,
  rtpmapLine: string,
  payloadType: string,
  wanted: Record<string, string>
) => {
  const fmtpPattern = new RegExp(`a=fmtp:${payloadType} ([^\\r\\n]*)`);

  if (!fmtpPattern.test(sdp)) {
    const config = Object.entries(wanted)
      .map(([key, value]) => `${key}=${value}`)
      .join(';');

    return sdp.replace(
      rtpmapLine,
      `${rtpmapLine}\r\na=fmtp:${payloadType} ${config}`
    );
  }

  return sdp.replace(fmtpPattern, (_line, params: string) => {
    const merged = new Map<string, string>();

    for (const pair of params.split(';')) {
      const [key, value] = pair.split('=');

      if (key) merged.set(key.trim(), (value ?? '').trim());
    }

    for (const [key, value] of Object.entries(wanted)) {
      merged.set(key, value);
    }

    const config = [...merged.entries()]
      .map(([key, value]) => `${key}=${value}`)
      .join(';');

    return `a=fmtp:${payloadType} ${config}`;
  });
};

// a browser offers opus tuned for voice; a stream carries music and game sound, so it asks for
// stereo at a real bitrate. the server echoes these back in its answer, and the answer is what
// the encoder obeys
export const tuneOpus = (sdp: string, bitrateKbps: number) => {
  const rtpmap = sdp.match(/a=rtpmap:(\d+) opus\/48000\/2/i);

  if (!rtpmap) return sdp;

  return mergeFmtp(sdp, rtpmap[0], rtpmap[1]!, {
    stereo: '1',
    'sprop-stereo': '1',
    maxaveragebitrate: String(bitrateKbps * 1000),
    // discontinuous transmission saves bandwidth in speech pauses and cuts music tails
    usedtx: '0',
    useinbandfec: '1'
  });
};

// chrome opens a connection at about 300 kbps and climbs from there, shrinking the picture
// meanwhile. once it is under 360p it swaps the graphics card encoder for the cpu one and stays
// there, so the answer tells it to start at the bitrate the stream is set to
export const setVideoStartBitrate = (sdp: string, bitrateKbps: number) => {
  let result = sdp;

  for (const [rtpmapLine, payloadType] of sdp.matchAll(VIDEO_RTPMAP_PATTERN)) {
    result = mergeFmtp(result, rtpmapLine, payloadType!, {
      'x-google-start-bitrate': String(bitrateKbps)
    });
  }

  return result;
};
