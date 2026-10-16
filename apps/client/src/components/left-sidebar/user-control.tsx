import { openServerScreen } from '@/features/server-screens/actions';
import { useCurrentVoiceChannelId } from '@/features/server/channels/hooks';
import { useChannelCan } from '@/features/server/hooks';
import { useOwnPublicUser } from '@/features/server/users/hooks';
import { useVoice } from '@/features/server/voice/hooks';
import { cn } from '@/lib/utils';
import { ChannelPermission, TestId, UserStatus } from '@sharkord/shared';
import { Button } from '@sharkord/ui';
import { HeadphoneOff, Headphones, Mic, MicOff, Settings } from 'lucide-react';
import { memo, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ServerScreen } from '../server-screens/screens';
import { UserAvatar } from '../user-avatar';
import { UserPopover } from '../user-popover';
import { useMicFailureCopy } from '../voice-provider/hooks/use-mic-failure-copy';

const STATUS_LABEL_KEYS = {
  [UserStatus.ONLINE]: 'statusOnline',
  [UserStatus.IDLE]: 'statusIdle',
  [UserStatus.OFFLINE]: 'statusOffline'
} as const;

const UserControl = memo(() => {
  const { t } = useTranslation('sidebar');
  const ownPublicUser = useOwnPublicUser();
  const currentVoiceChannelId = useCurrentVoiceChannelId();
  const { ownVoiceState, toggleMic, toggleSound, micState, retryMic } =
    useVoice();
  const channelCan = useChannelCan(currentVoiceChannelId);
  const micFailure = useMicFailureCopy(micState.status);

  const handleSettingsClick = useCallback(() => {
    openServerScreen(ServerScreen.USER_SETTINGS);
  }, []);

  // a broken microphone makes muting meaningless, so the button offers the one action that
  // can change anything
  const micButton = useMemo(() => {
    if (micFailure) {
      return {
        label: t('micUnavailableRetry', { reason: micFailure.title }),
        className:
          'text-warning bg-warning/10 hover:bg-warning/20 hover:text-warning',
        Icon: MicOff,
        onClick: retryMic
      };
    }

    if (ownVoiceState.micMuted) {
      return {
        label: t('unmuteMic'),
        className:
          'text-destructive hover:text-destructive bg-destructive/12 hover:bg-destructive/20',
        Icon: MicOff,
        onClick: toggleMic
      };
    }

    return {
      label: t('muteMic'),
      className: 'text-muted-foreground hover:text-foreground',
      Icon: Mic,
      onClick: toggleMic
    };
  }, [micFailure, ownVoiceState.micMuted, retryMic, toggleMic, t]);

  const MicIcon = micButton.Icon;

  if (!ownPublicUser) return null;

  return (
    <div className="flex items-center justify-between h-14 px-2">
      <UserPopover userId={ownPublicUser.id}>
        <div className="flex items-center space-x-2 min-w-0 flex-1 cursor-pointer rounded-full p-1 pr-2 transition-colors duration-150 ease-emphasized hover:bg-foreground/[0.06]">
          <UserAvatar
            userId={ownPublicUser.id}
            className="h-8 w-8 flex-shrink-0"
            showUserPopover={false}
          />
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-sm font-medium text-foreground truncate">
              {ownPublicUser.name}
            </span>
            <div className="flex items-center space-x-1">
              <span className="text-xs text-muted-foreground">
                {t(
                  STATUS_LABEL_KEYS[ownPublicUser.status ?? UserStatus.OFFLINE]
                )}
              </span>
            </div>
          </div>
        </div>
      </UserPopover>

      <div className="flex items-center space-x-0.5">
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'h-8 w-8 hover:bg-foreground/[0.06]',
            micButton.className
          )}
          onClick={micButton.onClick}
          title={micButton.label}
          aria-label={micButton.label}
          disabled={
            !channelCan(ChannelPermission.SPEAK) ||
            (!micFailure && ownVoiceState.soundMuted)
          }
        >
          <MicIcon className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'h-8 w-8 hover:bg-foreground/[0.06]',
            ownVoiceState.soundMuted
              ? 'text-destructive hover:text-destructive bg-destructive/12 hover:bg-destructive/20'
              : 'text-muted-foreground hover:text-foreground'
          )}
          onClick={toggleSound}
          title={ownVoiceState.soundMuted ? t('undeafen') : t('deafen')}
        >
          {ownVoiceState.soundMuted ? (
            <HeadphoneOff className="h-4 w-4" />
          ) : (
            <Headphones className="h-4 w-4" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06]"
          data-testid={TestId.USER_SETTINGS_TRIGGER}
          onClick={handleSettingsClick}
          title={t('userSettings')}
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
});

export { UserControl };
