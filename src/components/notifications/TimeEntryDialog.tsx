import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { z } from 'zod';
import { Timestamp } from 'firebase/firestore';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Notification } from '@/types';
import * as timeEntryService from '@/services/timeEntryService';
import * as notificationService from '@/services/notificationService';

/**
 * Mirrors the mapping in NotificationBell: notification text is rendered from
 * i18n keys derived from `type` + `data`, falling back to the stored
 * title/message for legacy documents.
 */
const NOTIFICATION_TITLE_KEYS: Partial<Record<Notification['type'], string>> = {
  job_tagged: 'notifications.jobTagged',
  time_entry_reminder: 'notifications.timeEntryReminder',
  manual_job_reminder: 'notifications.manualJobReminder',
  service_needed: 'notifications.serviceNeeded',
};

const getNotificationTitle = (t: TFunction, notification: Notification): string => {
  const key = NOTIFICATION_TITLE_KEYS[notification.type];
  return key ? t(key) : notification.title;
};

const getNotificationMessage = (t: TFunction, notification: Notification): string => {
  const { type, data } = notification;

  switch (type) {
    case 'job_tagged': {
      const location = data?.locationName;
      return location
        ? t('notifications.jobTaggedDescription', { location })
        : notification.message;
    }
    case 'time_entry_reminder': {
      const count = data?.pendingEntries;
      return typeof count === 'number'
        ? t('notifications.timeEntryReminderDescription', { count })
        : notification.message;
    }
    case 'manual_job_reminder':
      return t('notifications.manualJobReminderDescription');
    case 'service_needed':
      return t('notifications.serviceNeededDescription');
    default:
      return notification.message;
  }
};

interface TimeEntryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  notificationId: string;
  locationId: string;
  locationName: string;
  /** Source notification; its type/data drive the localized dialog text. */
  notification?: Notification | null;
}

export function TimeEntryDialog({
  isOpen,
  onClose,
  onSuccess,
  notificationId,
  locationId,
  locationName,
  notification,
}: TimeEntryDialogProps) {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  // Localized notification text (title/message) with stored-text fallback.
  const localizedTitle = notification ? getNotificationTitle(t, notification) : null;
  const localizedMessage = notification ? getNotificationMessage(t, notification) : null;

  const timeEntrySchema = z.object({
    hours: z.coerce.number({
      required_error: t('timeEntry.hoursRequired'),
    })
      .gt(0, t('timeEntry.hoursMinimum'))
      .max(timeEntryService.MAX_TIME_ENTRY_HOURS, {
        message: t('timeEntry.hoursMaximum', { defaultValue: 'Tidsbruk kan ikke overstige 24 timer' }),
      }),
    edgeCuttingDone: z.boolean().default(false),
    notes: z.string().optional(),
  });

  type TimeEntryFormValues = z.infer<typeof timeEntrySchema>;

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TimeEntryFormValues>({
    resolver: zodResolver(timeEntrySchema),
    defaultValues: {
      hours: undefined,
      edgeCuttingDone: false,
      notes: '',
    },
  });

  const onSubmit = async (data: TimeEntryFormValues) => {
    if (!currentUser) return;
    
    try {
      setLoading(true);

      // Add new time entry with Firebase Timestamp. Only rule-allowed fields
      // are persisted (names are resolved from userDirectory at read time).
      await timeEntryService.addTimeEntry({
        locationId,
        employeeId: currentUser.uid,
        date: Timestamp.fromDate(new Date()),
        hours: data.hours,
        edgeCuttingDone: data.edgeCuttingDone,
        notes: data.notes,
      });

      // Marking the notification as read is best-effort: the time entry is
      // already saved, so a failure here must not trigger a retry (which would
      // create a duplicate entry).
      try {
        await notificationService.markNotificationAsRead(notificationId);
      } catch (notificationError) {
        console.error('Could not mark notification as read:', notificationError);
      }

      toast({
        title: t('timeEntry.timeRegistered'),
        description: t('timeEntry.timeRegisteredFor', { location: locationName }),
      });

      reset();
      
      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }
      
      onClose();
    } catch (error) {
      console.error('Error submitting time entry:', error);
      toast({
        title: t('common.error'),
        description: t('errors.couldNotSaveData'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {localizedTitle || t('timeEntry.registerHoursFor', { location: locationName })}
          </DialogTitle>
          <DialogDescription>
            {localizedMessage || t('timeEntry.youHaveBeenTagged')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="hours">{t('timeEntry.timeUsedRequired')}</Label>
            <Input
              id="hours"
              type="number"
              step="0.5"
              min="0.5"
              max={timeEntryService.MAX_TIME_ENTRY_HOURS}
              placeholder="0.0"
              {...register('hours')}
            />
            {errors.hours && (
              <p className="text-sm text-destructive mt-1">{errors.hours.message}</p>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Controller
              name="edgeCuttingDone"
              control={control}
              render={({ field }) => (
                <Switch
                  id="edgeCuttingDone"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
            <Label htmlFor="edgeCuttingDone">{t('timeEntry.edgeCutting')}</Label>
          </div>

          <div>
            <Label htmlFor="notes">{t('common.notes')}</Label>
            <Textarea
              id="notes"
              placeholder={t('timeEntry.notesPlaceholder')}
              maxLength={timeEntryService.MAX_TIME_ENTRY_NOTES_LENGTH}
              {...register('notes')}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t('common.saving') : t('notifications.registerHours')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
