import { UserAvatar } from '@/components/user-avatar';
import { useSpeakingState } from '@/features/server/voice/hooks';
import { cn } from '@/lib/utils';
import { memo } from 'react';

type TRoomAvatarProps = {
  userId: number;
};

// the same speaking ring as in the call, so the home screen shows who is talking right now
const RoomAvatar = memo(({ userId }: TRoomAvatarProps) => {
  const { isActivelySpeaking, speakingEffectClass } = useSpeakingState(userId);

  return (
    <UserAvatar
      userId={userId}
      className={cn(
        'size-9 ring-2 ring-card',
        isActivelySpeaking && speakingEffectClass
      )}
      showUserPopover
      showStatusBadge={false}
    />
  );
});

export { RoomAvatar };
