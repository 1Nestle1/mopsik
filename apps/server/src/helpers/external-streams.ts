import { ServerEvents, StreamKind } from '@sharkord/shared';
import type { VoiceRuntime } from '../runtimes/voice';
import { pubsub } from '../utils/pubsub';

type TExternalStreamOptions = Parameters<
  VoiceRuntime['createExternalStream']
>[0];

// a stream from outside a browser, a plugin's or one pushed in over whip, joins the call the
// same way whoever starts it: added to the runtime, then announced along with each track
const createExternalStream = (
  runtime: VoiceRuntime,
  options: TExternalStreamOptions
) => {
  const streamId = runtime.createExternalStream(options);
  const stream = runtime.getState().externalStreams[streamId]!;

  pubsub.publish(ServerEvents.VOICE_ADD_EXTERNAL_STREAM, {
    channelId: runtime.id,
    streamId,
    stream
  });

  for (const [kind, producer] of [
    [StreamKind.EXTERNAL_AUDIO, options.producers.audio],
    [StreamKind.EXTERNAL_VIDEO, options.producers.video]
  ] as const) {
    if (!producer) continue;

    pubsub.publishForChannel(runtime.id, ServerEvents.VOICE_NEW_PRODUCER, {
      channelId: runtime.id,
      remoteId: streamId,
      kind
    });
  }

  return streamId;
};

export { createExternalStream };
