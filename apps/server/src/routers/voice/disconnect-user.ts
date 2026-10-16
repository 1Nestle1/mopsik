import { Permission } from '@sharkord/shared';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { config } from '../../config';
import { db } from '../../db';
import { channels } from '../../db/schema';
import { assertCanActOnUser } from '../../helpers/assert-can-act-on-user';
import { assertChannelAccess } from '../../helpers/assert-channel-access';
import { disconnectVoiceUser } from '../../helpers/voice-moderation';
import { logger } from '../../logger';
import { VoiceRuntime } from '../../runtimes/voice';
import { invariant } from '../../utils/invariant';
import { protectedProcedure, rateLimitedProcedure } from '../../utils/trpc';

const disconnectUserRoute = rateLimitedProcedure(protectedProcedure, {
  maxRequests: config.rateLimiters.moveMembers.maxRequests,
  windowMs: config.rateLimiters.moveMembers.windowMs,
  logLabel: 'disconnectUser'
})
  .input(
    z.object({
      userId: z.number().int().positive()
    })
  )
  .mutation(async ({ input, ctx }) => {
    // moving someone already lets a moderator take them out of a call, into another one
    await ctx.needsPermission(Permission.MOVE_MEMBERS);

    const runtime = VoiceRuntime.findRuntimeByUserId(input.userId);

    invariant(runtime, {
      code: 'BAD_REQUEST',
      message: 'User is not in a voice channel'
    });

    const channel = await db
      .select({ name: channels.name, isDm: channels.isDm })
      .from(channels)
      .where(eq(channels.id, runtime.id))
      .limit(1)
      .get();

    // dm calls are private to their participants, moderation does not reach into them. same
    // message as above so this does not leak that the user is in a dm
    invariant(channel && !channel.isDm, {
      code: 'BAD_REQUEST',
      message: 'User is not in a voice channel'
    });

    await assertChannelAccess(ctx, runtime.id);
    await assertCanActOnUser(ctx.userId, input.userId);

    // the client takes its own departure from the server as the end of the call and does not
    // try to rejoin, the same way it handles the channel being deleted under it
    await disconnectVoiceUser(input.userId);

    logger.info(
      '%s disconnected user %s from voice channel %s',
      ctx.user.name,
      input.userId,
      channel.name
    );
  });

export { disconnectUserRoute };
