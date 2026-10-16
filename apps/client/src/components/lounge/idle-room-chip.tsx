import { useSelectChannel } from '@/hooks/use-select-channel';
import type { TChannel } from '@sharkord/shared';
import { Button } from '@sharkord/ui';
import { Volume2 } from 'lucide-react';
import { memo, useCallback } from 'react';

type TIdleRoomChipProps = {
  channel: TChannel;
};

const IdleRoomChip = memo(({ channel }: TIdleRoomChipProps) => {
  const selectChannel = useSelectChannel();

  // selecting a voice channel joins it, and the join reports its own failures in a toast
  const handleJoin = useCallback(() => {
    selectChannel(channel.id);
  }, [selectChannel, channel.id]);

  return (
    <Button size="sm" variant="secondary" onClick={handleJoin}>
      <Volume2 />
      {channel.name}
    </Button>
  );
});

export { IdleRoomChip };
