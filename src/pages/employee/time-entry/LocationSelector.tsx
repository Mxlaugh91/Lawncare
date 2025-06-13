import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, AlertCircle, Scissors } from 'lucide-react';
import { Location } from '@/types';

interface LocationSelectorProps {
  locations: Location[];
  selectedLocationId: string;
  selectedLocation: Location | null;
  onLocationChange: (locationId: string) => void;
  edgeCuttingNeeded?: boolean;
  error?: string;
  currentWeek: number;
}

export const LocationSelector = ({ 
  locations, 
  selectedLocationId, 
  selectedLocation,
  onLocationChange,
  edgeCuttingNeeded = false,
  error,
  currentWeek
}: LocationSelectorProps) => {
  const getLocationBadges = (location: any) => {
    const badges = [];
    
    if (location.isDueForMaintenanceInSelectedWeek) {
      badges.push(
        <Badge key="maintenance" variant="default" className="text-xs">
          Plenklipping
        </Badge>
      );
    }
    
    if (location.isDueForEdgeCuttingInSelectedWeek) {
      badges.push(
        <Badge key="edgecutting" variant="secondary" className="text-xs">
          <Scissors className="h-3 w-3 mr-1" />
          Kantklipping
        </Badge>
      );
    }
    
    return badges;
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center text-lg">
          <MapPin className="mr-2 h-5 w-5 text-primary" />
          Velg sted
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Select
          value={selectedLocationId}
          onValueChange={onLocationChange}
        >
          <SelectTrigger className="h-12">
            <SelectValue placeholder="Velg hvilket sted du skal jobbe på" />
          </SelectTrigger>
          <SelectContent>
            {locations.map((location) => (
              <SelectItem key={location.id} value={location.id} className="py-4">
                <div className="flex flex-col w-full">
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="font-medium">{location.name}</span>
                    <div className="flex gap-1">
                      {getLocationBadges(location)}
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground">{location.address}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {selectedLocation && (
          <div className="space-y-3">
            <div className="rounded-lg bg-muted p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-medium">{selectedLocation.name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedLocation.address}</p>
                </div>
                <div className="flex flex-col gap-1">
                  {getLocationBadges(selectedLocation)}
                </div>
              </div>
              
              {selectedLocation.notes && (
                <div className="pt-2 border-t border-border/50">
                  <p className="text-sm font-medium mb-1">Instrukser:</p>
                  <p className="text-sm">{selectedLocation.notes}</p>
                </div>
              )}
            </div>

            {edgeCuttingNeeded && (
              <Alert className="border-amber-200 bg-amber-50">
                <Scissors className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-700">
                  Kantklipping anbefales for dette stedet denne uken.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};