import { describe, expect, test } from 'bun:test';
import {
  getMicFailureStatus,
  isMicUnavailable,
  MIC_FAILURE_COPY_KEYS,
  MicStatus
} from '../mic-status';
import { ProduceDeniedError } from '../produce-denied-error';

const domError = (name: string) => new DOMException('mic failed', name);

describe('mic status', () => {
  test('should read a denied permission as blocked', () => {
    expect(getMicFailureStatus(domError('NotAllowedError'))).toBe(
      MicStatus.BLOCKED
    );
    expect(getMicFailureStatus(domError('SecurityError'))).toBe(
      MicStatus.BLOCKED
    );
  });

  test('should read a missing or unmatched device as not found', () => {
    expect(getMicFailureStatus(domError('NotFoundError'))).toBe(
      MicStatus.NOT_FOUND
    );
    // a saved microphone id that is no longer plugged in fails the exact deviceId constraint
    expect(getMicFailureStatus(domError('OverconstrainedError'))).toBe(
      MicStatus.NOT_FOUND
    );
  });

  test('should read a device another app holds as busy', () => {
    expect(getMicFailureStatus(domError('NotReadableError'))).toBe(
      MicStatus.BUSY
    );
    expect(getMicFailureStatus(domError('AbortError'))).toBe(MicStatus.BUSY);
  });

  test('should map the legacy chrome error names the same way', () => {
    expect(getMicFailureStatus(domError('PermissionDeniedError'))).toBe(
      MicStatus.BLOCKED
    );
    expect(getMicFailureStatus(domError('DevicesNotFoundError'))).toBe(
      MicStatus.NOT_FOUND
    );
    expect(getMicFailureStatus(domError('TrackStartError'))).toBe(
      MicStatus.BUSY
    );
  });

  test('should fall back to failed for anything it does not recognise', () => {
    expect(getMicFailureStatus(new Error('transport gone'))).toBe(
      MicStatus.FAILED
    );
    expect(getMicFailureStatus('a string')).toBe(MicStatus.FAILED);
    expect(getMicFailureStatus(undefined)).toBe(MicStatus.FAILED);
  });

  test('should not treat a refused track as a device problem', () => {
    // the provider checks this type before classifying, so it must keep its own name
    const error = new ProduceDeniedError('no permission');

    expect(error).toBeInstanceOf(ProduceDeniedError);
    expect(error.name).toBe('ProduceDeniedError');
    expect(getMicFailureStatus(error)).toBe(MicStatus.FAILED);
  });

  test('should only call the failure states unavailable', () => {
    expect(isMicUnavailable(MicStatus.IDLE)).toBe(false);
    expect(isMicUnavailable(MicStatus.ACTIVE)).toBe(false);

    for (const status of Object.keys(MIC_FAILURE_COPY_KEYS)) {
      expect(isMicUnavailable(status as MicStatus)).toBe(true);
    }
  });

  test('should have copy for every failure state', () => {
    const failureStatuses = Object.values(MicStatus).filter(isMicUnavailable);

    expect(Object.keys(MIC_FAILURE_COPY_KEYS).sort()).toEqual(
      [...failureStatuses].sort()
    );
  });
});
