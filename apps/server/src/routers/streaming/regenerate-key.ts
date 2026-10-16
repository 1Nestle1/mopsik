import { Permission } from '@sharkord/shared';
import { config } from '../../config';
import { regenerateStreamKey } from '../../helpers/stream-keys';
import { protectedProcedure, rateLimitedProcedure } from '../../utils/trpc';

const regenerateStreamKeyRoute = rateLimitedProcedure(protectedProcedure, {
  maxRequests: config.rateLimiters.streamKey.maxRequests,
  windowMs: config.rateLimiters.streamKey.windowMs,
  logLabel: 'regenerateStreamKey'
}).mutation(async ({ ctx }) => {
  await ctx.needsPermission(Permission.SHARE_SCREEN);

  return regenerateStreamKey(ctx.userId);
});

export { regenerateStreamKeyRoute };
