import { Permission } from '@sharkord/shared';
import { getStreamKeyCreatedAt } from '../../db/queries/stream-keys';
import { hasWhipSession } from '../../runtimes/whip';
import { protectedProcedure } from '../../utils/trpc';

// never the key itself: only a hash is stored, so it can't be shown again after creation
const getStreamKeyInfoRoute = protectedProcedure.query(async ({ ctx }) => {
  const [createdAt, canStream] = await Promise.all([
    getStreamKeyCreatedAt(ctx.userId),
    ctx.hasPermission(Permission.SHARE_SCREEN)
  ]);

  return {
    createdAt: createdAt ?? null,
    canStream,
    isLive: hasWhipSession(ctx.userId)
  };
});

export { getStreamKeyInfoRoute };
