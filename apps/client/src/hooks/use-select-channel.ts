import { setSelectedChannelId } from '@/features/server/channels/actions';
import { useCurrentVoiceChannelId } from '@/features/server/channels/hooks';
import { channelByIdSelector } from '@/features/server/channels/selectors';
import { store } from '@/features/store';
import { LocalStorageKey, setLocalStorageItem } from '@/helpers/storage';
import { ChannelType } from '@sharkord/shared';
import { useCallback } from 'react';
import { useJoinVoiceChannel } from './use-join-voice-channel';

// the single entry point for navigating to a channel, it also joins voice and
// remembers the last text channel, so never dispatch setSelectedChannelId directly
const useSelectChannel = () => {
  const joinVoiceChannel = useJoinVoiceChannel();
  const currentVoiceChannelId = useCurrentVoiceChannelId();

  return useCallback(
    async (channelId: number) => {
      const channel = channelByIdSelector(store.getState(), channelId);

      if (!channel) return;

      setSelectedChannelId(channel.id);

      if (channel.type !== ChannelType.VOICE) {
        // persist selected channel for non-voice channels
        setLocalStorageItem(
          LocalStorageKey.LAST_SELECTED_CHANNEL,
          channel.id.toString()
        );
      }

      if (
        channel.type === ChannelType.VOICE &&
        currentVoiceChannelId !== channel.id
      ) {
        await joinVoiceChannel(channel.id);
      }
    },
    [currentVoiceChannelId, joinVoiceChannel]
  );
};

export { useSelectChannel };
