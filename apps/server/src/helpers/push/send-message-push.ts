import {
  ChannelPermission,
  getErrorMessage,
  getMessageNotificationText,
  getPlainTextFromHtml,
  hasMention,
  shouldNotify,
  type TJoinedMessage
} from '@sharkord/shared';
import { eq, inArray } from 'drizzle-orm';
import { db } from '../../db';
import { getAffectedUserIdsForChannel } from '../../db/queries/channels';
import { getPushSubscriptionsForUsers } from '../../db/queries/push-subscriptions';
import { getRoleIdsByUserIds } from '../../db/queries/roles';
import { channels, pushSubscriptions, users } from '../../db/schema';
import { logger } from '../../logger';
import { pluginManager } from '../../plugins';
import { getOnlineUserIds } from '../../utils/wss';
import { sendWebPush } from './send-web-push';
import { getVapidKeys } from './vapid-keys';

// what the service worker reads to show the notification and to open the message on click
type TMessagePushPayload = {
  title: string;
  body: string;
  tag: string;
  channelId: number;
  messageId: number;
  isDm: boolean;
};

// a plugin's message is shown under the plugin's name, the way the chat shows it
const getAuthorName = async (message: TJoinedMessage) => {
  if (message.pluginId) {
    const pluginName = pluginManager.getPluginName(message.pluginId);

    if (pluginName) return pluginName;
  }

  if (!message.userId) return undefined;

  const author = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, message.userId))
    .limit(1)
    .get();

  return author?.name;
};

// anyone with the app open hears about the message from that tab, which applies the same
// rule, so pushes only go to people with no tab open anywhere and nobody gets it twice
const sendMessagePush = async (message: TJoinedMessage) => {
  const channel = await db
    .select({ id: channels.id, name: channels.name, isDm: channels.isDm })
    .from(channels)
    .where(eq(channels.id, message.channelId))
    .limit(1)
    .get();

  if (!channel) return;

  const onlineUserIds = new Set(getOnlineUserIds());
  const audience = await getAffectedUserIdsForChannel(
    channel.id,
    ChannelPermission.VIEW_CHANNEL
  );
  const offlineUserIds = audience.filter(
    (userId) => userId !== message.userId && !onlineUserIds.has(userId)
  );

  const subscriptions = await getPushSubscriptionsForUsers(offlineUserIds);

  if (subscriptions.length === 0) return;

  const subscribedUserIds = [
    ...new Set(subscriptions.map(({ userId }) => userId))
  ];

  const [roleIdsByUserId, authorName] = await Promise.all([
    getRoleIdsByUserIds(subscribedUserIds),
    getAuthorName(message)
  ]);

  if (!authorName) return;

  const targets = subscriptions.filter((subscription) => {
    if (subscription.mutedChannelIds.includes(channel.id)) return false;

    return shouldNotify(
      {
        all: subscription.notifyAll,
        mentions: subscription.notifyMentions,
        dms: subscription.notifyDms,
        replies: subscription.notifyReplies
      },
      {
        isDm: channel.isDm,
        isMentioned: hasMention(
          message.content,
          subscription.userId,
          roleIdsByUserId.get(subscription.userId) ?? []
        ),
        isReplyToOwnMessage: message.replyTo?.userId === subscription.userId
      }
    );
  });

  if (targets.length === 0) return;

  const { title, body } = getMessageNotificationText({
    authorName,
    channelName: channel.name,
    isDm: channel.isDm,
    plainText: getPlainTextFromHtml(message.content ?? '')
  });

  const payload: TMessagePushPayload = {
    title,
    body,
    tag: `message-${message.id}`,
    channelId: channel.id,
    // a thread reply lives in the thread panel, so the click lands on the message it answers
    messageId: message.parentMessageId ?? message.id,
    isDm: channel.isDm
  };

  const keys = await getVapidKeys();
  const results = await Promise.allSettled(
    targets.map((target) => sendWebPush(target, JSON.stringify(payload), keys))
  );

  const goneIds: number[] = [];

  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      logger.warn(
        'Push notification failed: %s',
        getErrorMessage(result.reason)
      );

      return;
    }

    const target = targets[index];

    if (result.value === 'gone' && target) goneIds.push(target.id);
  });

  if (goneIds.length > 0) {
    await db
      .delete(pushSubscriptions)
      .where(inArray(pushSubscriptions.id, goneIds));
  }
};

export { sendMessagePush };
export type { TMessagePushPayload };
