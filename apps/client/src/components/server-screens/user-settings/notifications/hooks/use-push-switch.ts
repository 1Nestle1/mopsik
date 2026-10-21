import {
  disablePush,
  enablePush,
  getPushSubscription,
  isPushSupported
} from '@/helpers/push-notifications';
import { getTrpcError } from '@sharkord/shared';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

// pushes are per browser, so the switch reflects this device and acts at once, apart from the
// form's save button
const usePushSwitch = (requestPermission: () => Promise<string>) => {
  const { t } = useTranslation('settings');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const isSupported = isPushSupported();

  useEffect(() => {
    let isCancelled = false;

    const readSubscription = async () => {
      try {
        const subscription = await getPushSubscription();

        if (!isCancelled) setIsSubscribed(!!subscription);
      } catch {
        // no registration to ask means no subscription either
      }
    };

    // it catches its own failure
    readSubscription();

    return () => {
      isCancelled = true;
    };
  }, []);

  const onCheckedChange = useCallback(
    async (checked: boolean) => {
      setIsBusy(true);

      try {
        if (checked) {
          const permission = await requestPermission();

          if (permission !== 'granted') {
            toast.error(t('pushNeedsPermission'));

            return;
          }

          await enablePush();
          toast.success(t('pushEnabled'));
        } else {
          await disablePush();
          toast.success(t('pushDisabled'));
        }

        setIsSubscribed(checked);
      } catch (error) {
        toast.error(
          getTrpcError(
            error,
            t(checked ? 'failedEnablePush' : 'failedDisablePush')
          )
        );
      } finally {
        setIsBusy(false);
      }
    },
    [requestPermission, t]
  );

  return { isSupported, isSubscribed, isBusy, onCheckedChange };
};

export { usePushSwitch };
