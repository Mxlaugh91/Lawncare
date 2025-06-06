import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  CheckCircle2, 
  Clock, 
  Filter, 
  MapPin, 
  Scissors,
  Users, 
  Search,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Calendar,
  Archive,
  AlertCircle
} from 'lucide-react';
import { LocationWithStatus } from '@/types';
import * as locationService from '@/services/locationService';
import { useToast } from '@/hooks/use-toast';
import { getISOWeekNumber, getISOWeekDates } from '@/lib/utils';

interface LocationWithStatus extends Location {
  isDueForMaintenanceInSelectedWeek: boolean;
  isDueForEdgeCuttingInSelectedWeek: boolean;
  lastTimeEntry?: TimeEntry;
  isMaintenanceCompleted: boolean;
  isEdgeCuttingCompleted: boolean;
}

const WeekSelector = ({ selectedWeek, onWeekChange }: { 
  selectedWeek: number; 
  onWeekChange: (week: number) => void;
}) => {
  const weeks = Array.from({ length: 53 }, (_, i) => i + 1);
  const { start, end } = getISOWeekDates(selectedWeek);

  // Format dates using Norwegian locale
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('no-NO', {
      day: '2-digit',
      month: '2-digit'
    });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-[280px] justify-start">
          <Calendar className="mr-2 h-4 w-4" />
          Uke {selectedWeek} ({formatDate(start)} - {formatDate(end)})
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <div className="grid grid-cols-4 gap-2 p-4">
          {weeks.map(week => {
            const dates = getISOWeekDates(week);
            return (
              <Button
                key={week}
                variant={selectedWeek === week ? "default" : "ghost"}
                className="h-9 w-full"
                onClick={() => onWeekChange(week)}
              >
                {week}
              </Button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
};

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

  const getMaintenanceStatus = (location: LocationWithStatus) => {
    if (!location.isDueForMaintenanceInSelectedWeek) {
      return "Ikke planlagt denne uken";
    }
    switch (location.status) {
      case 'fullfort':
        return <span className="text-primary font-medium">Fullført</span>;
      case 'ikke_utfort':
        return <span className="text-destructive">Ikke utført</span>;
      default:
        return <span className="text-amber-600">Planlagt denne uken</span>;
    }
  };

  const getEdgeCuttingStatus = (location: LocationWithStatus) => {
    if (!location.isDueForEdgeCuttingInSelectedWeek) {
      return "Ikke planlagt denne uken";
    }
    switch (location.status) {
      case 'fullfort':
        return <span className="text-primary font-medium">Fullført</span>;
      case 'ikke_utfort':
        return <span className="text-destructive">Ikke utført</span>;
      default:
        return <span className="text-amber-600">Planlagt denne uken</span>;
    }
  };

  const renderMobileLocationCard = (location: LocationWithStatus) => {
    const isExpanded = expandedLocationId === location.id;

    return (
      <Card key={location.id} className="mb-4 card-hover">
        <CardContent className="p-4">
          <div 
            className="flex items-center justify-between cursor-pointer"
            onClick={() => toggleLocationExpand(location.id)}
          >
            <div>
              <div className="font-medium">{location.name}</div>
              <div className="text-sm text-muted-foreground">{location.address}</div>
            </div>
            <div className="flex items-center">
              {isExpanded ? <ChevronUp className="ml-2 h-4 w-4" /> : <ChevronDown className="ml-2 h-4 w-4" />}
            </div>
          </div>

          {isExpanded && (
            <div className="mt-4 space-y-3 border-t pt-3">
              <div>
                <div className="text-sm font-medium">Plenklipping</div>
                <div className="text-sm">
                  {getMaintenanceStatus(location)}
                </div>
              </div>

              <div>
                <div className="text-sm font-medium">Kantklipping</div>
                <div className="text-sm">
                  {getEdgeCuttingStatus(location)}
                </div>
              </div>

              {location.timeEntries && location.timeEntries.length > 0 && (
                <>
                  <div>
                    <div className="text-sm font-medium">Utført</div>
                    <div className="text-sm">
                      {new Intl.DateTimeFormat('no-NO', {
                          weekday 'long'
                      }).format(location.timeEntries[0].date.toDate())}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-medium">Tidsbruk</div>
                    <div className="text-sm">
                      {location.timeEntries[0].hours} timer
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-medium">Utført av</div>
                    <div className="text-sm">
                      {location.timeEntries[0].employeeName || 'Ikke registrert'}
                    </div>
                  </div>
                </>
              )}

              <div className="pt-2">
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <Link to={`/admin/steder/${location.id}`}>
                    Se detaljer
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderLocationTable = () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[250px]">Sted</TableHead>
          <TableHead className="hidden md:table-cell">Hovedvedlikehold</TableHead>
          <TableHead className="hidden md:table-cell">Kantklipping</TableHead>
          <TableHead className="hidden lg:table-cell">Sist utført</TableHead>
          <TableHead className="hidden lg:table-cell">Tidsbruk</TableHead>
          <TableHead className="hidden lg:table-cell">Utført av</TableHead>
          <TableHead className="text-right">Handlinger</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filteredLocations.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="h-24 text-center">
              Ingen steder funnet for valgt uke.
            </TableCell>
          </TableRow>
        ) : (
          filteredLocations.map((location) => (
            <TableRow key={location.id}>
              <TableCell>
                <div>
                  <div className="font-medium">{location.name}</div>
                  <div className="text-sm text-muted-foreground">{location.address}</div>
                </div>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                {getMaintenanceStatus(location)}
              </TableCell>
              <TableCell className="hidden md:table-cell">
                {getEdgeCuttingStatus(location)}
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                {location.timeEntries && location.timeEntries.length > 0 
                  ? new Intl.DateTimeFormat('no-NO', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    }).format(location.timeEntries[0].date.toDate())
                  : 'Ikke registrert'
                }
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                {location.timeEntries && location.timeEntries.length > 0 
                  ? `${location.timeEntries[0].hours} timer`
                  : '-'
                }
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                {location.timeEntries && location.timeEntries.length > 0 
                  ? location.timeEntries[0].employeeName 
                  : 'Ikke registrert'
                }
              </TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm" asChild>
                  <Link to={`/admin/steder/${location.id}`}>
                    Detaljer
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  const handleArchiveAll = async () => {
    try {
      setLoading(true);
      await Promise.all(locations.map(location => locationService.archiveLocation(location.id)));
      
      toast({
        title: 'Suksess',
        description: 'Alle steder ble arkivert',
      });
      
      // Refresh the locations list
      const activeLocations = await locationService.getActiveLocations();
      setLocations(activeLocations);
      setFilteredLocations(activeLocations);
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
        <h1 className="text-2xl font-bold tracking-tight">Drift</h1>
        <div className="flex space-x-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Archive className="mr-2 h-4 w-4" />
                Arkiver alle steder
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Er du sikker?</AlertDialogTitle>
                <AlertDialogDescription>
                  Dette vil arkivere alle aktive steder. Denne handlingen kan ikke angres.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Avbryt</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleArchiveAll}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  Arkiver alle
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button asChild>
            <Link to="/admin/steder/nytt">
              <MapPin className="mr-2 h-4 w-4" />
              Legg til nytt sted
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0 mb-6">
            <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4 md:items-center">
              <div className="relative flex-grow max-w-md">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Søk etter sted eller adresse..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <WeekSelector 
                selectedWeek={selectedWeek} 
                onWeekChange={setSelectedWeek} 
              />
            </div>
          </div>

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
              {loading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-16 bg-muted rounded-md" />
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  {/* Mobile view */}
                  <div className="md:hidden">
                    {filteredLocations.map(renderMobileLocationCard)}
                  </div>
                  
                  {/* Desktop view */}
                  <div className="hidden md:block overflow-x-auto">
                    {renderLocationTable()}
                  </div>
                </>
              )}
            </TabsContent>
            
            <TabsContent value="status">
              <div className="grid gap-4 md:grid-cols-3">
                <Card className="card-hover">
                  <CardContent className="p-6 flex flex-col items-center">
                    <div className="rounded-full bg-primary/10 p-3 mb-4">
                      <CheckCircle2 className="h-8 w-8 text-primary" />
                    </div>
                    <div className="text-3xl font-bold">
                      {locations.filter(loc => loc.isDueForMaintenanceInSelectedWeek).length}
                    </div>
                    <p className="text-sm text-muted-foreground text-center">
                      Steder planlagt for hovedvedlikehold denne uken
                    </p>
                  </CardContent>
                </Card>
                
                <Card className="card-hover">
                  <CardContent className="p-6 flex flex-col items-center">
                    <div className="rounded-full bg-amber-100 p-3 mb-4">
                      <Scissors className="h-8 w-8 text-amber-700" />
                    </div>
                    <div className="text-3xl font-bold">
                      {locations.filter(loc => loc.isDueForEdgeCuttingInSelectedWeek).length}
                    </div>
                    <p className="text-sm text-muted-foreground text-center">
                      Steder planlagt for kantklipping denne uken
                    </p>
                  </CardContent>
                </Card>
                
                <Card className="card-hover">
                  <CardContent className="p-6 flex flex-col items-center">
                    <div className="rounded-full bg-blue-100 p-3 mb-4">
                      <MapPin className="h-8 w-8 text-blue-700" />
                    </div>
                    <div className="text-3xl font-bold">
                      {locations.length}
                    </div>
                    <p className="text-sm text-muted-foreground text-center">
                      Totalt antall steder denne uken
                    </p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Operations;