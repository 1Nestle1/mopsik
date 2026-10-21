import { Permission, ServerEvents } from '@sharkord/shared';
import { afterEach, describe, expect, test } from 'bun:test';
import { and, eq } from 'drizzle-orm';
import { tdb, testsBaseUrl } from '../../__tests__/setup';
import { config } from '../../config';
import { rolePermissions, users } from '../../db/schema';
import { regenerateStreamKey } from '../../helpers/stream-keys';
import { endVoiceSession } from '../../helpers/voice-sessions';
import { lines, OBS_OFFER } from '../../helpers/whip/__tests__/fixtures';
import { VoiceRuntime } from '../../runtimes/voice';
import { getWhipSession, hasWhipSession } from '../../runtimes/whip';
import { pubsub } from '../../utils/pubsub';

// mediasoup is real here: the runtime gets a router, the endpoint a transport and producers.
// what can't be reached is the media itself, since no app on the other end ever completes
// ice and dtls, so the transport failure paths are covered by the registry closing it instead

const VOICE_CHANNEL_ID = 2;
const DM_CHANNEL_ID = 3;
const PRIVATE_VOICE_CHANNEL_ID = 4;

const runtimes: VoiceRuntime[] = [];

const joinVoice = async (channelId: number, userId: number) => {
  const runtime =
    VoiceRuntime.findById(channelId) ?? new VoiceRuntime(channelId);

  if (!runtimes.includes(runtime)) {
    await runtime.init();
    runtimes.push(runtime);
  }

  runtime.addUser(userId, { micMuted: false, soundMuted: false });

  return runtime;
};

afterEach(async () => {
  for (const runtime of runtimes.splice(0)) {
    await runtime.destroy();
  }
});

type TPostOptions = {
  key?: string;
  body?: string;
  contentType?: string;
  userAgent?: string;
};

const postOffer = ({
  key,
  body = OBS_OFFER,
  contentType = 'application/sdp',
  userAgent = 'Mozilla/5.0 (Windows NT 10.0) OBS-Studio/31.0.2'
}: TPostOptions = {}) =>
  fetch(`${testsBaseUrl}/whip`, {
    method: 'POST',
    headers: {
      'Content-Type': contentType,
      'User-Agent': userAgent,
      ...(key ? { Authorization: `Bearer ${key}` } : {})
    },
    body
  });

const sendToStream = (
  method: 'DELETE' | 'PATCH',
  location: string,
  key?: string
) =>
  fetch(`${testsBaseUrl}${location}`, {
    method,
    headers: key ? { Authorization: `Bearer ${key}` } : {}
  });

const getSessionId = (location: string | null) =>
  (location ?? '').split('/')[2] ?? '';

const revokeShareScreenFromDefaultRole = async () =>
  tdb
    .delete(rolePermissions)
    .where(
      and(
        eq(rolePermissions.roleId, 2),
        eq(rolePermissions.permission, Permission.SHARE_SCREEN)
      )
    );

const nextTick = () => new Promise((resolve) => setTimeout(resolve, 20));

describe('/whip', () => {
  test("should start a stream in the caller's voice channel", async () => {
    const runtime = await joinVoice(VOICE_CHANNEL_ID, 1);
    const { key } = await regenerateStreamKey(1);
    const added: number[] = [];
    const subscription = pubsub
      .subscribe(ServerEvents.VOICE_ADD_EXTERNAL_STREAM)
      .subscribe({ next: ({ streamId }) => added.push(streamId) });

    try {
      const response = await postOffer({ key });
      const answer = await response.text();
      const location = response.headers.get('location');

      expect(response.status).toBe(201);
      expect(response.headers.get('content-type')).toBe('application/sdp');
      expect(location).toMatch(/^\/whip\/[0-9a-f-]{36}$/);
      expect(answer).toContain('a=ice-lite');
      expect(answer).toContain('a=setup:passive');
      expect(answer).toContain('a=rtpmap:96 H264/90000');
      expect(answer).toContain('a=rtpmap:111 opus/48000/2');

      const streams = Object.entries(runtime.getState().externalStreams);

      expect(streams).toHaveLength(1);
      expect(streams[0]?.[1]).toMatchObject({
        title: 'Test Owner',
        key: 'whip-1',
        pluginId: 'OBS',
        tracks: { audio: true, video: true }
      });
      expect(added).toEqual([Number(streams[0]?.[0])]);
      expect(getWhipSession(getSessionId(location))?.userId).toBe(1);
    } finally {
      subscription.unsubscribe();
    }
  });

  test('should label a stream from another app as whip', async () => {
    const runtime = await joinVoice(VOICE_CHANNEL_ID, 1);
    const { key } = await regenerateStreamKey(1);

    const response = await postOffer({ key, userAgent: 'gstreamer' });

    expect(response.status).toBe(201);
    expect(Object.values(runtime.getState().externalStreams)[0]?.pluginId).toBe(
      'WHIP'
    );
  });

  test('should label a stream from our own app', async () => {
    const runtime = await joinVoice(VOICE_CHANNEL_ID, 1);
    const { key } = await regenerateStreamKey(1);

    const response = await postOffer({
      key,
      userAgent: 'MOPSCORD-Stream/0.1.0'
    });

    expect(response.status).toBe(201);
    expect(Object.values(runtime.getState().externalStreams)[0]?.pluginId).toBe(
      'MOPSCORD Stream'
    );
  });

  test('should replace the stream the same person left running', async () => {
    const runtime = await joinVoice(VOICE_CHANNEL_ID, 1);
    const { key } = await regenerateStreamKey(1);

    const first = await postOffer({ key });
    const second = await postOffer({ key });

    expect(second.status).toBe(201);
    expect(Object.keys(runtime.getState().externalStreams)).toHaveLength(1);
    expect(
      getWhipSession(getSessionId(first.headers.get('location')))
    ).toBeUndefined();
  });

  test('should refuse a request without a stream key', async () => {
    await joinVoice(VOICE_CHANNEL_ID, 1);

    const response = await postOffer();

    expect(response.status).toBe(401);
    expect(response.headers.get('www-authenticate')).toBe('Bearer');
    expect(await response.text()).toBe('The stream key is not valid.');
  });

  test('should refuse an unknown stream key', async () => {
    await joinVoice(VOICE_CHANNEL_ID, 1);

    const response = await postOffer({ key: 'sk_not-a-real-key' });

    expect(response.status).toBe(401);
  });

  test('should refuse the key of a banned user', async () => {
    await joinVoice(VOICE_CHANNEL_ID, 2);
    const { key } = await regenerateStreamKey(2);

    await tdb.update(users).set({ banned: true }).where(eq(users.id, 2));

    const response = await postOffer({ key });

    expect(response.status).toBe(401);
  });

  test('should refuse an offer that is not sdp', async () => {
    const { key } = await regenerateStreamKey(1);

    const response = await postOffer({ key, contentType: 'application/json' });

    expect(response.status).toBe(415);
    expect(await response.text()).toBe('Send the offer as application/sdp.');
  });

  test('should refuse a user without the share screen permission', async () => {
    await joinVoice(VOICE_CHANNEL_ID, 2);
    const { key } = await regenerateStreamKey(2);

    await revokeShareScreenFromDefaultRole();

    const response = await postOffer({ key });

    expect(response.status).toBe(403);
    expect(await response.text()).toBe(
      'You are not allowed to share your screen on this server.'
    );
  });

  test('should ask the user to join a voice channel first', async () => {
    const { key } = await regenerateStreamKey(1);

    const response = await postOffer({ key });

    expect(response.status).toBe(409);
    expect(await response.text()).toBe(
      'Join a voice channel in Sharkord first, then start streaming.'
    );
  });

  test('should refuse streaming into a direct message call', async () => {
    await joinVoice(DM_CHANNEL_ID, 3);
    const { key } = await regenerateStreamKey(3);

    const response = await postOffer({ key });

    expect(response.status).toBe(409);
    expect(await response.text()).toBe(
      'Streaming into a direct message call is not supported.'
    );
  });

  test('should refuse a channel the user may not share in', async () => {
    await joinVoice(PRIVATE_VOICE_CHANNEL_ID, 2);
    const { key } = await regenerateStreamKey(2);

    const response = await postOffer({ key });

    expect(response.status).toBe(403);
    expect(await response.text()).toBe(
      'You are not allowed to share your screen in this channel.'
    );
  });

  test('should refuse an offer without media', async () => {
    await joinVoice(VOICE_CHANNEL_ID, 1);
    const { key } = await regenerateStreamKey(1);

    const response = await postOffer({
      key,
      body: lines('v=0', 'o=- 1 1 IN IP4 127.0.0.1', 's=-', 't=0 0')
    });

    expect(response.status).toBe(400);
    expect(await response.text()).toBe('The offer has no media to stream');
  });

  test('should refuse an offer with no codec it can forward', async () => {
    const runtime = await joinVoice(VOICE_CHANNEL_ID, 1);
    const { key } = await regenerateStreamKey(1);
    const unsupported = OBS_OFFER.replace('opus/48000/2', 'PCMU/8000').replace(
      'H264/90000',
      'H263/90000'
    );

    const response = await postOffer({ key, body: unsupported });

    expect(response.status).toBe(400);
    expect(await response.text()).toBe(
      'None of the offered codecs can be streamed. Use H.264 video and Opus audio.'
    );
    expect(Object.keys(runtime.getState().externalStreams)).toHaveLength(0);
  });

  test('should rate limit stream attempts', async () => {
    for (let i = 0; i < config.rateLimiters.whip.maxRequests; i++) {
      const response = await postOffer();

      expect(response.status).toBe(401);
    }

    const response = await postOffer();

    expect(response.status).toBe(429);
  });

  describe('stopping', () => {
    test('should end the stream when the app deletes it', async () => {
      const runtime = await joinVoice(VOICE_CHANNEL_ID, 1);
      const { key } = await regenerateStreamKey(1);
      const location = (await postOffer({ key })).headers.get('location')!;

      const response = await sendToStream('DELETE', location, key);

      expect(response.status).toBe(200);
      expect(Object.keys(runtime.getState().externalStreams)).toHaveLength(0);
      expect(hasWhipSession(1)).toBe(false);
    });

    test('should not let someone else end the stream', async () => {
      const runtime = await joinVoice(VOICE_CHANNEL_ID, 1);
      const { key } = await regenerateStreamKey(1);
      const { key: otherKey } = await regenerateStreamKey(2);
      const location = (await postOffer({ key })).headers.get('location')!;

      const response = await sendToStream('DELETE', location, otherKey);

      expect(response.status).toBe(404);
      expect(Object.keys(runtime.getState().externalStreams)).toHaveLength(1);
    });

    test('should refuse to end a stream without a key', async () => {
      await joinVoice(VOICE_CHANNEL_ID, 1);
      const { key } = await regenerateStreamKey(1);
      const location = (await postOffer({ key })).headers.get('location')!;

      const response = await sendToStream('DELETE', location);

      expect(response.status).toBe(401);
      expect(hasWhipSession(1)).toBe(true);
    });

    test('should answer 405 to updates of a running stream', async () => {
      const response = await sendToStream('PATCH', '/whip/anything');

      expect(response.status).toBe(405);
      expect(response.headers.get('allow')).toBe('POST, DELETE');
    });

    test('should end the stream when its owner leaves the call', async () => {
      const runtime = await joinVoice(VOICE_CHANNEL_ID, 1);
      const { key } = await regenerateStreamKey(1);

      await postOffer({ key });

      endVoiceSession(1);
      await nextTick();

      expect(Object.keys(runtime.getState().externalStreams)).toHaveLength(0);
      expect(hasWhipSession(1)).toBe(false);
    });

    test('should end the stream when its key is replaced', async () => {
      const runtime = await joinVoice(VOICE_CHANNEL_ID, 1);
      const { key } = await regenerateStreamKey(1);

      await postOffer({ key });
      await regenerateStreamKey(1);

      expect(Object.keys(runtime.getState().externalStreams)).toHaveLength(0);
      expect(hasWhipSession(1)).toBe(false);
    });

    test("should end the stream when the channel's call closes", async () => {
      const runtime = await joinVoice(VOICE_CHANNEL_ID, 1);
      const { key } = await regenerateStreamKey(1);

      await postOffer({ key });
      await runtime.destroy();
      runtimes.splice(runtimes.indexOf(runtime), 1);
      await nextTick();

      expect(hasWhipSession(1)).toBe(false);
    });
  });
});
