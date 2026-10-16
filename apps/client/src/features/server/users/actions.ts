import { requestTextInput } from '@/features/dialogs/actions';
import { store } from '@/features/store';
import { i18n } from '@/i18n';
import { getTRPCClient } from '@/lib/trpc';
import {
  getTrpcError,
  UserStatus,
  type TJoinedPublicUser
} from '@sharkord/shared';
import { toast } from 'sonner';
import { serverSliceActions } from '../slice';
import { userByIdSelector } from './selectors';

export const addUser = (user: TJoinedPublicUser) => {
  store.dispatch(serverSliceActions.addUser(user));
};

export const updateUser = (
  userId: number,
  user: Partial<TJoinedPublicUser>
) => {
  store.dispatch(serverSliceActions.updateUser({ userId, user }));
};

export const wipeUser = (userId: number) => {
  store.dispatch(serverSliceActions.wipeUser({ userId }));
};

export const reassignUser = (userId: number, targetUser: number) => {
  store.dispatch(
    serverSliceActions.reassignUser({ userId, deletedUserId: targetUser })
  );
};

export const handleUserJoin = (user: TJoinedPublicUser) => {
  const state = store.getState();
  const foundUser = userByIdSelector(state, user.id);

  if (foundUser) {
    updateUser(user.id, { ...user, status: UserStatus.ONLINE });
  } else {
    addUser(user);
  }
};

// asks for an optional reason first. resolves false when the moderator cancelled, so callers
// only refresh after something was actually attempted
export const kickUserWithReason = async (userId: number) => {
  const reason = await requestTextInput({
    title: i18n.t('settings:kickTitle'),
    message: i18n.t('settings:kickMsg'),
    confirmLabel: i18n.t('settings:kickConfirm'),
    allowEmpty: true
  });

  if (reason === null) return false;

  try {
    const trpc = getTRPCClient();

    await trpc.users.kick.mutate({ userId, reason });
    toast.success(i18n.t('settings:kickedSuccess'));
  } catch (error) {
    toast.error(getTrpcError(error, i18n.t('settings:failedKick')));
  }

  return true;
};

export const banUserWithReason = async (userId: number) => {
  const reason = await requestTextInput({
    title: i18n.t('settings:banTitle'),
    message: i18n.t('settings:banMsg'),
    confirmLabel: i18n.t('settings:banConfirm'),
    allowEmpty: true
  });

  if (reason === null) return false;

  try {
    const trpc = getTRPCClient();

    await trpc.users.ban.mutate({ userId, reason });
    toast.success(i18n.t('settings:bannedSuccess'));
  } catch (error) {
    toast.error(getTrpcError(error, i18n.t('settings:failedBan')));
  }

  return true;
};
