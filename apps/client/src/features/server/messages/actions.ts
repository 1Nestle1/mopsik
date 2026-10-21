import {
  isChannelMutedSelector,
  notificationPreferencesSelector,
  threadSidebarDataSelector
} from '@/features/app/selectors';
import { store } from '@/features/store';
import { logDebug } from '@/helpers/browser-logger';
import { getFileUrl } from '@/helpers/get-file-url';
import { getServiceWorkerRegistration } from '@/helpers/push-notifications';
import { playSound } from '@/helpers/sounds';
import type { TMessageJumpToTarget } from '@/types';
import {
  getMessageNotificationText,
  getPlainTextFromHtml,
  hasMention,
  shouldNotify,
  TYPING_MS,
  type TJoinedMessage
} from '@sharkord/shared';
import { jumpToMessage, markChannelAsRead } from '../actions';
import {
  channelByIdSelector,
  isChannelTextVisibleByIdSelector
} from '../channels/selectors';
import { pluginMetadataByIdSelector } from '../plugins/selectors';
import { serverSliceActions } from '../slice';
import { SoundType } from '../types';
import {
  ownUserIdSelector,
  ownUserRoleIdsSelector,
  userByIdSelector
} from '../users/selectors';
import { threadMessagesMapSelector } from './selectors';

const sendBrowserNotification = async (
  message: TJoinedMessage,
  channelId: number,
  isDm = false
) => {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  const state = store.getState();

  const user = userByIdSelector(state, message.userId);
  const plugin = pluginMetadataByIdSelector(state, message.pluginId);
  const channel = channelByIdSelector(state, channelId);
  const isPluginMessage = !!message.pluginId;

  if (!user || !channel) {
    return;
  }

  const { title, body } = getMessageNotificationText({
    authorName: isPluginMessage && plugin ? plugin.name : user.name,
    channelName: channel.name,
    isDm,
    plainText: getPlainTextFromHtml(message.content ?? '')
  });
  const options = {
    body,
    icon: user.avatar ? getFileUrl(user.avatar) : undefined,
    // push notifications use the same tag, so a message the tab and the push both announce
    // shows up once
    tag: `message-${message.id}`
  };
  const target: TMessageJumpToTarget = {
    channelId,
    // a thread reply lives in the thread panel, so the jump lands on the message it answers
    messageId: message.parentMessageId ?? message.id,
    isDm
  };

  // android's chrome refuses notifications made by the page itself, so whenever the service
  // worker is there it shows them, and its click comes back through usePushNotifications
  const registration = await getServiceWorkerRegistration();

  if (registration) {
    await registration.showNotification(title, { ...options, data: target });

    return;
  }

  const notification = new Notification(title, options);

  notification.onclick = () => {
    window.focus();
    notification.close();
    jumpToMessage(target);
  };
};

const typingTimeouts: { [key: string]: NodeJS.Timeout } = {};

const getTypingKey = (channelId: number, userId: number) =>
  `${channelId}-${userId}`;

export const setChannelMessages = (
  channelId: number,
  messages: TJoinedMessage[],
  detached: boolean
) => {
  store.dispatch(
    serverSliceActions.setChannelMessages({ channelId, messages, detached })
  );
};

export const trimChannelMessages = (channelId: number) => {
  store.dispatch(serverSliceActions.trimChannelMessages(channelId));
};

export const addMessages = (
  channelId: number,
  messages: TJoinedMessage[],
  isSubscriptionMessage = false
) => {
  const rootMessages = messages.filter((m) => !m.parentMessageId);
  const threadReplies = messages.filter((m) => !!m.parentMessageId);

  if (rootMessages.length > 0) {
    store.dispatch(
      serverSliceActions.addMessages({
        channelId,
        messages: rootMessages,
        isLive: isSubscriptionMessage
      })
    );
  }

  const repliesByParent = new Map<number, TJoinedMessage[]>();

  for (const reply of threadReplies) {
    const parentId = reply.parentMessageId!;

    if (!repliesByParent.has(parentId)) {
      repliesByParent.set(parentId, []);
    }

    repliesByParent.get(parentId)!.push(reply);
  }

  for (const [parentMessageId, replies] of repliesByParent) {
    store.dispatch(
      serverSliceActions.addThreadMessages({
        parentMessageId,
        messages: replies
      })
    );
  }

  rootMessages.forEach((message) => {
    if (message.userId) {
      removeTypingUser(channelId, message.userId);
    }
  });

  threadReplies.forEach((message) => {
    if (message.parentMessageId && message.userId) {
      removeThreadTypingUser(message.parentMessageId, message.userId);
    }
  });

  if (isSubscriptionMessage && messages.length > 0) {
    const state = store.getState();
    const ownUserId = ownUserIdSelector(state);
    const targetMessage = messages[0];
    const isFromOwnUser =
      targetMessage.userId && ownUserId === targetMessage.userId;

    const isChannelTextVisible = isChannelTextVisibleByIdSelector(
      state,
      channelId
    );

    const isWindowHidden = document?.hidden;
    const isChannelMuted = isChannelMutedSelector(state, channelId);

    if (!isFromOwnUser && !isChannelMuted) {
      const isThreadReply = !!targetMessage.parentMessageId;

      if (isThreadReply) {
        const { isOpen, parentMessageId } = threadSidebarDataSelector(state);

        // only play sound if the user has this thread open
        if (isOpen && parentMessageId === targetMessage.parentMessageId) {
          playSound(SoundType.MESSAGE_RECEIVED);
        }
      } else {
        playSound(SoundType.MESSAGE_RECEIVED);
      }

      // only send browser notifications if the user is not currently viewing this channel
      if (!isChannelTextVisible || isWindowHidden) {
        const channel = channelByIdSelector(state, channelId);
        const ownRoleIds = ownUserRoleIdsSelector(state);
        const preferences = notificationPreferencesSelector(state);
        const relation = {
          isDm: !!channel?.isDm,
          isMentioned: hasMention(
            targetMessage.content ?? null,
            ownUserId,
            ownRoleIds
          ),
          isReplyToOwnMessage:
            !!targetMessage.replyToMessageId &&
            targetMessage.replyTo?.userId === ownUserId
        };

        if (shouldNotify(preferences, relation)) {
          sendBrowserNotification(
            targetMessage,
            channelId,
            relation.isDm
          ).catch((error) => logDebug('Could not show a notification', error));
        }
      }
    }

    if (isChannelTextVisible && !isFromOwnUser && rootMessages.length > 0) {
      markChannelAsRead(channelId, true);
    }
  }
};

export const updateMessage = (channelId: number, message: TJoinedMessage) => {
  if (message.parentMessageId) {
    store.dispatch(
      serverSliceActions.updateThreadMessage({
        parentMessageId: message.parentMessageId,
        message
      })
    );
  } else {
    store.dispatch(serverSliceActions.updateMessage({ channelId, message }));
  }
};

export const deleteMessage = (channelId: number, messageId: number) => {
  // delete from both maps, the message could be a thread reply or root
  store.dispatch(serverSliceActions.deleteMessage({ channelId, messageId }));

  const state = store.getState();
  const threadMessagesMap = threadMessagesMapSelector(state);

  for (const parentId in threadMessagesMap) {
    const threadMessages = threadMessagesMap[parentId];

    if (threadMessages?.some((m) => m.id === messageId)) {
      store.dispatch(
        serverSliceActions.deleteThreadMessage({
          parentMessageId: Number(parentId),
          messageId
        })
      );

      break;
    }
  }
};

export const addThreadMessages = (
  parentMessageId: number,
  messages: TJoinedMessage[]
) => {
  store.dispatch(
    serverSliceActions.addThreadMessages({
      parentMessageId,
      messages
    })
  );
};

export const clearThreadMessages = (parentMessageId: number) => {
  store.dispatch(serverSliceActions.clearThreadMessages(parentMessageId));
};

export const addTypingUser = (
  channelId: number,
  userId: number,
  parentMessageId?: number
) => {
  if (parentMessageId) {
    store.dispatch(
      serverSliceActions.addThreadTypingUser({ parentMessageId, userId })
    );

    const timeoutKey = `thread-${parentMessageId}-${userId}`;

    if (typingTimeouts[timeoutKey]) {
      clearTimeout(typingTimeouts[timeoutKey]);
    }

    typingTimeouts[timeoutKey] = setTimeout(() => {
      removeThreadTypingUser(parentMessageId, userId);

      delete typingTimeouts[timeoutKey];
    }, TYPING_MS + 500);
  } else {
    store.dispatch(serverSliceActions.addTypingUser({ channelId, userId }));

    const timeoutKey = getTypingKey(channelId, userId);

    if (typingTimeouts[timeoutKey]) {
      clearTimeout(typingTimeouts[timeoutKey]);
    }

    typingTimeouts[timeoutKey] = setTimeout(() => {
      removeTypingUser(channelId, userId);

      delete typingTimeouts[timeoutKey];
    }, TYPING_MS + 500);
  }
};

export const removeTypingUser = (channelId: number, userId: number) => {
  store.dispatch(serverSliceActions.removeTypingUser({ channelId, userId }));
};

export const removeThreadTypingUser = (
  parentMessageId: number,
  userId: number
) => {
  store.dispatch(
    serverSliceActions.removeThreadTypingUser({ parentMessageId, userId })
  );
};

export const updateReplyCount = (
  channelId: number,
  messageId: number,
  replyCount: number
) => {
  store.dispatch(
    serverSliceActions.updateReplyCount({ channelId, messageId, replyCount })
  );
};
