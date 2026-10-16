import type { Producer, RtpParameters } from 'mediasoup/types';
import { logger } from '../../logger';
import type { VoiceRuntime } from '../../runtimes/voice';
import {
  endWhipSessionsForUser,
  registerWhipSession
} from '../../runtimes/whip';
import { createExternalStream } from '../external-streams';
import { createWhipAnswer, parseWhipOffer, WhipOfferError } from './sdp';

type TStartWhipSessionOptions = {
  userId: number;
  // shown on the stream card, the streamer's name
  title: string;
  // shown as "via ..." on the card, the app that sent the stream
  source: string;
  runtime: VoiceRuntime;
  offerSdp: string;
};

const startWhipSession = async ({
  userId,
  title,
  source,
  runtime,
  offerSdp
}: TStartWhipSessionOptions) => {
  const router = runtime.getRouter();
  const offer = parseWhipOffer(offerSdp, router.rtpCapabilities);

  // one stream per person: obs reconnecting after a drop replaces the one it left behind
  endWhipSessionsForUser(userId);

  const { transport } = await runtime.createTransport();

  try {
    await transport.connect({ dtlsParameters: offer.remoteDtlsParameters });

    const producers: { audio?: Producer; video?: Producer } = {};
    const accepted = new Map<string, RtpParameters>();

    for (const section of offer.sections) {
      if (!section.kind || producers[section.kind]) continue;

      // the router refuses a codec it can't forward, an h264 profile it doesn't know for
      // example, so the next choice gets its turn
      for (const rtpParameters of section.candidates) {
        try {
          producers[section.kind] = await transport.produce({
            kind: section.kind,
            rtpParameters
          });
          accepted.set(section.mid, rtpParameters);

          break;
        } catch (error) {
          logger.debug(
            'Stream codec %s refused: %s',
            rtpParameters.codecs[0]?.mimeType,
            error
          );
        }
      }
    }

    if (!producers.audio && !producers.video) {
      throw new WhipOfferError(
        'None of the offered codecs can be streamed. Use H.264 video and Opus audio.'
      );
    }

    const answerSdp = createWhipAnswer({
      offer,
      transport: {
        iceParameters: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters
      },
      accepted
    });

    const streamId = createExternalStream(runtime, {
      title,
      key: `whip-${userId}`,
      pluginId: source,
      producers
    });

    const sessionId = registerWhipSession({
      userId,
      channelId: runtime.id,
      streamId,
      transport
    });

    logger.info(
      'User %s started streaming from %s into channel %s (audio=%s, video=%s)',
      userId,
      source,
      runtime.id,
      !!producers.audio,
      !!producers.video
    );

    return { sessionId, answerSdp };
  } catch (error) {
    transport.close();

    throw error;
  }
};

export { startWhipSession };
