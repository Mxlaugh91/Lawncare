import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Location } from '@/types';
import * as locationService from '@/services/locationService';
import { Archive } from 'lucide-react';

interface LocationsProps {
  isNew?: boolean;
}

const AdminLocations = ({ isNew }: LocationsProps) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState<Location | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    maintenanceFrequency: 2,
    edgeCuttingFrequency: 4,
    startWeek: 18,
    notes: ''
  });

  useEffect(() => {
    const fetchLocation = async () => {
      if (!id || isNew) {
        setLoading(false);
        return;
      }

      try {
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
        } else {
          toast({
            title: 'Feil',
            description: 'Fant ikke stedet',
            variant: 'destructive',
          });
          navigate('/admin/drift');
        }
      } catch (error) {
        console.error('Error fetching location:', error);
        toast({
          title: 'Feil',
          description: 'Kunne ikke hente stedsdata. Prøv igjen senere.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchLocation();
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">
          {isNew ? 'Legg til nytt sted' : 'Rediger sted'}
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{isNew ? 'Nytt sted' : location?.name || 'Laster...'}</CardTitle>
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
                      Frekvens hovedvedlikehold (uker) *
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
    </div>
  );
};

export default AdminLocations;