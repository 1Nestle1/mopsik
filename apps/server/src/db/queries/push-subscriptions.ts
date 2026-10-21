import { and, eq, inArray } from 'drizzle-orm';
import { db } from '..';
import { pushSubscriptions, users } from '../schema';

// a banned user keeps their subscriptions until they are unbanned or deleted, so they are
// skipped here rather than cleaned up
const getPushSubscriptionsForUsers = async (userIds: number[]) => {
  if (userIds.length === 0) return [];

  return db
    .select({
      id: pushSubscriptions.id,
      userId: pushSubscriptions.userId,
      endpoint: pushSubscriptions.endpoint,
      p256dh: pushSubscriptions.p256dh,
      auth: pushSubscriptions.auth,
      notifyAll: pushSubscriptions.notifyAll,
      notifyMentions: pushSubscriptions.notifyMentions,
      notifyDms: pushSubscriptions.notifyDms,
      notifyReplies: pushSubscriptions.notifyReplies,
      mutedChannelIds: pushSubscriptions.mutedChannelIds
    })
    .from(pushSubscriptions)
    .innerJoin(users, eq(users.id, pushSubscriptions.userId))
    .where(
      and(inArray(pushSubscriptions.userId, userIds), eq(users.banned, false))
    );
};

export { getPushSubscriptionsForUsers };
