import { isSameDay, isSameYear, subDays } from 'date-fns';

type TDayDividerLabel =
  | { kind: 'today' }
  | { kind: 'yesterday' }
  | { kind: 'date'; pattern: string };

// the year only shows up once it is not this year, the way people say dates out loud
const getDayDividerLabel = (
  date: Date,
  now: Date = new Date()
): TDayDividerLabel => {
  if (isSameDay(date, now)) return { kind: 'today' };
  if (isSameDay(date, subDays(now, 1))) return { kind: 'yesterday' };

  return {
    kind: 'date',
    pattern: isSameYear(date, now) ? 'EEEE, d MMMM' : 'EEEE, d MMMM yyyy'
  };
};

export { getDayDividerLabel, type TDayDividerLabel };
