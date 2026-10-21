import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import { IpcChannel, type TMopscordApi } from '../shared/types';

const api: TMopscordApi = {
  listSources: () => ipcRenderer.invoke(IpcChannel.LIST_SOURCES),
  listAudioApps: () => ipcRenderer.invoke(IpcChannel.LIST_AUDIO_APPS),
  isAppAudioAvailable: () => ipcRenderer.invoke(IpcChannel.APP_AUDIO_AVAILABLE),
  loadSettings: () => ipcRenderer.invoke(IpcChannel.LOAD_SETTINGS),
  saveSettings: (update) =>
    ipcRenderer.invoke(IpcChannel.SAVE_SETTINGS, update),
  whipPublish: (offerSdp) =>
    ipcRenderer.invoke(IpcChannel.WHIP_PUBLISH, offerSdp),
  whipStop: () => ipcRenderer.invoke(IpcChannel.WHIP_STOP),
  startAppAudio: (pid, mode) =>
    ipcRenderer.invoke(IpcChannel.START_APP_AUDIO, pid, mode),
  stopAppAudio: () => ipcRenderer.invoke(IpcChannel.STOP_APP_AUDIO),
  onAppAudioData: (listener) => {
    const handler = (_event: IpcRendererEvent, chunk: Uint8Array) =>
      listener(chunk);

    ipcRenderer.on(IpcChannel.APP_AUDIO_DATA, handler);

    return () => ipcRenderer.off(IpcChannel.APP_AUDIO_DATA, handler);
  },
  onAppAudioEnded: (listener) => {
    const handler = (_event: IpcRendererEvent, message: string | null) =>
      listener(message);

    ipcRenderer.on(IpcChannel.APP_AUDIO_ENDED, handler);

    return () => ipcRenderer.off(IpcChannel.APP_AUDIO_ENDED, handler);
  }
};

contextBridge.exposeInMainWorld('mopscord', api);
