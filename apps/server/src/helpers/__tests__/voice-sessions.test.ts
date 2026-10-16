import { ServerEvents } from '@sharkord/shared';
import { describe, expect, test } from 'bun:test';
import { createFakeSocket, initTest } from '../../__tests__/helpers';
import { VoiceRuntime } from '../../runtimes/voice';
import { pubsub } from '../../utils/pubsub';
import { getOnlineUserIds, handleSocketClose } from '../../utils/wss';

// seeded voice channels, user 1 owns the server and can join both
const VOICE_CHANNEL_ID = 2;
const OTHER_VOICE_CHANNEL_ID = 4;

const joinInput = (channelId: number) => ({
  channelId,
  state: { micMuted: false, soundMuted: false }
});

const connect = async (userId: number) => {
  const socket = createFakeSocket();
  const { caller } = await initTest(userId, { socket });

  return { socket, caller };
};

const recordVoiceDepartures = () => {
  const departures: { channelId: number; userId: number }[] = [];

  const subscription = pubsub
    .subscribe(ServerEvents.USER_LEAVE_VOICE)
    .subscribe({
      next: (departure) => {
        departures.push(departure);
      }
    });

  return { departures, stop: () => subscription.unsubscribe() };
};

const withRuntimes = async (channelIds: number[], run: () => Promise<void>) => {
  const runtimes = channelIds.map((channelId) => new VoiceRuntime(channelId));

  try {
    await Promise.all(runtimes.map((runtime) => runtime.init()));
    await run();
  } finally {
    await Promise.all(runtimes.map((runtime) => runtime.destroy()));
  }
};

describe('voice sessions', () => {
  // the reported bug: a reconnect opens the new socket before the server notices the old
  // one died, so the old socket closes while the user is still online
  test('should end the session when the socket that joined closes while another stays open', async () => {
    await withRuntimes([VOICE_CHANNEL_ID], async () => {
      const oldConnection = await connect(1);

      await oldConnection.caller.voice.join(joinInput(VOICE_CHANNEL_ID));

      await connect(1);

      const { departures, stop } = recordVoiceDepartures();

      await handleSocketClose(oldConnection.socket);

      stop();

      expect(VoiceRuntime.findRuntimeByUserId(1)).toBeUndefined();
      expect(departures).toEqual([{ channelId: VOICE_CHANNEL_ID, userId: 1 }]);
      expect(getOnlineUserIds()).toContain(1);
    });
  });

  test('should keep the session when a socket that did not join closes', async () => {
    await withRuntimes([VOICE_CHANNEL_ID], async () => {
      const voiceConnection = await connect(1);
      const otherTab = await connect(1);

      await voiceConnection.caller.voice.join(joinInput(VOICE_CHANNEL_ID));

      const { departures, stop } = recordVoiceDepartures();

      await handleSocketClose(otherTab.socket);

      stop();

      expect(VoiceRuntime.findRuntimeByUserId(1)?.id).toBe(VOICE_CHANNEL_ID);
      expect(departures).toEqual([]);
    });
  });

  test('should let a join from a new connection take over a stale session', async () => {
    await withRuntimes([VOICE_CHANNEL_ID], async () => {
      const oldConnection = await connect(1);

      await oldConnection.caller.voice.join(joinInput(VOICE_CHANNEL_ID));

      const newConnection = await connect(1);
      const { departures, stop } = recordVoiceDepartures();

      const result = await newConnection.caller.voice.join(
        joinInput(VOICE_CHANNEL_ID)
      );

      stop();

      expect(result.routerRtpCapabilities).toBeDefined();
      expect(departures).toEqual([{ channelId: VOICE_CHANNEL_ID, userId: 1 }]);

      const runtime = VoiceRuntime.findById(VOICE_CHANNEL_ID);

      expect(runtime?.getState().users.map(({ userId }) => userId)).toEqual([
        1
      ]);

      // the old socket closing late must not end the session the new one now owns
      await handleSocketClose(oldConnection.socket);

      expect(VoiceRuntime.findRuntimeByUserId(1)?.id).toBe(VOICE_CHANNEL_ID);
    });
  });

  test('should move the session to the channel the new connection joins', async () => {
    await withRuntimes([VOICE_CHANNEL_ID, OTHER_VOICE_CHANNEL_ID], async () => {
      const oldConnection = await connect(1);

      await oldConnection.caller.voice.join(joinInput(VOICE_CHANNEL_ID));

      const newConnection = await connect(1);
      const { departures, stop } = recordVoiceDepartures();

      await newConnection.caller.voice.join(joinInput(OTHER_VOICE_CHANNEL_ID));

      stop();

      expect(departures).toEqual([{ channelId: VOICE_CHANNEL_ID, userId: 1 }]);
      expect(VoiceRuntime.findRuntimeByUserId(1)?.id).toBe(
        OTHER_VOICE_CHANNEL_ID
      );
    });
  });

  test('should refuse to let the replaced connection drive the session', async () => {
    await withRuntimes([VOICE_CHANNEL_ID], async () => {
      const oldConnection = await connect(1);

      await oldConnection.caller.voice.join(joinInput(VOICE_CHANNEL_ID));

      const newConnection = await connect(1);

      await newConnection.caller.voice.join(joinInput(VOICE_CHANNEL_ID));

      await expect(oldConnection.caller.voice.leave()).rejects.toThrow(
        'Your voice session moved to another connection'
      );

      expect(VoiceRuntime.findRuntimeByUserId(1)?.id).toBe(VOICE_CHANNEL_ID);
    });
  });

  test('should release the session when its connection leaves', async () => {
    await withRuntimes([VOICE_CHANNEL_ID], async () => {
      const voiceConnection = await connect(1);
      const otherTab = await connect(1);

      await voiceConnection.caller.voice.join(joinInput(VOICE_CHANNEL_ID));
      await voiceConnection.caller.voice.leave();

      expect(VoiceRuntime.findRuntimeByUserId(1)).toBeUndefined();

      // nothing is left claimed, so the other tab can join without a takeover
      const { departures, stop } = recordVoiceDepartures();

      await otherTab.caller.voice.join(joinInput(VOICE_CHANNEL_ID));

      stop();

      expect(departures).toEqual([]);
    });
  });

  test('should end the session when the last socket closes', async () => {
    await withRuntimes([VOICE_CHANNEL_ID], async () => {
      const voiceConnection = await connect(1);

      await voiceConnection.caller.voice.join(joinInput(VOICE_CHANNEL_ID));

      await handleSocketClose(voiceConnection.socket);

      expect(VoiceRuntime.findRuntimeByUserId(1)).toBeUndefined();
      expect(getOnlineUserIds()).not.toContain(1);
    });
  });
});
