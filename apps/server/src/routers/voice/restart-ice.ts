import { z } from 'zod';
import { config } from '../../config';
import { getCurrentVoiceRuntime } from '../../helpers/get-current-voice-runtime';
import { invariant } from '../../utils/invariant';
import { protectedProcedure, rateLimitedProcedure } from '../../utils/trpc';

// a blip that breaks the media path but not the server connection (a wifi roam, a vpn
// reconnect, a laptop waking up) leaves the transport on a dead candidate pair. fresh ice
// credentials let the client find a path again without leaving the call
const restartIceRoute = rateLimitedProcedure(protectedProcedure, {
  maxRequests: config.rateLimiters.voiceTransport.maxRequests,
  windowMs: config.rateLimiters.voiceTransport.windowMs,
  logLabel: 'restartIce'
})
  .input(
    z.object({
      direction: z.enum(['producer', 'consumer'])
    })
  )
  .mutation(async ({ input, ctx }) => {
    const { runtime } = await getCurrentVoiceRuntime(ctx);

    const transport =
      input.direction === 'producer'
        ? runtime.getProducerTransport(ctx.user.id)
        : runtime.getConsumerTransport(ctx.user.id);

    invariant(transport, {
      code: 'NOT_FOUND',
      message: 'Voice transport not found'
    });

    const iceParameters = await transport.restartIce();

    return { iceParameters };
  });

export { restartIceRoute };
