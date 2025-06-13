import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { LocationWithStatus } from '@/types';

interface LocationMobileCardsProps {
  filteredLocations: LocationWithStatus[];
  loading: boolean;
  expandedLocationId: string | null;
  toggleLocationExpand: (locationId: string) => void;
}

export const LocationMobileCards = ({ 
  filteredLocations, 
  loading, 
  expandedLocationId, 
  toggleLocationExpand 
}: LocationMobileCardsProps) => {
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
    <div>
      {filteredLocations.map((location) => {
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