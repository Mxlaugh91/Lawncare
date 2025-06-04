import { useState, useEffect } from 'react';
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

const EmployeeHistory = () => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
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
        
        switch (periodFilter) {
          case 'today':
            startDate = new Date(now.setHours(0, 0, 0, 0));
            endDate = new Date(now.setHours(23, 59, 59, 999));
            break;
          case 'this-week':
            startDate = new Date(now.setDate(now.getDate() - now.getDay()));
            endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + 6);
            break;
          case 'last-week':
            startDate = new Date(now.setDate(now.getDate() - now.getDay() - 7));
            endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + 6);
            break;
          case 'this-month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            break;
          case 'last-month':
            startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            endDate = new Date(now.getFullYear(), now.getMonth(), 0);
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
          title: 'Feil',
          description: 'Kunne ikke hente timeregistreringer. Prøv igjen senere.',
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Min historikk</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total tidsbruk</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.totalHours.toFixed(1)} timer</div>
            <p className="text-xs text-muted-foreground">
              i valgt periode
            </p>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Antall steder</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.totalLocations}</div>
            <p className="text-xs text-muted-foreground">
              unike steder besøkt
            </p>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gjennomsnitt</CardTitle>
            <History className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.averageTimePerLocation.toFixed(1)} timer</div>
            <p className="text-xs text-muted-foreground">
              per sted
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Timeregistreringer</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Label htmlFor="period-filter">Periode</Label>
            <Select
              value={periodFilter}
              onValueChange={setPeriodFilter}
            >
              <SelectTrigger id="period-filter" className="w-[200px]">
                <SelectValue placeholder="Velg periode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">I dag</SelectItem>
                <SelectItem value="this-week">Denne uken</SelectItem>
                <SelectItem value="last-week">Forrige uke</SelectItem>
                <SelectItem value="this-month">Denne måneden</SelectItem>
                <SelectItem value="last-month">Forrige måned</SelectItem>
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
                  <TableHead>Dato</TableHead>
                  <TableHead>Timer</TableHead>
                  <TableHead className="hidden md:table-cell">Kantklipping</TableHead>
                  <TableHead className="hidden md:table-cell">Notater</TableHead>
                  <TableHead className="text-right">Handlinger</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {timeEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{formatDate(entry.date.toDate())}</TableCell>
                    <TableCell>{entry.hours} timer</TableCell>
                    <TableCell className="hidden md:table-cell">
                      {entry.edgeCuttingDone ? 'Ja' : 'Nei'}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {entry.notes || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        Detaljer
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                Ingen timeregistreringer funnet for valgt periode.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeeHistory;