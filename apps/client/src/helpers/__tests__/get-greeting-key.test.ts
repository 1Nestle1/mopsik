import { describe, expect, test } from 'bun:test';
import { getGreetingKey } from '../get-greeting-key';

describe('getGreetingKey', () => {
  test('should greet by the part of the day', () => {
    expect(getGreetingKey(8)).toBe('loungeGreetingMorning');
    expect(getGreetingKey(14)).toBe('loungeGreetingAfternoon');
    expect(getGreetingKey(20)).toBe('loungeGreetingEvening');
    expect(getGreetingKey(2)).toBe('loungeGreetingNight');
  });

  test('should switch exactly on the boundaries', () => {
    expect(getGreetingKey(4)).toBe('loungeGreetingNight');
    expect(getGreetingKey(5)).toBe('loungeGreetingMorning');
    expect(getGreetingKey(12)).toBe('loungeGreetingAfternoon');
    expect(getGreetingKey(18)).toBe('loungeGreetingEvening');
    expect(getGreetingKey(23)).toBe('loungeGreetingNight');
  });
});
