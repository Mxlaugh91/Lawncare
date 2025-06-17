import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MapPin, CheckCircle2 } from 'lucide-react';
import { LocationWithStatus } from '@/types';
import * as locationService from '@/services/locationService';
import { useToast } from '@/hooks/use-toast';
import { getISOWeekNumber } from '@/lib/utils';

// Import the new components
import { OperationsHeader } from '@/components/admin/operations/OperationsHeader';
import { OperationsFilters } from '@/components/admin/operations/OperationsFilters';
import { LocationListTable } from '@/components/admin/operations/LocationListTable';
import { LocationMobileCards } from '@/components/admin/operations/LocationMobileCards';
import { OperationsStatsCards } from '@/components/admin/operations/OperationsStatsCards';

const Operations = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState<LocationWithStatus[]>([]);
  const [filteredLocations, setFilteredLocations] = useState<LocationWithStatus[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWeek, setSelectedWeek] = useState(getISOWeekNumber(new Date()));
  const [expandedLocationId, setExpandedLocationId] = useState<string | null>(null);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        setLoading(true);
        const locationsWithStatus = await locationService.getLocationsWithWeeklyStatus(selectedWeek);
        setLocations(locationsWithStatus);
        setFilteredLocations(locationsWithStatus);
      } catch (error) {
        console.error('Error fetching locations:', error);
        toast({
          title: 'Feil',
          description: 'Kunne ikke hente steder. Prøv igjen senere.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchLocations();
  }, [selectedWeek, toast]);

  useEffect(() => {
    let filtered = [...locations];
    
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(
        location => 
          location.name.toLowerCase().includes(lowerQuery) || 
          location.address.toLowerCase().includes(lowerQuery)
      );
    }
    
    setFilteredLocations(filtered);
  }, [searchQuery, locations]);

  const toggleLocationExpand = (locationId: string) => {
    setExpandedLocationId(expandedLocationId === locationId ? null : locationId);
  };

  const handleArchiveAll = async () => {
    try {
      setLoading(true);
      await Promise.all(locations.map(location => locationService.archiveLocation(location.id)));
      
      toast({
        title: 'Suksess',
        description: 'Alle steder ble arkivert',
      });
      
      // Refresh the locations list
      const locationsWithStatus = await locationService.getLocationsWithWeeklyStatus(selectedWeek);
      setLocations(locationsWithStatus);
      setFilteredLocations(locationsWithStatus);
    } catch (error) {
      console.error('Error archiving all locations:', error);
      toast({
        title: 'Feil',
        description: 'Kunne ikke arkivere alle steder. Prøv igjen senere.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Klippeliste</h1>
        <OperationsHeader onArchiveAll={handleArchiveAll} />
      </div>

      <Card>
        <CardContent className="p-6">
          <OperationsFilters
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            selectedWeek={selectedWeek}
            onWeekChange={setSelectedWeek}
          />

          <Tabs defaultValue="list" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="list">
                <MapPin className="mr-2 h-4 w-4" />
                Stedsliste
              </TabsTrigger>
              <TabsTrigger value="status">
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Status
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="list">
              {/* Mobile view */}
              <div className="md:hidden">
                <LocationMobileCards
                  filteredLocations={filteredLocations}
                  loading={loading}
                  expandedLocationId={expandedLocationId}
                  toggleLocationExpand={toggleLocationExpand}
                />
              </div>
              
              {/* Desktop view */}
              <div className="hidden md:block overflow-x-auto">
                <LocationListTable
                  filteredLocations={filteredLocations}
                  loading={loading}
                />
              </div>
            </TabsContent>
            
            <TabsContent value="status">
              <OperationsStatsCards
                locations={locations}
                loading={loading}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Operations;