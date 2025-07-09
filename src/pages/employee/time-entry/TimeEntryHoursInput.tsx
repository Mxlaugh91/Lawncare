import React from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UseFormRegister, FieldErrors } from 'react-hook-form';

interface TimeEntryHoursInputProps {
  selectedHours: number;
  onQuickHourSelect: (hours: number) => void;
  register: UseFormRegister<any>;
  errors: FieldErrors<any>;
}

const quickHours = [0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 8];

export const TimeEntryHoursInput = React.memo(({ 
  selectedHours, 
  onQuickHourSelect, 
  register, 
  errors 
}: TimeEntryHoursInputProps) => {
  const { t } = useTranslation();

  return (
    <Card className="card-hover">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center text-lg font-semibold">
          <div className="p-2 rounded-full bg-primary/10 mr-3">
            <Clock className="h-5 w-5 text-primary" />
          </div>
          {t('timeEntry.timeUsed')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <Label htmlFor="hours" className="text-base font-medium">{t('timeEntry.timeUsedRequired')}</Label>
          
          {/* Quick hour buttons */}
          <div className="grid grid-cols-5 gap-2 mb-4">
            {quickHours.map((hour) => (
              <Button
                key={hour}
                type="button"
                variant={selectedHours === hour ? "default" : "outline"}
                size="sm"
                className={`h-10 text-sm font-medium transition-all duration-200 button-effect ${
                  selectedHours === hour 
                    ? 'bg-primary text-primary-foreground shadow-md scale-105' 
                    : 'hover:bg-primary/10 hover:border-primary/50'
                }`}
                onClick={() => onQuickHourSelect(hour)}
              >
                {hour}h
              </Button>
            ))}
          </div>
          
          <Input
            id="hours"
            type="number"
            step="0.25"
            min="0.25"
            placeholder={t('timeEntry.timeUsedPlaceholder')}
            className="h-14 text-lg border-2 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
            {...register('hours')}
          />
          {errors.hours && (
            <p className="text-sm text-destructive flex items-center animate-in slide-in-from-left-2 duration-300">
              <AlertCircle className="mr-2 h-4 w-4" />
              {errors.hours.message}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

TimeEntryHoursInput.displayName = 'TimeEntryHoursInput';