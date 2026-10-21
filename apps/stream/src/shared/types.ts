// the contract between electron's main process and the window, shared by both sides

export type TCaptureSourceKind = 'screen' | 'window';

export type TCaptureSource = {
  // desktopCapturer's id: "screen:<n>:0" or "window:<hwnd>:0"
  id: string;
  name: string;
  kind: TCaptureSourceKind;
  thumbnail: string;
  appIcon: string | null;
};

export type TAudioApp = {
  hwnd: number;
  pid: number;
  name: string;
  title: string;
};

export enum AudioSourceKind {
  NONE = 'none',
  // the sound of the app whose window is being streamed
  WINDOW_APP = 'window-app',
  // the sound of an app picked from a list
  APP = 'app',
  // everything the computer plays except one app, usually the browser with the call in it
  ALL_EXCEPT = 'all-except',
  // everything the computer plays, call included
  SYSTEM = 'system',
  // a microphone or any other input device, like a capture card or a virtual cable
  DEVICE = 'device'
}

export type TAudioSettings = {
  kind: AudioSourceKind;
  appPid?: number;
  appName?: string;
  deviceId?: string;
};

export enum Resolution {
  SOURCE = 'source',
  P1440 = '1440p',
  P1080 = '1080p',
  P900 = '900p',
  P720 = '720p',
  P480 = '480p'
}

export enum VideoCodecPreference {
  AUTO = 'auto',
  H264 = 'video/H264',
  AV1 = 'video/AV1',
  VP9 = 'video/VP9',
  VP8 = 'video/VP8'
}

export enum ContentHint {
  MOTION = 'motion',
  DETAIL = 'detail'
}

export type TStreamSettings = {
  serverUrl: string;
  // the key never travels back to the window once saved, only whether there is one
  hasStreamKey: boolean;
  resolution: Resolution;
  frameRate: number;
  videoBitrateKbps: number;
  codec: VideoCodecPreference;
  contentHint: ContentHint;
  audio: TAudioSettings;
  audioBitrateKbps: number;
  lastSourceId?: string;
};

export type TSettingsUpdate = Partial<Omit<TStreamSettings, 'hasStreamKey'>> & {
  streamKey?: string;
};

export type TWhipPublishResult =
  | { ok: true; answerSdp: string }
  | { ok: false; status: number; message: string };

export type TAppAudioStartResult =
  | { ok: true }
  | { ok: false; message: string };

export type TMopscordApi = {
  listSources: () => Promise<TCaptureSource[]>;
  listAudioApps: () => Promise<TAudioApp[]>;
  isAppAudioAvailable: () => Promise<boolean>;
  loadSettings: () => Promise<TStreamSettings>;
  saveSettings: (update: TSettingsUpdate) => Promise<TStreamSettings>;
  whipPublish: (offerSdp: string) => Promise<TWhipPublishResult>;
  whipStop: () => Promise<void>;
  startAppAudio: (
    pid: number,
    mode: 'include' | 'exclude'
  ) => Promise<TAppAudioStartResult>;
  stopAppAudio: () => Promise<void>;
  onAppAudioData: (listener: (chunk: Uint8Array) => void) => () => void;
  onAppAudioEnded: (listener: (message: string | null) => void) => () => void;
};

export const IpcChannel = {
  LIST_SOURCES: 'sources:list',
  LIST_AUDIO_APPS: 'app-audio:list',
  APP_AUDIO_AVAILABLE: 'app-audio:available',
  LOAD_SETTINGS: 'settings:load',
  SAVE_SETTINGS: 'settings:save',
  WHIP_PUBLISH: 'whip:publish',
  WHIP_STOP: 'whip:stop',
  START_APP_AUDIO: 'app-audio:start',
  STOP_APP_AUDIO: 'app-audio:stop',
  APP_AUDIO_DATA: 'app-audio:data',
  APP_AUDIO_ENDED: 'app-audio:ended'
} as const;
