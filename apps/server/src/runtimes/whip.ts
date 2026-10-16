import { ServerEvents } from '@sharkord/shared';
import type { Unsubscribable } from '@trpc/server/observable';
import { randomUUID } from 'crypto';
import type { WebRtcTransport } from 'mediasoup/types';
import { logger } from '../logger';
import { IS_TEST } from '../utils/env';
import { pubsub } from '../utils/pubsub';
import { VoiceRuntime } from './voice';

// a stream pushed in from an app like obs. it lives in the call its owner was in when it
// started, as an external stream, and is fed by its own transport
type TWhipSession = {
  id: string;
  userId: number;
  channelId: number;
  streamId: number;
  transport: WebRtcTransport;
  leaveSubscription: Unsubscribable;
  leaveTimer?: ReturnType<typeof setTimeout>;
  iceTimer?: ReturnType<typeof setTimeout>;
};

// a browser reconnect takes its owner out of the call for a moment, and a network blip pauses
// ice for a moment; the stream should outlive both and only end once they really are gone
const WHIP_GRACE_MS = IS_TEST ? 0 : 10_000;

const whipSessions = new Map<string, TWhipSession>();

const endWhipSession = (sessionId: string) => {
  const session = whipSessions.get(sessionId);

  if (!session) return;

  whipSessions.delete(sessionId);

  clearTimeout(session.leaveTimer);
  clearTimeout(session.iceTimer);
  session.leaveSubscription.unsubscribe();

  VoiceRuntime.findById(session.channelId)?.removeExternalStream(
    session.streamId
  );

  if (!session.transport.closed) {
    session.transport.close();
  }

  logger.info(
    'Stream %s of user %s ended in channel %s',
    sessionId,
    session.userId,
    session.channelId
  );
};

const endWhipSessionsForUser = (userId: number) => {
  for (const session of [...whipSessions.values()]) {
    if (session.userId === userId) {
      endWhipSession(session.id);
    }
  }
};

const getWhipSession = (sessionId: string) => whipSessions.get(sessionId);

const hasWhipSession = (userId: number) =>
  [...whipSessions.values()].some((session) => session.userId === userId);

const registerWhipSession = ({
  userId,
  channelId,
  streamId,
  transport
}: Pick<TWhipSession, 'userId' | 'channelId' | 'streamId' | 'transport'>) => {
  const id = randomUUID();

  const leaveSubscription = pubsub
    .subscribe(ServerEvents.USER_LEAVE_VOICE)
    .subscribe({
      next: (departure) => {
        const session = whipSessions.get(id);

        if (!session) return;
        if (departure.userId !== userId) return;
        if (departure.channelId !== channelId) return;

        clearTimeout(session.leaveTimer);

        session.leaveTimer = setTimeout(() => {
          const isBack = !!VoiceRuntime.findById(channelId)?.getUser(userId);

          if (!isBack) endWhipSession(id);
        }, WHIP_GRACE_MS);
      }
    });

  whipSessions.set(id, {
    id,
    userId,
    channelId,
    streamId,
    transport,
    leaveSubscription
  });

  transport.on('dtlsstatechange', (state) => {
    if (state === 'failed' || state === 'closed') {
      endWhipSession(id);
    }
  });

  transport.on('icestatechange', (state) => {
    const session = whipSessions.get(id);

    if (!session) return;

    clearTimeout(session.iceTimer);

    if (state !== 'disconnected') return;

    session.iceTimer = setTimeout(() => {
      if (transport.iceState === 'disconnected') endWhipSession(id);
    }, WHIP_GRACE_MS);
  });

  // the router closing with its channel takes the transport down with it
  transport.observer.on('close', () => endWhipSession(id));

  return id;
};

const clearWhipSessionsForTests = () => {
  for (const sessionId of [...whipSessions.keys()]) {
    endWhipSession(sessionId);
  }
};

export {
  clearWhipSessionsForTests,
  endWhipSession,
  endWhipSessionsForUser,
  getWhipSession,
  hasWhipSession,
  registerWhipSession
};
