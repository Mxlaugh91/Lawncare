import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, AlertCircle, Scissors, Wrench, CheckCircle2 } from 'lucide-react';
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
        <Badge key="maintenance" variant="default" className="text-xs font-medium">
          <Wrench className="h-3 w-3 mr-1" />
          Plenklipping
        </Badge>
      );
    }
    
    if (location.isDueForEdgeCuttingInSelectedWeek) {
      badges.push(
        <Badge key="edgecutting" variant="secondary" className="text-xs font-medium">
          <Scissors className="h-3 w-3 mr-1" />
          Kantklipping
        </Badge>
      );
    }
    
    return badges;
  };

  return (
    <Card className="card-hover">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center text-lg font-semibold">
          <div className="p-2 rounded-full bg-primary/10 mr-3">
            <MapPin className="h-5 w-5 text-primary" />
          </div>
          Velg sted
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Select
          value={selectedLocationId}
          onValueChange={onLocationChange}
        >
          <SelectTrigger className="h-14 border-2 hover:border-primary/50 transition-colors focus:border-primary focus:ring-4 focus:ring-primary/10">
            <SelectValue placeholder="👆 Trykk for å velge sted" />
          </SelectTrigger>
          <SelectContent className="border-2 shadow-xl">
            {locations.map((location) => (
              <SelectItem 
                key={location.id} 
                value={location.id} 
                className="py-4 px-4 cursor-pointer hover:bg-muted focus:bg-muted active:bg-accent transition-all"
              >
                <div className="flex flex-col w-full">
                  <div className="flex items-center justify-between w-full mb-2">
                    <span className="font-semibold">{location.name}</span>
                    <div className="flex gap-2">
                      {getLocationBadges(location)}
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground flex items-center">
                    <MapPin className="h-3 w-3 mr-1" />
                    {location.address}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {error && (
          <Alert variant="destructive" className="animate-in slide-in-from-top-2 duration-300">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="font-medium">{error}</AlertDescription>
          </Alert>
        )}

              </div>
              
              {selectedLocation.notes && (
                <div className="pt-3 border-t">
                  <div className="bg-card/60 rounded-lg p-3">
                    <p className="text-sm font-semibold mb-2 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1 text-primary" />
                      Instrukser:
                    </p>
                    <p className="text-sm text-muted-foreground leading-relaxed">{selectedLocation.notes}</p>
                  </div>
                </div>
              )}
            </div>

            {edgeCuttingNeeded && (
              <Alert className="border-amber-200 bg-amber-50 animate-pulse">
                <div className="p-1 rounded-full bg-amber-100 mr-2">
                  <Scissors className="h-4 w-4 text-amber-600" />
                </div>
                <AlertDescription className="text-amber-800 font-medium">
                  💡 Kantklipping anbefales for dette stedet denne uken.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};