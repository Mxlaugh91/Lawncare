import { useState, useEffect, useCallback } from 'react';
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
  Wrench,
  Sparkles,
  Timer,
  FileText,
  Save,
  Zap
} from 'lucide-react';
import { Location, Mower, User } from '@/types';
import * as timeEntryService from '@/services/timeEntryService';
import * as notificationService from '@/services/notificationService';
import { getISOWeekNumber, getISOWeekDates, formatDateToShortLocale } from '@/lib/utils';
import { EmployeeSelector, LocationSelector } from '@/pages/employee/time-entry';

// Import Zustand stores
import { useLocationStore } from '@/store/locationStore';
import { useEquipmentStore } from '@/store/equipmentStore';
import { useUserStore } from '@/store/userStore';

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

const TimeEntry = () => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  
  // Use Zustand stores instead of local state
  const { 
    getLocationsWithWeeklyStatus, 
    loading: locationsLoading, 
    error: locationsError 
  } = useLocationStore();
  
  const { 
    mowers, 
    fetchMowers, 
    loading: mowersLoading, 
    error: mowersError 
  } = useEquipmentStore();
  
  const { 
    users, 
    fetchUsers, 
    loading: usersLoading, 
    error: usersError 
  } = useUserStore();

  // Local state for component-specific data
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [edgeCuttingNeeded, setEdgeCuttingNeeded] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [isEmployeeSectionOpen, setIsEmployeeSectionOpen] = useState(false);
  const [isEquipmentSectionOpen, setIsEquipmentSectionOpen] = useState(false);
  const [isNotesSectionOpen, setIsNotesSectionOpen] = useState(false);
  
  const currentWeek = getISOWeekNumber(new Date());
  const weekDates = getISOWeekDates(currentWeek);

  // Combine loading states
  const loading = locationsLoading || mowersLoading || usersLoading;
  const hasError = locationsError || mowersError || usersError;

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

  // Quick hour suggestions
  const quickHours = [0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 8];

  // Filter employees to exclude current user
  const employees = users.filter(emp => emp.id !== currentUser?.uid);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Use Promise.all to fetch data in parallel from Zustand stores
        await Promise.all([
          // Fetch mowers if not already loaded
          mowers.length === 0 ? fetchMowers() : Promise.resolve(),
          // Fetch users if not already loaded  
          users.length === 0 ? fetchUsers() : Promise.resolve(),
        ]);

        // Get locations with weekly status
        const locationsWithStatus = await getLocationsWithWeeklyStatus(currentWeek);
        
        // Filter available locations for time entry
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

        setLocations(availableLocations);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          title: 'Feil',
          description: 'Kunne ikke hente nødvendig data. Prøv igjen senere.',
          variant: 'destructive',
        });
      }
    };

    fetchData();
  }, [currentUser, currentWeek, fetchMowers, fetchUsers, getLocationsWithWeeklyStatus, mowers.length, users.length, toast]);

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

  // Memoize the employee toggle handler to prevent unnecessary re-renders
  const handleEmployeeToggle = useCallback((employeeId: string) => {
    setSelectedEmployees(prev => {
      const isSelected = prev.includes(employeeId);
      if (isSelected) {
        return prev.filter(id => id !== employeeId);
      } else {
        return [...prev, employeeId];
      }
    });
  }, []);

  // Memoize the location change handler
  const handleLocationChange = useCallback((value: string) => {
    setValue('locationId', value);
  }, [setValue]);

  const handleQuickHourSelect = useCallback((hours: number) => {
    setValue('hours', hours);
    // Add haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(30);
    }
  }, [setValue]);

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
      // Add haptic feedback for submission
      if ('vibrate' in navigator) {
        navigator.vibrate([100, 50, 100]);
      }

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
        title: '🎉 Timer registrert!',
        description: `${selectedHours} timer registrert for ${selectedLocation?.name}`,
      });
      
      reset();
      setSelectedEmployees([]);
      setLocations((prev) => prev.filter(loc => loc.id !== data.locationId));
      setSelectedLocation(null);
      setIsEmployeeSectionOpen(false);
      setIsEquipmentSectionOpen(false);
      setIsNotesSectionOpen(false);
    } catch (error) {
      console.error('Error submitting time entry:', error);
      toast({
        title: 'Feil',
        description: 'Kunne ikke lagre timeregistrering. Prøv igjen senere.',
        variant: 'destructive',
      });
    }
  };

  // Show error state if there are any errors
  if (hasError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center text-center p-8 space-y-4">
            <div className="p-4 rounded-full bg-destructive/10">
              <AlertCircle className="h-12 w-12 text-destructive" />
            </div>
            <h3 className="text-xl font-semibold text-destructive">Feil ved lasting</h3>
            <p className="text-muted-foreground">
              {locationsError || mowersError || usersError}
            </p>
            <Button onClick={() => window.location.reload()}>
              Prøv igjen
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="space-y-6 p-4 pb-24 md:pb-8 max-w-2xl mx-auto">
          {/* Enhanced Header Skeleton */}
          <div className="text-center space-y-4 py-6">
            <div className="inline-flex items-center justify-center p-3 rounded-full bg-primary/10 mb-4">
              <Timer className="h-8 w-8 text-primary animate-pulse" />
            </div>
            <div className="h-8 bg-gradient-to-r from-gray-200 to-gray-300 rounded-xl animate-pulse" />
            <div className="h-6 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full animate-pulse mx-auto w-64" />
          </div>

          {/* Loading skeletons for different sections */}
          <div className="space-y-6">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="pb-3">
                  <div className="flex items-center">
                    <div className="p-2 rounded-full bg-gray-200 mr-3 w-10 h-10" />
                    <div className="h-6 bg-gray-200 rounded w-32" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="h-12 bg-gray-200 rounded" />
                  {i === 1 && (
                    <div className="grid grid-cols-5 gap-2">
                      {[...Array(5)].map((_, j) => (
                        <div key={j} className="h-10 bg-gray-200 rounded" />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="space-y-6 p-4 pb-24 md:pb-8 max-w-2xl mx-auto">
        {/* Enhanced Header */}
        <div className="text-center space-y-4 py-6">
          <div className="inline-flex items-center justify-center p-3 rounded-full bg-primary/10 mb-4">
            <Timer className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            Registrer timer
          </h1>
          <div className="flex items-center justify-center space-x-3 text-sm text-muted-foreground bg-card/60 rounded-full px-4 py-2 backdrop-blur-sm border">
            <Calendar className="h-4 w-4 text-primary" />
            <span className="font-medium">Uke {currentWeek}</span>
            <span className="text-muted-foreground/50">•</span>
            <span>({formatDateToShortLocale(weekDates.start)} - {formatDateToShortLocale(weekDates.end)})</span>
          </div>
        </div>

        {locations.length === 0 && (
          <Card className="card-hover border-0 bg-primary/5">
            <CardContent className="flex flex-col items-center text-center p-8 space-y-4">
              <div className="p-4 rounded-full bg-primary/10">
                <CheckCircle2 className="h-12 w-12 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-primary">Alle oppgaver fullført! 🎉</h3>
              <p className="text-muted-foreground max-w-sm">
                Flott jobba! Du har ingen steder som trenger vedlikehold denne uken.
              </p>
              <div className="flex space-x-2">
                <Badge className="bg-primary/10 text-primary border-primary/20">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Perfekt score
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-6">
          {/* Location Selection */}
          <LocationSelector
            locations={locations}
            selectedLocationId={selectedLocationId}
            selectedLocation={selectedLocation}
            onLocationChange={handleLocationChange}
            edgeCuttingNeeded={edgeCuttingNeeded}
            error={errors.locationId?.message}
            currentWeek={currentWeek}
          />

          {/* Enhanced Time Entry */}
          {selectedLocation && (
            <Card className="card-hover">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-lg font-semibold">
                  <div className="p-2 rounded-full bg-primary/10 mr-3">
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                  Tidsbruk
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <Label htmlFor="hours" className="text-base font-medium">Timer brukt *</Label>
                  
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
                        onClick={() => handleQuickHourSelect(hour)}
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
                    placeholder="Eller skriv inn timer..."
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
          )}

          {/* Enhanced Edge Cutting */}
          {selectedLocation && (
            <Card className="card-hover">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between p-4 rounded-xl bg-amber-50 border border-amber-200">
                  <div className="flex-1">
                    <Label htmlFor="edgeCuttingDone" className="text-base font-semibold flex items-center">
                      <div className="p-2 rounded-full bg-amber-100 mr-3">
                        <Scissors className="h-5 w-5 text-amber-600" />
                      </div>
                      Kantklipping utført
                    </Label>
                    {edgeCuttingNeeded && !edgeCuttingDone && (
                      <p className="text-sm text-amber-700 flex items-center mt-2 ml-11 animate-pulse">
                        <Zap className="mr-1 h-3 w-3" />
                        Anbefales for dette stedet
                      </p>
                    )}
                    {edgeCuttingDone && (
                      <p className="text-sm text-primary flex items-center mt-2 ml-11">
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        Kantklipping registrert
                      </p>
                    )}
                  </div>
                  <Switch
                    id="edgeCuttingDone"
                    checked={edgeCuttingDone}
                    onCheckedChange={(checked) => {
                      setValue('edgeCuttingDone', checked);
                      if ('vibrate' in navigator) {
                        navigator.vibrate(50);
                      }
                    }}
                    className="scale-125 data-[state=checked]:bg-primary"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Enhanced Equipment Selection */}
          {selectedLocation && (
            <Collapsible open={isEquipmentSectionOpen} onOpenChange={setIsEquipmentSectionOpen}>
              <Card className="card-hover">
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 active:bg-muted transition-all duration-200">
                    <CardTitle className="flex items-center justify-between text-lg font-semibold">
                      <div className="flex items-center">
                        <div className="p-2 rounded-full bg-muted mr-3">
                          <Wrench className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="flex flex-col items-start">
                          <span>Utstyr brukt</span>
                          <span className="text-xs text-muted-foreground font-normal">Hvilken gressklipper ble brukt?</span>
                        </div>
                        <Badge variant="outline" className="ml-3">Valgfritt</Badge>
                      </div>
                      <ChevronDown className={`h-5 w-5 transition-transform duration-300 text-muted-foreground ${isEquipmentSectionOpen ? 'rotate-180' : ''}`} />
                    </CardTitle>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent>
                    <Select
                      onValueChange={(value) => setValue('mowerId', value === 'none' ? null : value)}
                    >
                      <SelectTrigger className="h-12 border-2 hover:border-primary/50 transition-colors">
                        <SelectValue placeholder="🚜 Velg gressklipper" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none" className="py-3">
                          <span className="text-muted-foreground">Ingen gressklipper brukt</span>
                        </SelectItem>
                        {mowers.map((mower) => (
                          <SelectItem key={mower.id} value={mower.id} className="py-3">
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

          {/* Enhanced Notes */}
          {selectedLocation && (
            <Collapsible open={isNotesSectionOpen} onOpenChange={setIsNotesSectionOpen}>
              <Card className="card-hover">
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/30 active:bg-muted transition-all duration-200">
                    <CardTitle className="flex items-center justify-between text-lg font-semibold">
                      <div className="flex items-center">
                        <div className="p-2 rounded-full bg-primary/10 mr-3">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex flex-col items-start">
                          <span>Notater</span>
                          <span className="text-xs text-muted-foreground font-normal">Legg til merknader om jobben</span>
                        </div>
                        <Badge variant="outline" className="ml-3">Valgfritt</Badge>
                      </div>
                      <ChevronDown className={`h-5 w-5 transition-transform duration-300 text-muted-foreground ${isNotesSectionOpen ? 'rotate-180' : ''}`} />
                    </CardTitle>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent>
                    <Textarea
                      placeholder="💭 Skriv eventuelle merknader om jobben her..."
                      className="min-h-[100px] resize-none border-2 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                      {...register('notes')}
                    />
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          )}

          {/* Enhanced Submit Button */}
          {selectedLocation && (
            <div className="sticky bottom-4 z-10">
              <Button 
                onClick={handleSubmit(onSubmit)}
                className="w-full h-16 text-lg font-semibold bg-primary hover:bg-primary/90 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] button-effect" 
                disabled={isSubmitting}
                size="lg"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3" />
                    Lagrer timer...
                  </>
                ) : (
                  <>
                    <Save className="mr-3 h-5 w-5" />
                    Registrer og marker som fullført 🎯
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TimeEntry;