import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Timestamp } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Location, Mower, User } from '@/types';
import * as locationService from '@/services/locationService';
import * as equipmentService from '@/services/equipmentService';
import * as timeEntryService from '@/services/timeEntryService';
import * as userService from '@/services/userService';
import * as notificationService from '@/services/notificationService';
import { getISOWeekNumber, getISOWeekDates } from '@/lib/utils';

// Import the new components
import {
  EmployeeSelector,
  LocationSelector,
  TimeEntryHeader,
  TimeEntryHoursInput,
  TimeEntryEdgeCutting,
  TimeEntryEquipment,
  TimeEntryNotes,
  TimeEntrySubmitButton,
  TimeEntryCompletedState
} from '@/pages/employee/time-entry';

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
  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState<Location[]>([]);
  const [mowers, setMowers] = useState<Mower[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [edgeCuttingNeeded, setEdgeCuttingNeeded] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [isEmployeeSectionOpen, setIsEmployeeSectionOpen] = useState(false);
  const [isEquipmentSectionOpen, setIsEquipmentSectionOpen] = useState(false);
  const [isNotesSectionOpen, setIsNotesSectionOpen] = useState(false);
  
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

  const handleEdgeCuttingChange = useCallback((checked: boolean) => {
    setValue('edgeCuttingDone', checked);
  }, [setValue]);

  const handleMowerChange = useCallback((value: string) => {
    setValue('mowerId', value || null);
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

  if (loading) {
    return (
      <div className="space-y-4 p-6 animate-pulse">
        <div className="h-12 bg-gradient-to-r from-blue-200 to-purple-200 rounded-xl" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-gradient-to-r from-gray-200 to-gray-300 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="space-y-6 p-4 pb-24 md:pb-8 max-w-2xl mx-auto">
        {/* Header */}
        <TimeEntryHeader currentWeek={currentWeek} weekDates={weekDates} />

        {/* Completed State */}
        {locations.length === 0 && <TimeEntryCompletedState />}

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

          {/* Time Entry */}
          {selectedLocation && (
            <TimeEntryHoursInput
              selectedHours={selectedHours}
              onQuickHourSelect={handleQuickHourSelect}
              register={register}
              errors={errors}
            />
          )}

          {/* Edge Cutting */}
          {selectedLocation && (
            <TimeEntryEdgeCutting
              edgeCuttingDone={edgeCuttingDone}
              edgeCuttingNeeded={edgeCuttingNeeded}
              onEdgeCuttingChange={handleEdgeCuttingChange}
            />
          )}

          {/* Equipment Selection */}
          {selectedLocation && (
            <TimeEntryEquipment
              mowers={mowers}
              isOpen={isEquipmentSectionOpen}
              onOpenChange={setIsEquipmentSectionOpen}
              onMowerChange={handleMowerChange}
            />
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
            <TimeEntryNotes
              isOpen={isNotesSectionOpen}
              onOpenChange={setIsNotesSectionOpen}
              register={register}
            />
          )}

          {/* Submit Button */}
          {selectedLocation && (
            <TimeEntrySubmitButton
              isSubmitting={isSubmitting}
              onSubmit={handleSubmit(onSubmit)}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default TimeEntry;