import { getErrorMessage, type TJoinedMessage } from '@sharkord/shared';
import Queue from 'queue';
import { sendMessagePush } from '../../helpers/push/send-message-push';
import { logger } from '../../logger';
import { drainQueue } from '../drain';

// a push service can take a second or two to answer, which no message send should wait on
const pushNotificationsQueue = new Queue({
  concurrency: 2,
  autostart: true,
  timeout: 15_000
});

pushNotificationsQueue.autostart = true;

const enqueueMessagePush = (message: TJoinedMessage) => {
  pushNotificationsQueue.push(async (callback) => {
    try {
      await sendMessagePush(message);
    } catch (error) {
      logger.error(
        'Failed to send push notifications for message %d: %s',
        message.id,
        getErrorMessage(error)
      );
    }

    callback?.();
  });
};

const drainPushNotificationsQueue = () => drainQueue(pushNotificationsQueue);

export { drainPushNotificationsQueue, enqueueMessagePush };
