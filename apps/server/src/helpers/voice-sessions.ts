import { ServerEvents } from '@sharkord/shared';
import type WebSocket from 'ws';
import { VoiceRuntime } from '../runtimes/voice';
import { pubsub } from '../utils/pubsub';

// voice membership is kept per user in the runtime, but the transports behind it belong to
// the one connection that joined. a reconnect opens a new socket before the server notices
// the old one is gone, so tying the session to "the user still has a socket" let it outlive
// the connection that owned it: a ghost the user could neither rejoin nor leave
const voiceSessionOwners = new Map<number, WebSocket | undefined>();

const claimVoiceSession = (userId: number, ws: WebSocket | undefined) => {
  voiceSessionOwners.set(userId, ws);
};

const isVoiceSessionOwner = (userId: number, ws: WebSocket | undefined) =>
  voiceSessionOwners.has(userId) && voiceSessionOwners.get(userId) === ws;

// only a session another socket claimed is refused. one nobody claimed, put in the runtime
// directly, stays reachable from any of the user's connections as it always was
const isVoiceSessionOwnedElsewhere = (
  userId: number,
  ws: WebSocket | undefined
) => voiceSessionOwners.has(userId) && voiceSessionOwners.get(userId) !== ws;

const endVoiceSession = (userId: number): number | undefined => {
  voiceSessionOwners.delete(userId);

  const runtime = VoiceRuntime.findRuntimeByUserId(userId);

  if (!runtime) return undefined;

  runtime.removeUser(userId);

  pubsub.publish(ServerEvents.USER_LEAVE_VOICE, {
    channelId: runtime.id,
    userId
  });

  return runtime.id;
};

const clearVoiceSessionsForTests = () => {
  voiceSessionOwners.clear();
};

export {
  claimVoiceSession,
  clearVoiceSessionsForTests,
  endVoiceSession,
  isVoiceSessionOwnedElsewhere,
  isVoiceSessionOwner
};
