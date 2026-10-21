import { useTotalUnreadCount } from '@/features/server/hooks';
import { useEffect } from 'react';

// the unread count on the icon of mopscord installed as an app, the same number the tab title
// shows. a browser has to know about the badge api and be running the installed app for it to
// show, and it rejects the call otherwise, which is fine
const useAppBadge = () => {
  const unreadCount = useTotalUnreadCount();

  useEffect(() => {
    if (!('setAppBadge' in navigator)) return;

    const update =
      unreadCount > 0
        ? navigator.setAppBadge(unreadCount)
        : navigator.clearAppBadge();

    update.catch(() => {});
  }, [unreadCount]);
};

export { useAppBadge };
