import { openServerScreen } from '@/features/server-screens/actions';
import { useVoice } from '@/features/server/voice/hooks';
import { Button } from '@sharkord/ui';
import { Loader2, MicOff, RotateCw } from 'lucide-react';
import { memo, useCallback, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ServerScreen } from '../server-screens/screens';
import { useMicFailureCopy } from '../voice-provider/hooks/use-mic-failure-copy';
import { MicStatus } from '../voice-provider/mic-status';

// stays in the voice panel for as long as the microphone is unavailable, where the toast
// that announced it has long gone
const MicUnavailableNotice = memo(() => {
  const { t } = useTranslation('sidebar');
  const { micState, retryMic } = useVoice();
  const copy = useMicFailureCopy(micState.status);
  const titleId = useId();
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = useCallback(async () => {
    setIsRetrying(true);

    try {
      await retryMic();
    } finally {
      setIsRetrying(false);
    }
  }, [retryMic]);

  const handleOpenDevices = useCallback(() => {
    openServerScreen(ServerScreen.USER_SETTINGS, {
      initialEntryId: 'devices'
    });
  }, []);

  if (!copy) return null;

  // neither a retry nor another device helps on a page the browser treats as insecure
  const canRecoverHere = micState.status !== MicStatus.INSECURE;

  return (
    <section
      aria-labelledby={titleId}
      className="mx-2 mb-2 rounded-md bg-warning/10 px-2.5 py-2"
    >
      <div className="flex items-start gap-2">
        <MicOff
          className="mt-0.5 size-3.5 shrink-0 text-warning"
          aria-hidden="true"
        />
        <div className="min-w-0 space-y-0.5">
          <p id={titleId} className="text-xs font-medium text-foreground">
            {copy.title}
          </p>
          <p className="text-xs leading-snug text-muted-foreground">
            {copy.detail}
          </p>
        </div>
      </div>

      {canRecoverHere && (
        <div className="mt-2 flex flex-wrap gap-1.5 pl-5.5">
          <Button
            size="sm"
            variant="secondary"
            className="h-7 px-2.5 text-xs"
            onClick={handleRetry}
            disabled={isRetrying}
          >
            {isRetrying ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <RotateCw className="size-3.5" aria-hidden="true" />
            )}
            {t('micRetry')}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2.5 text-xs"
            onClick={handleOpenDevices}
          >
            {t('micOpenDevices')}
          </Button>
        </div>
      )}
    </section>
  );
});

export { MicUnavailableNotice };
