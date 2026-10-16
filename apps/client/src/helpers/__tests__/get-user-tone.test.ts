import { describe, expect, test } from 'bun:test';
import { getUserTone, getUserToneHue } from '../get-user-tone';

const ACCENT_HUE = 182;

describe('getUserTone', () => {
  test('should give the same person the same tone every time', () => {
    expect(getUserTone(7)).toBe(getUserTone(7));
  });

  test('should spread neighbouring ids over different hues', () => {
    const hues = new Set([1, 2, 3, 4, 5, 6, 7, 8].map(getUserToneHue));

    expect(hues.size).toBe(8);
  });

  test('should never hand out the accent hue', () => {
    for (let userId = 0; userId < 64; userId++) {
      expect(Math.abs(getUserToneHue(userId) - ACCENT_HUE)).toBeGreaterThan(20);
    }
  });

  test('should cope with ids that are not small positive integers', () => {
    expect(getUserTone(-3)).toBe(getUserTone(3));
    expect(getUserTone(1_000_003)).toStartWith('oklch(');
  });
});
