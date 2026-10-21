// shows push notifications and opens the message one is about. it caches nothing, so the app
// behaves the same with or without it. "mopscord:open-message" is read by usePushNotifications
const OPEN_MESSAGE_EVENT = 'mopscord:open-message';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

const readPayload = (event) => {
  try {
    return event.data ? event.data.json() : undefined;
  } catch {
    return undefined;
  }
};

self.addEventListener('push', (event) => {
  const payload = readPayload(event);

  if (!payload || typeof payload.title !== 'string') return;

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      // the open tab tags its own notification the same way, so one message shows once
      tag: payload.tag,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: {
        channelId: payload.channelId,
        messageId: payload.messageId,
        isDm: payload.isDm
      }
    })
  );
});

const openMessage = async (target) => {
  const windows = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  });
  const [existing] = windows;

  if (existing) {
    await existing.focus();

    if (target) existing.postMessage({ type: OPEN_MESSAGE_EVENT, ...target });

    return;
  }

  // with no tab open the app starts fresh and lands where it always does
  await self.clients.openWindow('/');
};

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(openMessage(event.notification.data));
});
