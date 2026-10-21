import {
  useMutedChannelIds,
  useNotificationPreferences
} from '@/features/app/hooks';
import { jumpToMessage } from '@/features/server/actions';
import { logDebug } from '@/helpers/browser-logger';
import {
  OPEN_MESSAGE_EVENT,
  registerServiceWorker,
  syncPushSubscription,
  type TOpenMessageEvent
} from '@/helpers/push-notifications';
import { useEffect } from 'react';

// the settings form saves its switches one after another, so they go to the server as one
const SYNC_DELAY_MS = 800;

const isOpenMessageEvent = (data: unknown): data is TOpenMessageEvent => {
  if (!data || typeof data !== 'object') return false;

  const event = data as Partial<TOpenMessageEvent>;

  return (
    event.type === OPEN_MESSAGE_EVENT &&
    typeof event.channelId === 'number' &&
    typeof event.messageId === 'number' &&
    typeof event.isDm === 'boolean'
  );
};

const usePushNotifications = () => {
  const preferences = useNotificationPreferences();
  const mutedChannelIds = useMutedChannelIds();

  // registered for everyone, not only those who turn pushes on: it is also what shows the
  // tab's own notifications on android. it reports its own failure by resolving to nothing
  useEffect(() => {
    registerServiceWorker();
  }, []);

  // keeps the server's copy of the switches and mutes current; running on every connect also
  // brings back a subscription the server lost
  useEffect(() => {
    const timer = setTimeout(() => {
      syncPushSubscription().catch((error) =>
        logDebug('Could not sync the push subscription', error)
      );
    }, SYNC_DELAY_MS);

    return () => clearTimeout(timer);
  }, [preferences, mutedChannelIds]);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const onMessage = (event: MessageEvent) => {
      if (!isOpenMessageEvent(event.data)) return;

      const { channelId, messageId, isDm } = event.data;

      jumpToMessage({ channelId, messageId, isDm });
    };

    navigator.serviceWorker.addEventListener('message', onMessage);

    return () => {
      navigator.serviceWorker.removeEventListener('message', onMessage);
    };
  }, []);
};

export { usePushNotifications };
