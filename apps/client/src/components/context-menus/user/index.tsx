import { StreamVolumePanel } from '@/components/stream-volume-panel';
import type { TStreamVolumeTarget } from '@/components/voice-provider/hooks/use-stream-volume-control';
import { setModViewOpen } from '@/features/app/actions';
import { openDirectMessage } from '@/features/server/actions';
import { useCurrentVoiceChannelId } from '@/features/server/channels/hooks';
import { useCan, usePublicServerSettings } from '@/features/server/hooks';
import {
  banUserWithReason,
  kickUserWithReason
} from '@/features/server/users/actions';
import { useIsOwnUser, useUserById } from '@/features/server/users/hooks';
import { useUserVoiceChannelId } from '@/features/server/voice/hooks';
import { getTRPCClient } from '@/lib/trpc';
import {
  DELETED_USER_IDENTITY_AND_NAME,
  getTrpcError,
  Permission,
  TestId,
  UserStatus
} from '@sharkord/shared';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger
} from '@sharkord/ui';
import {
  memo,
  useCallback,
  useMemo,
  type ComponentProps,
  type ReactNode
} from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { MoveToSubmenu } from './move-to-submenu';
import { RolesSubmenu } from './roles-submenu';

type TUserContextMenuProps = Omit<
  ComponentProps<typeof ContextMenuTrigger>,
  'asChild' | 'children'
> & {
  userId: number;
  children: ReactNode;
};

// the trigger props are passed through so this can sit inside another asChild trigger, like
// the user popover, and still hand both sets of handlers to the element they wrap
const UserContextMenu = memo(
  ({ userId, children, ...triggerProps }: TUserContextMenuProps) => {
    const { t } = useTranslation('common');
    const user = useUserById(userId);
    const isOwnUser = useIsOwnUser(userId);
    const can = useCan();
    const settings = usePublicServerSettings();
    const voiceChannelId = useUserVoiceChannelId(userId);
    const currentVoiceChannelId = useCurrentVoiceChannelId();

    const volumeTarget = useMemo<TStreamVolumeTarget>(
      () => ({ type: 'user', userId }),
      [userId]
    );

    const onDirectMessage = useCallback(
      () => openDirectMessage(userId),
      [userId]
    );

    const onOpenModView = useCallback(
      () => setModViewOpen(true, userId),
      [userId]
    );

    const onDisconnect = useCallback(async () => {
      try {
        const trpc = getTRPCClient();

        await trpc.voice.disconnectUser.mutate({ userId });
      } catch (error) {
        toast.error(getTrpcError(error, t('failedDisconnectUser')));
      }
    }, [userId, t]);

    const onKick = useCallback(() => kickUserWithReason(userId), [userId]);
    const onBan = useCallback(() => banUserWithReason(userId), [userId]);

    const isDeleted = user?.name === DELETED_USER_IDENTITY_AND_NAME;
    const isOffline = !user?.status || user.status === UserStatus.OFFLINE;
    const isInVoice = voiceChannelId !== undefined;
    const isInYourCall =
      isInVoice && voiceChannelId === currentVoiceChannelId && !isOwnUser;

    const canManageUsers = can(Permission.MANAGE_USERS);
    const canMove = can(Permission.MOVE_MEMBERS) && isInVoice;
    const showDirectMessage =
      !!settings?.directMessagesEnabled && !isDeleted && !isOwnUser;
    const showModeration =
      !isOwnUser && !isDeleted && (canManageUsers || canMove);
    const hasItems = isInYourCall || showDirectMessage || showModeration;

    return (
      <ContextMenu>
        <ContextMenuTrigger asChild disabled={!hasItems} {...triggerProps}>
          {children}
        </ContextMenuTrigger>
        <ContextMenuContent
          className="w-64"
          data-testid={TestId.USER_CONTEXT_MENU}
        >
          <ContextMenuLabel className="truncate">{user?.name}</ContextMenuLabel>

          {isInYourCall && <StreamVolumePanel target={volumeTarget} />}

          {showDirectMessage && (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem onClick={onDirectMessage}>
                {t('directMessage')}
              </ContextMenuItem>
            </>
          )}

          {showModeration && (
            <>
              <ContextMenuSeparator />
              {canMove && voiceChannelId !== undefined && (
                <MoveToSubmenu
                  userId={userId}
                  currentChannelId={voiceChannelId}
                />
              )}
              {canMove && (
                <ContextMenuItem onClick={onDisconnect}>
                  {t('userMenuDisconnect')}
                </ContextMenuItem>
              )}
              {canManageUsers && <RolesSubmenu userId={userId} />}
              {canManageUsers && (
                <ContextMenuItem onClick={onOpenModView}>
                  {t('moderationView')}
                </ContextMenuItem>
              )}
            </>
          )}

          {showModeration && canManageUsers && (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem
                variant="destructive"
                disabled={isOffline}
                onClick={onKick}
              >
                {t('kickBtn', { ns: 'settings' })}
                {isOffline && (
                  <ContextMenuShortcut>
                    {t('userMenuOffline')}
                  </ContextMenuShortcut>
                )}
              </ContextMenuItem>
              {!user?.banned && (
                <ContextMenuItem variant="destructive" onClick={onBan}>
                  {t('banBtn', { ns: 'settings' })}
                </ContextMenuItem>
              )}
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>
    );
  }
);

export { UserContextMenu };
