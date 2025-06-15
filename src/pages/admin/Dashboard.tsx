import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  FileSpreadsheet, 
  MapPin, 
  Users, 
  CheckCircle2, 
  ArrowRight,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { useLocationStore } from '@/store/locationStore';
import { useTimeEntryStore } from '@/store/timeEntryStore';
import { useToast } from '@/hooks/use-toast';
import { getISOWeekNumber } from '@/lib/utils';
import { TimeEntry } from '@/types';

interface DashboardStats {
  remainingLocations: number;
  completedThisWeek: number;
  totalLocations: number;
  activeEmployees: number;
}

interface DashboardError {
  message: string;
  action?: () => void;
}

const AdminDashboard = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<DashboardError | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    remainingLocations: 0,
    completedThisWeek: 0,
    totalLocations: 0,
    activeEmployees: 0
  });
  
  const [recentActivity, setRecentActivity] = useState<TimeEntry[]>([]);

  // Use Zustand stores
  const { locations, fetchLocations, isLoading: locationsLoading } = useLocationStore();
  const { getWeeklyAggregatedHoursByEmployee, getRecentTimeEntries } = useTimeEntryStore();

  // Memoized current week calculation
  const currentWeek = useMemo(() => getISOWeekNumber(new Date()), []);

  const fetchDashboardData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      
      // Fetch locations if not already loaded or if refreshing
      if (locations.length === 0 || isRefresh) {
        await fetchLocations();
      }

      // Get weekly stats (cached by Zustand)
      const weeklyHours = await getWeeklyAggregatedHoursByEmployee();
      
      // Calculate stats with better error handling
      const activeLocations = locations.filter(loc => loc && !loc.isArchived);
      const completedThisWeek = activeLocations.filter(loc => {
        return loc.lastMaintenanceWeek === currentWeek;
      }).length;

      const newStats: DashboardStats = {
        remainingLocations: Math.max(0, activeLocations.length - completedThisWeek),
        completedThisWeek,
        totalLocations: activeLocations.length,
        activeEmployees: Object.keys(weeklyHours || {}).length
      };

      setStats(newStats);

      // Get recent activity with error handling
      try {
        const recent = await getRecentTimeEntries(5);
        setRecentActivity(Array.isArray(recent) ? recent : []);
      } catch (activityError) {
        console.warn('Could not fetch recent activity:', activityError);
        setRecentActivity([]);
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Ukjent feil oppstod';
      
      setError({
        message: `Kunne ikke hente dashboarddata: ${errorMessage}`,
        action: () => fetchDashboardData(true)
      });
      
      toast({
        title: 'Feil ved lasting av dashboard',
        description: 'Kunne ikke hente alle data. Prøv å oppdatere siden.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [locations, fetchLocations, getWeeklyAggregatedHoursByEmployee, getRecentTimeEntries, toast, currentWeek]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const formatDate = useCallback((date: Date) => {
    return new Intl.DateTimeFormat('no-NO', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }, []);

  const handleRefresh = useCallback(() => {
    fetchDashboardData(true);
  }, [fetchDashboardData]);

  // Loading skeleton component
  const StatCardSkeleton = () => (
    <Card className="animate-pulse">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
          <Skeleton className="h-8 w-12" />
        </div>
      </CardContent>
    </Card>
  );

  const ActivitySkeleton = () => (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="flex items-center justify-between">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-8 w-8" />
          </div>
          {i < 2 && <Separator className="my-4" />}
        </div>
      ))}
    </div>
  );

  // Error display component
  const ErrorDisplay = ({ error }: { error: DashboardError }) => (
    <Card className="border-destructive/50 bg-destructive/5">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-destructive">{error.message}</p>
          </div>
          {error.action && (
            <Button
              variant="outline"
              size="sm"
              onClick={error.action}
              disabled={refreshing}
            >
              {refreshing ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                'Prøv igjen'
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  // Stats card data with better accessibility
  const statsCards = [
    {
      key: 'remaining',
      title: 'Gjenstår',
      description: 'Steder som ikke er fullført',
      value: stats.remainingLocations,
      icon: FileSpreadsheet,
      colorClass: 'bg-primary/10 text-primary',
      ariaLabel: `${stats.remainingLocations} steder gjenstår å fullføre`
    },
    {
      key: 'completed',
      title: 'Fullført denne uken',
      description: 'Steder fullført',
      value: stats.completedThisWeek,
      icon: CheckCircle2,
      colorClass: 'bg-green-100 text-green-700',
      ariaLabel: `${stats.completedThisWeek} steder fullført denne uken`
    },
    {
      key: 'total',
      title: 'Totalt aktive steder',
      description: 'steder i systemet',
      value: stats.totalLocations,
      icon: MapPin,
      colorClass: 'bg-blue-100 text-blue-700',
      ariaLabel: `${stats.totalLocations} totalt aktive steder`
    },
    {
      key: 'employees',
      title: 'Aktive ansatte',
      description: 'som har registrert timer denne uken',
      value: stats.activeEmployees,
      icon: Users,
      colorClass: 'bg-amber-100 text-amber-700',
      ariaLabel: `${stats.activeEmployees} aktive ansatte denne uken`
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Oversiktspanel</h1>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing || loading}
            aria-label="Oppdater dashboard"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Oppdater
          </Button>
          <Button asChild>
            <Link to="/admin/steder/nytt">
              <MapPin className="mr-2 h-4 w-4" />
              Legg til nytt sted
            </Link>
          </Button>
        </div>
      </div>

      {error && <ErrorDisplay error={error} />}

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          [...Array(4)].map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          statsCards.map((card) => {
            const IconComponent = card.icon;
            return (
              <Card key={card.key} className="card-hover transition-all duration-200 hover:shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`rounded-full p-2 ${card.colorClass}`}>
                        <IconComponent className="h-4 w-4" aria-hidden="true" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                        <p className="text-xs text-muted-foreground">{card.description}</p>
                      </div>
                    </div>
                    <div 
                      className="text-2xl font-bold"
                      aria-label={card.ariaLabel}
                    >
                      {card.value}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Recent Activity */}
        <Card className="col-span-4">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle>Nylig aktivitet</CardTitle>
            {!loading && recentActivity.length > 0 && (
              <Button variant="ghost" size="sm" asChild>
                <Link to="/admin/drift">
                  Se alle
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {loading ? (
              <ActivitySkeleton />
            ) : recentActivity.length === 0 ? (
              <div className="text-center py-8">
                <FileSpreadsheet className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">
                  Ingen nylig aktivitet
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Aktivitet vil vises her når ansatte registrerer timer
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentActivity.map((activity, i) => (
                  <div key={activity.id}>
                    {i > 0 && <Separator className="my-4" />}
                    <div className="flex items-center justify-between group">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium truncate">{activity.locationName}</h4>
                        <p className="text-sm text-muted-foreground">
                          {activity.employeeName} • {formatDate(activity.date.toDate())}
                        </p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        asChild
                        className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2"
                      >
                        <Link to={`/admin/drift`} aria-label="Vis detaljer for aktivitet">
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Snarveier</CardTitle>
          </CardHeader>
          <CardContent>
            <nav className="space-y-2" role="navigation" aria-label="Hovednavigering">
              <Button className="w-full justify-start" variant="outline" asChild>
                <Link to="/admin/drift">
                  <FileSpreadsheet className="mr-2 h-4 w-4" aria-hidden="true" />
                  Drift
                </Link>
              </Button>
              <Button className="w-full justify-start" variant="outline" asChild>
                <Link to="/admin/steder">
                  <MapPin className="mr-2 h-4 w-4" aria-hidden="true" />
                  Steder
                </Link>
              </Button>
              <Button className="w-full justify-start" variant="outline" asChild>
                <Link to="/admin/vedlikehold">
                  <Users className="mr-2 h-4 w-4" aria-hidden="true" />
                  Vedlikehold
                </Link>
              </Button>
            </nav>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;