const lines = (...rows: string[]) => `${rows.join('\r\n')}\r\n`;

// what obs studio sends: opus and one h264 payload, ssrcs but no header extensions
const OBS_OFFER = lines(
  'v=0',
  'o=rtc 4158491451 0 IN IP4 127.0.0.1',
  's=-',
  't=0 0',
  'a=group:BUNDLE 0 1',
  'a=msid-semantic:WMS *',
  'a=setup:actpass',
  'a=ice-ufrag:Dm0F',
  'a=ice-pwd:8Lr6R3ZFcxF3ZhdBc9Uq0Y',
  'a=fingerprint:sha-256 9F:21:5B:63:41:0E:E2:6C:7D:10:57:8E:6B:2A:19:AA:01:3D:4C:5E:6F:70:81:92:A3:B4:C5:D6:E7:F8:09:1A',
  'm=audio 9 UDP/TLS/RTP/SAVPF 111',
  'c=IN IP4 0.0.0.0',
  'a=mid:0',
  'a=sendonly',
  'a=ssrc:1406187211 cname:CbgP8Q1R0pDl9oMB',
  'a=rtcp-mux',
  'a=rtpmap:111 opus/48000/2',
  'a=fmtp:111 minptime=10;stereo=1;useinbandfec=1',
  'm=video 9 UDP/TLS/RTP/SAVPF 96',
  'c=IN IP4 0.0.0.0',
  'a=mid:1',
  'a=sendonly',
  'a=ssrc:2158919712 cname:CbgP8Q1R0pDl9oMB',
  'a=rtcp-mux',
  'a=rtpmap:96 H264/90000',
  'a=rtcp-fb:96 nack',
  'a=rtcp-fb:96 nack pli',
  'a=fmtp:96 profile-level-id=42e01f;packetization-mode=1;level-asymmetry-allowed=1'
);

export { OBS_OFFER, lines };
