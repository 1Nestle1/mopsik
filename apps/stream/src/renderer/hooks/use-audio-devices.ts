import { useCallback, useEffect, useState } from 'react';

const listInputs = async () => {
  const devices = await navigator.mediaDevices.enumerateDevices();

  return devices.filter(
    (device) => device.kind === 'audioinput' && device.deviceId !== ''
  );
};

export const useAudioDevices = (enabled: boolean) => {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);

  const refresh = useCallback(async () => {
    let inputs = await listInputs();

    // device names stay hidden until the page has opened a microphone once
    if (inputs.some((device) => !device.label)) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true
        });

        stream.getTracks().forEach((track) => track.stop());
        inputs = await listInputs();
      } catch {
        // no microphone at all, the unnamed list is all there is
      }
    }

    setDevices(inputs);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    refresh();
    navigator.mediaDevices.addEventListener('devicechange', refresh);

    return () =>
      navigator.mediaDevices.removeEventListener('devicechange', refresh);
  }, [enabled, refresh]);

  return { devices, refresh };
};
