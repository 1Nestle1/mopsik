import { UserAvatar } from '@/components/user-avatar';
import { useStreamVolumeControl } from '@/components/voice-provider/hooks/use-stream-volume-control';
import { useCan } from '@/features/server/hooks';
import type { TVoiceUser } from '@/features/server/types';
import { useIsOwnUser } from '@/features/server/users/hooks';
import { useSpeakingState } from '@/features/server/voice/hooks';
import { Permission, PluginSlot } from '@sharkord/shared';
import { cn } from '@sharkord/ui';
import { HeadphoneOff, Monitor, Video, VolumeX } from 'lucide-react';
import { memo, useCallback, useMemo } from 'react';
import { UserContextMenu } from '../context-menus/user';
import { PluginSlotRenderer } from '../plugin-slot-renderer';
import { UserPopover } from '../user-popover';
import { VOICE_USER_DND_MIME } from './helpers';
import { OwnVoiceUserMicIcon, VoiceUserMicIcon } from './voice-user-mic-icon';

type TVoiceUserProps = {
  userId: number;
  channelId: number;
  user: TVoiceUser;
  isOwnChannel?: boolean;
};

const VoiceUser = memo(
  ({ user, channelId, isOwnChannel = false }: TVoiceUserProps) => {
    const isOwnUser = useIsOwnUser(user.id);
    const { isMuted } = useStreamVolumeControl({
      type: 'user',
      userId: user.id
    });
    const { isActivelySpeaking, speakingEffectClass } = useSpeakingState(
      user.id
    );
    const can = useCan();
    const shouldShowMuteIndicator = isOwnChannel && !isOwnUser && isMuted;
    const canMove = !isOwnUser && can(Permission.MOVE_MEMBERS);

    const pluginSlotProps = useMemo(
      () => ({ channelId, userId: user.id }),
      [channelId, user.id]
    );

    const micIcon = isOwnUser ? (
      <OwnVoiceUserMicIcon micMuted={user.state.micMuted} />
    ) : (
      <VoiceUserMicIcon micMuted={user.state.micMuted} />
    );

    const handleDragStart = useCallback(
      (e: React.DragEvent<HTMLDivElement>) => {
        e.dataTransfer.setData(VOICE_USER_DND_MIME, String(user.id));
        e.dataTransfer.effectAllowed = 'move';
      },
      [user.id]
    );

    const userRow = (
      <div
        draggable={canMove}
        onDragStart={canMove ? handleDragStart : undefined}
        className={cn(
          'flex items-center gap-2 px-2 py-1 rounded-full transition-colors duration-150 ease-emphasized hover:bg-foreground/[0.06] text-sm',
          canMove && 'cursor-grab active:cursor-grabbing'
        )}
      >
        <UserAvatar
          userId={user.id}
          className={cn('h-5 w-5', isActivelySpeaking && speakingEffectClass)}
          showUserPopover={true}
          showStatusBadge={false}
        />

        <span className="flex-1 truncate text-xs text-foreground/80">
          {user.name}
        </span>

        <PluginSlotRenderer
          slotId={PluginSlot.VOICE_USER_ROW}
          props={pluginSlotProps}
        />

        <div className="flex items-center gap-1">
          {shouldShowMuteIndicator && (
            <VolumeX className="h-3 w-3 text-muted-foreground" />
          )}

          {micIcon}

          {user.state.soundMuted && (
            <HeadphoneOff className="h-3 w-3 text-destructive" />
          )}

          {user.state.webcamEnabled && (
            <Video className="h-3 w-3 text-primary" />
          )}

          {user.state.sharingScreen && (
            <Monitor className="h-3 w-3 text-primary" />
          )}
        </div>
      </div>
    );

    return (
      <UserPopover userId={user.id}>
        <UserContextMenu userId={user.id}>{userRow}</UserContextMenu>
      </UserPopover>
    );
  }
);

export { VoiceUser };
