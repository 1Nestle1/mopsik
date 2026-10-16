import { TestId } from '@sharkord/shared';
import { cn } from '@sharkord/ui';
import { memo } from 'react';

type TUnreadCountProps = {
  count: number;
  hasMention?: boolean;
  className?: string;
};

const UnreadCount = memo(
  ({ count, hasMention, className }: TUnreadCountProps) => {
    if (count === 0) return null;

    return (
      <div
        data-testid={TestId.UNREAD_COUNT}
        className={cn(
          'ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-medium tabular-nums',
          // a wall of filled badges hid the one that mattered: only a mention earns the
          // accent pill, plain unread stays a quiet number
          hasMention
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground',
          className
        )}
      >
        {count > 99 ? '99+' : count}
      </div>
    );
  }
);

export { UnreadCount };
