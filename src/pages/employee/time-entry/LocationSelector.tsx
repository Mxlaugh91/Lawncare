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
          <Wrench className="h-3 w-2 mr-4" />
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
    <Card className="shadow-sm border-0 bg-gradient-to-br from-white to-gray-50/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center text-lg font-semibold text-gray-900">
          <div className="p-2 rounded-full bg-blue-100 mr-3">
            <MapPin className="h-5 w-5 text-blue-600" />
          </div>
          Velg sted
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Select
          value={selectedLocationId}
          onValueChange={onLocationChange}
        >
          <SelectTrigger className="h-14 border-2 border-gray-200 hover:border-blue-300 transition-colors focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10">
            <SelectValue placeholder="👆 Trykk for å velge sted" />
          </SelectTrigger>
          <SelectContent className="border-2 border-gray-200 shadow-xl">
            {locations.map((location) => (
              <SelectItem 
                key={location.id} 
                value={location.id} 
                className="py-4 px-4 cursor-pointer hover:bg-blue-50 focus:bg-blue-50 active:bg-blue-100 transition-all"
              >
                <div className="flex flex-col w-full">
                  <div className="flex items-center justify-between w-full mb-2">
                    <span className="font-semibold text-gray-900">{location.name}</span>
                    <div className="flex gap-2">
                      {getLocationBadges(location)}
                    </div>
                  </div>
                  <span className="text-sm text-gray-600 flex items-center">
                    <MapPin className="h-3 w-3 mr-1 text-gray-400" />
                    {location.address}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {error && (
          <Alert variant="destructive" className="border-red-200 bg-red-50 animate-in slide-in-from-top-2 duration-300">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-700 font-medium">{error}</AlertDescription>
          </Alert>
        )}

        {selectedLocation && (
          <div className="space-y-4 animate-in slide-in-from-bottom-3 duration-500">
            <div className="rounded-xl bg-gradient-to-br from-blue-50 to-blue-100/50 p-5 border border-blue-200">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mr-2" />
                    <h3 className="font-semibold text-gray-900">{selectedLocation.name}</h3>
                  </div>
                  <p className="text-sm text-gray-600 flex items-center">
                    <MapPin className="h-3 w-3 mr-1 text-gray-400" />
                    {selectedLocation.address}
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  {getLocationBadges(selectedLocation)}
                </div>
              </div>
              
              {selectedLocation.notes && (
                <div className="pt-3 border-t border-blue-200/60">
                  <div className="bg-white/60 rounded-lg p-3">
                    <p className="text-sm font-semibold mb-2 text-gray-800 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1 text-blue-600" />
                      Instrukser:
                    </p>
                    <p className="text-sm text-gray-700 leading-relaxed">{selectedLocation.notes}</p>
                  </div>
                </div>
              )}
            </div>

            {edgeCuttingNeeded && (
              <Alert className="border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 animate-pulse">
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