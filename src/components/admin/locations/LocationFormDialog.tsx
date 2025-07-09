import { useState, useEffect } from 'react';
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

const locationSchema = z.object({
  name: z.string().min(1, 'Navn må fylles ut'),
  address: z.string().min(1, 'Adresse må fylles ut'),
  description: z.string().optional(),
  imageUrl: z.string().url('Ugyldig URL').optional().or(z.literal('')),
  recommendedEquipment: z.string().optional(),
  maintenanceFrequency: z.coerce.number().min(1, 'Frekvens må være større enn 0'),
  edgeCuttingFrequency: z.coerce.number().min(1, 'Frekvens må være større enn 0'),
  startWeek: z.coerce.number().min(1, 'Oppstartsuke må være mellom 1 og 52').max(52, 'Oppstartsuke må være mellom 1 og 52'),
  notes: z.string().optional(),
});

export type LocationFormValues = z.infer<typeof locationSchema>;

interface LocationFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: LocationFormValues) => Promise<void>;
  loading: boolean;
  initialData?: Partial<LocationFormValues>;
  isNew?: boolean;
}

export const LocationFormDialog = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  loading, 
  initialData,
  isNew = false 
}: LocationFormDialogProps) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LocationFormValues>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      name: '',
      address: '',
      maintenanceFrequency: 2,
      edgeCuttingFrequency: 4,
      startWeek: 18,
      notes: '',
    },
  });

  // Reset form when dialog opens with proper data
  useEffect(() => {
    if (isOpen) {
      if (isNew) {
        // Reset to default values for new location
        reset({
          name: '',
          address: '',
          description: '',
          imageUrl: '',
          recommendedEquipment: '',
          maintenanceFrequency: 2,
          edgeCuttingFrequency: 4,
          startWeek: 18,
          notes: '',
        });
      } else if (initialData) {
        // Reset with existing location data for editing
        reset({
          name: initialData.name || '',
          address: initialData.address || '',
          description: initialData.description || '',
          imageUrl: initialData.imageUrl || '',
          recommendedEquipment: initialData.recommendedEquipment || '',
          maintenanceFrequency: initialData.maintenanceFrequency || 2,
          edgeCuttingFrequency: initialData.edgeCuttingFrequency || 4,
          startWeek: initialData.startWeek || 18,
          notes: initialData.notes || '',
        });
      }
    }
  }, [isOpen, isNew, initialData, reset]);

  const handleFormSubmit = async (data: LocationFormValues) => {
    try {
      await onSubmit(data);
      onClose();
    } catch (error) {
      // Error handling is done in parent component
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isNew ? 'Legg til nytt sted' : 'Rediger sted'}
          </DialogTitle>
          <DialogDescription>
            {isNew 
              ? 'Fyll ut informasjon om det nye stedet.' 
              : 'Oppdater informasjon om stedet.'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Navn *</Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="Navn på stedet"
              />
              {errors.name && (
                <p className="text-sm text-destructive mt-1">{errors.name.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="address">Adresse *</Label>
              <Input
                id="address"
                {...register('address')}
                placeholder="Adresse til stedet"
              />
              {errors.address && (
                <p className="text-sm text-destructive mt-1">{errors.address.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="description">Beskrivelse</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Kort beskrivelse av stedet"
                className="h-20"
              />
              {errors.description && (
                <p className="text-sm text-destructive mt-1">{errors.description.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="imageUrl">Bilde URL</Label>
              <Input
                id="imageUrl"
                {...register('imageUrl')}
                placeholder="https://example.com/image.jpg"
              />
              {errors.imageUrl && (
                <p className="text-sm text-destructive mt-1">{errors.imageUrl.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="recommendedEquipment">Anbefalt utstyr</Label>
              <Textarea
                id="recommendedEquipment"
                {...register('recommendedEquipment')}
                placeholder="F.eks. Stor sitteklipper, mindre håndklipper for kantklipping, løvblåser"
                className="h-20"
              />
              {errors.recommendedEquipment && (
                <p className="text-sm text-destructive mt-1">{errors.recommendedEquipment.message}</p>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <Label htmlFor="maintenanceFrequency">
                  Frekvens Klipping (uker) *
                </Label>
                <Input
                  id="maintenanceFrequency"
                  type="number"
                  min="1"
                  {...register('maintenanceFrequency')}
                />
                {errors.maintenanceFrequency && (
                  <p className="text-sm text-destructive mt-1">{errors.maintenanceFrequency.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="edgeCuttingFrequency">
                  Frekvens kantklipping (uker) *
                </Label>
                <Input
                  id="edgeCuttingFrequency"
                  type="number"
                  min="1"
                  {...register('edgeCuttingFrequency')}
                />
                {errors.edgeCuttingFrequency && (
                  <p className="text-sm text-destructive mt-1">{errors.edgeCuttingFrequency.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="startWeek">Oppstartsuke *</Label>
                <Input
                  id="startWeek"
                  type="number"
                  min="1"
                  max="52"
                  {...register('startWeek')}
                />
                {errors.startWeek && (
                  <p className="text-sm text-destructive mt-1">{errors.startWeek.message}</p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notater og instrukser</Label>
              <Textarea
                id="notes"
                {...register('notes')}
                placeholder="Skriv eventuelle merknader eller instrukser her"
                className="h-32"
              />
              {errors.notes && (
                <p className="text-sm text-destructive mt-1">{errors.notes.message}</p>
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-4 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Avbryt
            </Button>
            <Button type="submit" disabled={loading}>
              {loading 
                ? (isNew ? 'Oppretter...' : 'Lagrer...') 
                : (isNew ? 'Opprett sted' : 'Lagre endringer')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};