import { joinVoice, leaveVoice } from '@/features/server/voice/actions';
import { useVoice } from '@/features/server/voice/hooks';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

// joining a call is two halves, the server session and the local transports, and a failure
// in the second has to undo the first or the user is left listed in a call they cannot hear
const useJoinVoiceChannel = () => {
  const { t } = useTranslation('common');

  const { init } = useVoice();

  return useCallback(
    async (channelId: number) => {
      const response = await joinVoice(channelId);

      if (!response) return;

      try {
        await init(response, channelId);
      } catch {
        await leaveVoice({ reason: 'init_failed' });

        toast.error(t('common:failedInitVoiceConnection'));
      }
    },
    [init, t]
  );
};

export { useJoinVoiceChannel };
