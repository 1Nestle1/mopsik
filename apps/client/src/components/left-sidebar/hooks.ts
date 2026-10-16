import { useAutoJoinLastChannel } from '@/features/app/hooks';
import { setSelectedChannelId } from '@/features/server/channels/actions';
import { useChannelsMap } from '@/features/server/channels/hooks';
import {
  setVoiceMoveTargetChannelId,
  setVoiceRejoinChannelId
} from '@/features/server/voice/actions';
import {
  useVoice,
  useVoiceMoveTargetChannelId,
  useVoiceRejoinChannelId
} from '@/features/server/voice/hooks';
import {
  getLocalStorageItem,
  getLocalStorageItemAsJSON,
  LocalStorageKey,
  setLocalStorageItemAsJSON
} from '@/helpers/storage';
import { useJoinVoiceChannel } from '@/hooks/use-join-voice-channel';
import { useSelectChannel } from '@/hooks/use-select-channel';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useMicFailureCopy } from '../voice-provider/hooks/use-mic-failure-copy';
import { MicStatus } from '../voice-provider/mic-status';

const loadExpandedValue = (categoryId: number): boolean => {
  const expandedMap = getLocalStorageItemAsJSON<Record<number, boolean>>(
    LocalStorageKey.CATEGORIES_EXPANDED,
    {}
  );

  return expandedMap?.[categoryId] ?? true;
};

const saveExpandedValue = (categoryId: number, expanded: boolean): void => {
  const expandedMap = getLocalStorageItemAsJSON<Record<number, boolean>>(
    LocalStorageKey.CATEGORIES_EXPANDED,
    {}
  );

  const newExpandedMap = {
    ...expandedMap,
    [categoryId]: expanded
  };

  setLocalStorageItemAsJSON(
    LocalStorageKey.CATEGORIES_EXPANDED,
    newExpandedMap
  );
};

const useCategoryExpanded = (categoryId: number) => {
  const [expanded, setExpanded] = useState(loadExpandedValue(categoryId));

  const toggleExpanded = useCallback(() => {
    setExpanded((prev) => {
      const newValue = !prev;

      saveExpandedValue(categoryId, newValue);

      return newValue;
    });
  }, [categoryId]);

  const expand = useCallback(() => {
    saveExpandedValue(categoryId, true);
    setExpanded(true);
  }, [categoryId]);

  return useMemo(
    () => ({ expand, expanded, toggleExpanded }),
    [expand, expanded, toggleExpanded]
  );
};

const useRestoreLastSelectedChannel = () => {
  const autoJoinLastChannel = useAutoJoinLastChannel();
  const channelsMap = useChannelsMap();

  useEffect(() => {
    if (!autoJoinLastChannel) return;

    const lastSelectedChannelId = getLocalStorageItem(
      LocalStorageKey.LAST_SELECTED_CHANNEL
    );

    if (lastSelectedChannelId) {
      const channelId = parseInt(lastSelectedChannelId, 10);
      const lastChannel = channelsMap[channelId];

      if (lastChannel) {
        setSelectedChannelId(channelId);
      }
    }
  }, [channelsMap, autoJoinLastChannel]);
};

const useFollowVoiceMove = () => {
  const selectChannel = useSelectChannel();
  const voiceMoveTargetChannelId = useVoiceMoveTargetChannelId();

  useEffect(() => {
    if (voiceMoveTargetChannelId === undefined) return;

    setVoiceMoveTargetChannelId(undefined);
    selectChannel(voiceMoveTargetChannelId);
  }, [voiceMoveTargetChannelId, selectChannel]);
};

// unlike a move, this joins without selecting the channel: the user did not ask to go
// anywhere, the connection dropped while they were reading something else
const useRejoinVoiceAfterReconnect = () => {
  const joinVoiceChannel = useJoinVoiceChannel();
  const voiceRejoinChannelId = useVoiceRejoinChannelId();

  useEffect(() => {
    if (voiceRejoinChannelId === undefined) return;

    setVoiceRejoinChannelId(undefined);
    joinVoiceChannel(voiceRejoinChannelId);
  }, [voiceRejoinChannelId, joinVoiceChannel]);
};

const MIC_FAILURE_TOAST_ID = 'mic-failure';

// one toast per failed attempt, so a retry that fails the same way still answers the click.
// it replaces itself instead of stacking, and goes away once the microphone works again
const useMicFailureToast = () => {
  const { t } = useTranslation('sidebar');
  const { micState, retryMic } = useVoice();
  const copy = useMicFailureCopy(micState.status);
  const toastedAttemptRef = useRef(micState.attempt);

  useEffect(() => {
    if (!copy) {
      toast.dismiss(MIC_FAILURE_TOAST_ID);

      return;
    }

    if (toastedAttemptRef.current === micState.attempt) return;

    toastedAttemptRef.current = micState.attempt;

    const canRetry = micState.status !== MicStatus.INSECURE;

    toast.warning(copy.title, {
      id: MIC_FAILURE_TOAST_ID,
      description: copy.detail,
      // retryMic reports its own outcome through the mic state, it never rejects
      action: canRetry
        ? { label: t('micRetry'), onClick: () => retryMic() }
        : undefined
    });
  }, [copy, micState.attempt, micState.status, retryMic, t]);
};

export {
  useCategoryExpanded,
  useFollowVoiceMove,
  useMicFailureToast,
  useRejoinVoiceAfterReconnect,
  useRestoreLastSelectedChannel
};
