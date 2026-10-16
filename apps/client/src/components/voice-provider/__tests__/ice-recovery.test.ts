import { afterAll, describe, expect, test } from 'bun:test';
import type { AppData, IceParameters, Transport } from 'mediasoup-client/types';

// the voice logger listens for network and visibility changes as soon as it loads, so it
// needs something to attach to outside a browser. imported after, for the same reason
const browserStandIn = { addEventListener: () => {} };
const originalWindow = globalThis.window;
const originalDocument = globalThis.document;

Object.assign(globalThis, {
  window: originalWindow ?? browserStandIn,
  document: originalDocument ?? browserStandIn
});

const { createIceRecovery } = await import('../ice-recovery');

// every test file shares the process, and the next one must not find a fake browser
afterAll(() => {
  Object.assign(globalThis, {
    window: originalWindow,
    document: originalDocument
  });
});

const ICE_PARAMETERS: IceParameters = {
  usernameFragment: 'fresh',
  password: 'secret',
  iceLite: true
};

const GRACE_MS = 20;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const createFakeTransport = () => {
  const restarts: IceParameters[] = [];

  const transport = {
    closed: false,
    restartIce: async ({ iceParameters }: { iceParameters: IceParameters }) => {
      restarts.push(iceParameters);
    }
  } as unknown as Transport<AppData>;

  return { transport, restarts };
};

const setup = (options?: { failRequests?: boolean }) => {
  const { transport, restarts } = createFakeTransport();
  let requests = 0;
  let exhausted = 0;

  const recovery = createIceRecovery({
    direction: 'consumer',
    getTransport: () => transport,
    requestIceParameters: async () => {
      requests += 1;

      if (options?.failRequests) {
        throw new Error('no server connection');
      }

      return ICE_PARAMETERS;
    },
    onExhausted: () => {
      exhausted += 1;
    },
    graceMs: GRACE_MS
  });

  return {
    transport,
    restarts,
    recovery,
    getRequests: () => requests,
    getExhausted: () => exhausted
  };
};

describe('ice recovery', () => {
  test('should restart at once when the transport fails', async () => {
    const { recovery, restarts } = setup();

    recovery.onConnectionStateChange('failed');
    await wait(0);

    expect(restarts).toEqual([ICE_PARAMETERS]);
  });

  test('should give a disconnected transport time to heal by itself', async () => {
    const { recovery, getRequests } = setup();

    recovery.onConnectionStateChange('disconnected');
    await wait(GRACE_MS / 2);
    recovery.onConnectionStateChange('connected');
    await wait(GRACE_MS * 2);

    expect(getRequests()).toBe(0);
  });

  test('should restart a transport that stays disconnected', async () => {
    const { recovery, restarts } = setup();

    recovery.onConnectionStateChange('disconnected');
    await wait(GRACE_MS * 2);

    expect(restarts).toHaveLength(1);
  });

  test('should give up after three restarts that did not bring it back', async () => {
    const { recovery, getRequests, getExhausted } = setup();

    for (let i = 0; i < 4; i++) {
      recovery.onConnectionStateChange('failed');
      await wait(0);
    }

    expect(getRequests()).toBe(3);
    expect(getExhausted()).toBe(1);
  });

  test('should start counting again once the transport recovers', async () => {
    const { recovery, getRequests, getExhausted } = setup();

    for (let i = 0; i < 3; i++) {
      recovery.onConnectionStateChange('failed');
      await wait(0);
    }

    recovery.onConnectionStateChange('connected');
    recovery.onConnectionStateChange('failed');
    await wait(0);

    expect(getRequests()).toBe(4);
    expect(getExhausted()).toBe(0);
  });

  test('should give up when the server cannot be asked for new credentials', async () => {
    const { recovery, restarts, getExhausted } = setup({ failRequests: true });

    recovery.onConnectionStateChange('failed');
    await wait(0);

    expect(restarts).toEqual([]);
    expect(getExhausted()).toBe(1);
  });

  test('should leave a closed transport alone', async () => {
    const { recovery, transport, getRequests } = setup();

    (transport as { closed: boolean }).closed = true;

    recovery.onConnectionStateChange('failed');
    await wait(0);

    expect(getRequests()).toBe(0);
  });

  test('should cancel a pending restart when disposed', async () => {
    const { recovery, getRequests } = setup();

    recovery.onConnectionStateChange('disconnected');
    recovery.dispose();
    await wait(GRACE_MS * 2);

    expect(getRequests()).toBe(0);
  });
});
