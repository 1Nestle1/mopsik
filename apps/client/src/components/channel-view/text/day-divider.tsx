import { useDateLocale } from '@/hooks/use-date-locale';
import { format } from 'date-fns';
import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { getDayDividerLabel } from './day-divider-label';

type TDayDividerProps = {
  timestamp: number;
};

const DayDivider = memo(({ timestamp }: TDayDividerProps) => {
  const { t } = useTranslation('common');
  const dateLocale = useDateLocale();

  const label = useMemo(() => {
    const date = new Date(timestamp);
    const dayLabel = getDayDividerLabel(date);

    if (dayLabel.kind === 'today') return t('dayToday');
    if (dayLabel.kind === 'yesterday') return t('dayYesterday');

    return format(date, dayLabel.pattern, { locale: dateLocale });
  }, [timestamp, dateLocale, t]);

  return (
    <div
      role="separator"
      aria-label={label}
      className="flex items-center gap-3 px-2 pt-2"
    >
      <div className="h-px flex-1 bg-border" />
      <span className="text-xs font-medium text-muted-foreground first-letter:uppercase">
        {label}
      </span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
});

export { DayDivider };
