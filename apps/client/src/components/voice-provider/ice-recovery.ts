import {
  logVoice,
  logVoiceError,
  logVoiceWarn
} from '@/helpers/browser-logger';
import type {
  AppData,
  ConnectionState,
  IceParameters,
  Transport
} from 'mediasoup-client/types';

// "disconnected" follows any short blip and usually heals by itself, so it only gets a
// restart once it has lasted. "failed" never heals on its own and is restarted at once
const ICE_DISCONNECTED_GRACE_MS = 3_000;
const MAX_ICE_RESTARTS = 3;

type TTransportDirection = 'producer' | 'consumer';

type TIceRecoveryOptions = {
  direction: TTransportDirection;
  getTransport: () => Transport<AppData> | undefined;
  requestIceParameters: () => Promise<IceParameters>;
  onExhausted: () => void;
  graceMs?: number;
};

const createIceRecovery = ({
  direction,
  getTransport,
  requestIceParameters,
  onExhausted,
  graceMs = ICE_DISCONNECTED_GRACE_MS
}: TIceRecoveryOptions) => {
  let graceTimer: ReturnType<typeof setTimeout> | undefined;
  let attempts = 0;
  let restarting = false;

  const clearGraceTimer = () => {
    if (graceTimer) {
      clearTimeout(graceTimer);
      graceTimer = undefined;
    }
  };

  const restart = async () => {
    clearGraceTimer();

    const transport = getTransport();

    if (!transport || transport.closed || restarting) return;

    if (attempts >= MAX_ICE_RESTARTS) {
      logVoiceWarn(`${direction} transport: ice restarts exhausted`, {
        attempts
      });
      onExhausted();

      return;
    }

    attempts += 1;
    restarting = true;

    logVoiceWarn(`${direction} transport: restarting ice`, {
      attempt: attempts
    });

    try {
      const iceParameters = await requestIceParameters();

      await transport.restartIce({ iceParameters });
    } catch (error) {
      // also lands here while the server connection itself is down, and the reconnect
      // that follows rejoins the call, so giving up is the right call either way
      logVoiceError(`${direction} transport: ice restart failed`, error);
      onExhausted();
    } finally {
      restarting = false;
    }
  };

  const onConnectionStateChange = (state: ConnectionState) => {
    if (state === 'connected') {
      if (attempts > 0) {
        logVoice(`${direction} transport: recovered`, { attempts });
      }

      clearGraceTimer();
      attempts = 0;

      return;
    }

    // restart catches its own failures and hands them to onExhausted, so neither call
    // below has a rejection to handle
    if (state === 'disconnected') {
      graceTimer ??= setTimeout(restart, graceMs);

      return;
    }

    if (state === 'failed') {
      restart();

      return;
    }

    if (state === 'closed') {
      clearGraceTimer();
    }
  };

  return { onConnectionStateChange, dispose: clearGraceTimer };
};

export { createIceRecovery, type TTransportDirection };
