import { useUserById } from '@/features/server/users/hooks';
import { getFileUrl } from '@/helpers/get-file-url';
import { getInitialsFromName } from '@/helpers/get-initials-from-name';
import { getRenderedUsername } from '@/helpers/get-rendered-username';
import { getUserTone } from '@/helpers/get-user-tone';
import { cn } from '@/lib/utils';
import { AvatarImage } from '@radix-ui/react-avatar';
import { UserStatus } from '@sharkord/shared';
import { Avatar, AvatarFallback } from '@sharkord/ui';
import { memo, useMemo } from 'react';
import { UserContextMenu } from '../context-menus/user';
import { UserPopover } from '../user-popover';
import { UserStatusBadge } from '../user-status';

type TUserAvatarProps = {
  userId: number | null;
  className?: string;
  showUserPopover?: boolean;
  showUserMenu?: boolean;
  showStatusBadge?: boolean;
  onClick?: () => void;
};

const UserAvatar = memo(
  ({
    userId,
    className,
    showUserPopover = false,
    showUserMenu = false,
    showStatusBadge = true,
    onClick
  }: TUserAvatarProps) => {
    const user = useUserById(userId);
    const fallbackStyle = useMemo(() => {
      if (userId === null) return undefined;

      const tone = getUserTone(userId);

      return {
        backgroundColor: `color-mix(in oklch, ${tone} 22%, var(--card))`,
        color: tone
      };
    }, [userId]);

    if (!user) return null;

    const content = (
      <div className="relative size-fit" onClick={onClick}>
        <Avatar className={cn('size-8 bg-muted', className)}>
          <AvatarImage src={getFileUrl(user.avatar)} key={user.avatarId} />
          <AvatarFallback
            className="text-xs font-semibold"
            style={fallbackStyle}
          >
            {getInitialsFromName(getRenderedUsername(user))}
          </AvatarFallback>
        </Avatar>
        {showStatusBadge && (
          <UserStatusBadge
            status={user.status || UserStatus.OFFLINE}
            className="absolute bottom-0 right-0"
          />
        )}
      </div>
    );

    if (!showUserPopover || userId === null) return content;

    if (showUserMenu) {
      return (
        <UserPopover userId={userId}>
          <UserContextMenu userId={userId}>{content}</UserContextMenu>
        </UserPopover>
      );
    }

    return <UserPopover userId={userId}>{content}</UserPopover>;
  }
);

export { UserAvatar };
