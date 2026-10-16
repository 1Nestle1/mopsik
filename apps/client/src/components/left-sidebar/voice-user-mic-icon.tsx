import { useVoice } from '@/features/server/voice/hooks';
import { MicOff } from 'lucide-react';
import { memo } from 'react';
import { useMicFailureCopy } from '../voice-provider/hooks/use-mic-failure-copy';

type TVoiceUserMicIconProps = {
  micMuted: boolean;
};

// only an exception is drawn: a green mic on every row said nothing and buried the muted ones
const VoiceUserMicIcon = memo(({ micMuted }: TVoiceUserMicIconProps) => {
  if (!micMuted) return null;

  return <MicOff className="h-3 w-3 text-destructive" />;
});

// only the own row knows the microphone failed: the server still has the user unmuted, so
// every row would otherwise show a green mic for someone who is sending nothing. kept out of
// the shared row so the other rows do not re-render on every voice context change
const OwnVoiceUserMicIcon = memo(({ micMuted }: TVoiceUserMicIconProps) => {
  const { micState } = useVoice();
  const micFailure = useMicFailureCopy(micState.status);

  if (micFailure) {
    return (
      <span title={micFailure.title}>
        <MicOff className="h-3 w-3 text-warning" aria-hidden="true" />
        <span className="sr-only">{micFailure.title}</span>
      </span>
    );
  }

  return <VoiceUserMicIcon micMuted={micMuted} />;
});

export { OwnVoiceUserMicIcon, VoiceUserMicIcon };
