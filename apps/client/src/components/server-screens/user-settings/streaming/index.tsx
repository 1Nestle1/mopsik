import { SettingsSection } from '@/components/server-screens/settings-shell/section';
import { requestConfirmation } from '@/features/dialogs/actions';
import { getUrlFromServer } from '@/helpers/get-file-url';
import { useDateLocale } from '@/hooks/use-date-locale';
import { getTRPCClient } from '@/lib/trpc';
import { getTrpcError } from '@sharkord/shared';
import {
  Alert,
  AlertDescription,
  Button,
  Group,
  LoadingCard
} from '@sharkord/ui';
import { format } from 'date-fns';
import { memo, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { CopyField } from './copy-field';
import { ObsGuide } from './obs-guide';

type TKeyInfo = {
  createdAt: number | null;
  canStream: boolean;
  isLive: boolean;
};

const Streaming = memo(() => {
  const { t } = useTranslation('settings');
  const dateLocale = useDateLocale();
  const [keyInfo, setKeyInfo] = useState<TKeyInfo>();
  // the key exists in plain text only between creating it and leaving this page
  const [freshKey, setFreshKey] = useState<string>();
  const [busy, setBusy] = useState(false);

  const serverUrl = `${getUrlFromServer()}/whip`;

  const loadKeyInfo = useCallback(async () => {
    try {
      const trpc = getTRPCClient();

      setKeyInfo(await trpc.streaming.getKeyInfo.query());
    } catch (error) {
      toast.error(getTrpcError(error, t('streamingFailedLoad')));
    }
  }, [t]);

  useEffect(() => {
    loadKeyInfo();
  }, [loadKeyInfo]);

  const onCreateKey = useCallback(async () => {
    if (keyInfo?.createdAt) {
      const confirmed = await requestConfirmation({
        title: t('streamingNewKeyConfirmTitle'),
        message: t('streamingNewKeyConfirmMsg'),
        confirmLabel: t('streamingNewKeyConfirmBtn'),
        variant: 'danger'
      });

      if (!confirmed) return;
    }

    setBusy(true);

    try {
      const trpc = getTRPCClient();
      const { key } = await trpc.streaming.regenerateKey.mutate();

      setFreshKey(key);
      await loadKeyInfo();
    } catch (error) {
      toast.error(getTrpcError(error, t('streamingFailedKey')));
    } finally {
      setBusy(false);
    }
  }, [keyInfo?.createdAt, loadKeyInfo, t]);

  const onRevokeKey = useCallback(async () => {
    const confirmed = await requestConfirmation({
      title: t('streamingRevokeConfirmTitle'),
      message: t('streamingRevokeConfirmMsg'),
      confirmLabel: t('streamingRevokeConfirmBtn'),
      variant: 'danger'
    });

    if (!confirmed) return;

    setBusy(true);

    try {
      const trpc = getTRPCClient();

      await trpc.streaming.revokeKey.mutate();
      setFreshKey(undefined);
      await loadKeyInfo();
    } catch (error) {
      toast.error(getTrpcError(error, t('streamingFailedKey')));
    } finally {
      setBusy(false);
    }
  }, [loadKeyInfo, t]);

  if (!keyInfo) {
    return <LoadingCard className="h-[400px]" />;
  }

  let keyDescription = t('streamingKeyNone');

  if (freshKey) {
    keyDescription = t('streamingKeyShownOnce');
  } else if (keyInfo.createdAt) {
    keyDescription = t('streamingKeyCreated', {
      date: format(new Date(keyInfo.createdAt), 'PP', { locale: dateLocale })
    });
  }

  return (
    <SettingsSection
      title={t('streamingTitle')}
      description={t('streamingDesc')}
      action={
        keyInfo.isLive ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-live/15 px-2.5 py-1 text-xs font-medium text-live">
            <span className="size-1.5 rounded-full bg-live" />
            {t('streamingLive')}
          </span>
        ) : undefined
      }
    >
      {!keyInfo.canStream && (
        <Alert variant="destructive">
          <AlertDescription>{t('streamingNotAllowed')}</AlertDescription>
        </Alert>
      )}

      <Group
        label={t('streamingServerUrlLabel')}
        description={t('streamingServerUrlDesc')}
      >
        <CopyField value={serverUrl} />
      </Group>

      <Group label={t('streamingKeyLabel')} description={keyDescription}>
        {freshKey && <CopyField value={freshKey} secret />}

        <div className="flex flex-wrap gap-2">
          <Button
            onClick={onCreateKey}
            disabled={busy || !keyInfo.canStream}
            variant={keyInfo.createdAt ? 'secondary' : 'default'}
          >
            {keyInfo.createdAt ? t('streamingNewKey') : t('streamingCreateKey')}
          </Button>
          {keyInfo.createdAt && (
            <Button variant="ghost" onClick={onRevokeKey} disabled={busy}>
              {t('streamingRevokeKey')}
            </Button>
          )}
        </div>
      </Group>

      <Group label={t('streamingGuideTitle')}>
        <ObsGuide />
      </Group>
    </SettingsSection>
  );
});

export { Streaming };
