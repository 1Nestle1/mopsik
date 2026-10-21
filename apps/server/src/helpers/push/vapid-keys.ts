import webPush from 'web-push';
import { db } from '../../db';
import { pushVapidKeys } from '../../db/schema';
import { invariant } from '../../utils/invariant';

const readVapidKeys = () =>
  db
    .select({
      publicKey: pushVapidKeys.publicKey,
      privateKey: pushVapidKeys.privateKey
    })
    .from(pushVapidKeys)
    .limit(1)
    .get();

// made on first use instead of at boot, so a server where nobody turns pushes on never has a
// pair. two first uses at once both try to insert; the single row index keeps one of them and
// both read that one back
const getVapidKeys = async () => {
  const existing = await readVapidKeys();

  if (existing) return existing;

  const { publicKey, privateKey } = webPush.generateVAPIDKeys();

  await db
    .insert(pushVapidKeys)
    .values({ publicKey, privateKey, createdAt: Date.now() })
    .onConflictDoNothing();

  const stored = await readVapidKeys();

  invariant(stored, {
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Push notifications could not be set up on this server.'
  });

  return stored;
};

export { getVapidKeys };
