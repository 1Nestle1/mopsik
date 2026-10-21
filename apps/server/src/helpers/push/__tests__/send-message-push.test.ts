import { beforeEach, describe, expect, spyOn, test, type Mock } from 'bun:test';
import { eq } from 'drizzle-orm';
import { initTest, sendMessage } from '../../../__tests__/helpers';
import { tdb } from '../../../__tests__/setup';
import { pushSubscriptions, users } from '../../../db/schema';
import { drainPushNotificationsQueue } from '../../../queues/push-notifications';
import * as wss from '../../../utils/wss';
import type { TMessagePushPayload } from '../send-message-push';
import * as webPush from '../send-web-push';

// the real push services are out of reach from tests, so sendWebPush is stubbed and what it was
// asked to send is asserted on; the encryption itself is web-push's and is not re-tested here

const GENERAL_CHANNEL_ID = 1;
const DM_CHANNEL_ID = 3;
const RESTRICTED_CHANNEL_ID = 5;

const MENTION_OF_USER_2 =
  '<p>look <span data-type="mention" data-user-id="2">@testuser</span></p>';

type TPreferences = {
  all: boolean;
  mentions: boolean;
  dms: boolean;
  replies: boolean;
};

const getEndpoint = (userId: number) =>
  `https://fcm.googleapis.com/fcm/send/user-${userId}`;

const subscribe = async (
  userId: number,
  preferences: Partial<TPreferences> = {},
  mutedChannelIds: number[] = []
) => {
  const { caller } = await initTest(userId);

  await caller.notifications.subscribePush({
    endpoint: getEndpoint(userId),
    keys: { p256dh: 'BPublicKeyOfTheBrowser', auth: 'authSecret' },
    preferences: {
      all: false,
      mentions: true,
      dms: true,
      replies: true,
      ...preferences
    },
    mutedChannelIds
  });
};

const send = async (
  userId: number,
  channelId: number,
  content: string,
  replyToMessageId?: number
) => {
  const { caller } = await initTest(userId);
  const messageId = await sendMessage(caller, {
    channelId,
    content,
    replyToMessageId
  });

  await drainPushNotificationsQueue();

  return messageId;
};

describe('sendMessagePush', () => {
  let sendSpy: Mock<typeof webPush.sendWebPush>;

  const getPushedEndpoints = () =>
    sendSpy.mock.calls.map(([target]) => target.endpoint);

  const getPayload = (callIndex: number): TMessagePushPayload =>
    JSON.parse(sendSpy.mock.calls[callIndex]![1]);

  beforeEach(() => {
    spyOn(wss, 'getOnlineUserIds').mockReturnValue([]);
    sendSpy = spyOn(webPush, 'sendWebPush').mockResolvedValue('sent');
  });

  test('should push a mention to someone with no tab open', async () => {
    await subscribe(2);

    const messageId = await send(1, GENERAL_CHANNEL_ID, MENTION_OF_USER_2);
    const payload = getPayload(0);

    expect(getPushedEndpoints()).toEqual([getEndpoint(2)]);
    expect(payload.title.endsWith(' · #General')).toBe(true);
    expect(payload.body).toContain('@testuser');
    expect(payload).toMatchObject({
      tag: `message-${messageId}`,
      channelId: GENERAL_CHANNEL_ID,
      messageId,
      isDm: false
    });
  });

  test('should not push a plain message to someone who only wants mentions', async () => {
    await subscribe(2);

    await send(1, GENERAL_CHANNEL_ID, '<p>hello everyone</p>');

    expect(sendSpy).not.toHaveBeenCalled();
  });

  test('should push every message to someone with all messages on', async () => {
    await subscribe(2, { all: true });

    await send(1, GENERAL_CHANNEL_ID, '<p>hello everyone</p>');

    expect(getPushedEndpoints()).toEqual([getEndpoint(2)]);
  });

  test('should push a reply to the author of the message replied to', async () => {
    await subscribe(1, { mentions: false, replies: true });

    // message 1 is the owner's seeded message in General
    await send(3, GENERAL_CHANNEL_ID, '<p>agreed</p>', 1);

    expect(getPushedEndpoints()).toEqual([getEndpoint(1)]);
  });

  test('should push a direct message under the sender name alone', async () => {
    await subscribe(4, { mentions: false, replies: false, dms: true });

    await send(3, DM_CHANNEL_ID, '<p>psst</p>');

    const payload = getPayload(0);

    expect(getPushedEndpoints()).toEqual([getEndpoint(4)]);
    expect(payload.isDm).toBe(true);
    expect(payload.title).not.toContain('#');
  });

  test('should not push a direct message with the dm switch off', async () => {
    await subscribe(4, { all: true, dms: false });

    await send(3, DM_CHANNEL_ID, '<p>psst</p>');

    expect(sendSpy).not.toHaveBeenCalled();
  });

  test('should not push to someone who has a tab open', async () => {
    await subscribe(2, { all: true });

    spyOn(wss, 'getOnlineUserIds').mockReturnValue([2]);

    await send(1, GENERAL_CHANNEL_ID, MENTION_OF_USER_2);

    expect(sendSpy).not.toHaveBeenCalled();
  });

  test('should not push the author their own message', async () => {
    await subscribe(1, { all: true });

    await send(1, GENERAL_CHANNEL_ID, '<p>talking to myself</p>');

    expect(sendSpy).not.toHaveBeenCalled();
  });

  test('should not push a channel the subscriber muted', async () => {
    await subscribe(2, { all: true }, [GENERAL_CHANNEL_ID]);

    await send(1, GENERAL_CHANNEL_ID, MENTION_OF_USER_2);

    expect(sendSpy).not.toHaveBeenCalled();
  });

  test('should not push a channel the subscriber cannot see', async () => {
    await subscribe(2, { all: true });

    await send(1, RESTRICTED_CHANNEL_ID, MENTION_OF_USER_2);

    expect(sendSpy).not.toHaveBeenCalled();
  });

  test('should not push to a banned user', async () => {
    await subscribe(2, { all: true });

    await tdb.update(users).set({ banned: true }).where(eq(users.id, 2));

    await send(1, GENERAL_CHANNEL_ID, MENTION_OF_USER_2);

    expect(sendSpy).not.toHaveBeenCalled();
  });

  test('should drop a subscription the push service says is gone', async () => {
    sendSpy.mockResolvedValue('gone');

    await subscribe(2, { all: true });
    await send(1, GENERAL_CHANNEL_ID, '<p>anyone there</p>');

    expect(await tdb.select().from(pushSubscriptions)).toHaveLength(0);
  });

  test('should still push the others when one push service fails', async () => {
    sendSpy.mockImplementation(async (target) => {
      if (target.endpoint === getEndpoint(2)) throw new Error('down');

      return 'sent';
    });

    await subscribe(2, { all: true });
    await subscribe(3, { all: true });
    await send(1, GENERAL_CHANNEL_ID, '<p>hello everyone</p>');

    expect(getPushedEndpoints().sort()).toEqual(
      [getEndpoint(2), getEndpoint(3)].sort()
    );
    expect(await tdb.select().from(pushSubscriptions)).toHaveLength(2);
  });
});
