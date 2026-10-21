import { describe, expect, test } from 'bun:test';
import { isAllowedPushEndpoint } from '../push-endpoint';

describe('isAllowedPushEndpoint', () => {
  test('should accept the push services of the major browsers', () => {
    expect(
      isAllowedPushEndpoint('https://fcm.googleapis.com/fcm/send/abc')
    ).toBe(true);
    expect(
      isAllowedPushEndpoint(
        'https://updates.push.services.mozilla.com/wpush/v2/abc'
      )
    ).toBe(true);
    expect(
      isAllowedPushEndpoint(
        'https://wns2-par02p.notify.windows.com/w/?token=abc'
      )
    ).toBe(true);
    expect(isAllowedPushEndpoint('https://web.push.apple.com/abc')).toBe(true);
  });

  test('should refuse any other host', () => {
    expect(isAllowedPushEndpoint('https://localhost/push')).toBe(false);
    expect(isAllowedPushEndpoint('https://192.168.1.10/push')).toBe(false);
    expect(isAllowedPushEndpoint('https://example.com/push')).toBe(false);
  });

  test('should refuse a host that only ends with a push service name', () => {
    expect(isAllowedPushEndpoint('https://evilfcm.googleapis.com/push')).toBe(
      false
    );
    expect(
      isAllowedPushEndpoint('https://fcm.googleapis.com.evil.example/push')
    ).toBe(false);
  });

  test('should refuse plain http and custom ports', () => {
    expect(
      isAllowedPushEndpoint('http://fcm.googleapis.com/fcm/send/abc')
    ).toBe(false);
    expect(
      isAllowedPushEndpoint('https://fcm.googleapis.com:8443/fcm/send/abc')
    ).toBe(false);
  });

  test('should refuse something that is not a url', () => {
    expect(isAllowedPushEndpoint('not a url')).toBe(false);
  });
});
