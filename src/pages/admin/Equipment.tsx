import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Search, Plus, AlertCircle, CheckCircle2, History, Trash2, MinusCircle } from 'lucide-react';
import { Mower, ServiceInterval } from '@/types';
import * as equipmentService from '@/services/equipmentService';
import { useToast } from '@/hooks/use-toast';

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

const AdminEquipment = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [mowers, setMowers] = useState<Mower[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredMowers, setFilteredMowers] = useState<Mower[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedMowerId, setSelectedMowerId] = useState<string | null>(null);
  const [isAddIntervalDialogOpen, setIsAddIntervalDialogOpen] = useState(false);

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

  useEffect(() => {
    const fetchMowers = async () => {
      try {
        setLoading(true);
        const mowerData = await equipmentService.getAllMowers();
        setMowers(mowerData);
        setFilteredMowers(mowerData);
      } catch (error) {
        console.error('Error fetching mowers:', error);
        toast({
          title: 'Feil',
          description: 'Kunne ikke hente gressklippere. Prøv igjen senere.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchMowers();
  }, [toast]);

  useEffect(() => {
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      const filtered = mowers.filter(
        (mower) => 
          mower.name.toLowerCase().includes(lowerQuery) || 
          mower.model.toLowerCase().includes(lowerQuery) ||
          mower.serialNumber.toLowerCase().includes(lowerQuery)
      );
      setFilteredMowers(filtered);
    } else {
      setFilteredMowers(mowers);
    }
  }, [searchQuery, mowers]);

  const formatDate = (date: Date | null) => {
    if (!date) return 'Aldri';
    return new Intl.DateTimeFormat('no-NO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  };

  const getServiceStatus = (mower: Mower, interval: ServiceInterval) => {
    const lastResetHours = interval.lastResetHours || 0;
    const hoursSinceReset = mower.totalHours - lastResetHours;
    const hoursUntilService = interval.hourInterval - hoursSinceReset;

    if (hoursUntilService <= 0) {
      return {
        status: 'overdue',
        text: `${Math.abs(hoursUntilService)} timer over tid`,
        badge: <Badge variant="destructive">Over tid</Badge>
      };
    } else if (hoursUntilService <= interval.hourInterval * 0.2) {
      return {
        status: 'warning',
        text: `${hoursUntilService} timer igjen`,
        badge: <Badge variant="outline" className="border-amber-500 text-amber-700">Nærmer seg</Badge>
      };
    } else {
      return {
        status: 'ok',
        text: `${hoursUntilService} timer igjen`,
        badge: <Badge variant="outline" className="border-green-500 text-green-700">OK</Badge>
      };
    }
  };

  const onSubmit = async (data: MowerFormValues) => {
    try {
      await equipmentService.addMower(data);
      
      toast({
        title: 'Suksess',
        description: 'Ny gressklipper ble lagt til',
      });
      
      // Reset form and close dialog
      reset();
      setIsAddDialogOpen(false);
      
      // Refresh mower list
      const updatedMowers = await equipmentService.getAllMowers();
      setMowers(updatedMowers);
      setFilteredMowers(updatedMowers);
    } catch (error) {
      console.error('Error adding mower:', error);
      toast({
        title: 'Feil',
        description: 'Kunne ikke legge til ny gressklipper. Prøv igjen senere.',
        variant: 'destructive',
      });
    }
  };

  const handleServiceReset = async (mowerId: string, intervalId: string) => {
    try {
      await equipmentService.resetServiceInterval(mowerId, intervalId, 'current-user');
      
      // Refresh mower list
      const updatedMowers = await equipmentService.getAllMowers();
      setMowers(updatedMowers);
      setFilteredMowers(updatedMowers);
      
      toast({
        title: 'Suksess',
        description: 'Serviceintervall ble nullstilt',
      });
    } catch (error) {
      console.error('Error resetting service interval:', error);
      toast({
        title: 'Feil',
        description: 'Kunne ikke nullstille serviceintervall. Prøv igjen senere.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (mowerId: string) => {
    try {
      await equipmentService.deleteMower(mowerId);
      
      // Update local state
      const updatedMowers = mowers.filter(m => m.id !== mowerId);
      setMowers(updatedMowers);
      setFilteredMowers(updatedMowers);
      
      toast({
        title: 'Suksess',
        description: 'Gressklipperen ble slettet',
      });
    } catch (error) {
      console.error('Error deleting mower:', error);
      toast({
        title: 'Feil',
        description: 'Kunne ikke slette gressklipperen. Prøv igjen senere.',
        variant: 'destructive',
      });
    }
  };

  const handleAddInterval = async (mowerId: string) => {
    setSelectedMowerId(mowerId);
    setIsAddIntervalDialogOpen(true);
  };

  const handleDeleteInterval = async (mowerId: string, intervalId: string) => {
    try {
      await equipmentService.deleteServiceInterval(mowerId, intervalId);
      
      // Refresh mower list
      const updatedMowers = await equipmentService.getAllMowers();
      setMowers(updatedMowers);
      setFilteredMowers(updatedMowers);
      
      toast({
        title: 'Suksess',
        description: 'Serviceintervall ble slettet',
      });
    } catch (error) {
      console.error('Error deleting service interval:', error);
      toast({
        title: 'Feil',
        description: 'Kunne ikke slette serviceintervall. Prøv igjen senere.',
        variant: 'destructive',
      });
    }
  };

  const handleSubmitNewInterval = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedMowerId) return;

    const formData = new FormData(event.currentTarget);
    const description = formData.get('description') as string;
    const hourInterval = parseInt(formData.get('hourInterval') as string);

    if (!description || !hourInterval) {
      toast({
        title: 'Feil',
        description: 'Alle felt må fylles ut',
        variant: 'destructive',
      });
      return;
    }

    try {
      await equipmentService.addServiceInterval(selectedMowerId, {
        description,
        hourInterval,
      });

      // Refresh mower list
      const updatedMowers = await equipmentService.getAllMowers();
      setMowers(updatedMowers);
      setFilteredMowers(updatedMowers);

      setIsAddIntervalDialogOpen(false);
      setSelectedMowerId(null);

      toast({
        title: 'Suksess',
        description: 'Nytt serviceintervall ble lagt til',
      });
    } catch (error) {
      console.error('Error adding service interval:', error);
      toast({
        title: 'Feil',
        description: 'Kunne ikke legge til serviceintervall. Prøv igjen senere.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Vedlikehold</h1>
        <div className="flex space-x-2">
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
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
              
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
                      setIsAddDialogOpen(false);
                    }}
                  >
                    Avbryt
                  </Button>
                  <Button type="submit">Legg til gressklipper</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex flex-col items-center">
              <div className="rounded-full bg-green-100 p-3 mb-4">
                <CheckCircle2 className="h-6 w-6 text-green-700" />
              </div>
              <div className="text-2xl font-bold">
                {mowers.length}
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Aktive gressklippere
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex flex-col items-center">
              <div className="rounded-full bg-amber-100 p-3 mb-4">
                <AlertCircle className="h-6 w-6 text-amber-700" />
              </div>
              <div className="text-2xl font-bold">
                {mowers.reduce((count, mower) => {
                  return count + (mower.serviceIntervals?.filter(interval => {
                    const lastResetHours = interval.lastResetHours || 0;
                    return (mower.totalHours - lastResetHours) >= interval.hourInterval;
                  }).length || 0);
                }, 0)}
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Service forfalt
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex flex-col items-center">
              <div className="rounded-full bg-blue-100 p-3 mb-4">
                <History className="h-6 w-6 text-blue-700" />
              </div>
              <div className="text-2xl font-bold">
                {mowers.reduce((total, mower) => total + (mower.totalHours || 0), 0)}
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Timer totalt
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Gressklippere</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4">
            <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4 md:items-center">
              <div className="relative flex-grow max-w-md">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Søk etter navn eller modell..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-6">
              {loading ? (
                <div className="space-y-4">
                  {[...Array(2)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-24 bg-muted rounded-md" />
                    </div>
                  ))}
                </div>
              ) : filteredMowers.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    Ingen gressklippere funnet
                  </p>
                </div>
              ) : (
                filteredMowers.map((mower) => (
                  <Card key={mower.id} className="card-hover">
                    <CardContent className="p-6">
                      <div className="flex flex-col space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-lg font-semibold">{mower.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {mower.model} • {mower.serialNumber}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="text-right">
                              <div className="text-2xl font-bold">
                                {mower.totalHours}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                timer totalt
                              </p>
                            </div>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Er du sikker?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Dette vil permanent slette gressklipperen og all tilhørende servicehistorikk.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Avbryt</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(mower.id)}
                                    className="bg-destructive hover:bg-destructive/90"
                                  >
                                    Slett
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">Serviceintervaller</h4>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleAddInterval(mower.id)}
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              Legg til intervall
                            </Button>
                          </div>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Beskrivelse</TableHead>
                                <TableHead>Intervall</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Sist nullstilt</TableHead>
                                <TableHead className="text-right">Handling</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {mower.serviceIntervals?.map((interval) => {
                                const status = getServiceStatus(mower, interval);
                                return (
                                  <TableRow key={interval.id}>
                                    <TableCell>{interval.description}</TableCell>
                                    <TableCell>{interval.hourInterval} timer</TableCell>
                                    <TableCell>
                                      <div className="flex flex-col space-y-1">
                                        {status.badge}
                                        <span className="text-xs text-muted-foreground">
                                          {status.text}
                                        </span>
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex flex-col">
                                        <span>{formatDate(interval.lastResetDate?.toDate())}</span>
                                        {interval.lastResetBy && (
                                          <span className="text-xs text-muted-foreground">
                                            av {interval.lastResetBy}
                                          </span>
                                        )}
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <div className="flex justify-end space-x-2">
                                        <Button 
                                          variant="outline" 
                                          size="sm"
                                          disabled={status.status === 'ok'}
                                          onClick={() => handleServiceReset(mower.id, interval.id)}
                                        >
                                          Nullstill
                                        </Button>
                                        <AlertDialog>
                                          <AlertDialogTrigger asChild>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="text-destructive"
                                            >
                                              <Trash2 className="h-4 w-4" />
                                            </Button>
                                          </AlertDialogTrigger>
                                          <AlertDialogContent>
                                            <AlertDialogHeader>
                                              <AlertDialogTitle>Er du sikker?</AlertDialogTitle>
                                              <AlertDialogDescription>
                                                Dette vil permanent slette dette serviceintervallet.
                                              </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                              <AlertDialogCancel>Avbryt</AlertDialogCancel>
                                              <AlertDialogAction
                                                onClick={() => handleDeleteInterval(mower.id, interval.id)}
                                                className="bg-destructive hover:bg-destructive/90"
                                              >
                                                Slett
                                              </AlertDialogAction>
                                            </AlertDialogFooter>
                                          </AlertDialogContent>
                                        </AlertDialog>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Service Interval Dialog */}
      <Dialog open={isAddIntervalDialogOpen} onOpenChange={setIsAddIntervalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Legg til nytt serviceintervall</DialogTitle>
            <DialogDescription>
              Fyll ut informasjon om det nye serviceintervallet.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmitNewInterval} className="space-y-4">
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
                onClick={() => {
                  setIsAddIntervalDialogOpen(false);
                  setSelectedMowerId(null);
                }}
              >
                Avbryt
              </Button>
              <Button type="submit">Legg til intervall</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminEquipment;