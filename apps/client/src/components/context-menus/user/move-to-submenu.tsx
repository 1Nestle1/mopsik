import { useReferenceableVoiceChannels } from '@/features/server/hooks';
import { moveUserToVoiceChannel } from '@/features/server/voice/actions';
import {
  ContextMenuItem,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger
} from '@sharkord/ui';
import { Volume2 } from 'lucide-react';
import { memo, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

type TMoveTargetItemProps = {
  userId: number;
  channelId: number;
  name: string;
};

const MoveTargetItem = memo(
  ({ userId, channelId, name }: TMoveTargetItemProps) => {
    const onClick = useCallback(
      () => moveUserToVoiceChannel(userId, channelId),
      [userId, channelId]
    );

    return (
      <ContextMenuItem onClick={onClick}>
        <Volume2 className="text-muted-foreground" />
        <span className="truncate">{name}</span>
      </ContextMenuItem>
    );
  }
);

type TMoveToSubmenuProps = {
  userId: number;
  currentChannelId: number;
};

const MoveToSubmenu = memo(
  ({ userId, currentChannelId }: TMoveToSubmenuProps) => {
    const { t } = useTranslation('common');
    const voiceChannels = useReferenceableVoiceChannels();

    const targets = useMemo(
      () => voiceChannels.filter((channel) => channel.id !== currentChannelId),
      [voiceChannels, currentChannelId]
    );

    return (
      <ContextMenuSub>
        <ContextMenuSubTrigger>{t('userMenuMoveTo')}</ContextMenuSubTrigger>
        <ContextMenuSubContent className="max-h-72 w-52 overflow-y-auto">
          {targets.length === 0 && (
            <ContextMenuItem disabled>
              {t('userMenuNoVoiceTargets')}
            </ContextMenuItem>
          )}
          {targets.map((channel) => (
            <MoveTargetItem
              key={channel.id}
              userId={userId}
              channelId={channel.id}
              name={channel.name}
            />
          ))}
        </ContextMenuSubContent>
      </ContextMenuSub>
    );
  }
);

export { MoveToSubmenu };
