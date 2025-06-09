import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface AddIntervalDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { description: string; hourInterval: number }) => Promise<void>;
  loading: boolean;
}

export const AddIntervalDialog = ({ isOpen, onClose, onSubmit, loading }: AddIntervalDialogProps) => {
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    const formData = new FormData(event.currentTarget);
    const description = formData.get('description') as string;
    const hourInterval = parseInt(formData.get('hourInterval') as string);

    if (!description || !hourInterval) {
      return;
    }

    try {
      await onSubmit({ description, hourInterval });
      onClose();
    } catch (error) {
      // Error handling is done in parent component
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Legg til nytt serviceintervall</DialogTitle>
          <DialogDescription>
            Fyll ut informasjon om det nye serviceintervallet.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Input
              name="description"
              placeholder="Beskrivelse"
              required
            />
          </div>

          <div className="space-y-2">
            <Input
              name="hourInterval"
              type="number"
              placeholder="Timer mellom service"
              min="1"
              required
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
              {loading ? 'Legger til...' : 'Legg til intervall'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};