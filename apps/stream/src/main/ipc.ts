import { ipcMain, type BrowserWindow } from 'electron';
import { IpcChannel, type TSettingsUpdate } from '../shared/types';
import {
  isAppAudioAvailable,
  listAudioApps,
  startAppAudio,
  stopAppAudio
} from './app-audio';
import { getStreamKey, loadSettings, saveSettings } from './settings-store';
import { listSources } from './sources';
import { publishWhipOffer, stopWhipSession } from './whip-http';

// an sdp offer is a few kilobytes, a stream key well under one
const MAX_OFFER_LENGTH = 64 * 1024;
const MAX_FIELD_LENGTH = 2048;

const isShortString = (value: unknown): value is string =>
  typeof value === 'string' && value.length <= MAX_FIELD_LENGTH;

const registerIpc = (window: BrowserWindow) => {
  ipcMain.handle(IpcChannel.LIST_SOURCES, () =>
    listSources(window.getMediaSourceId())
  );

  ipcMain.handle(IpcChannel.LIST_AUDIO_APPS, () => listAudioApps());

  ipcMain.handle(IpcChannel.APP_AUDIO_AVAILABLE, () => isAppAudioAvailable());

  ipcMain.handle(IpcChannel.LOAD_SETTINGS, () => loadSettings());

  ipcMain.handle(
    IpcChannel.SAVE_SETTINGS,
    (_event, update: TSettingsUpdate) => {
      if (update.streamKey !== undefined && !isShortString(update.streamKey)) {
        throw new Error('The stream key is too long.');
      }

      if (update.serverUrl !== undefined && !isShortString(update.serverUrl)) {
        throw new Error('The server URL is too long.');
      }

      return saveSettings(update);
    }
  );

  ipcMain.handle(IpcChannel.WHIP_PUBLISH, (_event, offerSdp: unknown) => {
    if (typeof offerSdp !== 'string' || offerSdp.length > MAX_OFFER_LENGTH) {
      throw new Error('The offer is not valid.');
    }

    const { serverUrl } = loadSettings();
    const streamKey = getStreamKey();

    if (!serverUrl || !streamKey) {
      return {
        ok: false,
        status: 0,
        message: 'Add the server URL and your stream key first.'
      };
    }

    return publishWhipOffer(serverUrl, streamKey, offerSdp);
  });

  ipcMain.handle(IpcChannel.WHIP_STOP, () => stopWhipSession());

  ipcMain.handle(
    IpcChannel.START_APP_AUDIO,
    (event, pid: unknown, mode: unknown) => {
      if (!Number.isInteger(pid) || (pid as number) <= 0) {
        throw new Error('The app to capture is not valid.');
      }

      if (mode !== 'include' && mode !== 'exclude') {
        throw new Error('The capture mode is not valid.');
      }

      return startAppAudio(event.sender, pid as number, mode);
    }
  );

  ipcMain.handle(IpcChannel.STOP_APP_AUDIO, () => stopAppAudio());
};

export { registerIpc };
