import { app, safeStorage } from 'electron';
import fs from 'fs';
import path from 'path';
import {
  AudioSourceKind,
  ContentHint,
  Resolution,
  VideoCodecPreference,
  type TSettingsUpdate,
  type TStreamSettings
} from '../shared/types';

type TPublicSettings = Omit<TStreamSettings, 'hasStreamKey'>;

type TStoredSettings = TPublicSettings & {
  // encrypted with the windows account's own key where electron can, so a copied settings
  // file doesn't hand out the stream key
  streamKey?: string;
  streamKeyEncrypted?: boolean;
};

const DEFAULT_SETTINGS: TPublicSettings = {
  serverUrl: '',
  resolution: Resolution.P1080,
  frameRate: 60,
  videoBitrateKbps: 6000,
  codec: VideoCodecPreference.AUTO,
  contentHint: ContentHint.MOTION,
  audio: { kind: AudioSourceKind.WINDOW_APP },
  audioBitrateKbps: 128
};

const getSettingsPath = () =>
  path.join(app.getPath('userData'), 'settings.json');

const readStoredSettings = (): TStoredSettings => {
  try {
    const raw = fs.readFileSync(getSettingsPath(), 'utf8');

    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
};

const toPublicSettings = (stored: TStoredSettings): TStreamSettings => ({
  serverUrl: stored.serverUrl,
  resolution: stored.resolution,
  frameRate: stored.frameRate,
  videoBitrateKbps: stored.videoBitrateKbps,
  codec: stored.codec,
  contentHint: stored.contentHint,
  audio: stored.audio,
  audioBitrateKbps: stored.audioBitrateKbps,
  lastSourceId: stored.lastSourceId,
  hasStreamKey: !!stored.streamKey
});

const encodeStreamKey = (key: string) => {
  if (!safeStorage.isEncryptionAvailable()) {
    return { streamKey: key, streamKeyEncrypted: false };
  }

  return {
    streamKey: safeStorage.encryptString(key).toString('base64'),
    streamKeyEncrypted: true
  };
};

const getStreamKey = () => {
  const stored = readStoredSettings();

  if (!stored.streamKey) return undefined;

  if (!stored.streamKeyEncrypted) return stored.streamKey;

  try {
    return safeStorage.decryptString(Buffer.from(stored.streamKey, 'base64'));
  } catch {
    // saved under another windows account, so it has to be entered again
    return undefined;
  }
};

const loadSettings = () => toPublicSettings(readStoredSettings());

const saveSettings = (update: TSettingsUpdate) => {
  const { streamKey, ...settings } = update;
  const next: TStoredSettings = { ...readStoredSettings(), ...settings };

  if (streamKey !== undefined) {
    const trimmed = streamKey.trim();

    if (trimmed) {
      Object.assign(next, encodeStreamKey(trimmed));
    } else {
      delete next.streamKey;
      delete next.streamKeyEncrypted;
    }
  }

  fs.mkdirSync(path.dirname(getSettingsPath()), { recursive: true });
  fs.writeFileSync(getSettingsPath(), JSON.stringify(next, null, 2));

  return toPublicSettings(next);
};

export { getStreamKey, loadSettings, saveSettings };
