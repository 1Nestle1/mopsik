import { Protect } from '@/components/protect';
import { useIsCurrentVoiceChannelSelected } from '@/features/server/channels/hooks';
import { useChannelCan } from '@/features/server/hooks';
import { leaveVoice } from '@/features/server/voice/actions';
import {
  useAlwaysShowVoiceControls,
  useOwnVoiceState,
  useVoice
} from '@/features/server/voice/hooks';
import { cn } from '@/lib/utils';
import { ChannelPermission, Permission } from '@sharkord/shared';
import { Button, Tooltip } from '@sharkord/ui';
import {
  HeadphoneOff,
  Headphones,
  Mic,
  MicOff,
  Monitor,
  PhoneOff,
  ScreenShareOff,
  Video,
  VideoOff
} from 'lucide-react';
import { memo, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useMicFailureCopy } from '../../voice-provider/hooks/use-mic-failure-copy';
import { ControlToggleButton } from './control-toggle-button';
import { ReactionsButton } from './reactions-button';

type TControlsBarProps = {
  channelId: number;
};

const ControlsBar = memo(({ channelId }: TControlsBarProps) => {
  const { t } = useTranslation('sidebar');
  const {
    toggleMic,
    toggleSound,
    toggleWebcam,
    toggleScreenShare,
    isScreenShareSupported,
    micState,
    retryMic
  } = useVoice();
  const ownVoiceState = useOwnVoiceState();
  const micFailure = useMicFailureCopy(micState.status);
  const micRetryLabel = micFailure
    ? t('micUnavailableRetry', { reason: micFailure.title })
    : '';
  const channelCan = useChannelCan(channelId);
  const alwaysShowControls = useAlwaysShowVoiceControls();
  const isConnectedToThisChannel = useIsCurrentVoiceChannelSelected();

  const permissions = useMemo(
    () => ({
      canSpeak: channelCan(ChannelPermission.SPEAK),
      canWebcam: channelCan(ChannelPermission.WEBCAM),
      canShareScreen: channelCan(ChannelPermission.SHARE_SCREEN)
    }),
    [channelCan]
  );

  const barClass = alwaysShowControls
    ? 'relative -mt-3'
    : 'absolute bottom-0 left-0 right-0 transition-all duration-300 ease-in-out invisible opacity-0 translate-y-4 group-hover/voice-stage:visible group-hover/voice-stage:opacity-100 group-hover/voice-stage:translate-y-0';

  const handleLeaveVoice = useCallback(() => {
    leaveVoice();
  }, []);

  return (
    <div
      className={cn(
        'flex justify-center items-center pointer-events-none gap-2 p-3',
        barClass
      )}
    >
      <div
        className={cn(
          'flex items-center pointer-events-auto p-1.5',
          'gap-1.5 rounded-full shadow-lg shadow-black/30',
          'bg-popover/90 backdrop-blur-md'
        )}
      >
        {micFailure ? (
          <ControlToggleButton
            enabled
            enabledLabel={micRetryLabel}
            disabledLabel={micRetryLabel}
            enabledIcon={MicOff}
            disabledIcon={MicOff}
            enabledClassName="bg-warning/15 text-warning hover:bg-warning/25 hover:text-warning"
            onClick={retryMic}
            disabled={!permissions.canSpeak}
          />
        ) : (
          <ControlToggleButton
            enabled={ownVoiceState.micMuted}
            enabledLabel={t('unmuteMic')}
            disabledLabel={t('muteMic')}
            enabledIcon={MicOff}
            disabledIcon={Mic}
            enabledClassName="bg-destructive/15 text-destructive hover:bg-destructive/25 hover:text-destructive"
            onClick={toggleMic}
            disabled={
              !permissions.canSpeak ||
              ownVoiceState.soundMuted ||
              ownVoiceState.serverMuted
            }
          />
        )}

        <ControlToggleButton
          enabled={ownVoiceState.soundMuted}
          enabledLabel={t('undeafen')}
          disabledLabel={t('deafen')}
          enabledIcon={HeadphoneOff}
          disabledIcon={Headphones}
          enabledClassName="bg-destructive/15 text-destructive hover:bg-destructive/25 hover:text-destructive"
          onClick={toggleSound}
        />

        <div className="mx-0.5 h-6 w-px bg-border" />

        <ControlToggleButton
          enabled={ownVoiceState.webcamEnabled}
          enabledLabel={t('turnOffCamera')}
          disabledLabel={t('turnOnCamera')}
          enabledIcon={Video}
          disabledIcon={VideoOff}
          enabledClassName="bg-primary/15 text-primary hover:bg-primary/25 hover:text-primary"
          onClick={toggleWebcam}
          disabled={!permissions.canWebcam}
        />

        {isScreenShareSupported && (
          <ControlToggleButton
            enabled={ownVoiceState.sharingScreen}
            enabledLabel={t('stopScreenShare')}
            disabledLabel={t('startScreenShare')}
            enabledIcon={ScreenShareOff}
            disabledIcon={Monitor}
            enabledClassName="bg-primary/15 text-primary hover:bg-primary/25 hover:text-primary"
            onClick={toggleScreenShare}
            disabled={!permissions.canShareScreen}
          />
        )}

        {isConnectedToThisChannel && (
          <Protect permission={Permission.SEND_VOICE_REACTION}>
            <div className="mx-0.5 h-6 w-px bg-border" />

            <ReactionsButton />
          </Protect>
        )}
      </div>
      <Tooltip content={t('disconnectVoice')}>
        <Button
          className={cn(
            'inline-flex h-auto self-stretch min-w-12 items-center justify-center rounded-full px-4',
            'pointer-events-auto text-white shadow-lg shadow-black/30',
            'bg-destructive hover:bg-destructive/90'
          )}
          onClick={handleLeaveVoice}
          aria-label={t('disconnectVoice')}
        >
          <PhoneOff className="size-4" fill="currentColor" />
        </Button>
      </Tooltip>
    </div>
  );
});

export { ControlsBar };
