import { z } from 'zod';
import { config } from '../../config';
import { db } from '../../db';
import { pushSubscriptions } from '../../db/schema';
import { isAllowedPushEndpoint } from '../../helpers/push/push-endpoint';
import { invariant } from '../../utils/invariant';
import { protectedProcedure, rateLimitedProcedure } from '../../utils/trpc';

// also how the switches and muted channels are kept in sync: the browser sends its whole
// subscription again whenever one of them changes
const subscribePushRoute = rateLimitedProcedure(protectedProcedure, {
  maxRequests: config.rateLimiters.pushSubscription.maxRequests,
  windowMs: config.rateLimiters.pushSubscription.windowMs,
  logLabel: 'subscribePush'
})
  .input(
    z.object({
      endpoint: z.url().max(2048),
      keys: z.object({
        p256dh: z.string().min(1).max(256),
        auth: z.string().min(1).max(64)
      }),
      preferences: z.object({
        all: z.boolean(),
        mentions: z.boolean(),
        dms: z.boolean(),
        replies: z.boolean()
      }),
      mutedChannelIds: z.array(z.number().int().positive()).max(1000)
    })
  )
  .mutation(async ({ ctx, input }) => {
    invariant(isAllowedPushEndpoint(input.endpoint), {
      code: 'BAD_REQUEST',
      message: "This browser's push service isn't supported."
    });

    const now = Date.now();
    const values = {
      userId: ctx.userId,
      p256dh: input.keys.p256dh,
      auth: input.keys.auth,
      notifyAll: input.preferences.all,
      notifyMentions: input.preferences.mentions,
      notifyDms: input.preferences.dms,
      notifyReplies: input.preferences.replies,
      mutedChannelIds: input.mutedChannelIds,
      updatedAt: now
    };

    // a browser that signs in as someone else hands its endpoint over to the new account, so
    // the previous one stops getting pushes on a device it no longer uses
    await db
      .insert(pushSubscriptions)
      .values({ ...values, endpoint: input.endpoint, createdAt: now })
      .onConflictDoUpdate({ target: pushSubscriptions.endpoint, set: values });
  });

export { subscribePushRoute };
