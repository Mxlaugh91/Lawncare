import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  FileSpreadsheet, 
  MapPin, 
  Users, 
  CheckCircle2, 
  ArrowRight
} from 'lucide-react';
import { useLocationStore, useEquipmentStore, useUserStore, useTimeEntryStore } from '@/store';
import { useToast } from '@/hooks/use-toast';
import { getISOWeekNumber } from '@/lib/utils';

const AdminDashboard = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    remainingLocations: 0,
    completedThisWeek: 0,
    totalLocations: 0,
    activeEmployees: 0
  });
  
  // Use Zustand stores
  const { locations, fetchLocations } = useLocationStore();
  const { mowers, fetchMowers } = useEquipmentStore();
  const { users, fetchUsers } = useUserStore();
  const { getRecentTimeEntries, getWeeklyAggregatedHoursByEmployee } = useTimeEntryStore();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch all required data in parallel
        await Promise.all([
          fetchLocations(),
          fetchMowers(),
          fetchUsers()
        ]);

        // Get weekly stats
        const weeklyHours = await getWeeklyAggregatedHoursByEmployee();
        
        // Calculate stats
        const activeLocations = locations.filter(loc => !loc.isArchived);
        const currentWeek = getISOWeekNumber(new Date());
        const completedThisWeek = activeLocations.filter(loc => {
          return loc.lastMaintenanceWeek === currentWeek;
        }).length;

        setStats({
          remainingLocations: activeLocations.length - completedThisWeek,
          completedThisWeek,
          totalLocations: activeLocations.length,
          activeEmployees: Object.keys(weeklyHours).length
        });
        
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

    fetchDashboardData();
  }, [fetchLocations, fetchMowers, fetchUsers, getWeeklyAggregatedHoursByEmployee, locations, toast]);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('no-NO', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Oversiktspanel</h1>
        <div className="flex space-x-2">
          <Button asChild>
            <Link to="/admin/steder/nytt">
              <MapPin className="mr-2 h-4 w-4" />
              Legg til nytt sted
            </Link>
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="h-20 bg-muted rounded-t-lg" />
              <CardContent className="p-6">
                <div className="h-6 bg-muted rounded w-1/2 mb-2" />
                <div className="h-8 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gjenstår</CardTitle>
              <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.remainingLocations}</div>
              <p className="text-xs text-muted-foreground">
                Steder som ikke er fullført
              </p>
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Fullført denne uken</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completedThisWeek}</div>
              <p className="text-xs text-muted-foreground">
                Steder fullført
              </p>
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Totalt aktive steder</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalLocations}</div>
              <p className="text-xs text-muted-foreground">
                steder i systemet
              </p>
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Aktive ansatte</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeEmployees}</div>
              <p className="text-xs text-muted-foreground">
                som har registrert timer denne uken
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Nylig aktivitet</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-4 animate-pulse">
                    <div className="h-12 w-12 rounded-full bg-muted" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-4 bg-muted rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Recent activity will be populated here */}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Snarveier</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button className="w-full justify-start" variant="outline" asChild>
                <Link to="/admin/drift">
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Drift
                </Link>
              </Button>
              <Button className="w-full justify-start" variant="outline" asChild>
                <Link to="/admin/steder">
                  <MapPin className="mr-2 h-4 w-4" />
                  Steder
                </Link>
              </Button>
              <Button className="w-full justify-start" variant="outline" asChild>
                <Link to="/admin/vedlikehold">
                  <Users className="mr-2 h-4 w-4" />
                  Vedlikehold
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;