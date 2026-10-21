import {
  Button,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@sharkord/ui';
import { RefreshCw } from 'lucide-react';
import { memo, useCallback, useEffect } from 'react';
import {
  AudioSourceKind,
  type TAudioSettings,
  type TCaptureSourceKind
} from '../../shared/types';
import { useAudioApps } from '../hooks/use-audio-apps';
import { useAudioDevices } from '../hooks/use-audio-devices';
import { useT, type TKey } from '../lib/i18n';
import { AUDIO_BITRATES } from '../lib/presets';
import { Field, Section } from './section';

const SOURCE_LABELS: Record<AudioSourceKind, TKey> = {
  [AudioSourceKind.WINDOW_APP]: 'audioWindowApp',
  [AudioSourceKind.APP]: 'audioApp',
  [AudioSourceKind.ALL_EXCEPT]: 'audioAllExcept',
  [AudioSourceKind.SYSTEM]: 'audioSystem',
  [AudioSourceKind.DEVICE]: 'audioDevice',
  [AudioSourceKind.NONE]: 'audioNone'
};

const APP_SOURCES = new Set([
  AudioSourceKind.WINDOW_APP,
  AudioSourceKind.APP,
  AudioSourceKind.ALL_EXCEPT
]);

// the call is almost always running in one of these
const BROWSER_PATTERN =
  /^(chrome|msedge|firefox|opera|brave|vivaldi|browser|yandex|arc|zen)$/i;

type TAudioSectionProps = {
  audio: TAudioSettings;
  audioBitrateKbps: number;
  sourceKind: TCaptureSourceKind | undefined;
  onChange: (changes: {
    audio?: TAudioSettings;
    audioBitrateKbps?: number;
  }) => void;
};

export const AudioSection = memo(
  ({ audio, audioBitrateKbps, sourceKind, onChange }: TAudioSectionProps) => {
    const t = useT();
    const needsAppList =
      audio.kind === AudioSourceKind.APP ||
      audio.kind === AudioSourceKind.ALL_EXCEPT;
    const { apps, available, refresh } = useAudioApps(needsAppList);
    const { devices } = useAudioDevices(audio.kind === AudioSourceKind.DEVICE);

    // excluding the browser is what keeps friends from hearing themselves, so it is the
    // first guess until someone picks otherwise
    useEffect(() => {
      if (audio.kind !== AudioSourceKind.ALL_EXCEPT || audio.appPid) return;

      const browser = apps.find((app) => BROWSER_PATTERN.test(app.name));

      if (browser) {
        onChange({
          audio: { ...audio, appPid: browser.pid, appName: browser.name }
        });
      }
    }, [apps, audio, onChange]);

    const onSourceKind = useCallback(
      (value: string) =>
        onChange({ audio: { kind: value as AudioSourceKind } }),
      [onChange]
    );

    const onApp = useCallback(
      (value: string) => {
        const pid = Number(value);
        const app = apps.find((candidate) => candidate.pid === pid);

        onChange({ audio: { ...audio, appPid: pid, appName: app?.name } });
      },
      [apps, audio, onChange]
    );

    const onDevice = useCallback(
      (deviceId: string) => onChange({ audio: { ...audio, deviceId } }),
      [audio, onChange]
    );

    const onBitrate = useCallback(
      (value: string) => onChange({ audioBitrateKbps: Number(value) }),
      [onChange]
    );

    let hint: string | undefined;
    let warning: string | undefined;

    if (APP_SOURCES.has(audio.kind) && !available) {
      warning = t('audioAppUnavailable');
    } else if (audio.kind === AudioSourceKind.WINDOW_APP) {
      if (sourceKind === 'screen') {
        warning = t('audioNeedsWindowHint');
      } else {
        hint = t('audioWindowAppHint');
      }
    } else if (audio.kind === AudioSourceKind.ALL_EXCEPT) {
      hint = t('audioAllExceptHint');
    } else if (audio.kind === AudioSourceKind.SYSTEM) {
      warning = t('audioSystemWarning');
    }

    return (
      <Section title={t('audioTitle')}>
        <Field label={t('audioSource')} hint={hint} warning={warning}>
          <Select value={audio.kind} onValueChange={onSourceKind}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {Object.values(AudioSourceKind).map((kind) => (
                  <SelectItem key={kind} value={kind}>
                    {t(SOURCE_LABELS[kind])}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>

        {needsAppList && (
          <Field label={t('audioAppPick')}>
            <div className="flex gap-2">
              <Select
                value={audio.appPid ? String(audio.appPid) : undefined}
                onValueChange={onApp}
              >
                <SelectTrigger className="min-w-0 flex-1">
                  <SelectValue placeholder={t('audioAppPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {apps.map((app) => (
                      <SelectItem key={app.pid} value={String(app.pid)}>
                        <span className="truncate">
                          <span className="font-medium">{app.name}</span>
                          <span className="text-muted-foreground">
                            {' '}
                            {app.title}
                          </span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon"
                onClick={refresh}
                title={t('audioRefresh')}
                aria-label={t('audioRefresh')}
              >
                <RefreshCw />
              </Button>
            </div>
          </Field>
        )}

        {audio.kind === AudioSourceKind.DEVICE && (
          <Field label={t('audioDevicePick')}>
            <Select value={audio.deviceId} onValueChange={onDevice}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('audioDevicePlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {devices.map((device) => (
                    <SelectItem key={device.deviceId} value={device.deviceId}>
                      {device.label || device.deviceId}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
        )}

        {audio.kind !== AudioSourceKind.NONE && (
          <Field label={t('audioBitrate')}>
            <Select value={String(audioBitrateKbps)} onValueChange={onBitrate}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {AUDIO_BITRATES.map((bitrate) => (
                    <SelectItem key={bitrate} value={String(bitrate)}>
                      {t('audioBitrateValue', { value: bitrate })}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
        )}
      </Section>
    );
  }
);
