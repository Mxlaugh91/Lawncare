import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
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
import { Search, ArchiveRestore, Trash2 } from 'lucide-react';
import { Location } from '@/types';
import * as locationService from '@/services/locationService';
import { useToast } from '@/hooks/use-toast';

const AdminArchive = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [archivedLocations, setArchivedLocations] = useState<Location[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredLocations, setFilteredLocations] = useState<Location[]>([]);

  const fetchArchivedLocations = async () => {
    try {
      setLoading(true);
      const locations = await locationService.getArchivedLocations();
      setArchivedLocations(locations);
      setFilteredLocations(locations);
    } catch (error) {
      console.error('Error fetching archived locations:', error);
      toast({
        title: 'Feil',
        description: 'Kunne ikke hente arkiverte steder. Prøv igjen senere.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArchivedLocations();
  }, [toast]);

  useEffect(() => {
    // Filter locations based on search query
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      const filtered = archivedLocations.filter(
        location => 
          location.name.toLowerCase().includes(lowerQuery) || 
          location.address.toLowerCase().includes(lowerQuery)
      );
      setFilteredLocations(filtered);
    } else {
      setFilteredLocations(archivedLocations);
    }
  }, [searchQuery, archivedLocations]);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('no-NO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  };

  const handleRestore = async (locationId: string) => {
    try {
      await locationService.restoreLocation(locationId);
      
      // Update the local state
      const updatedLocations = archivedLocations.filter(loc => loc.id !== locationId);
      setArchivedLocations(updatedLocations);
      setFilteredLocations(updatedLocations);
      
      toast({
        title: 'Suksess',
        description: 'Stedet ble gjenopprettet',
      });
    } catch (error) {
      console.error('Error restoring location:', error);
      toast({
        title: 'Feil',
        description: 'Kunne ikke gjenopprette stedet. Prøv igjen senere.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteAll = async () => {
    try {
      setLoading(true);
      await locationService.deleteAllLocations();
      setArchivedLocations([]);
      setFilteredLocations([]);
      toast({
        title: 'Suksess',
        description: 'Alle arkiverte steder ble slettet',
      });
    } catch (error) {
      console.error('Error deleting all locations:', error);
      toast({
        title: 'Feil',
        description: 'Kunne ikke slette alle steder. Prøv igjen senere.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Arkiv</h1>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Slett alle arkiverte steder
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Er du helt sikker?</AlertDialogTitle>
              <AlertDialogDescription>
                Dette vil permanent slette alle arkiverte steder. Denne handlingen kan ikke angres.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Avbryt</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteAll}
                className="bg-red-500 hover:bg-red-600"
              >
                Ja, slett alle
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Arkiverte steder</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4">
            <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4 md:items-center">
              <div className="relative flex-grow max-w-md">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Søk i arkivet..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sted</TableHead>
                    <TableHead>Sist oppdatert</TableHead>
                    <TableHead>Opprettet</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Handlinger</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24">
                        <div className="flex items-center justify-center">
                          Laster arkiverte steder...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredLocations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24">
                        <div className="flex flex-col items-center justify-center text-center">
                          <p className="text-sm text-muted-foreground">
                            Ingen arkiverte steder funnet
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLocations.map((location) => (
                      <TableRow key={location.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{location.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {location.address}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {formatDate(location.updatedAt.toDate())}
                        </TableCell>
                        <TableCell>
                          {formatDate(location.createdAt.toDate())}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">Arkivert</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleRestore(location.id)}
                          >
                            <ArchiveRestore className="mr-2 h-4 w-4" />
                            Gjenopprett
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminArchive;