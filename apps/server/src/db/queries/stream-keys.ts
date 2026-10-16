import { eq } from 'drizzle-orm';
import { db } from '..';
import { streamKeys, users } from '../schema';

const getStreamKeyCreatedAt = async (userId: number) => {
  const row = await db
    .select({ createdAt: streamKeys.createdAt })
    .from(streamKeys)
    .where(eq(streamKeys.userId, userId))
    .limit(1)
    .get();

  return row?.createdAt;
};

const getStreamKeyOwner = async (keyHash: string) =>
  db
    .select({ id: users.id, name: users.name, banned: users.banned })
    .from(streamKeys)
    .innerJoin(users, eq(users.id, streamKeys.userId))
    .where(eq(streamKeys.keyHash, keyHash))
    .limit(1)
    .get();

export { getStreamKeyCreatedAt, getStreamKeyOwner };
