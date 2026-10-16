import { Permission } from '@sharkord/shared';
import { describe, expect, test } from 'bun:test';
import { and, eq } from 'drizzle-orm';
import { initTest } from '../../__tests__/helpers';
import { tdb } from '../../__tests__/setup';
import { config } from '../../config';
import { rolePermissions, streamKeys } from '../../db/schema';
import { hashStreamKey } from '../../helpers/stream-keys';

const revokeShareScreenFromDefaultRole = async () =>
  tdb
    .delete(rolePermissions)
    .where(
      and(
        eq(rolePermissions.roleId, 2),
        eq(rolePermissions.permission, Permission.SHARE_SCREEN)
      )
    );

const getStoredKey = async (userId: number) =>
  tdb.select().from(streamKeys).where(eq(streamKeys.userId, userId)).get();

describe('streaming router', () => {
  describe('getKeyInfo', () => {
    test('should report no key before one is made', async () => {
      const { caller } = await initTest(1);

      const info = await caller.streaming.getKeyInfo();

      expect(info).toEqual({ createdAt: null, canStream: true, isLive: false });
    });

    test('should report when the key was made, never the key itself', async () => {
      const { caller } = await initTest(1);

      const { createdAt } = await caller.streaming.regenerateKey();
      const info = await caller.streaming.getKeyInfo();

      expect(info.createdAt).toBe(createdAt);
      expect(JSON.stringify(info)).not.toContain('sk_');
    });

    test('should say when the user may not stream', async () => {
      await revokeShareScreenFromDefaultRole();

      const { caller } = await initTest(2);

      const info = await caller.streaming.getKeyInfo();

      expect(info.canStream).toBe(false);
    });
  });

  describe('regenerateKey', () => {
    test('should hand out a key once and store only its hash', async () => {
      const { caller } = await initTest(1);

      const { key, createdAt } = await caller.streaming.regenerateKey();
      const stored = await getStoredKey(1);

      expect(key.startsWith('sk_')).toBe(true);
      expect(key.length).toBeGreaterThan(40);
      expect(stored?.keyHash).toBe(hashStreamKey(key));
      expect(stored?.keyHash).not.toBe(key);
      expect(stored?.createdAt).toBe(createdAt);
    });

    test('should replace the previous key', async () => {
      const { caller } = await initTest(1);

      const first = await caller.streaming.regenerateKey();
      const second = await caller.streaming.regenerateKey();
      const rows = await tdb
        .select()
        .from(streamKeys)
        .where(eq(streamKeys.userId, 1));

      expect(second.key).not.toBe(first.key);
      expect(rows).toHaveLength(1);
      expect(rows[0]?.keyHash).toBe(hashStreamKey(second.key));
    });

    test('should reject a user without the share screen permission', async () => {
      await revokeShareScreenFromDefaultRole();

      const { caller } = await initTest(2);

      await expect(caller.streaming.regenerateKey()).rejects.toThrow(
        'Insufficient permissions'
      );
      expect(await getStoredKey(2)).toBeUndefined();
    });

    test('should rate limit key changes', async () => {
      const { caller } = await initTest(1);

      for (let i = 0; i < config.rateLimiters.streamKey.maxRequests; i++) {
        await caller.streaming.regenerateKey();
      }

      await expect(caller.streaming.regenerateKey()).rejects.toThrow(
        'Too many requests. Please try again shortly.'
      );
    });
  });

  describe('revokeKey', () => {
    test('should delete the key', async () => {
      const { caller } = await initTest(1);

      await caller.streaming.regenerateKey();
      await caller.streaming.revokeKey();

      expect(await getStoredKey(1)).toBeUndefined();
    });

    test('should let a user without the permission revoke their key', async () => {
      const { caller } = await initTest(2);

      await caller.streaming.regenerateKey();
      await revokeShareScreenFromDefaultRole();
      await caller.streaming.revokeKey();

      expect(await getStoredKey(2)).toBeUndefined();
    });
  });
});
