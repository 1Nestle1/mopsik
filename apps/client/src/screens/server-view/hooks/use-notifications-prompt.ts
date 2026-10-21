import { turnOnNotifications } from '@/helpers/push-notifications';
import {
  getLocalStorageItemBool,
  LocalStorageKey,
  setLocalStorageItemBool
} from '@/helpers/storage';
import { getTrpcError } from '@sharkord/shared';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

// long enough for the server to finish loading, so the prompt isn't lost in that bustle
const PROMPT_DELAY_MS = 4_000;

const dismissPrompt = () =>
  setLocalStorageItemBool(LocalStorageKey.NOTIFICATIONS_PROMPT_DISMISSED, true);

// notifications are on by default but the browser stays silent until it is allowed to speak,
// and it only asks after a click. this offers that click once, on a toast
const useNotificationsPrompt = () => {
  const { t } = useTranslation('common');

  useEffect(() => {
    if (!('Notification' in window) || Notification.permission !== 'default') {
      return;
    }

    const isDismissed = getLocalStorageItemBool(
      LocalStorageKey.NOTIFICATIONS_PROMPT_DISMISSED,
      false
    );

    if (isDismissed) return;

    const onEnable = async () => {
      dismissPrompt();

      try {
        await turnOnNotifications();
      } catch (error) {
        toast.error(getTrpcError(error, t('failedTurnOnNotifications')));
      }
    };

    const timer = setTimeout(() => {
      toast(t('notificationsPromptTitle'), {
        description: t('notificationsPromptDesc'),
        duration: Infinity,
        action: { label: t('notificationsPromptEnable'), onClick: onEnable },
        cancel: { label: t('notificationsPromptLater'), onClick: dismissPrompt }
      });
    }, PROMPT_DELAY_MS);

    return () => clearTimeout(timer);
  }, [t]);
};

export { useNotificationsPrompt };
