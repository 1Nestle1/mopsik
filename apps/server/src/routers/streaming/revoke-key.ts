import { config } from '../../config';
import { revokeStreamKey } from '../../helpers/stream-keys';
import { protectedProcedure, rateLimitedProcedure } from '../../utils/trpc';

// no permission needed: anyone can always take away their own key
const revokeStreamKeyRoute = rateLimitedProcedure(protectedProcedure, {
  maxRequests: config.rateLimiters.streamKey.maxRequests,
  windowMs: config.rateLimiters.streamKey.windowMs,
  logLabel: 'revokeStreamKey'
}).mutation(async ({ ctx }) => {
  await revokeStreamKey(ctx.userId);
});

export { revokeStreamKeyRoute };
