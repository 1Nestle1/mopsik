import { app } from 'electron';
import type { TWhipPublishResult } from '../shared/types';

// the http half of whip lives here rather than in the window: the window's origin is a local
// file, and a server only allows its own site to send it an authorization header

type TWhipSession = {
  location: string;
  streamKey: string;
};

const PUBLISH_TIMEOUT_MS = 15_000;
const STOP_TIMEOUT_MS = 5_000;

let currentSession: TWhipSession | undefined;

const getErrorText = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

const stopWhipSession = async () => {
  const session = currentSession;

  currentSession = undefined;

  if (!session) return;

  try {
    await fetch(session.location, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session.streamKey}` },
      signal: AbortSignal.timeout(STOP_TIMEOUT_MS)
    });
  } catch {
    // the server ends the stream by itself once its media stops arriving
  }
};

const publishWhipOffer = async (
  serverUrl: string,
  streamKey: string,
  offerSdp: string
): Promise<TWhipPublishResult> => {
  await stopWhipSession();

  let url: URL;

  try {
    url = new URL(serverUrl);
  } catch {
    return { ok: false, status: 0, message: 'The server URL is not valid.' };
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/sdp',
        Authorization: `Bearer ${streamKey}`,
        'User-Agent': `MOPSCORD-Stream/${app.getVersion()}`
      },
      body: offerSdp,
      signal: AbortSignal.timeout(PUBLISH_TIMEOUT_MS)
    });

    const body = await response.text();

    if (response.status !== 201) {
      return {
        ok: false,
        status: response.status,
        message: body.trim() || `The server answered ${response.status}.`
      };
    }

    const location = response.headers.get('location');

    if (location) {
      currentSession = {
        location: new URL(location, url).toString(),
        streamKey
      };
    }

    return { ok: true, answerSdp: body };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      message: `Couldn't reach the server: ${getErrorText(error)}`
    };
  }
};

export { publishWhipOffer, stopWhipSession };
