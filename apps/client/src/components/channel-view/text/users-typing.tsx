import { TypingDots } from '@/components/typing-dots';
import type { TJoinedPublicUser } from '@sharkord/shared';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

type TUsersTypingIndicatorProps = {
  typingUsers: TJoinedPublicUser[];
};

const UsersTypingIndicator = memo(
  ({ typingUsers }: TUsersTypingIndicatorProps) => {
    const { t } = useTranslation('common');

    if (typingUsers.length === 0) return null;

    const [first, second] = typingUsers;
    let label = t('typingOne', { name: first.name });

    if (typingUsers.length === 2) {
      label = t('typingTwo', { first: first.name, second: second.name });
    } else if (typingUsers.length > 2) {
      label = t('typingMany', {
        name: first.name,
        count: typingUsers.length - 1
      });
    }

    return (
      <div className="h-2 flex items-center gap-1 text-xs text-muted-foreground p-3 absolute -top-6 bg-background">
        <div className="flex items-center gap-2">
          <TypingDots className="[&>div]:w-0.5 [&>div]:h-0.5" />
          <span>{label}</span>
        </div>
      </div>
    );
  }
);

export { UsersTypingIndicator };
