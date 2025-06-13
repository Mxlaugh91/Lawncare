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
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  AlertCircle, 
  Clock, 
  Scissors, 
  Calendar, 
  ChevronDown,
  CheckCircle2,
  Wrench
} from 'lucide-react';
import { EmployeeSelector, LocationSelector } from '@/components/employee/time-entry';
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
  const [isEmployeeSectionOpen, setIsEmployeeSectionOpen] = useState(false);
  const [isEquipmentSectionOpen, setIsEquipmentSectionOpen] = useState(false);
  
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
  const selectedHours = watch('hours');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        const locationsWithStatus = await locationService.getLocationsWithWeeklyStatus(currentWeek);
        
        const availableLocations = locationsWithStatus.filter(loc => {
          if (!(loc.isDueForMaintenanceInSelectedWeek || loc.isDueForEdgeCuttingInSelectedWeek)) return false;
          if (loc.status === 'fullfort') return false;
          if (loc.status === 'ikke_utfort') {
            if (!loc.taggedEmployees || loc.taggedEmployees.length === 0) return false;
            return loc.taggedEmployees.some(emp => emp.id === currentUser?.uid);
          } 
          return true;
        }).map(loc => ({
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
          status: loc.status,
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

  const handleEmployeeToggle = (employeeId: string) => {
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
      const timeEntryId = await timeEntryService.addTimeEntry({
        ...data,
        employeeId: currentUser.uid,
        employeeName: currentUser.displayName || currentUser.email || 'Ukjent',
        date: Timestamp.fromDate(new Date()),
        taggedEmployeeIds: selectedEmployees,
      });
      
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
        title: 'Timer registrert!',
        description: `${selectedHours} timer registrert for ${selectedLocation?.name}`,
      });
      
      reset();
      setSelectedEmployees([]);
      setLocations((prev) => prev.filter(loc => loc.id !== data.locationId));
      setSelectedLocation(null);
      setIsEmployeeSectionOpen(false);
      setIsEquipmentSectionOpen(false);
    } catch (error) {
      console.error('Error submitting time entry:', error);
      toast({
        title: 'Feil',
        description: 'Kunne ikke lagre timeregistrering. Prøv igjen senere.',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <div className="h-8 bg-muted rounded animate-pulse" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-muted rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 pb-20 md:pb-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-xl font-bold">Registrer timer</h1>
        <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>Uke {currentWeek}</span>
          <span>({formatDateToShortLocale(weekDates.start)} - {formatDateToShortLocale(weekDates.end)})</span>
        </div>
      </div>

      {locations.length === 0 && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="flex flex-col items-center text-center p-6 space-y-3">
            <CheckCircle2 className="h-12 w-12 text-green-600" />
            <h3 className="font-medium text-green-900">Alle oppgaver fullført!</h3>
            <p className="text-sm text-green-700">
              Du har ingen steder som trenger vedlikehold denne uken.
            </p>
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Location Selection */}
        <LocationSelector
          locations={locations}
          selectedLocationId={selectedLocationId}
          selectedLocation={selectedLocation}
          onLocationChange={(value) => setValue('locationId', value)}
          edgeCuttingNeeded={edgeCuttingNeeded}
          error={errors.locationId?.message}
          currentWeek={currentWeek}
        />

        {/* Time Entry */}
        {selectedLocation && (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center text-lg">
                <Clock className="mr-2 h-5 w-5 text-primary" />
                Tidsbruk
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="hours" className="text-base">Timer brukt *</Label>
                <Input
                  id="hours"
                  type="number"
                  step="0.5"
                  min="0.5"
                  placeholder="Hvor mange timer brukte du?"
                  className="h-12 text-lg"
                  {...register('hours')}
                />
                {errors.hours && (
                  <p className="text-sm text-destructive flex items-center">
                    <AlertCircle className="mr-1 h-3 w-3" />
                    {errors.hours.message}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Edge Cutting */}
        {selectedLocation && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Label htmlFor="edgeCuttingDone" className="text-base font-medium flex items-center">
                    <Scissors className="mr-2 h-5 w-5" />
                    Kantklipping utført
                  </Label>
                  {edgeCuttingNeeded && !edgeCuttingDone && (
                    <p className="text-sm text-amber-600 flex items-center mt-1">
                      <AlertCircle className="mr-1 h-3 w-3" />
                      Kantklipping anbefales for dette stedet
                    </p>
                  )}
                </div>
                <Switch
                  id="edgeCuttingDone"
                  checked={edgeCuttingDone}
                  onCheckedChange={(checked) => setValue('edgeCuttingDone', checked)}
                  className="scale-125"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Equipment Selection - Collapsible */}
        {selectedLocation && (
          <Collapsible open={isEquipmentSectionOpen} onOpenChange={setIsEquipmentSectionOpen}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardTitle className="flex items-center justify-between text-lg">
                    <div className="flex items-center">
                      <Wrench className="mr-2 h-5 w-5 text-muted-foreground" />
                      Utstyr brukt
                      <Badge variant="outline" className="ml-2">Valgfritt</Badge>
                    </div>
                    <ChevronDown className={`h-4 w-4 transition-transform ${isEquipmentSectionOpen ? 'rotate-180' : ''}`} />
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent>
                  <Select
                    onValueChange={(value) => setValue('mowerId', value === 'none' ? null : value)}
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Velg gressklipper (valgfritt)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Ingen gressklipper brukt</SelectItem>
                      {mowers.map((mower) => (
                        <SelectItem key={mower.id} value={mower.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{mower.name}</span>
                            <span className="text-sm text-muted-foreground">{mower.model}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        )}

        {/* Team Members */}
        {selectedLocation && (
          <EmployeeSelector
            employees={employees}
            selectedEmployees={selectedEmployees}
            onEmployeeToggle={handleEmployeeToggle}
            isOpen={isEmployeeSectionOpen}
            onOpenChange={setIsEmployeeSectionOpen}
          />
        )}

        {/* Notes */}
        {selectedLocation && (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Notater</CardTitle>
              <CardDescription>Legg til eventuelle merknader (valgfritt)</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Skriv eventuelle merknader om jobben her..."
                className="min-h-[80px] resize-none"
                {...register('notes')}
              />
            </CardContent>
          </Card>
        )}

        {/* Submit Button */}
        {selectedLocation && (
          <div className="sticky bottom-4 z-10">
            <Button 
              type="submit" 
              className="w-full h-12 text-lg font-medium" 
              disabled={isSubmitting}
              size="lg"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Lagrer...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                  Registrer og marker som fullført
                </>
              )}
            </Button>
          </div>
        )}
      </form>
    </div>
  );
};

export default EmployeeTimeEntry;