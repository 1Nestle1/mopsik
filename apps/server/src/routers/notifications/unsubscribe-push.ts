import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { config } from '../../config';
import { db } from '../../db';
import { pushSubscriptions } from '../../db/schema';
import { protectedProcedure, rateLimitedProcedure } from '../../utils/trpc';

// only the caller's own row: an endpoint someone else registered is left alone, and whether
// one exists is not revealed
const unsubscribePushRoute = rateLimitedProcedure(protectedProcedure, {
  maxRequests: config.rateLimiters.pushSubscription.maxRequests,
  windowMs: config.rateLimiters.pushSubscription.windowMs,
  logLabel: 'unsubscribePush'
})
  .input(z.object({ endpoint: z.string().min(1).max(2048) }))
  .mutation(async ({ ctx, input }) => {
    await db
      .delete(pushSubscriptions)
      .where(
        and(
          eq(pushSubscriptions.endpoint, input.endpoint),
          eq(pushSubscriptions.userId, ctx.userId)
        )
      );
  });

export { unsubscribePushRoute };
