import { createHash, randomBytes } from 'crypto';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { streamKeys } from '../db/schema';
import { endWhipSessionsForUser } from '../runtimes/whip';

// prefixed so a key pasted somewhere it shouldn't be is easy to recognise and revoke
const STREAM_KEY_PREFIX = 'sk_';

const hashStreamKey = (key: string) =>
  createHash('sha256').update(key).digest('hex');

// a new key replaces the old one, and whatever was streaming with the old key stops with it
const regenerateStreamKey = async (userId: number) => {
  const key = `${STREAM_KEY_PREFIX}${randomBytes(32).toString('base64url')}`;
  const keyHash = hashStreamKey(key);
  const createdAt = Date.now();

  await db
    .insert(streamKeys)
    .values({ userId, keyHash, createdAt })
    .onConflictDoUpdate({
      target: streamKeys.userId,
      set: { keyHash, createdAt }
    });

  endWhipSessionsForUser(userId);

  return { key, createdAt };
};

const revokeStreamKey = async (userId: number) => {
  await db.delete(streamKeys).where(eq(streamKeys.userId, userId));

  endWhipSessionsForUser(userId);
};

export { hashStreamKey, regenerateStreamKey, revokeStreamKey };
