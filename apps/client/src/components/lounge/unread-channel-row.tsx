import {
  useHasUnreadMentions,
  useUnreadMessagesCount
} from '@/features/server/hooks';
import { useSelectChannel } from '@/hooks/use-select-channel';
import type { TChannel } from '@sharkord/shared';
import { Hash } from 'lucide-react';
import { memo, useCallback } from 'react';
import { UnreadCount } from '../unread-count';

type TUnreadChannelRowProps = {
  channel: TChannel;
};

const UnreadChannelRow = memo(({ channel }: TUnreadChannelRowProps) => {
  const selectChannel = useSelectChannel();
  const unreadCount = useUnreadMessagesCount(channel.id);
  const hasMention = useHasUnreadMentions(channel.id);

  // opening a text channel only selects it, there is nothing here that can reject
  const handleOpen = useCallback(() => {
    selectChannel(channel.id);
  }, [selectChannel, channel.id]);

  return (
    <button
      type="button"
      onClick={handleOpen}
      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-150 ease-emphasized hover:bg-foreground/[0.05]"
    >
      <Hash className="size-4 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
        {channel.name}
      </span>
      <UnreadCount count={unreadCount} hasMention={hasMention} />
    </button>
  );
});

export { UnreadChannelRow };
