import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, MinusCircle } from 'lucide-react';
import { Mower } from '@/types';

const mowerSchema = z.object({
  name: z.string().min(1, 'Navn må fylles ut'),
  model: z.string().min(1, 'Modell må fylles ut'),
  serialNumber: z.string().min(1, 'Serienummer må fylles ut'),
  serviceIntervals: z.array(z.object({
    description: z.string().min(1, 'Beskrivelse må fylles ut'),
    hourInterval: z.coerce.number().min(1, 'Intervall må være større enn 0'),
  })),
});

type MowerFormValues = z.infer<typeof mowerSchema>;

interface AddMowerDialogProps {
  onSubmit: (data: MowerFormValues) => Promise<void>;
  loading: boolean;
}

export const AddMowerDialog = ({ onSubmit, loading }: AddMowerDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MowerFormValues>({
    resolver: zodResolver(mowerSchema),
    defaultValues: {
      serviceIntervals: [{ description: '', hourInterval: 100 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "serviceIntervals",
  });

  const handleFormSubmit = async (data: MowerFormValues) => {
    try {
      await onSubmit(data);
      reset();
      setIsOpen(false);
    } catch (error) {
      // Error handling is done in parent component
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Legg til ny gressklipper
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Legg til ny gressklipper</DialogTitle>
          <DialogDescription>
            Fyll ut informasjon om den nye gressklipperen og definer serviceintervaller.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Input
              placeholder="Navn"
              {...register('name')}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Input
              placeholder="Modell"
              {...register('model')}
            />
            {errors.model && (
              <p className="text-sm text-destructive">{errors.model.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Input
              placeholder="Serienummer"
              {...register('serialNumber')}
            />
            {errors.serialNumber && (
              <p className="text-sm text-destructive">{errors.serialNumber.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Serviceintervaller</h4>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ description: '', hourInterval: 100 })}
              >
                <Plus className="mr-2 h-4 w-4" />
                Legg til intervall
              </Button>
            </div>
            
            <div className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="relative">
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Beskrivelse"
                      {...register(`serviceIntervals.${index}.description`)}
                    />
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Timer"
                        {...register(`serviceIntervals.${index}.hourInterval`)}
                      />
                      {index > 0 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => remove(index)}
                        >
                          <MinusCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  {errors.serviceIntervals?.[index]?.description && (
                    <p className="text-sm text-destructive mt-1">
                      {errors.serviceIntervals[index]?.description?.message}
                    </p>
                  )}
                  {errors.serviceIntervals?.[index]?.hourInterval && (
                    <p className="text-sm text-destructive mt-1">
                      {errors.serviceIntervals[index]?.hourInterval?.message}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset();
                setIsOpen(false);
              }}
            >
              Avbryt
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Legger til...' : 'Legg til gressklipper'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};