import { useCurrentVoiceChannelId } from '@/features/server/channels/hooks';
import {
  useHasSharingScreenUsers,
  useVoiceUsersByChannelId
} from '@/features/server/hooks';
import { useSelectChannel } from '@/hooks/use-select-channel';
import type { TChannel } from '@sharkord/shared';
import { Button } from '@sharkord/ui';
import { memo, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Waveform } from '../left-sidebar/waveform';
import { RoomAvatar } from './room-avatar';

const MAX_AVATARS = 5;

type TVoiceRoomCardProps = {
  channel: TChannel;
};

const VoiceRoomCard = memo(({ channel }: TVoiceRoomCardProps) => {
  const { t } = useTranslation('common');
  const voiceUsers = useVoiceUsersByChannelId(channel.id);
  const isSharingScreen = useHasSharingScreenUsers(channel.id);
  const currentVoiceChannelId = useCurrentVoiceChannelId();
  const selectChannel = useSelectChannel();
  const isHere = currentVoiceChannelId === channel.id;

  const shownUsers = useMemo(
    () => voiceUsers.slice(0, MAX_AVATARS),
    [voiceUsers]
  );
  const names = useMemo(
    () => voiceUsers.map(({ name }) => name).join(', '),
    [voiceUsers]
  );
  const hiddenCount = voiceUsers.length - shownUsers.length;

  // selecting a voice channel joins it, and the join reports its own failures in a toast
  const handleJoin = useCallback(() => {
    selectChannel(channel.id);
  }, [selectChannel, channel.id]);

  return (
    <article className="flex flex-col gap-4 rounded-xl bg-card p-4">
      <div className="flex min-w-0 items-center gap-2">
        <Waveform className="text-live" isScreenSharing={isSharingScreen} />
        <h3 className="truncate font-medium text-foreground">{channel.name}</h3>
        <span className="ml-auto shrink-0 text-xs tabular-nums text-muted-foreground">
          {t('loungePeople', { count: voiceUsers.length })}
        </span>
      </div>

      <div className="flex min-w-0 items-center gap-3">
        <div className="flex shrink-0 -space-x-2">
          {shownUsers.map(({ id }) => (
            <RoomAvatar key={id} userId={id} />
          ))}
          {hiddenCount > 0 && (
            <span className="flex size-9 items-center justify-center rounded-full bg-secondary text-xs font-medium text-foreground ring-2 ring-card tabular-nums">
              +{hiddenCount}
            </span>
          )}
        </div>
        <p className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
          {names}
        </p>
      </div>

      <Button
        size="sm"
        variant={isHere ? 'secondary' : 'default'}
        className="self-start"
        onClick={handleJoin}
      >
        {isHere ? t('loungeYouAreHere') : t('loungeJoin')}
      </Button>
    </article>
  );
});

export { VoiceRoomCard };
