import { createContext, useCallback, useContext } from 'react';

// a small app with a few dozen strings: two dictionaries and {{name}} placeholders are all it
// needs. english and russian, like the main app

const en = {
  appName: 'MOPSCORD Stream',
  statusReady: 'Ready',
  statusStarting: 'Connecting…',
  statusLive: 'Live',
  statusStopped: 'Stopped',
  language: 'Language',

  sourcesScreens: 'Screens',
  sourcesWindows: 'Windows',
  sourcesRefresh: 'Refresh',
  sourcesEmptyWindows: 'No windows to share right now.',
  sourcesEmptyScreens: 'No screens found.',
  sourcesSelected: 'Streaming this',
  sourcesSwitchHint:
    'Click another screen or window to switch to it without stopping.',
  sourcesWindowFpsHint:
    'Windows are captured at about 15 fps. For games and video, pick the screen.',

  serverTitle: 'Server',
  serverUrl: 'Server URL',
  serverUrlHint: 'Copy it from Sharkord: User settings → Streaming.',
  streamKey: 'Stream key',
  streamKeySaved: 'Saved on this computer',
  streamKeyChange: 'Change',
  streamKeySave: 'Save',
  streamKeyHint: 'Create one in Sharkord: User settings → Streaming.',

  videoTitle: 'Video',
  presets: 'Quick presets',
  presetLight: 'Light 720p30',
  presetSmooth: 'Smooth 720p60',
  presetSharp: 'Sharp 1080p30',
  presetBest: 'Best 1080p60',
  presetUltra: 'Ultra 1440p60',
  resolution: 'Resolution',
  resolutionSource: 'Source size',
  frameRate: 'Frame rate',
  frameRateValue: '{{value}} fps',
  bitrate: 'Bitrate',
  bitrateHint:
    'Higher is sharper. Everyone watching downloads this much, and your server sends it to each of them.',
  codec: 'Codec',
  codecAuto: 'Auto (H.264 on your graphics card)',
  optimizeFor: 'Optimize for',
  optimizeMotion: 'Motion: games and video',
  optimizeDetail: 'Detail: text and code',
  optimizeHint:
    'Motion keeps the frame rate and lowers sharpness when it has to. Detail keeps text sharp and may drop frames.',
  liveChangeHint:
    'Changes apply right away, codec changes the next time you go live.',

  audioTitle: 'Sound',
  audioSource: 'Source',
  audioWindowApp: 'Sound of the streamed window',
  audioApp: 'Sound of one app',
  audioAllExcept: 'Everything except one app',
  audioSystem: 'Everything (your call too)',
  audioDevice: 'Microphone or input device',
  audioNone: 'No sound',
  audioWindowAppHint:
    'Only the app you stream is heard. Your call and other apps stay out.',
  audioNeedsWindowHint:
    'A screen has no single app. Pick a window, or another sound source.',
  audioAppPick: 'App',
  audioAppPlaceholder: 'Pick an app',
  audioAllExceptHint:
    'Pick the browser your call is in, so friends don’t hear themselves.',
  audioSystemWarning:
    'Everyone in the call will hear their own voices come back. “Everything except one app” avoids that.',
  audioDevicePick: 'Input device',
  audioDevicePlaceholder: 'Pick a device',
  audioBitrate: 'Sound quality',
  audioBitrateValue: '{{value}} kbit/s',
  audioAppUnavailable: 'Capturing one app’s sound needs Windows 11.',
  audioRefresh: 'Refresh list',

  goLive: 'Go live',
  stop: 'Stop',
  starting: 'Connecting…',
  pickSourceFirst: 'Pick a screen or window first.',
  addServerFirst: 'Add the server URL and your stream key first.',
  needWindowForAudio:
    'The window’s sound needs a window. Pick one, or another sound source.',
  appNotFound:
    'That app isn’t running any more. Refresh the list and pick again.',
  pickAppFirst: 'Pick the app for the sound first.',
  pickDeviceFirst: 'Pick an input device first.',
  connectionLost: 'The connection to the server was lost.',
  soundStopped: 'The sound stopped: {{message}}',
  summary: '{{source}} · {{resolution}} · {{fps}} fps · {{bitrate}}',
  statsGpu: 'GPU encoder',
  statsCpu: 'CPU encoder',
  statsLimitedCpu: 'Held back by CPU',
  statsLimitedNetwork: 'Held back by network',
  statsRtt: '{{value}} ms',
  statsLoss: '{{value}}% loss',
  previewAlt: 'What your friends see',
  dismiss: 'Dismiss'
} as const;

type TKey = keyof typeof en;

const ru: Record<TKey, string> = {
  appName: 'MOPSCORD Stream',
  statusReady: 'Готово',
  statusStarting: 'Подключение…',
  statusLive: 'В эфире',
  statusStopped: 'Остановлено',
  language: 'Язык',

  sourcesScreens: 'Экраны',
  sourcesWindows: 'Окна',
  sourcesRefresh: 'Обновить',
  sourcesEmptyWindows: 'Сейчас нет окон для показа.',
  sourcesEmptyScreens: 'Экраны не найдены.',
  sourcesSelected: 'Транслируется',
  sourcesSwitchHint:
    'Нажмите на другой экран или окно, чтобы переключиться без остановки.',
  sourcesWindowFpsHint:
    'Окна захватываются примерно с 15 кадрами в секунду. Для игр и видео выберите экран.',

  serverTitle: 'Сервер',
  serverUrl: 'Адрес сервера',
  serverUrlHint:
    'Скопируйте его в Sharkord: Настройки пользователя → Трансляции.',
  streamKey: 'Ключ трансляции',
  streamKeySaved: 'Сохранён на этом компьютере',
  streamKeyChange: 'Изменить',
  streamKeySave: 'Сохранить',
  streamKeyHint:
    'Создайте его в Sharkord: Настройки пользователя → Трансляции.',

  videoTitle: 'Видео',
  presets: 'Быстрые настройки',
  presetLight: 'Лёгкий 720p30',
  presetSmooth: 'Плавно 720p60',
  presetSharp: 'Чётко 1080p30',
  presetBest: 'Максимум 1080p60',
  presetUltra: 'Ультра 1440p60',
  resolution: 'Разрешение',
  resolutionSource: 'Как у источника',
  frameRate: 'Частота кадров',
  frameRateValue: '{{value}} кадров/с',
  bitrate: 'Битрейт',
  bitrateHint:
    'Чем выше, тем чётче. Каждый зритель скачивает столько, и сервер отправляет это каждому.',
  codec: 'Кодек',
  codecAuto: 'Авто (H.264 на видеокарте)',
  optimizeFor: 'Оптимизировать для',
  optimizeMotion: 'Движение: игры и видео',
  optimizeDetail: 'Детали: текст и код',
  optimizeHint:
    'Движение сохраняет частоту кадров и при нехватке снижает чёткость. Детали сохраняют чёткость текста, но могут пропускать кадры.',
  liveChangeHint:
    'Изменения применяются сразу, а смена кодека со следующего эфира.',

  audioTitle: 'Звук',
  audioSource: 'Источник',
  audioWindowApp: 'Звук транслируемого окна',
  audioApp: 'Звук одного приложения',
  audioAllExcept: 'Всё, кроме одного приложения',
  audioSystem: 'Всё (и ваш звонок тоже)',
  audioDevice: 'Микрофон или устройство ввода',
  audioNone: 'Без звука',
  audioWindowAppHint:
    'Слышно только транслируемое приложение. Звонок и остальные приложения не попадут.',
  audioNeedsWindowHint:
    'У экрана нет одного приложения. Выберите окно или другой источник звука.',
  audioAppPick: 'Приложение',
  audioAppPlaceholder: 'Выберите приложение',
  audioAllExceptHint:
    'Выберите браузер, в котором идёт звонок, чтобы друзья не слышали себя.',
  audioSystemWarning:
    'Все в звонке услышат свои голоса обратно. «Всё, кроме одного приложения» этого избегает.',
  audioDevicePick: 'Устройство ввода',
  audioDevicePlaceholder: 'Выберите устройство',
  audioBitrate: 'Качество звука',
  audioBitrateValue: '{{value}} кбит/с',
  audioAppUnavailable: 'Для звука одного приложения нужна Windows 11.',
  audioRefresh: 'Обновить список',

  goLive: 'В эфир',
  stop: 'Остановить',
  starting: 'Подключение…',
  pickSourceFirst: 'Сначала выберите экран или окно.',
  addServerFirst: 'Сначала укажите адрес сервера и ключ трансляции.',
  needWindowForAudio:
    'Для звука окна нужно окно. Выберите его или другой источник звука.',
  appNotFound: 'Это приложение уже закрыто. Обновите список и выберите снова.',
  pickAppFirst: 'Сначала выберите приложение для звука.',
  pickDeviceFirst: 'Сначала выберите устройство ввода.',
  connectionLost: 'Связь с сервером потеряна.',
  soundStopped: 'Звук прервался: {{message}}',
  summary: '{{source}} · {{resolution}} · {{fps}} кадров/с · {{bitrate}}',
  statsGpu: 'Кодирует видеокарта',
  statsCpu: 'Кодирует процессор',
  statsLimitedCpu: 'Не хватает процессора',
  statsLimitedNetwork: 'Не хватает сети',
  statsRtt: '{{value}} мс',
  statsLoss: 'потери {{value}}%',
  previewAlt: 'Что видят друзья',
  dismiss: 'Закрыть'
};

export type TLanguage = 'en' | 'ru';

const dictionaries: Record<TLanguage, Record<TKey, string>> = { en, ru };

export const getDefaultLanguage = (): TLanguage =>
  navigator.language.toLowerCase().startsWith('ru') ? 'ru' : 'en';

export const translate = (
  language: TLanguage,
  key: TKey,
  values?: Record<string, string | number>
) => {
  const template = dictionaries[language][key];

  if (!values) return template;

  return template.replace(/\{\{(\w+)\}\}/g, (match, name: string) =>
    name in values ? String(values[name]) : match
  );
};

export const LanguageContext = createContext<TLanguage>('en');

export const useT = () => {
  const language = useContext(LanguageContext);

  return useCallback(
    (key: TKey, values?: Record<string, string | number>) =>
      translate(language, key, values),
    [language]
  );
};

export type { TKey };
