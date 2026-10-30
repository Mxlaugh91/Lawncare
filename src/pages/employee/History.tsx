import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { History, MapPin, Clock } from 'lucide-react';
import { TimeEntry } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import * as timeEntryService from '@/services/timeEntryService';
import { useToast } from '@/hooks/use-toast';
import { getISOWeekNumber, getISOWeekDates } from '@/lib/utils';

const startOfDay = (date: Date): Date => {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
};

const endOfDay = (date: Date): Date => {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
};

const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

// ISO year of a date (can differ from the calendar year around New Year).
const getISOWeekYear = (date: Date): number => {
  const target = new Date(date.valueOf());
  const dayNumber = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNumber + 3);
  return target.getFullYear();
};

const safeToDate = (value: unknown): Date | null => {
  if (!value) return null;
  const maybeTimestamp = value as { toDate?: () => Date };
  if (typeof maybeTimestamp.toDate !== 'function') return null;
  try {
    return maybeTimestamp.toDate();
  } catch (error) {
    console.error('Could not read timestamp:', error);
    return null;
  }
};

const EmployeeHistory = () => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [periodFilter, setPeriodFilter] = useState('this-week');
  const [statistics, setStatistics] = useState({
    totalHours: 0,
    totalLocations: 0,
    averageTimePerLocation: 0
  });

  useEffect(() => {
    const fetchTimeEntries = async () => {
      if (!currentUser) return;

      try {
        setLoading(true);
        
        let startDate: Date | undefined;
        let endDate: Date | undefined;
        
        const now = new Date();
        // ISO weeks start on Monday; use the shared helpers for consistency
        // with the rest of the app.
        const currentWeek = getISOWeekNumber(now);
        const { start: thisWeekStart } = getISOWeekDates(currentWeek, getISOWeekYear(now));
        
        switch (periodFilter) {
          case 'today':
            startDate = startOfDay(now);
            endDate = endOfDay(now);
            break;
          case 'this-week':
            startDate = startOfDay(thisWeekStart);
            endDate = endOfDay(addDays(thisWeekStart, 6));
            break;
          case 'last-week':
            startDate = startOfDay(addDays(thisWeekStart, -7));
            endDate = endOfDay(addDays(thisWeekStart, -1));
            break;
          case 'this-month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
            // Last day of the month, ending at 23:59:59.999 so no entries are dropped.
            endDate = endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0));
            break;
          case 'last-month':
            startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
            endDate = endOfDay(new Date(now.getFullYear(), now.getMonth(), 0));
            break;
        }
        
        const entries = await timeEntryService.getTimeEntriesForEmployee(
          currentUser.uid,
          startDate,
          endDate
        );
        
        setTimeEntries(entries);
        
        // Calculate statistics
        const totalHours = entries.reduce((sum, entry) => sum + entry.hours, 0);
        const uniqueLocations = new Set(entries.map(entry => entry.locationId)).size;
        
        setStatistics({
          totalHours,
          totalLocations: uniqueLocations,
          averageTimePerLocation: uniqueLocations > 0 ? totalHours / uniqueLocations : 0
        });
      } catch (error) {
        console.error('Error fetching time entries:', error);
        toast({
          title: t('common.error'),
          description: t('errors.couldNotFetchData'),
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchTimeEntries();
  }, [currentUser, periodFilter, toast]);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('no-NO', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Guards against missing/malformed timestamps so a single bad document
  // cannot blank the whole route.
  const formatEntryDate = (date: unknown) => {
    const value = safeToDate(date);
    return value ? formatDate(value) : '-';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{t('history.title')}</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('history.totalTimeUsed')}</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.totalHours.toFixed(1)} {t('common.hours')}</div>
            <p className="text-xs text-muted-foreground">
              {t('history.totalTimeDescription')}
            </p>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('history.numberOfLocations')}</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.totalLocations}</div>
            <p className="text-xs text-muted-foreground">
              {t('history.locationsDescription')}
            </p>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('history.average')}</CardTitle>
            <History className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.averageTimePerLocation.toFixed(1)} {t('common.hours')}</div>
            <p className="text-xs text-muted-foreground">
              {t('history.averageDescription')}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('history.timeEntries')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Label htmlFor="period-filter">{t('history.period')}</Label>
            <Select
              value={periodFilter}
              onValueChange={setPeriodFilter}
            >
              <SelectTrigger id="period-filter" className="w-[200px]">
                <SelectValue placeholder={t('history.selectPeriod')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">{t('history.today')}</SelectItem>
                <SelectItem value="this-week">{t('history.thisWeek')}</SelectItem>
                <SelectItem value="last-week">{t('history.lastWeek')}</SelectItem>
                <SelectItem value="this-month">{t('history.thisMonth')}</SelectItem>
                <SelectItem value="last-month">{t('history.lastMonth')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-16 bg-muted rounded-md" />
                </div>
              ))}
            </div>
          ) : timeEntries.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('common.date')}</TableHead>
                  <TableHead>{t('common.hours')}</TableHead>
                  <TableHead className="hidden md:table-cell">{t('history.edgeCuttingDone')}</TableHead>
                  <TableHead className="hidden md:table-cell">{t('common.notes')}</TableHead>
                  <TableHead className="text-right">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {timeEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{formatEntryDate(entry.date)}</TableCell>
                    <TableCell>{entry.hours} {t('common.hours')}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      {entry.edgeCuttingDone ? t('common.yes') : t('common.no')}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {entry.notes || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        {t('common.details')}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {t('history.noEntriesFound')}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeeHistory;