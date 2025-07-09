import React from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, Timer } from 'lucide-react';
import { formatDateToShortLocale } from '@/lib/utils';

interface TimeEntryHeaderProps {
  currentWeek: number;
  weekDates: { start: Date; end: Date };
}

export const TimeEntryHeader = React.memo(({ currentWeek, weekDates }: TimeEntryHeaderProps) => {
  const { t } = useTranslation();

  return (
    <div className="text-center space-y-4 py-6">
      <div className="inline-flex items-center justify-center p-3 rounded-full bg-primary/10 mb-4">
        <Timer className="h-8 w-8 text-primary" />
      </div>
      <h1 className="text-2xl font-bold text-foreground">
        {t('timeEntry.title')}
      </h1>
      <div className="flex items-center justify-center space-x-3 text-sm text-muted-foreground bg-card/60 rounded-full px-4 py-2 backdrop-blur-sm border">
        <Calendar className="h-4 w-4 text-primary" />
        <span className="font-medium">{t('common.week')} {currentWeek}</span>
        <span className="text-muted-foreground/50">•</span>
        <span>({formatDateToShortLocale(weekDates.start)} - {formatDateToShortLocale(weekDates.end)})</span>
      </div>
    </div>
  );
});

TimeEntryHeader.displayName = 'TimeEntryHeader';