import { describe, expect, test } from 'bun:test';
import { subDays, subYears } from 'date-fns';
import { getDayDividerLabel } from '../day-divider-label';

describe('getDayDividerLabel', () => {
  test('should call today and yesterday by name', () => {
    const now = new Date();

    expect(getDayDividerLabel(now, now)).toEqual({ kind: 'today' });
    expect(getDayDividerLabel(subDays(now, 1), now)).toEqual({
      kind: 'yesterday'
    });
  });

  test('should leave the year out for dates in the current year', () => {
    const now = new Date(new Date().getFullYear(), 11, 31, 12);
    const earlier = new Date(now.getFullYear(), 0, 2, 12);

    expect(getDayDividerLabel(earlier, now)).toEqual({
      kind: 'date',
      pattern: 'EEEE, d MMMM'
    });
  });

  test('should add the year for older dates', () => {
    const now = new Date();

    expect(getDayDividerLabel(subYears(now, 1), now)).toEqual({
      kind: 'date',
      pattern: 'EEEE, d MMMM yyyy'
    });
  });
});
