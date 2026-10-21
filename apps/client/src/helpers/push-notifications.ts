import {
  mutedChannelIdsSelector,
  notificationPreferencesSelector
} from '@/features/app/selectors';
import { store } from '@/features/store';
import { getTRPCClient } from '@/lib/trpc';
import type { TMessageJumpToTarget } from '@/types';

const SERVICE_WORKER_URL = '/sw.js';

// the message public/sw.js posts when one of its notifications is clicked
export const OPEN_MESSAGE_EVENT = 'mopscord:open-message';

export type TOpenMessageEvent = TMessageJumpToTarget & {
  type: typeof OPEN_MESSAGE_EVENT;
};

// a page served over plain http, a lan address for one, has no service worker at all
export const isPushSupported = () =>
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window;

export const registerServiceWorker = async () => {
  if (!('serviceWorker' in navigator)) return undefined;

  try {
    return await navigator.serviceWorker.register(SERVICE_WORKER_URL);
  } catch {
    return undefined;
  }
};

export const getServiceWorkerRegistration = async () => {
  if (!('serviceWorker' in navigator)) return undefined;

  return navigator.serviceWorker.getRegistration();
};

export const getPushSubscription = async () => {
  if (!isPushSupported()) return null;

  const registration = await getServiceWorkerRegistration();

  if (!registration) return null;

  return registration.pushManager.getSubscription();
};

// the server decides on its own whether a push is worth sending, so it keeps a copy of the
// switches and muted channels next to the subscription
const sendSubscription = async (subscription: PushSubscription) => {
  const { keys } = subscription.toJSON();
  const state = store.getState();
  const preferences = notificationPreferencesSelector(state);
  const mutedChannelIds = mutedChannelIdsSelector(state);
  const trpc = getTRPCClient();

  await trpc.notifications.subscribePush.mutate({
    endpoint: subscription.endpoint,
    keys: { p256dh: keys?.p256dh ?? '', auth: keys?.auth ?? '' },
    preferences,
    mutedChannelIds
  });
};

export const enablePush = async () => {
  const registration = await registerServiceWorker();

  if (!registration) {
    throw new Error('This browser cannot receive push notifications here.');
  }

  await navigator.serviceWorker.ready;

  const existing = await registration.pushManager.getSubscription();

  if (existing) {
    await sendSubscription(existing);

    return;
  }

  const trpc = getTRPCClient();
  const { publicKey } = await trpc.notifications.getPushPublicKey.query();
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: publicKey
  });

  await sendSubscription(subscription);
};

export const disablePush = async () => {
  const subscription = await getPushSubscription();

  if (!subscription) return;

  const trpc = getTRPCClient();

  await trpc.notifications.unsubscribePush.mutate({
    endpoint: subscription.endpoint
  });
  await subscription.unsubscribe();
};

export const syncPushSubscription = async () => {
  const subscription = await getPushSubscription();

  if (subscription) await sendSubscription(subscription);
};

// what the "turn on" of the first visit prompt does: the permission, then pushes where the
// browser can take them. returns whether notifications ended up allowed
export const turnOnNotifications = async () => {
  const permission = await Notification.requestPermission();

  if (permission !== 'granted') return false;

  if (isPushSupported()) await enablePush();

  return true;
};
