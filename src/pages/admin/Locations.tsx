import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { useToast } from '@/hooks/use-toast';
import { Location, TimeEntry } from '@/types';
import * as locationService from '@/services/locationService';
import * as timeEntryService from '@/services/timeEntryService';
import { LocationFormDialog, LocationFormValues } from '@/components/admin/locations/LocationFormDialog';
import { 
  Archive, 
  ArrowLeft, 
  Clock, 
  Users, 
  DollarSign, 
  FileText,
  Calendar,
  MapPin,
  Scissors,
  Edit,
  Info
} from 'lucide-react';

interface LocationsProps {
  isNew?: boolean;
}

const AdminLocations = ({ isNew }: LocationsProps) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [loadingTimeEntries, setLoadingTimeEntries] = useState(false);
  const [location, setLocation] = useState<Location | null>(null);
  const [locationTimeEntries, setLocationTimeEntries] = useState<TimeEntry[]>([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(isNew || false);

  useEffect(() => {
    const fetchLocationData = async () => {
      if (!id || isNew) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Fetch location details
        const locationData = await locationService.getLocationById(id);
        if (locationData) {
          setLocation(locationData);

          // Fetch time entries for this location
          setLoadingTimeEntries(true);
          const timeEntries = await timeEntryService.getTimeEntriesForLocation(id);
          setLocationTimeEntries(timeEntries);
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
        setLoading(false);
        setLoadingTimeEntries(false);
      }
    };

    fetchLocationData();
  }, [id, isNew, toast, navigate]);

  const handleSaveLocation = async (data: LocationFormValues) => {
    try {
      if (isNew) {
        await locationService.addLocation(data);
        toast({
          title: 'Suksess',
          description: 'Nytt sted ble opprettet',
        });
        navigate('/admin/drift');
      } else if (id) {
        await locationService.updateLocation(id, data);
        
        // Update local state with new data
        setLocation(prev => prev ? { ...prev, ...data } : null);
        
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

  const handleArchive = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      await locationService.archiveLocation(id);
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
      setLoading(false);
    }
  };

  // Calculate summary statistics
  const getTotalHours = () => {
    return locationTimeEntries.reduce((total, entry) => total + entry.hours, 0);
  };

  const getUniqueEmployees = () => {
    const employeeNames = new Set<string>();
    locationTimeEntries.forEach(entry => {
      if (entry.employeeName) {
        employeeNames.add(entry.employeeName);
      }
    });
    return Array.from(employeeNames);
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

  const formatDate = (date: any) => {
    if (!date) return '';
    const dateObj = date.toDate ? date.toDate() : new Date(date);
    return new Intl.DateTimeFormat('no-NO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(dateObj);
  };

  const getEdgeCuttingCount = () => {
    return locationTimeEntries.filter(entry => entry.edgeCuttingDone).length;
  };

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

      {/* Location Information Display */}
      {!isNew && location && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <MapPin className="mr-2 h-5 w-5" />
                {location.name}
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditModalOpen(true)}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Rediger sted
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      size="sm"
                    >
                      <Archive className="mr-2 h-4 w-4" />
                      Arkiver sted
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Er du sikker?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Dette vil arkivere stedet og fjerne det fra aktive lister. Handlingen kan angres fra arkivet.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Avbryt</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleArchive}
                        className="bg-destructive hover:bg-destructive/90"
                      >
                        Arkiver sted
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-1/4 mb-2" />
                    <div className="h-6 bg-gray-200 rounded" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-1">Adresse</h4>
                    <p className="text-base">{location.address}</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-1">Oppstartsuke</h4>
                    <p className="text-base">Uke {location.startWeek}</p>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-1">Frekvens klipping</h4>
                    <p className="text-base">Hver {location.maintenanceFrequency}. uke</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-1">Frekvens kantklipping</h4>
                    <p className="text-base">Hver {location.edgeCuttingFrequency}. uke</p>
                  </div>
                </div>

                {location.notes && (
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-1">Notater og instrukser</h4>
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p className="text-base whitespace-pre-wrap">{location.notes}</p>
                    </div>
                  </div>
                )}

                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-1">Sist klippet</h4>
                    <p className="text-base">
                      {location.lastMaintenanceWeek ? `Uke ${location.lastMaintenanceWeek}` : 'Ikke registrert'}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-1">Sist kantklippet</h4>
                    <p className="text-base">
                      {location.lastEdgeCuttingWeek ? `Uke ${location.lastEdgeCuttingWeek}` : 'Ikke registrert'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Historical Data Section - Only show for existing locations */}
      {!isNew && location && (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Time Usage Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="mr-2 h-5 w-5 text-blue-600" />
                Oppsummert tidsbruk
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingTimeEntries ? (
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                  <div className="h-4 bg-gray-200 rounded w-2/3" />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-700">
                        {getTotalHours()}
                      </div>
                      <div className="text-sm text-blue-600">Timer totalt</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-700">
                        {locationTimeEntries.length}
                      </div>
                      <div className="text-sm text-green-600">Registreringer</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-3 bg-amber-50 rounded-lg">
                      <div className="text-2xl font-bold text-amber-700">
                        {getEdgeCuttingCount()}
                      </div>
                      <div className="text-sm text-amber-600 flex items-center justify-center">
                        <Scissors className="mr-1 h-3 w-3" />
                        Kantklipp utført
                      </div>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-700">
                        {getUniqueEmployees().length}
                      </div>
                      <div className="text-sm text-purple-600">Unike ansatte</div>
                    </div>
                  </div>

                  {getUniqueEmployees().length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2 flex items-center">
                        <Users className="mr-2 h-4 w-4" />
                        Ansatte som har jobbet her:
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {getUniqueEmployees().map((employeeName, index) => (
                          <Badge key={index} variant="outline">
                            {employeeName}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cost Estimate */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <DollarSign className="mr-2 h-5 w-5 text-green-600" />
                Kostnadsoverslag
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-600 mb-2">
                      Funksjon ikke implementert
                    </div>
                    <p className="text-sm text-gray-500">
                      For å beregne kostnader kan du legge til timelønn i ansattprofiler.
                    </p>
                  </div>
                </div>
                
                <div className="text-sm text-gray-600">
                  <h4 className="font-medium mb-2">Implementeringsforslag:</h4>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Legg til timelønn-felt i brukerprofilene</li>
                    <li>Beregn totalkostnad: timer × timelønn</li>
                    <li>Vis kostnad per ansatt og totalkostnad</li>
                    <li>Sammenlign kostnader over tid</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Historical Notes Section */}
      {!isNew && location && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="mr-2 h-5 w-5 text-purple-600" />
              Historiske notater fra timeregistreringer
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingTimeEntries ? (
              <div className="animate-pulse space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-200 rounded" />
                ))}
              </div>
            ) : getNotesFromTimeEntries().length > 0 ? (
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-3">
                  {getNotesFromTimeEntries().map((noteEntry, index) => (
                    <div key={index} className="border rounded-lg p-3 bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-gray-500" />
                          <span className="text-sm font-medium">
                            {formatDate(noteEntry.date)}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {noteEntry.hours} timer
                          </Badge>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {noteEntry.employeeName}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-700 bg-white p-2 rounded border">
                        {noteEntry.notes}
                      </p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FileText className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                <p>Ingen notater registrert for dette stedet ennå.</p>
                <p className="text-sm mt-2">
                  Notater fra timeregistreringer vil vises her når de blir lagt til.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Location Form Dialog */}
      <LocationFormDialog
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSubmit={handleSaveLocation}
        loading={loading}
        initialData={location ? {
          name: location.name,
          address: location.address,
          maintenanceFrequency: location.maintenanceFrequency,
          edgeCuttingFrequency: location.edgeCuttingFrequency,
          startWeek: location.startWeek,
          notes: location.notes || '',
        } : undefined}
        isNew={isNew}
      />
    </div>
  );
};

export default AdminLocations;