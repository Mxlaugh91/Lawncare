import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { LocationWithStatus } from '@/types';

interface LocationListTableProps {
  filteredLocations: LocationWithStatus[];
  loading: boolean;
}

export const LocationListTable = ({ filteredLocations, loading }: LocationListTableProps) => {
  const getMaintenanceStatus = (location: LocationWithStatus) => {
    if (!location.isDueForMaintenanceInSelectedWeek) {
      return "Ikke aktuelt";
    }
    switch (location.status) {
      case 'fullfort':
        return <span className="text-primary font-medium">Fullført</span>;
      case 'ikke_utfort':
        return <span className="text-destructive">Ikke utført</span>;
      default:
        return <span className="text-amber-600">Planlagt</span>;
    }
  };

  const getEdgeCuttingStatus = (location: LocationWithStatus) => {
    if (!location.isDueForEdgeCuttingInSelectedWeek) {
      return "Ikke aktuelt";
    }
    switch (location.status) {
      case 'fullfort':
        return <span className="text-primary font-medium">Fullført</span>;
      case 'ikke_utfort':
        return <span className="text-destructive">Ikke utført</span>;
      default:
        return <span className="text-amber-600">Planlagt</span>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-16 bg-muted rounded-md" />
          </div>
        ))}
      </div>
    );
  }

  return (
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
};