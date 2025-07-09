import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
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
import * as timeEntryService from '@/services/timeEntryService';
import * as notificationService from '@/services/notificationService';

interface TimeEntryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  notificationId: string;
  locationId: string;
  locationName: string;
  timeEntryId: string;
}

export function TimeEntryDialog({
  isOpen,
  onClose,
  notificationId,
  locationId,
  locationName,
  timeEntryId,
}: TimeEntryDialogProps) {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const timeEntrySchema = z.object({
    hours: z.coerce.number({
      required_error: t('timeEntry.hoursRequired'),
    }).min(0.1, t('timeEntry.hoursMinimum')),
    edgeCuttingDone: z.boolean().default(false),
    notes: z.string().optional(),
  });

  type TimeEntryFormValues = z.infer<typeof timeEntrySchema>;

  const {
    register,
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

      // Add new time entry with Firebase Timestamp
      await timeEntryService.addTimeEntry({
        locationId,
        employeeId: currentUser.uid,
        employeeName: currentUser.displayName || currentUser.email || 'Ukjent',
        date: Timestamp.fromDate(new Date()),
        hours: data.hours,
        edgeCuttingDone: data.edgeCuttingDone,
        notes: data.notes,
      });

      // Mark notification as read
      await notificationService.markNotificationAsRead(notificationId);

      toast({
        title: t('timeEntry.timeRegistered'),
        description: t('timeEntry.timeRegisteredFor', { location: locationName }),
      });

      reset();
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
          <DialogTitle>{t('timeEntry.registerHoursFor', { location: locationName })}</DialogTitle>
          <DialogDescription>
            {t('timeEntry.youHaveBeenTagged')}
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
              placeholder="0.0"
              {...register('hours')}
            />
            {errors.hours && (
              <p className="text-sm text-destructive mt-1">{errors.hours.message}</p>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="edgeCuttingDone"
              {...register('edgeCuttingDone')}
            />
            <Label htmlFor="edgeCuttingDone">{t('timeEntry.edgeCutting')}</Label>
          </div>

          <div>
            <Label htmlFor="notes">{t('common.notes')}</Label>
            <Textarea
              id="notes"
              placeholder={t('timeEntry.notesPlaceholder')}
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