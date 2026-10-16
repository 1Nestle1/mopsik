import type { IRootState } from '@/features/store';
import { ChannelType, UserStatus, type TChannel } from '@sharkord/shared';
import { describe, expect, test } from 'bun:test';
import {
  loungeVoiceChannelsSelector,
  referenceableVoiceChannelsSelector,
  unreadTextChannelsSelector
} from '../selectors';
import { onlineUsersSelector } from '../users/selectors';
import { userVoiceChannelIdSelector } from '../voice/selectors';

const channel = (
  id: number,
  type: ChannelType,
  options: { position?: number; isPrivate?: boolean } = {}
) =>
  ({
    id,
    categoryId: 1,
    position: options.position ?? id,
    name: `channel-${id}`,
    type,
    private: options.isPrivate ?? false,
    isDm: false
  }) as TChannel;

const user = (id: number, status: UserStatus, banned = false) => ({
  id,
  name: `user-${id}`,
  status,
  banned,
  roleIds: []
});

type TStateOptions = {
  channels?: TChannel[];
  voiceUsers?: Record<number, number[]>;
  readStates?: Record<number, number>;
  users?: ReturnType<typeof user>[];
};

const stateWith = ({
  channels = [],
  voiceUsers = {},
  readStates = {},
  users = [user(1, UserStatus.ONLINE)]
}: TStateOptions) => {
  const voiceMap = Object.fromEntries(
    Object.entries(voiceUsers).map(([channelId, userIds]) => [
      channelId,
      {
        users: Object.fromEntries(
          userIds.map((userId) => [userId, { micMuted: false }])
        )
      }
    ])
  );

  return {
    server: {
      channels,
      voiceMap,
      readStatesMap: readStates,
      channelPermissions: {},
      users,
      ownUserId: 1,
      roles: [],
      currentVoiceChannelId: undefined
    }
  } as unknown as IRootState;
};

describe('loungeVoiceChannelsSelector', () => {
  test('should split voice channels by whether anyone is in them', () => {
    const state = stateWith({
      channels: [
        channel(1, ChannelType.VOICE),
        channel(2, ChannelType.VOICE),
        channel(3, ChannelType.TEXT)
      ],
      voiceUsers: { 2: [1] }
    });

    const { active, idle } = loungeVoiceChannelsSelector(state);

    expect(active.map(({ id }) => id)).toEqual([2]);
    expect(idle.map(({ id }) => id)).toEqual([1]);
  });

  test('should put the busiest room first', () => {
    const state = stateWith({
      channels: [channel(1, ChannelType.VOICE), channel(2, ChannelType.VOICE)],
      voiceUsers: { 1: [1], 2: [1, 2, 3] }
    });

    expect(
      loungeVoiceChannelsSelector(state).active.map(({ id }) => id)
    ).toEqual([2, 1]);
  });

  test('should leave out private channels the user cannot see', () => {
    const state = stateWith({
      channels: [channel(1, ChannelType.VOICE, { isPrivate: true })],
      voiceUsers: { 1: [2] }
    });

    const { active, idle } = loungeVoiceChannelsSelector(state);

    expect(active).toEqual([]);
    expect(idle).toEqual([]);
  });
});

describe('unreadTextChannelsSelector', () => {
  test('should list text channels with unread messages, most unread first', () => {
    const state = stateWith({
      channels: [
        channel(1, ChannelType.TEXT),
        channel(2, ChannelType.TEXT),
        channel(3, ChannelType.TEXT),
        channel(4, ChannelType.VOICE)
      ],
      readStates: { 1: 3, 2: 0, 3: 12, 4: 5 }
    });

    expect(unreadTextChannelsSelector(state).map(({ id }) => id)).toEqual([
      3, 1
    ]);
  });

  test('should keep the home screen short', () => {
    const channels = Array.from({ length: 10 }, (_, index) =>
      channel(index + 1, ChannelType.TEXT)
    );
    const readStates = Object.fromEntries(channels.map(({ id }) => [id, id]));

    expect(
      unreadTextChannelsSelector(stateWith({ channels, readStates }))
    ).toHaveLength(6);
  });
});

describe('onlineUsersSelector', () => {
  test('should keep online and idle users and drop offline and banned ones', () => {
    const state = stateWith({
      users: [
        user(1, UserStatus.ONLINE),
        user(2, UserStatus.IDLE),
        user(3, UserStatus.OFFLINE),
        user(4, UserStatus.ONLINE, true)
      ]
    });

    expect(onlineUsersSelector(state).map(({ id }) => id)).toEqual([1, 2]);
  });
});

describe('referenceableVoiceChannelsSelector', () => {
  test('should list only voice channels, in sidebar order', () => {
    const state = stateWith({
      channels: [
        channel(1, ChannelType.VOICE, { position: 2 }),
        channel(2, ChannelType.TEXT, { position: 0 }),
        channel(3, ChannelType.VOICE, { position: 1 })
      ]
    });

    const ids = referenceableVoiceChannelsSelector(state).map(({ id }) => id);

    expect(ids).toEqual([3, 1]);
  });
});

describe('userVoiceChannelIdSelector', () => {
  test('should find the voice channel a user is in', () => {
    const state = stateWith({
      channels: [channel(1, ChannelType.VOICE), channel(2, ChannelType.VOICE)],
      voiceUsers: { 1: [5], 2: [7, 9] }
    });

    expect(userVoiceChannelIdSelector(state, 9)).toBe(2);
    expect(userVoiceChannelIdSelector(state, 5)).toBe(1);
  });

  test('should be undefined for someone who is not in voice', () => {
    const state = stateWith({
      channels: [channel(1, ChannelType.VOICE)],
      voiceUsers: { 1: [5] }
    });

    expect(userVoiceChannelIdSelector(state, 6)).toBeUndefined();
  });
});
