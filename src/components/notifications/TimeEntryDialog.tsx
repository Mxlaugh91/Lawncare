import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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

const timeEntrySchema = z.object({
  hours: z.coerce.number({
    required_error: 'Tidsbruk må fylles ut',
  }).min(0.1, 'Tidsbruk må være større enn 0'),
  edgeCuttingDone: z.boolean().default(false),
  notes: z.string().optional(),
});

type TimeEntryFormValues = z.infer<typeof timeEntrySchema>;

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
  const [loading, setLoading] = useState(false);

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

      // Add new time entry
      await timeEntryService.addTimeEntry({
        locationId,
        employeeId: currentUser.uid,
        employeeName: currentUser.displayName || currentUser.email || 'Ukjent',
        date: new Date(),
        hours: data.hours,
        edgeCuttingDone: data.edgeCuttingDone,
        notes: data.notes,
      });

      // Mark notification as read
      await notificationService.markNotificationAsRead(notificationId);

      toast({
        title: 'Timer registrert',
        description: `Timer ble registrert for ${locationName}`,
      });

      reset();
      onClose();
    } catch (error) {
      console.error('Error submitting time entry:', error);
      toast({
        title: 'Feil',
        description: 'Kunne ikke registrere timer. Prøv igjen senere.',
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
          <DialogTitle>Registrer timer for {locationName}</DialogTitle>
          <DialogDescription>
            Du har blitt tagget i en jobb. Registrer dine timer her.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="hours">Tidsbruk (timer) *</Label>
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
            <Label htmlFor="edgeCuttingDone">Kantklipping utført</Label>
          </div>

          <div>
            <Label htmlFor="notes">Notater</Label>
            <Textarea
              id="notes"
              placeholder="Skriv eventuelle merknader her"
              {...register('notes')}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Avbryt
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Lagrer...' : 'Registrer timer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}