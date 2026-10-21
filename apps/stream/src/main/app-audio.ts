import { execFile, spawn, type ChildProcess } from 'child_process';
import { app, type WebContents } from 'electron';
import fs from 'fs';
import path from 'path';
import {
  IpcChannel,
  type TAppAudioStartResult,
  type TAudioApp
} from '../shared/types';

// AppAudio.exe captures one app's sound, or everything but one app, through windows' process
// loopback, which no browser engine can do. it writes raw pcm that the window turns into a track

const LIST_TIMEOUT_MS = 5_000;
// a silent app still produces packets of silence, so the first one comes within a few ms;
// this is only a guard against a helper that hangs before its first write
const START_TIMEOUT_MS = 3_000;
// 16 bit stereo
const BYTES_PER_FRAME = 4;

let captureProcess: ChildProcess | undefined;

const getHelperPath = () => {
  const base = app.isPackaged
    ? process.resourcesPath
    : path.join(app.getAppPath(), 'resources');

  return path.join(base, 'app-audio', 'AppAudio.exe');
};

const isAppAudioAvailable = () =>
  process.platform === 'win32' && fs.existsSync(getHelperPath());

const listAudioApps = () =>
  new Promise<TAudioApp[]>((resolve) => {
    if (!isAppAudioAvailable()) {
      resolve([]);

      return;
    }

    execFile(
      getHelperPath(),
      ['list'],
      {
        timeout: LIST_TIMEOUT_MS,
        windowsHide: true,
        maxBuffer: 4 * 1024 * 1024
      },
      (error, stdout) => {
        if (error) {
          resolve([]);

          return;
        }

        try {
          resolve(JSON.parse(stdout) as TAudioApp[]);
        } catch {
          resolve([]);
        }
      }
    );
  });

const stopAppAudio = () => {
  const child = captureProcess;

  captureProcess = undefined;

  if (!child) return;

  // closing stdin is the helper's signal to stop; a kill is only the fallback
  child.stdin?.end();

  setTimeout(() => {
    if (child.exitCode === null) child.kill();
  }, 1_000);
};

const startAppAudio = (
  webContents: WebContents,
  pid: number,
  mode: 'include' | 'exclude'
) =>
  new Promise<TAppAudioStartResult>((resolve) => {
    stopAppAudio();

    if (!isAppAudioAvailable()) {
      resolve({ ok: false, message: 'App sound capture is not available.' });

      return;
    }

    const child = spawn(getHelperPath(), ['capture', String(pid), mode], {
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    captureProcess = child;

    let settled = false;
    let stderr = '';

    const settle = (result: TAppAudioStartResult) => {
      if (settled) return;

      settled = true;
      resolve(result);
    };

    const startTimer = setTimeout(() => settle({ ok: true }), START_TIMEOUT_MS);

    // a pipe hands over whatever it holds, which can end halfway through a frame; the
    // leftover waits for the next chunk so the window only ever gets whole frames
    let leftover: Buffer = Buffer.alloc(0);

    child.stdout.on('data', (chunk: Buffer) => {
      settle({ ok: true });

      const pending = leftover.length
        ? Buffer.concat([leftover, chunk])
        : chunk;
      const usable = pending.length - (pending.length % BYTES_PER_FRAME);

      leftover = pending.subarray(usable);

      if (usable === 0 || webContents.isDestroyed()) return;

      // a copy of exactly these bytes: node pools small buffers, and sending a view would
      // send the whole pool along with it
      webContents.send(
        IpcChannel.APP_AUDIO_DATA,
        new Uint8Array(pending.subarray(0, usable))
      );
    });

    child.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    child.on('error', (error) => {
      clearTimeout(startTimer);
      settle({ ok: false, message: error.message });
    });

    child.on('exit', (code) => {
      clearTimeout(startTimer);

      if (captureProcess === child) captureProcess = undefined;

      const message =
        code === 0 ? null : stderr.trim() || 'The app sound stopped.';

      if (!settled) {
        settle({ ok: false, message: message ?? 'The app sound stopped.' });

        return;
      }

      if (!webContents.isDestroyed()) {
        webContents.send(IpcChannel.APP_AUDIO_ENDED, message);
      }
    });
  });

export { isAppAudioAvailable, listAudioApps, startAppAudio, stopAppAudio };
