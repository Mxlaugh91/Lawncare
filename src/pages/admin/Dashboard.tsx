import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
import { useLocationStore } from '@/store/locationStore';
import { useTimeEntryStore } from '@/store/timeEntryStore';
import { useToast } from '@/hooks/use-toast';
import { getISOWeekNumber } from '@/lib/utils';
import { TimeEntry } from '@/types';

const AdminDashboard = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    remainingLocations: 0,
    completedThisWeek: 0,
    totalLocations: 0,
    activeEmployees: 0
  });
  
  const [recentActivity, setRecentActivity] = useState<TimeEntry[]>([]);

  // Use Zustand stores
  const { locations, fetchLocations } = useLocationStore();
  const { getWeeklyAggregatedHoursByEmployee, getRecentTimeEntries } = useTimeEntryStore();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch locations if not already loaded
        if (locations.length === 0) {
          await fetchLocations();
        }

        // Get weekly stats (cached by Zustand)
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

        // Get recent activity
        const recent = await getRecentTimeEntries(5);
        setRecentActivity(recent);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        toast({
          title: t('common.error'),
          description: t('errors.couldNotFetchData'),
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [locations, fetchLocations, getWeeklyAggregatedHoursByEmployee, getRecentTimeEntries, toast]);

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
        <h1 className="text-2xl font-bold tracking-tight">{t('dashboard.title')}</h1>
        <div className="flex space-x-2">
          <Button asChild>
            <Link to="/admin/steder/nytt">
              <MapPin className="mr-2 h-4 w-4" />
              {t('dashboard.addNewLocation')}
            </Link>
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-6 bg-muted rounded w-1/2 mb-2" />
                <div className="h-8 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
          <Card className="card-hover">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="rounded-full bg-primary/10 p-2">
                    <FileSpreadsheet className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t('dashboard.remaining')}</p>
                    <p className="text-xs text-muted-foreground">{t('dashboard.remainingDescription')}</p>
                  </div>
                </div>
                <div className="text-2xl font-bold">{stats.remainingLocations}</div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="rounded-full bg-green-100 p-2">
                    <CheckCircle2 className="h-4 w-4 text-green-700" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t('dashboard.completedThisWeek')}</p>
                    <p className="text-xs text-muted-foreground">{t('dashboard.completedDescription')}</p>
                  </div>
                </div>
                <div className="text-2xl font-bold">{stats.completedThisWeek}</div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="rounded-full bg-blue-100 p-2">
                    <MapPin className="h-4 w-4 text-blue-700" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t('dashboard.totalActiveLocations')}</p>
                    <p className="text-xs text-muted-foreground">{t('dashboard.totalDescription')}</p>
                  </div>
                </div>
                <div className="text-2xl font-bold">{stats.totalLocations}</div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="rounded-full bg-amber-100 p-2">
                    <Users className="h-4 w-4 text-amber-700" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t('dashboard.activeEmployees')}</p>
                    <p className="text-xs text-muted-foreground">{t('dashboard.employeesDescription')}</p>
                  </div>
                </div>
                <div className="text-2xl font-bold">{stats.activeEmployees}</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>{t('dashboard.recentActivity')}</CardTitle>
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
            ) : recentActivity.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  {t('dashboard.noRecentActivity')}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentActivity.map((activity, i) => (
                  <div key={activity.id}>
                    {i > 0 && <Separator className="my-4" />}
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium">{activity.locationName}</h4>
                        <p className="text-sm text-muted-foreground">
                          {activity.employeeName} • {formatDate(activity.date.toDate())}
                        </p>
                      </div>
                      <Button variant="ghost" size="icon" asChild>
                        <Link to={`/admin/drift`}>
                          <ArrowRight className="h-4 w-4" />
                          <span className="sr-only">Vis detaljer</span>
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>{t('dashboard.shortcuts')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button className="w-full justify-start" variant="outline" asChild>
                <Link to="/admin/drift">
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  {t('navigation.operations')}
                </Link>
              </Button>
              <Button className="w-full justify-start" variant="outline" asChild>
                <Link to="/admin/steder">
                  <MapPin className="mr-2 h-4 w-4" />
                  {t('navigation.locations')}
                </Link>
              </Button>
              <Button className="w-full justify-start" variant="outline" asChild>
                <Link to="/admin/vedlikehold">
                  <Users className="mr-2 h-4 w-4" />
                  {t('navigation.equipment')}
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