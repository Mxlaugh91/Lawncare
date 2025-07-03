import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { LocationWithStatus } from '@/types';

interface LocationMobileCardsProps {
  filteredLocations: LocationWithStatus[];
  loading: boolean;
  expandedLocationId: string | null;
  toggleLocationExpand: (locationId: string) => void;
}

const getStatusBadge = (location: LocationWithStatus) => {
  if (!location.isDueForMaintenanceInSelectedWeek && !location.isDueForEdgeCuttingInSelectedWeek) {
    return null;
  }

  switch (location.status) {
    case 'fullfort':
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100 text-xs">
          Fullført
        </Badge>
      );
    case 'ikke_utfort':
      return (
        <Badge variant="destructive" className="text-xs">
          Ikke utført
        </Badge>
      );
    default:
      return (
        <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100 text-xs">
          Planlagt
        </Badge>
      );
  }
};

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

const getTotalHours = (location: LocationWithStatus) => {
  if (!location.timeEntries || location.timeEntries.length === 0) {
    return 0;
  }
  return location.timeEntries.reduce((total, entry) => total + entry.hours, 0);
};

const getEmployeeSummary = (location: LocationWithStatus) => {
  if (!location.timeEntries || location.timeEntries.length === 0) {
    return 'Ikke registrert';
  }

  // Get unique employee names
  const uniqueEmployees = Array.from(
    new Set(location.timeEntries.map(entry => entry.employeeName).filter(Boolean))
  );

  if (uniqueEmployees.length === 0) {
    return 'Ikke registrert';
  }

  if (uniqueEmployees.length === 1) {
    return uniqueEmployees[0];
  }

  // Show first employee + count of others
  const additionalCount = uniqueEmployees.length - 1;
  return `${uniqueEmployees[0]} (+${additionalCount} andre)`;
};

export const LocationMobileCards = ({ 
  filteredLocations, 
  loading, 
  expandedLocationId, 
  toggleLocationExpand 
}: LocationMobileCardsProps) => {
  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-12 bg-muted rounded-md" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {filteredLocations.map((location) => {
        const isExpanded = expandedLocationId === location.id;
        const statusBadge = getStatusBadge(location);

        return (
          <Card key={location.id} className="card-hover">
            <CardContent className="p-3">
              <div 
                className="flex items-center justify-between cursor-pointer"
                onClick={() => toggleLocationExpand(location.id)}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{location.name}</div>
                  {statusBadge}
                </div>
                <div className="flex items-center ml-2">
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </div>

              {isExpanded && (
                <div className="mt-3 space-y-2 border-t pt-3">
                  <div className="text-xs text-muted-foreground mb-2">{location.address}</div>
                  
                  <div>
                    <div className="text-xs font-medium">Gressklipping</div>
                    <div className="text-xs">
                      {getMaintenanceStatus(location)}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-medium">Kantklipping</div>
                    <div className="text-xs">
                      {getEdgeCuttingStatus(location)}
                    </div>
                  </div>

                  {location.timeEntries && location.timeEntries.length > 0 && (
                    <>
                      <div>
                        <div className="text-xs font-medium">Utført</div>
                        <div className="text-xs">
                          {new Intl.DateTimeFormat('no-NO', {
                            weekday:'long',
                          }).format(location.timeEntries[0].date.toDate())}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs font-medium">Tidsbruk</div>
                        <div className="text-xs">
                          {getTotalHours(location)} timer
                        </div>
                      </div>

                      <div>
                        <div className="text-xs font-medium">Utført av</div>
                        <div className="text-xs">
                          {getEmployeeSummary(location)}
                        </div>
                      </div>
                    </>
                  )}

                  <div className="pt-2">
                    <Button variant="outline" size="sm" className="w-full text-xs h-8" asChild>
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
      })}
    </div>
  );
};