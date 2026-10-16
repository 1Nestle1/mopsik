import { StreamVolumePanel } from '@/components/stream-volume-panel';
import type { TStreamVolumeTarget } from '@/components/voice-provider/hooks/use-stream-volume-control';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuTrigger
} from '@sharkord/ui';
import { Router } from 'lucide-react';
import type { ReactNode } from 'react';
import { memo, useMemo } from 'react';

type TStreamContextMenuProps = {
  children: ReactNode;
  pluginId: string;
  streamKey: string;
  title: string;
  avatarUrl?: string;
};

// people in voice get the full user menu, which carries the same volume panel; this one is
// for plugin streams, which have nothing else to offer
const StreamContextMenu = memo(
  ({
    children,
    pluginId,
    streamKey,
    title,
    avatarUrl
  }: TStreamContextMenuProps) => {
    const target = useMemo<TStreamVolumeTarget>(
      () => ({ type: 'external', pluginId, streamKey }),
      [pluginId, streamKey]
    );

    const header = useMemo(
      () => (
        <>
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={title}
              className="h-6 w-6 rounded object-cover"
            />
          ) : (
            <Router className="h-6 w-6 text-muted-foreground" />
          )}
          <span className="text-sm truncate flex-1">{title}</span>
        </>
      ),
      [avatarUrl, title]
    );

    return (
      <ContextMenu>
        <ContextMenuTrigger>{children}</ContextMenuTrigger>
        <ContextMenuContent className="w-64">
          <StreamVolumePanel target={target} header={header} />
        </ContextMenuContent>
      </ContextMenu>
    );
  }
);

export { StreamContextMenu };
