import { describe, expect, test } from 'bun:test';
import { eq } from 'drizzle-orm';
import { initTest } from '../../__tests__/helpers';
import { tdb } from '../../__tests__/setup';
import { pushSubscriptions, pushVapidKeys } from '../../db/schema';

const ENDPOINT = 'https://fcm.googleapis.com/fcm/send/test-device';

const SUBSCRIPTION = {
  endpoint: ENDPOINT,
  keys: { p256dh: 'BPublicKeyOfTheBrowser', auth: 'authSecret' },
  preferences: { all: false, mentions: true, dms: true, replies: true },
  mutedChannelIds: [5]
};

const getStoredSubscriptions = () => tdb.select().from(pushSubscriptions);

describe('notifications router', () => {
  describe('getPushPublicKey', () => {
    test('should make the key pair once and keep handing out the same public key', async () => {
      const { caller } = await initTest(1);

      const first = await caller.notifications.getPushPublicKey();
      const second = await caller.notifications.getPushPublicKey();
      const stored = await tdb.select().from(pushVapidKeys);

      expect(first.publicKey.length).toBeGreaterThan(40);
      expect(second.publicKey).toBe(first.publicKey);
      expect(stored).toHaveLength(1);
    });

    test('should never hand out the private key', async () => {
      const { caller } = await initTest(2);

      const result = await caller.notifications.getPushPublicKey();
      const [stored] = await tdb.select().from(pushVapidKeys);

      expect(Object.keys(result)).toEqual(['publicKey']);
      expect(JSON.stringify(result)).not.toContain(stored!.privateKey);
    });
  });

  describe('subscribePush', () => {
    test('should store the subscription with its switches and muted channels', async () => {
      const { caller } = await initTest(2);

      await caller.notifications.subscribePush(SUBSCRIPTION);

      const [stored] = await getStoredSubscriptions();

      expect(stored).toMatchObject({
        userId: 2,
        endpoint: ENDPOINT,
        p256dh: 'BPublicKeyOfTheBrowser',
        auth: 'authSecret',
        notifyAll: false,
        notifyMentions: true,
        notifyDms: true,
        notifyReplies: true,
        mutedChannelIds: [5]
      });
    });

    test('should update the switches when the same browser subscribes again', async () => {
      const { caller } = await initTest(2);

      await caller.notifications.subscribePush(SUBSCRIPTION);
      await caller.notifications.subscribePush({
        ...SUBSCRIPTION,
        preferences: { all: true, mentions: false, dms: false, replies: false },
        mutedChannelIds: []
      });

      const stored = await getStoredSubscriptions();

      expect(stored).toHaveLength(1);
      expect(stored[0]).toMatchObject({
        notifyAll: true,
        notifyMentions: false,
        mutedChannelIds: []
      });
    });

    test('should hand the browser over to the account that signs in on it next', async () => {
      const { caller: first } = await initTest(2);
      const { caller: second } = await initTest(3);

      await first.notifications.subscribePush(SUBSCRIPTION);
      await second.notifications.subscribePush(SUBSCRIPTION);

      const stored = await getStoredSubscriptions();

      expect(stored).toHaveLength(1);
      expect(stored[0]!.userId).toBe(3);
    });

    test('should refuse an endpoint that is not a browser push service', async () => {
      const { caller } = await initTest(2);

      await expect(
        caller.notifications.subscribePush({
          ...SUBSCRIPTION,
          endpoint: 'https://internal.example.com/hook'
        })
      ).rejects.toThrow("This browser's push service isn't supported.");

      expect(await getStoredSubscriptions()).toHaveLength(0);
    });

    test('should refuse a push service reached without https', async () => {
      const { caller } = await initTest(2);

      await expect(
        caller.notifications.subscribePush({
          ...SUBSCRIPTION,
          endpoint: 'http://fcm.googleapis.com/fcm/send/test-device'
        })
      ).rejects.toThrow("This browser's push service isn't supported.");
    });

    test('should refuse an endpoint that is not a url', async () => {
      const { caller } = await initTest(2);

      await expect(
        caller.notifications.subscribePush({
          ...SUBSCRIPTION,
          endpoint: 'not a url'
        })
      ).rejects.toThrow();
    });

    test('should refuse empty browser keys', async () => {
      const { caller } = await initTest(2);

      await expect(
        caller.notifications.subscribePush({
          ...SUBSCRIPTION,
          keys: { p256dh: '', auth: '' }
        })
      ).rejects.toThrow();
    });

    test('should refuse a muted channel id that is not a positive integer', async () => {
      const { caller } = await initTest(2);

      await expect(
        caller.notifications.subscribePush({
          ...SUBSCRIPTION,
          mutedChannelIds: [-1]
        })
      ).rejects.toThrow();
    });
  });

  describe('unsubscribePush', () => {
    test('should remove the caller own subscription', async () => {
      const { caller } = await initTest(2);

      await caller.notifications.subscribePush(SUBSCRIPTION);
      await caller.notifications.unsubscribePush({ endpoint: ENDPOINT });

      expect(await getStoredSubscriptions()).toHaveLength(0);
    });

    test('should leave a subscription that belongs to someone else', async () => {
      const { caller: owner } = await initTest(2);
      const { caller: stranger } = await initTest(3);

      await owner.notifications.subscribePush(SUBSCRIPTION);
      await stranger.notifications.unsubscribePush({ endpoint: ENDPOINT });

      const stored = await tdb
        .select()
        .from(pushSubscriptions)
        .where(eq(pushSubscriptions.endpoint, ENDPOINT));

      expect(stored).toHaveLength(1);
    });
  });
});
