// src/pages/admin/Locations.tsx
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Location } from '@/types';
import * as locationService from '@/services/locationService';
import { LocationFormDialog, LocationFormValues } from '@/components/admin/locations/LocationFormDialog';
import { TimeEntryDetailsModal } from '@/components/admin/locations/TimeEntryDetailsModal';

// New imports for refactored components and hooks
import { useLocationStore } from '@/store/locationStore';
import { useLocationTimeEntries } from '@/hooks/useLocationTimeEntries';
import { LocationDetailsDisplay } from '@/components/admin/locations/LocationDetailsDisplay';
import { LocationSummaryCards } from '@/components/admin/locations/LocationSummaryCards';
import { LocationHistoricalNotes } from '@/components/admin/locations/LocationHistoricalNotes';

interface LocationsProps {
  isNew?: boolean;
}

const AdminLocations = ({ isNew }: LocationsProps) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Use Zustand store for location data
  const { locations: allLocations, updateLocation, archiveLocation } = useLocationStore();
  const [location, setLocation] = useState<Location | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(true);

  // Use custom hook for time entries
  const { timeEntries: locationTimeEntries, loading: loadingTimeEntries, error: timeEntriesError, refetch: refetchTimeEntries } = useLocationTimeEntries(id);

  const [isEditModalOpen, setIsEditModalOpen] = useState(isNew || false);

  // Modal state for TimeEntryDetailsModal
  const [isTimeEntryModalOpen, setIsTimeEntryModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalData, setModalData] = useState<any[]>([]);
  const [modalType, setModalType] = useState<'timeEntries' | 'employees' | 'edgeCutting' | 'notes'>('timeEntries');

  // Fetch location from Zustand store or service if not found
  useEffect(() => {
    const fetchAndSetLocation = async () => {
      if (isNew) {
        setLoadingLocation(false);
        return;
      }

      if (!id) {
        navigate('/admin/drift'); // Redirect if no ID for existing location
        return;
      }

      setLoadingLocation(true);
      // Try to get from Zustand store first
      const foundLocation = allLocations.find(loc => loc.id === id);

      if (foundLocation) {
        setLocation(foundLocation);
        setLoadingLocation(false);
      } else {
        // If not in store, fetch from service
        try {
          const locationData = await locationService.getLocationById(id);
          if (locationData) {
            setLocation(locationData);
            // Optionally, add this location to the store if it's not there
            // (though initRealtimeUpdates should handle this for active locations)
          } else {
            toast({
              title: 'Feil',
              description: 'Fant ikke stedet',
              variant: 'destructive',
            });
            navigate('/admin/drift');
          }
        } catch (error) {
          console.error('Error fetching location data:', error);
          toast({
            title: 'Feil',
            description: 'Kunne ikke hente stedsdata. Prøv igjen senere.',
            variant: 'destructive',
          });
        } finally {
          setLoadingLocation(false);
        }
      }
    };

    fetchAndSetLocation();
  }, [id, isNew, allLocations, navigate, toast]); // Depend on allLocations for real-time updates

  // Handle location form submission (add/edit)
  const handleSaveLocation = async (data: LocationFormValues) => {
    try {
      if (isNew) {
        await locationService.addLocation(data); // Service call, Zustand store will update via listener
        toast({
          title: 'Suksess',
          description: 'Nytt sted ble opprettet',
        });
        navigate('/admin/drift');
      } else if (id) {
        await updateLocation(id, data); // Zustand action, updates local state and service
        toast({
          title: 'Suksess',
          description: 'Stedet ble oppdatert',
        });
        setIsEditModalOpen(false);
      }
    } catch (error) {
      console.error('Error saving location:', error);
      toast({
        title: 'Feil',
        description: isNew
          ? 'Kunne ikke opprette nytt sted. Prøv igjen senere.'
          : 'Kunne ikke oppdatere stedet. Prøv igjen senere.',
        variant: 'destructive',
      });
      throw error; // Re-throw to prevent modal from closing
    }
  };

  // Handle archiving a location
  const handleArchiveLocation = async () => {
    if (!id) return;

    try {
      setLoadingLocation(true); // Set loading for the archive action
      await archiveLocation(id); // Zustand action, updates local state and service
      toast({
        title: 'Suksess',
        description: 'Stedet ble arkivert',
      });
      navigate('/admin/arkiv');
    } catch (error) {
      console.error('Error archiving location:', error);
      toast({
        title: 'Feil',
        description: 'Kunne ikke arkivere stedet. Prøv igjen senere.',
        variant: 'destructive',
      });
    } finally {
      setLoadingLocation(false);
    }
  };

  // Memoized callback for card clicks to open modals
  const handleCardClick = useCallback((type: 'timeEntries' | 'employees' | 'edgeCutting' | 'notes') => {
    let title = '';
    let data: any[] = [];

    // Helper functions for data aggregation (moved from original Locations.tsx)
    const getUniqueEmployees = () => {
      const employeeMap = new Map<string, { name: string; totalHours: number; registrations: number }>();
      locationTimeEntries.forEach(entry => {
        if (entry.employeeName) {
          const existing = employeeMap.get(entry.employeeName);
          if (existing) {
            existing.totalHours += entry.hours;
            existing.registrations += 1;
          } else {
            employeeMap.set(entry.employeeName, {
              name: entry.employeeName,
              totalHours: entry.hours,
              registrations: 1
            });
          }
        }
      });
      return Array.from(employeeMap.values());
    };

    const getNotesFromTimeEntries = () => {
      return locationTimeEntries
        .filter(entry => entry.notes && entry.notes.trim() !== '')
        .map(entry => ({
          date: entry.date,
          employeeName: entry.employeeName,
          notes: entry.notes,
          hours: entry.hours
        }));
    };

    const getEdgeCuttingEntries = () => {
      return locationTimeEntries.filter(entry => entry.edgeCuttingDone);
    };

    switch (type) {
      case 'timeEntries':
        title = `Alle timeregistreringer (${locationTimeEntries.length})`;
        data = locationTimeEntries;
        break;
      case 'employees':
        title = `Ansatte som har jobbet her (${getUniqueEmployees().length})`;
        data = getUniqueEmployees();
        break;
      case 'edgeCutting':
        title = `Kantklipping utført (${getEdgeCuttingEntries().length})`;
        data = getEdgeCuttingEntries();
        break;
      case 'notes':
        title = `Notater fra timeregistreringer (${getNotesFromTimeEntries().length})`;
        data = getNotesFromTimeEntries();
        break;
    }

    setModalTitle(title);
    setModalData(data);
    setModalType(type);
    setIsTimeEntryModalOpen(true);
  }, [locationTimeEntries]); // Depend on locationTimeEntries for data aggregation

  return (
    <div className="space-y-4">
      {/* Header with back button */}
      <div className="flex flex-col space-y-2 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/admin/drift')}
            className="flex items-center"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Tilbake til Klippeliste
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">
            {isNew ? 'Legg til nytt sted' : 'Stedsdetaljer'}
          </h1>
        </div>
      </div>

      {/* Historical Data Section - Only show for existing locations */}
      {!isNew && location && (
        <LocationSummaryCards
          timeEntries={locationTimeEntries}
          loading={loadingTimeEntries}
          onCardClick={handleCardClick}
        />
      )}

      {/* Historical Notes Section */}
      {!isNew && location && (
        <LocationHistoricalNotes
          timeEntries={locationTimeEntries}
          loading={loadingTimeEntries}
          onCardClick={handleCardClick}
        />
      )}

      {/* Location Details Display - MOVED TO BOTTOM */}
      {!isNew && location && (
        <LocationDetailsDisplay
          location={location}
          onEdit={() => setIsEditModalOpen(true)}
          onArchive={handleArchiveLocation}
          loading={loadingLocation}
        />
      )}

      {/* Location Form Dialog (for add/edit) */}
      <LocationFormDialog
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSubmit={handleSaveLocation}
        loading={loadingLocation} // Use loadingLocation for form submission
        initialData={location ? {
          name: location.name,
          address: location.address,
          description: location.description,
          imageUrl: location.imageUrl,
          googleEarthLink: location.googleEarthLink,
          recommendedEquipment: location.recommendedEquipment,
          maintenanceFrequency: location.maintenanceFrequency,
          edgeCuttingFrequency: location.edgeCuttingFrequency,
          startWeek: location.startWeek,
          notes: location.notes || '',
        } : undefined}
        isNew={isNew}
      />

      {/* Time Entry Details Modal */}
      <TimeEntryDetailsModal
        isOpen={isTimeEntryModalOpen}
        onClose={() => setIsTimeEntryModalOpen(false)}
        title={modalTitle}
        data={modalData}
        type={modalType}
      />
    </div>
  );
};

export default AdminLocations;