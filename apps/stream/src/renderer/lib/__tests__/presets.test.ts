import { describe, expect, test } from 'bun:test';
import { Resolution } from '../../../shared/types';
import {
  getCaptureSize,
  getMatchingPreset,
  getWindowHandle,
  QUALITY_PRESETS,
  SOURCE_MAX_SIZE
} from '../presets';

describe('getMatchingPreset', () => {
  test('should find the preset the settings came from', () => {
    const preset = getMatchingPreset({
      resolution: Resolution.P1080,
      frameRate: 60,
      videoBitrateKbps: 8000
    });

    expect(preset?.id).toBe('best');
  });

  test('should find nothing once one value was tweaked by hand', () => {
    const preset = getMatchingPreset({
      resolution: Resolution.P1080,
      frameRate: 60,
      videoBitrateKbps: 8500
    });

    expect(preset).toBeUndefined();
  });

  test('should give every preset its own combination', () => {
    const keys = new Set(
      QUALITY_PRESETS.map(
        ({ resolution, frameRate, videoBitrateKbps }) =>
          `${resolution}/${frameRate}/${videoBitrateKbps}`
      )
    );

    expect(keys.size).toBe(QUALITY_PRESETS.length);
  });
});

describe('getCaptureSize', () => {
  test('should cap a fixed resolution at its size', () => {
    expect(getCaptureSize(Resolution.P720)).toEqual({
      width: 1280,
      height: 720
    });
  });

  test('should cap source size at 4k', () => {
    expect(getCaptureSize(Resolution.SOURCE)).toEqual(SOURCE_MAX_SIZE);
  });
});

describe('getWindowHandle', () => {
  test('should read the handle out of a window source id', () => {
    expect(getWindowHandle('window:5114600:0')).toBe(5114600);
  });

  test('should give nothing for a screen', () => {
    expect(getWindowHandle('screen:0:0')).toBeUndefined();
  });

  test('should give nothing for a malformed id', () => {
    expect(getWindowHandle('window:abc:0')).toBeUndefined();
    expect(getWindowHandle('window')).toBeUndefined();
  });
});
