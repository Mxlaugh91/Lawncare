import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Clock, 
  MapPin, 
  CheckCircle2,
  AlertCircle,
  ChevronRight
} from 'lucide-react';
import { Location, Mower, ServiceInterval } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import * as locationService from '@/services/locationService';
import * as equipmentService from '@/services/equipmentService';
import * as timeEntryService from '@/services/timeEntryService';
import { useToast } from '@/hooks/use-toast';

const EmployeeDashboard = () => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [pendingLocations, setPendingLocations] = useState<Location[]>([]);
  const [mowersNeedingService, setMowersNeedingService] = useState<Array<{
    mower: Mower;
    intervals: ServiceInterval[];
  }>>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) return;

      try {
        setLoading(true);
        
        // Get locations due for service
        const dueLocations = await locationService.getLocationsDueForService();
        setPendingLocations(dueLocations);
        
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
  }, [currentUser, toast]);

  const getCurrentWeek = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const diff = now.getTime() - start.getTime();
    const oneWeek = 604800000;
    return Math.ceil(diff / oneWeek);
  };

  const currentWeek = getCurrentWeek();

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
              Steder som gjenstår
            </CardTitle>
            <CardDescription>
              Uke {currentWeek} - Steder som trenger vedlikehold
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
            ) : pendingLocations.length > 0 ? (
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-3">
                  {pendingLocations.map((location) => (
                    <div key={location.id} className="rounded-md border p-4 transition-all hover:bg-muted">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{location.name}</h4>
                          <p className="text-sm text-muted-foreground">{location.address}</p>
                        </div>
                        <div className="flex items-center">
                          {(currentWeek - (location.lastEdgeCuttingWeek || 0)) >= location.edgeCuttingFrequency && (
                            <Badge className="mr-2\" variant="outline">Kantklipp</Badge>
                          )}
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="flex flex-col items-center justify-center h-[200px] text-center p-4">
                <CheckCircle2 className="h-12 w-12 text-primary mb-4" />
                <h3 className="text-lg font-medium">Alle oppgaver er fullført!</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Det er ingen steder som trenger vedlikehold for øyeblikket.
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
    </div>
  );
};

export default EmployeeDashboard;