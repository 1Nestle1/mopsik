import { ImagePicker } from '@/components/image-picker';
import { SettingsSection } from '@/components/server-screens/settings-shell/section';
import { useSettingsForm } from '@/components/server-screens/settings-shell/use-settings-form';
import { UserAvatar } from '@/components/user-avatar';
import { useOwnPublicUser } from '@/features/server/users/hooks';
import { getFileUrl } from '@/helpers/get-file-url';
import type { TPickedImage } from '@/hooks/use-pick-image';
import { getTRPCClient } from '@/lib/trpc';
import { DEFAULT_PROFILE_COLOR, type TNicknameStyle } from '@sharkord/shared';
import {
  ColorPicker,
  Group,
  ImageSwatchPicker,
  Input,
  Textarea
} from '@sharkord/ui';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { NicknameSettings } from './nickname-settings';

type TProfileValues = {
  name: string;
  profileColor: string;
  nicknameStyle: TNicknameStyle | null;
  bio: string;
  // undefined means untouched, null means remove
  avatar?: TPickedImage | null;
  banner?: TPickedImage | null;
};

const Profile = memo(() => {
  const { t } = useTranslation('settings');
  const ownPublicUser = useOwnPublicUser();

  const onSave = useCallback(async (values: TProfileValues) => {
    const trpc = getTRPCClient();

    await trpc.users.update.mutate({
      name: values.name,
      profileColor: values.profileColor,
      nicknameStyle: values.nicknameStyle,
      bio: values.bio
    });

    if (values.avatar !== undefined) {
      await trpc.users.changeAvatar.mutate({ fileId: values.avatar?.fileId });
    }

    if (values.banner !== undefined) {
      await trpc.users.changeBanner.mutate({ fileId: values.banner?.fileId });
    }
  }, []);

  const { r, values, onChange } = useSettingsForm<TProfileValues>({
    initialValues: {
      name: ownPublicUser?.name ?? '',
      profileColor: ownPublicUser?.profileColor ?? DEFAULT_PROFILE_COLOR,
      nicknameStyle: ownPublicUser?.nicknameStyle ?? null,
      bio: ownPublicUser?.bio ?? ''
    },
    onSave,
    successMessage: t('profileUpdated'),
    errorMessage: t('failedUpdateProfile')
  });

  const handleColorChange = useCallback(
    (color: string) => onChange('profileColor', color),
    [onChange]
  );

  const handleAvatarChange = useCallback(
    (picked: TPickedImage | null) => onChange('avatar', picked),
    [onChange]
  );

  const handleBannerChange = useCallback(
    (picked: TPickedImage | null) => onChange('banner', picked),
    [onChange]
  );

  const handleNicknameChange = useCallback(
    (appearance: TNicknameStyle | null) =>
      onChange('nicknameStyle', appearance),
    [onChange]
  );

  if (!ownPublicUser) return null;

  const currentAvatarUrl = getFileUrl(ownPublicUser.avatar);
  const currentBannerUrl = getFileUrl(ownPublicUser.banner);
  const userAvatarUrl =
    values.avatar === undefined ? currentAvatarUrl : values.avatar?.previewUrl;
  const userBannerUrl =
    values.banner === undefined ? currentBannerUrl : values.banner?.previewUrl;

  return (
    <SettingsSection title={t('profileTitle')} description={t('profileDesc')}>
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-4">
        <ImagePicker
          label={t('avatarLabel')}
          className="size-20 rounded-full sm:size-24"
          currentUrl={currentAvatarUrl}
          draft={values.avatar}
          onChange={handleAvatarChange}
          fallback={
            <UserAvatar
              userId={ownPublicUser.id}
              className="size-20 rounded-full bg-muted sm:size-24"
              showStatusBadge={false}
              showUserPopover={false}
            />
          }
        />

        <ImagePicker
          label={t('bannerLabel')}
          className="h-20 w-full sm:h-24"
          currentUrl={currentBannerUrl}
          draft={values.banner}
          onChange={handleBannerChange}
        />
      </div>

      <Group label={t('profileColorLabel')}>
        <div className="flex flex-wrap items-center gap-3">
          <ColorPicker
            label={t('profileColorLabel')}
            resetLabel={t('nicknameStyle.default')}
            value={values.profileColor}
            onChange={handleColorChange}
            defaultValue={DEFAULT_PROFILE_COLOR}
          />
          <ImageSwatchPicker
            src={userAvatarUrl ?? ''}
            onChange={handleColorChange}
          />
          <ImageSwatchPicker
            src={userBannerUrl ?? ''}
            onChange={handleColorChange}
          />
        </div>
      </Group>

      <Group label={t('usernameLabel')}>
        <Input placeholder={t('usernamePlaceholder')} {...r('name')} />
      </Group>

      <Group label={t('bioLabel')}>
        <Textarea placeholder={t('bioPlaceholder')} {...r('bio')} />
      </Group>
      <NicknameSettings
        name={values.name}
        appearance={values.nicknameStyle}
        onChange={handleNicknameChange}
      />
    </SettingsSection>
  );
});

export { Profile };
