import { useIsOwnUserOwner, useUserRoles } from '@/features/server/hooks';
import { useRoles } from '@/features/server/roles/hooks';
import { getTRPCClient } from '@/lib/trpc';
import { getTrpcError, OWNER_ROLE_ID } from '@sharkord/shared';
import {
  ContextMenuCheckboxItem,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger
} from '@sharkord/ui';
import { memo, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

type TRoleCheckboxItemProps = {
  userId: number;
  roleId: number;
  name: string;
  color: string;
  checked: boolean;
};

// keeps the submenu open so several roles can be toggled in one go
const keepMenuOpen = (event: Event) => event.preventDefault();

const RoleCheckboxItem = memo(
  ({ userId, roleId, name, color, checked }: TRoleCheckboxItemProps) => {
    const { t } = useTranslation('common');

    const onCheckedChange = useCallback(
      async (nextChecked: boolean) => {
        try {
          const trpc = getTRPCClient();

          if (nextChecked) {
            await trpc.users.addRole.mutate({ userId, roleId });
          } else {
            await trpc.users.removeRole.mutate({ userId, roleId });
          }
        } catch (error) {
          const fallback = nextChecked
            ? t('failedAssignRole', { ns: 'dialogs' })
            : t('failedRemoveRole', { ns: 'settings' });

          toast.error(getTrpcError(error, fallback));
        }
      },
      [userId, roleId, t]
    );

    const dotStyle = useMemo(() => ({ backgroundColor: color }), [color]);

    return (
      <ContextMenuCheckboxItem
        checked={checked}
        onSelect={keepMenuOpen}
        onCheckedChange={onCheckedChange}
      >
        <span className="size-2 shrink-0 rounded-full" style={dotStyle} />
        <span className="truncate">{name}</span>
      </ContextMenuCheckboxItem>
    );
  }
);

type TRolesSubmenuProps = {
  userId: number;
};

const RolesSubmenu = memo(({ userId }: TRolesSubmenuProps) => {
  const { t } = useTranslation('common');
  const roles = useRoles();
  const userRoles = useUserRoles(userId);
  const isOwnUserOwner = useIsOwnUserOwner();

  // everyone holds the default role, and only the owner may hand out ownership. the server
  // enforces both, hiding them here just keeps choices that can only fail out of the menu
  const assignableRoles = useMemo(
    () =>
      roles.filter(
        (role) =>
          !role.isDefault && (role.id !== OWNER_ROLE_ID || isOwnUserOwner)
      ),
    [roles, isOwnUserOwner]
  );

  const userRoleIds = useMemo(
    () => new Set(userRoles.map((role) => role.id)),
    [userRoles]
  );

  if (assignableRoles.length === 0) return null;

  return (
    <ContextMenuSub>
      <ContextMenuSubTrigger>{t('userMenuRoles')}</ContextMenuSubTrigger>
      <ContextMenuSubContent className="max-h-72 w-52 overflow-y-auto">
        {assignableRoles.map((role) => (
          <RoleCheckboxItem
            key={role.id}
            userId={userId}
            roleId={role.id}
            name={role.name}
            color={role.color}
            checked={userRoleIds.has(role.id)}
          />
        ))}
      </ContextMenuSubContent>
    </ContextMenuSub>
  );
});

export { RolesSubmenu };
