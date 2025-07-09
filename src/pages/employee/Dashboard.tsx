import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LocationDetailModal } from '@/components/LocationDetailModal';
import { 
  Clock, 
  MapPin, 
  CheckCircle2,
  AlertCircle,
  ChevronRight
} from 'lucide-react';
import { LocationWithStatus, Mower, ServiceInterval, Location } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import * as locationService from '@/services/locationService';
import * as equipmentService from '@/services/equipmentService';
import * as timeEntryService from '@/services/timeEntryService';
import { useToast } from '@/hooks/use-toast';
import { getISOWeekNumber } from '@/lib/utils';

const getStatusBadge = (location: LocationWithStatus) => {
  if (!location.isDueForMaintenanceInSelectedWeek && !location.isDueForEdgeCuttingInSelectedWeek) {
    return null;
  }

  switch (location.status) {
    case 'fullfort':
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100 ml-2">
          Fullført
        </Badge>
      );
    case 'ikke_utfort':
      return (
        <Badge variant="destructive" className="ml-2">
          Ikke utført
        </Badge>
      );
    default:
      return (
        <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100 ml-2">
          Planlagt
        </Badge>
      );
  }
};

const EmployeeDashboard = () => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [locationsForCurrentWeek, setLocationsForCurrentWeek] = useState<LocationWithStatus[]>([]);
  const [mowersNeedingService, setMowersNeedingService] = useState<Array<{
    mower: Mower;
    intervals: ServiceInterval[];
  }>>([]);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  const currentWeek = getISOWeekNumber(new Date());

  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) return;

      try {
        setLoading(true);
        
        // Get locations with weekly status for current week
        const locationsWithStatus = await locationService.getLocationsWithWeeklyStatus(currentWeek);
        
        // Filter locations that are relevant for employees
        const relevantLocations = locationsWithStatus.filter(loc => {
          // Show locations that are due for maintenance or edge cutting this week
          if (!(loc.isDueForMaintenanceInSelectedWeek || loc.isDueForEdgeCuttingInSelectedWeek)) return false;
          
          // If completed, show it
          if (loc.status === 'fullfort') return true;
          
          // If not done and has tagged employees, only show if current user is tagged
          if (loc.status === 'ikke_utfort') {
            if (!loc.taggedEmployees || loc.taggedEmployees.length === 0) return false;
            return loc.taggedEmployees.some(emp => emp.id === currentUser?.uid);
          } 
          
          // Show planned tasks
          return true;
        });

        setLocationsForCurrentWeek(relevantLocations);
        
        // Get mowers needing service
        const mowersNeedingService = await equipmentService.getMowersNeedingService();
        setMowersNeedingService(mowersNeedingService.map(mower => ({
          mower,
          intervals: mower.serviceIntervals?.filter(interval => {
            const lastResetHours = interval.lastResetHours || 0;
            return (mower.totalHours - lastResetHours) >= interval.hourInterval;
          }) || []
        })));
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        toast({
          title: 'Feil',
          description: 'Kunne ikke hente dashboarddata. Prøv igjen senere.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser, toast, currentWeek]);

  const handleServiceReset = async (mowerId: string, intervalId: string) => {
    if (!currentUser) return;

    try {
      await equipmentService.resetServiceInterval(mowerId, intervalId, currentUser.uid);
      
      // Refresh mowers data
      const updatedMowers = await equipmentService.getMowersNeedingService();
      setMowersNeedingService(updatedMowers.map(mower => ({
        mower,
        intervals: mower.serviceIntervals?.filter(interval => {
          const lastResetHours = interval.lastResetHours || 0;
          return (mower.totalHours - lastResetHours) >= interval.hourInterval;
        }) || []
      })));
      
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

  const handleLocationClick = (location: LocationWithStatus) => {
    setSelectedLocation(location);
    setIsLocationModalOpen(true);
  };

  const handleCloseLocationModal = () => {
    setIsLocationModalOpen(false);
    setSelectedLocation(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Oversikt</h1>
        <div className="flex space-x-2">
          <Button asChild>
            <Link to="/employee/timeregistrering">
              <Clock className="mr-2 h-4 w-4" />
              Registrer timer
            </Link>
          </Button>
        </div>
      </div>

      {mowersNeedingService.length > 0 && (
        <Alert className="bg-amber-50 border-amber-200">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800">Utstyr trenger vedlikehold</AlertTitle>
          <AlertDescription className="text-amber-700">
            {mowersNeedingService.length} gressklipper(e) trenger service. Sjekk listen nedenfor.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="col-span-2 md:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center">
              <MapPin className="mr-2 h-5 w-5 text-primary" />
              Ukens oppgaver
            </CardTitle>
            <CardDescription>
              Uke {currentWeek} - Alle oppgaver for denne uken
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-16 bg-muted rounded-md" />
                  </div>
                ))}
              </div>
            ) : locationsForCurrentWeek.length > 0 ? (
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-3">
                  {locationsForCurrentWeek.map((location) => {
                    const statusBadge = getStatusBadge(location);
                    
                    return (
                      <div 
                        key={location.id} 
                        className="rounded-md border p-4 transition-all hover:bg-muted cursor-pointer"
                        onClick={() => handleLocationClick(location)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center mb-1">
                              <h4 className="font-medium truncate">{location.name}</h4>
                              {statusBadge}
                            </div>
                            <p className="text-sm text-muted-foreground truncate">{location.address}</p>
                            <div className="flex gap-2 mt-2">
                              {location.isDueForEdgeCuttingInSelectedWeek && (
                                <Badge variant="outline" className="text-xs">Kantklipp</Badge>
                              )}
                              {location.isDueForMaintenanceInSelectedWeek && (
                                <Badge variant="outline" className="text-xs">Gressklipp</Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center ml-2">
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            ) : (
              <div className="flex flex-col items-center justify-center h-[200px] text-center p-4">
                <CheckCircle2 className="h-12 w-12 text-primary mb-4" />
                <h3 className="text-lg font-medium">Ingen oppgaver denne uken!</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Det er ingen steder som trenger klipping for øyeblikket.
                </p>
              </div>
            )}
          </CardContent>
          <CardFooter className="border-t pt-4">
            <Button variant="outline" className="w-full" asChild>
              <Link to="/employee/timeregistrering">
                Registrer Timer
              </Link>
            </Button>
          </CardFooter>
        </Card>

        <Card className="col-span-2 md:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertCircle className="mr-2 h-5 w-5 text-amber-600" />
              Servicevarsler
            </CardTitle>
            <CardDescription>
              Utstyr som trenger vedlikehold
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-24 bg-muted rounded-md" />
                  </div>
                ))}
              </div>
            ) : mowersNeedingService.length > 0 ? (
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-4">
                  {mowersNeedingService.map((item) => (
                    <div key={item.mower.id} className="rounded-md border p-4">
                      <h4 className="font-medium">{item.mower.name}</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        {item.mower.model} • {item.mower.totalHours} timer totalt
                      </p>
                      
                      <Separator className="my-2" />
                      
                      <div className="mt-3 space-y-2">
                        {item.intervals.map((interval) => (
                          <div key={interval.id} className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium">{interval.description}</p>
                              <p className="text-xs text-muted-foreground">
                                Intervall: {interval.hourInterval} timer • 
                                Overtid: {item.mower.totalHours - (interval.lastResetHours || 0) - interval.hourInterval} timer
                              </p>
                            </div>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleServiceReset(item.mower.id, interval.id)}
                            >
                              Nullstill
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="flex flex-col items-center justify-center h-[200px] text-center p-4">
                <CheckCircle2 className="h-12 w-12 text-primary mb-4" />
                <h3 className="text-lg font-medium">Alt utstyr er vedlikeholdt!</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Det er ingen gressklippere som trenger service for øyeblikket.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Location Detail Modal */}
      <LocationDetailModal
        isOpen={isLocationModalOpen}
        onClose={handleCloseLocationModal}
        location={selectedLocation}
      />
    </div>
  );
};

export default EmployeeDashboard;