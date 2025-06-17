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
        <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100">
          Fullført
        </Badge>
      );
    case 'ikke_utfort':
      return (
        <Badge variant="destructive">
          Ikke utført
        </Badge>
      );
    default:
      return (
        <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100">
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

export const LocationMobileCards = ({ 
  filteredLocations, 
  loading, 
  expandedLocationId, 
  toggleLocationExpand 
}: LocationMobileCardsProps) => {
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
    <div>
      {filteredLocations.map((location) => {
        const isExpanded = expandedLocationId === location.id;
        const statusBadge = getStatusBadge(location);

        return (
          <Card key={location.id} className="mb-4 card-hover">
            <CardContent className="p-4">
              <div 
                className="flex items-center justify-between cursor-pointer"
                onClick={() => toggleLocationExpand(location.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="font-medium truncate">{location.name}</div>
                    {statusBadge}
                  </div>
                  <div className="text-sm text-muted-foreground truncate">{location.address}</div>
                </div>
                <div className="flex items-center ml-2">
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </div>

              {isExpanded && (
                <div className="mt-4 space-y-3 border-t pt-3">
                  <div>
                    <div className="text-sm font-medium">Gressklipping</div>
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
                            weekday:'long',
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
      })}
    </div>
  );
};