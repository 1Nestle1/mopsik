import { useCallback, useEffect, useState } from 'react';

type TNotificationPermissionState = NotificationPermission | 'unsupported';

const readPermission = (): TNotificationPermissionState =>
  'Notification' in window ? Notification.permission : 'unsupported';

const useNotificationPermission = () => {
  const [permission, setPermission] =
    useState<TNotificationPermissionState>(readPermission);

  // the person can flip it in the browser's site settings while this page is open
  useEffect(() => {
    if (!navigator.permissions) return;

    let status: PermissionStatus | undefined;
    let isCancelled = false;

    const onChange = () => setPermission(readPermission());

    const watchPermission = async () => {
      try {
        const result = await navigator.permissions.query({
          name: 'notifications'
        });

        if (isCancelled) return;

        status = result;
        status.addEventListener('change', onChange);
      } catch {
        // a browser that can't be asked just keeps the value read on mount
      }
    };

    // it catches its own failure
    watchPermission();

    return () => {
      isCancelled = true;
      status?.removeEventListener('change', onChange);
    };
  }, []);

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return 'unsupported';

    const result = await Notification.requestPermission();

    setPermission(result);

    return result;
  }, []);

  return { permission, requestPermission };
};

export { useNotificationPermission };
