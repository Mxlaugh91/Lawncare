import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Location, TimeEntry } from '@/types';
import * as locationService from '@/services/locationService';
import * as timeEntryService from '@/services/timeEntryService';
import { 
  Archive, 
  ArrowLeft, 
  Clock, 
  Users, 
  DollarSign, 
  FileText,
  Calendar,
  MapPin,
  Scissors
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
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    maintenanceFrequency: 2,
    edgeCuttingFrequency: 4,
    startWeek: 18,
    notes: ''
  });

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
          setFormData({
            name: locationData.name,
            address: locationData.address,
            maintenanceFrequency: locationData.maintenanceFrequency,
            edgeCuttingFrequency: locationData.edgeCuttingFrequency,
            startWeek: locationData.startWeek,
            notes: locationData.notes || ''
          });

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name.includes('Frequency') || name === 'startWeek' ? parseInt(value) : value
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    try {
      if (isNew) {
        await locationService.addLocation(formData);
        toast({
          title: 'Suksess',
          description: 'Nytt sted ble opprettet',
        });
      } else if (id) {
        await locationService.updateLocation(id, formData);
        toast({
          title: 'Suksess',
          description: 'Stedet ble oppdatert',
        });
      }
      navigate('/admin/drift');
    } catch (error) {
      console.error('Error saving location:', error);
      toast({
        title: 'Feil',
        description: isNew 
          ? 'Kunne ikke opprette nytt sted. Prøv igjen senere.'
          : 'Kunne ikke oppdatere stedet. Prøv igjen senere.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
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

      {/* Location Information and Edit Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <MapPin className="mr-2 h-5 w-5" />
            {isNew ? 'Nytt sted' : location?.name || 'Laster...'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/4 mb-2" />
                  <div className="h-10 bg-gray-200 rounded" />
                </div>
              ))}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Navn *</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="address">Adresse *</Label>
                  <Input
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <Label htmlFor="maintenanceFrequency">
                      Frekvens Klipping (uker) *
                    </Label>
                    <Input
                      id="maintenanceFrequency"
                      name="maintenanceFrequency"
                      type="number"
                      min="1"
                      value={formData.maintenanceFrequency}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="edgeCuttingFrequency">
                      Frekvens kantklipping (uker) *
                    </Label>
                    <Input
                      id="edgeCuttingFrequency"
                      name="edgeCuttingFrequency"
                      type="number"
                      min="1"
                      value={formData.edgeCuttingFrequency}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="startWeek">Oppstartsuke *</Label>
                    <Input
                      id="startWeek"
                      name="startWeek"
                      type="number"
                      min="1"
                      max="52"
                      value={formData.startWeek}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="notes">Notater og instrukser</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    placeholder="Skriv eventuelle merknader eller instrukser her"
                    className="h-32"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate('/admin/drift')}
                >
                  Avbryt
                </Button>
                {!isNew && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleArchive}
                    disabled={loading}
                  >
                    <Archive className="mr-2 h-4 w-4" />
                    Arkiver sted
                  </Button>
                )}
                <Button type="submit" disabled={loading}>
                  {loading 
                    ? (isNew ? 'Oppretter...' : 'Lagrer...') 
                    : (isNew ? 'Opprett sted' : 'Lagre endringer')}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Historical Data Section - Only show for existing locations */}
      {!isNew && location && (
        <div className="grid gap-6 md:grid-cols-2">
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
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-700">
                        {getTotalHours()}
                      </div>
                      <div className="text-sm text-blue-600">Timer totalt</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-700">
                        {locationTimeEntries.length}
                      </div>
                      <div className="text-sm text-green-600">Registreringer</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-amber-50 rounded-lg">
                      <div className="text-2xl font-bold text-amber-700">
                        {getEdgeCuttingCount()}
                      </div>
                      <div className="text-sm text-amber-600 flex items-center justify-center">
                        <Scissors className="mr-1 h-3 w-3" />
                        Kantklipp utført
                      </div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
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
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
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
                <div className="space-y-4">
                  {getNotesFromTimeEntries().map((noteEntry, index) => (
                    <div key={index} className="border rounded-lg p-4 bg-gray-50">
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
                      <p className="text-sm text-gray-700 bg-white p-3 rounded border">
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
    </div>
  );
};

export default AdminLocations;