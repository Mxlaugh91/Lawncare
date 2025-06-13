import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Timestamp } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertCircle, Clock, Scissors, Calendar, Users } from 'lucide-react';
import { Location, Mower, User } from '@/types';
import * as locationService from '@/services/locationService';
import * as equipmentService from '@/services/equipmentService';
import * as timeEntryService from '@/services/timeEntryService';
import * as userService from '@/services/userService';
import * as notificationService from '@/services/notificationService';
import { getISOWeekNumber, getISOWeekDates, formatDateToShortLocale } from '@/lib/utils';

const timeEntrySchema = z.object({
  locationId: z.string({
    required_error: 'Sted må velges',
  }),
  hours: z.coerce.number({
    required_error: 'Tidsbruk må fylles ut',
  }).min(0.1, 'Tidsbruk må være større enn 0'),
  mowerId: z.string().nullable(),
  edgeCuttingDone: z.boolean().default(false),
  notes: z.string().optional(),
  taggedEmployeeIds: z.array(z.string()).optional(),
});

type TimeEntryFormValues = z.infer<typeof timeEntrySchema>;

const EmployeeTimeEntry = () => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState<Location[]>([]);
  const [mowers, setMowers] = useState<Mower[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [edgeCuttingNeeded, setEdgeCuttingNeeded] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const currentWeek = getISOWeekNumber(new Date());
  const weekDates = getISOWeekDates(currentWeek);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TimeEntryFormValues>({
    resolver: zodResolver(timeEntrySchema),
    defaultValues: {
      locationId: '',
      hours: undefined,
      mowerId: null,
      edgeCuttingDone: false,
      notes: '',
      taggedEmployeeIds: [],
    },
  });

  const selectedLocationId = watch('locationId');
  const edgeCuttingDone = watch('edgeCuttingDone');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Get locations with weekly status
        const locationsWithStatus = await locationService.getLocationsWithWeeklyStatus(currentWeek);
        
        // Filter out completed locations
       const availableLocations = locationsWithStatus.filter(loc => {
     if (!(loc.isDueForMaintenanceInSelectedWeek || loc.isDueForEdgeCuttingInSelectedWeek)) return false;
      if (loc.status === 'fullfort') return false;
            if (loc.status === 'ikke_utfort') {
      if (!loc.taggedEmployees || loc.taggedEmployees.length === 0) return false;
    return loc.taggedEmployees.some(emp => emp.id === currentUser?.uid);
    } 
  return true;
  } )
  .map(loc => ({
    id: loc.id,
    name: loc.name,
    address: loc.address,
    maintenanceFrequency: loc.maintenanceFrequency,
    edgeCuttingFrequency: loc.edgeCuttingFrequency,
    startWeek: loc.startWeek,
    notes: loc.notes,
    isArchived: loc.isArchived,
    createdAt: loc.createdAt,
    updatedAt: loc.updatedAt,
    status: loc.status, // <-- keep this!
    isDueForMaintenanceInSelectedWeek: loc.isDueForMaintenanceInSelectedWeek,
    isDueForEdgeCuttingInSelectedWeek: loc.isDueForEdgeCuttingInSelectedWeek,
  }));

        const [mowerData, employeeData] = await Promise.all([
          equipmentService.getAllMowers(),
          userService.getAllEmployees()
        ]);
        
        setLocations(availableLocations);
        setMowers(mowerData);
        setEmployees(employeeData.filter(emp => emp.id !== currentUser?.uid));
      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          title: 'Feil',
          description: 'Kunne ikke hente nødvendig data. Prøv igjen senere.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [toast, currentUser, currentWeek]);

  useEffect(() => {
    if (selectedLocationId) {
      const location = locations.find(loc => loc.id === selectedLocationId);
      setSelectedLocation(location || null);
      
      if (location) {
        const lastEdgeCuttingWeek = location.lastEdgeCuttingWeek || 0;
        const frequency = location.edgeCuttingFrequency || 4;
        
        setEdgeCuttingNeeded((currentWeek - lastEdgeCuttingWeek) >= frequency);
      } else {
        setSelectedLocation(null);
        setEdgeCuttingNeeded(false);
      }
    } else {
      setSelectedLocation(null);
      setEdgeCuttingNeeded(false);
    }
  }, [selectedLocationId, locations, currentWeek]);

  const handleEmployeeSelect = (employeeId: string) => {
    setSelectedEmployees(prev => {
      const isSelected = prev.includes(employeeId);
      if (isSelected) {
        return prev.filter(id => id !== employeeId);
      } else {
        return [...prev, employeeId];
      }
    });
  };

  const onSubmit = async (data: TimeEntryFormValues) => {
    if (!currentUser) {
      toast({
        title: 'Feil',
        description: 'Du må være logget inn for å registrere timer',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Add the time entry and get the ID - Convert Date to Timestamp
      const timeEntryId = await timeEntryService.addTimeEntry({
        ...data,
        employeeId: currentUser.uid,
        employeeName: currentUser.displayName || currentUser.email || 'Ukjent',
        date: Timestamp.fromDate(new Date()),
        taggedEmployeeIds: selectedEmployees,
      });
      
      // Create notifications for tagged employees
      if (selectedEmployees.length > 0 && timeEntryId) {
        const location = locations.find(loc => loc.id === data.locationId);
        
        await Promise.all(selectedEmployees.map(employeeId =>
          notificationService.addNotification({
            userId: employeeId,
            title: 'Du har blitt tagget i en jobb',
            message: `Du har blitt tagget i en jobb på ${location?.name}`,
            type: 'job_tagged',
            data: {
              locationId: data.locationId,
              locationName: location?.name,
              timeEntryId: timeEntryId
            }
          })
        ));
      }
      
      toast({
        title: 'Timeregistrering lagret',
        description: 'Timeregistreringen ble lagret for ' + selectedLocation?.name,
      });
      
      reset();
      setSelectedEmployees([]);
      setLocations((prev) => prev.filter(loc => loc.id !== data.locationId));
      setSelectedLocation(null); // Optionally clear the selected location
    } catch (error) {
      console.error('Error submitting time entry:', error);
      toast({
        title: 'Feil',
        description: 'Kunne ikke lagre timeregistrering. Prøv igjen senere.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Timeregistrering</h1>
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>Uke {currentWeek} ({formatDateToShortLocale(weekDates.start)} - {formatDateToShortLocale(weekDates.end)})</span>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registrer utført vedlikehold</CardTitle>
          <CardDescription>
            Registrer timer for et sted og velg eventuelt brukt gressklipper
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="locationId">Velg sted *</Label>
                <Select
                  onValueChange={(value) => setValue('locationId', value)}
                  defaultValue={selectedLocationId}
                >
                  <SelectTrigger id="locationId" className="w-full">
                    <SelectValue placeholder="Velg sted" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.locationId && (
                  <p className="text-sm text-destructive mt-1">{errors.locationId.message}</p>
                )}
              </div>

              {selectedLocation && (
                <div className="rounded-md bg-muted p-4">
                  <h3 className="font-medium mb-1">{selectedLocation.name}</h3>
                  <p className="text-sm text-muted-foreground mb-2">{selectedLocation.address}</p>
                  
                  {selectedLocation.notes && (
                    <div className="mt-2">
                      <p className="text-sm font-medium">Notater:</p>
                      <p className="text-sm">{selectedLocation.notes}</p>
                    </div>
                  )}
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="hours" className="flex items-center">
                    <Clock className="mr-2 h-4 w-4" />
                    Tidsbruk (timer) *
                  </Label>
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
                
                <div>
                  <Label htmlFor="mowerId">Gressklipper brukt</Label>
                  <Select
                    onValueChange={(value) => setValue('mowerId', value === 'none' ? null : value)}
                  >
                    <SelectTrigger id="mowerId">
                      <SelectValue placeholder="Velg gressklipper" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Ingen gressklipper brukt</SelectItem>
                      {mowers.map((mower) => (
                        <SelectItem key={mower.id} value={mower.id}>
                          {mower.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="edgeCuttingDone"
                  checked={edgeCuttingDone}
                  onCheckedChange={(checked) => setValue('edgeCuttingDone', checked)}
                />
                <div>
                  <Label htmlFor="edgeCuttingDone" className="flex items-center">
                    <Scissors className="mr-2 h-4 w-4" />
                    Kantklipping utført
                  </Label>
                  {edgeCuttingNeeded && !edgeCuttingDone && (
                    <p className="text-xs text-amber-600 flex items-center mt-0.5">
                      <AlertCircle className="mr-1 h-3 w-3" />
                      Kantklipping er anbefalt for dette stedet
                    </p>
                  )}
                </div>
              </div>

              <div>
                <Label className="flex items-center mb-2">
                  <Users className="mr-2 h-4 w-4" />
                  Andre medarbeidere på jobb
                </Label>
                <ScrollArea className="h-32 rounded-md border">
                  <div className="p-2 space-y-1">
                    {employees.map((employee) => (
                      <div
                        key={employee.id}
                        className={`flex items-center space-x-2 p-2 rounded-md cursor-pointer transition-colors ${
                          selectedEmployees.includes(employee.id)
                            ? 'bg-primary/10 text-primary'
                            : 'hover:bg-muted'
                        }`}
                        onClick={() => handleEmployeeSelect(employee.id)}
                      >
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                          {employee.name.charAt(0)}
                        </div>
                        <span className="text-sm font-medium">{employee.name}</span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              <div>
                <Label htmlFor="notes">Notater</Label>
                <Textarea
                  id="notes"
                  placeholder="Skriv eventuelle merknader her"
                  {...register('notes')}
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Lagrer...' : 'Registrer og marker som fullført'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeeTimeEntry;