import { rejoinVoiceAfterTransportFailure } from '@/features/server/actions';
import { useCurrentVoiceChannelId } from '@/features/server/channels/hooks';
import { useChannelCan } from '@/features/server/hooks';
import { leaveVoice } from '@/features/server/voice/actions';
import { useVoice } from '@/features/server/voice/hooks';
import { cn } from '@/lib/utils';
import { ChannelPermission, PluginSlot } from '@sharkord/shared';
import { Button } from '@sharkord/ui';
import {
  AlertTriangle,
  Loader2,
  MicOff,
  Monitor,
  MonitorOff,
  PhoneOff,
  RotateCw,
  Video,
  VideoOff,
  Wifi,
  WifiOff
} from 'lucide-react';
import { memo, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ExternalAudioStreams } from '../channel-view/voice/external-audio-streams';
import { VoiceAudioStreams } from '../channel-view/voice/voice-audio-streams';
import { PluginSlotRenderer } from '../plugin-slot-renderer';
import { isMicUnavailable } from '../voice-provider/mic-status';
import { useMicFailureToast } from './hooks';
import { MicUnavailableNotice } from './mic-unavailable-notice';
import { StatsPopover } from './stats-popover';

const VoiceControl = memo(() => {
  const { t } = useTranslation('sidebar');
  const voiceChannelId = useCurrentVoiceChannelId();
  const channelCan = useChannelCan(voiceChannelId);
  const {
    ownVoiceState,
    toggleWebcam,
    toggleScreenShare,
    connectionStatus,
    isScreenShareSupported,
    micState
  } = useVoice();
  const micUnavailable = isMicUnavailable(micState.status);

  useMicFailureToast();

  const connectionInfo = useMemo(() => {
    switch (connectionStatus) {
      case 'connecting':
        return {
          icon: <Loader2 className="h-4 w-4 animate-spin" />,
          text: t('voiceConnecting'),
          color: 'text-warning'
        };
      case 'connected':
        // the call works but nothing is being sent, which a green "connected" hid
        if (micUnavailable) {
          return {
            icon: <MicOff className="h-4 w-4 text-warning" />,
            text: t('voiceConnectedNoMic'),
            color: 'text-warning'
          };
        }

        return {
          icon: <Wifi className="h-4 w-4 text-live" />,
          text: t('voiceConnected'),
          color: 'text-live'
        };
      case 'failed':
        return {
          icon: <AlertTriangle className="h-4 w-4 text-destructive" />,
          text: t('voiceFailed'),
          color: 'text-destructive'
        };
      case 'disconnected':
      default:
        return {
          icon: <WifiOff className="h-4 w-4 text-destructive" />,
          text: t('voiceDisconnected'),
          color: 'text-destructive'
        };
    }
  }, [connectionStatus, micUnavailable, t]);

  // a failed call used to offer only disconnect; this rejoins the same channel in place
  const handleRetryVoice = useCallback(() => {
    rejoinVoiceAfterTransportFailure();
  }, []);

  const pluginSlotProps = useMemo(
    () => (voiceChannelId ? { channelId: voiceChannelId } : undefined),
    [voiceChannelId]
  );

  if (!voiceChannelId) {
    return null;
  }

  return (
    <>
      <VoiceAudioStreams channelId={voiceChannelId} />
      <ExternalAudioStreams channelId={voiceChannelId} />
      <div className="mx-2 mb-1 overflow-hidden rounded-xl bg-muted">
        <StatsPopover>
          <div className="flex items-center px-3 pt-2.5 pb-1.5 gap-2 cursor-pointer transition-colors duration-150 ease-emphasized hover:bg-foreground/[0.04]">
            {connectionInfo.icon}
            <span
              role="status"
              className={cn('text-xs font-medium', connectionInfo.color)}
            >
              {connectionInfo.text}
            </span>
          </div>
        </StatsPopover>

        {connectionStatus === 'failed' && (
          <div className="px-3 pb-1">
            <Button size="sm" variant="secondary" onClick={handleRetryVoice}>
              <RotateCw />
              {t('voiceRetry')}
            </Button>
          </div>
        )}

        {connectionStatus === 'connected' && <MicUnavailableNotice />}

        <div className="flex items-center justify-between px-2 py-2">
          <Button
            variant="ghost"
            size="sm"
            className="bg-destructive/12 text-destructive hover:bg-destructive/20 hover:text-destructive"
            onClick={() => leaveVoice({ reason: 'user_disconnect_button' })}
          >
            <PhoneOff className="h-3.5 w-3.5 mr-1.5" />
            {t('disconnectVoice')}
          </Button>

          <div className="flex gap-1">
            <PluginSlotRenderer
              slotId={PluginSlot.VOICE_CONTROLS}
              props={pluginSlotProps}
            />
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'h-8 w-8 rounded-full transition-colors duration-150 ease-emphasized',
                ownVoiceState.webcamEnabled
                  ? 'bg-primary/15 hover:bg-primary/25 text-primary hover:text-primary'
                  : 'bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground'
              )}
              onClick={toggleWebcam}
              title={
                ownVoiceState.webcamEnabled
                  ? t('turnOffCamera')
                  : t('turnOnCamera')
              }
              disabled={!channelCan(ChannelPermission.WEBCAM)}
            >
              {ownVoiceState.webcamEnabled ? (
                <Video className="h-4 w-4" />
              ) : (
                <VideoOff className="h-4 w-4" />
              )}
            </Button>

            {isScreenShareSupported && (
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'h-8 w-8 rounded-full transition-colors duration-150 ease-emphasized',
                  ownVoiceState.sharingScreen
                    ? 'bg-primary/15 hover:bg-primary/25 text-primary hover:text-primary'
                    : 'bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground'
                )}
                onClick={toggleScreenShare}
                title={
                  ownVoiceState.sharingScreen
                    ? t('stopScreenShare')
                    : t('startScreenShare')
                }
                disabled={!channelCan(ChannelPermission.SHARE_SCREEN)}
              >
                {ownVoiceState.sharingScreen ? (
                  <Monitor className="h-4 w-4" />
                ) : (
                  <MonitorOff className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  );
});

export { VoiceControl };
