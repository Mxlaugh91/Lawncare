import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, AlertCircle } from 'lucide-react';
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

export const LocationSelector = React.memo(({ 
  locations, 
  selectedLocationId, 
  selectedLocation,
  onLocationChange,
  edgeCuttingNeeded = false,
  error,
  currentWeek
}: LocationSelectorProps) => {
  const { t } = useTranslation();

  return (
    <Card className="card-hover">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center text-lg font-semibold">
          <div className="p-2 rounded-full bg-primary/10 mr-3">
            <MapPin className="h-5 w-5 text-primary" />
          </div>
          {t('timeEntry.selectLocation')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Select
          value={selectedLocationId}
          onValueChange={onLocationChange}
        >
          <SelectTrigger className="h-14 border-2 hover:border-primary/50 transition-colors focus:border-primary focus:ring-4 focus:ring-primary/10">
            <SelectValue placeholder={t('timeEntry.selectLocationPlaceholder')} />
          </SelectTrigger>
          <SelectContent className="border-2 shadow-xl">
            {locations.map((location) => (
              <SelectItem 
                key={location.id} 
                value={location.id} 
                className="py-4 px-4 cursor-pointer hover:bg-muted focus:bg-muted active:bg-accent transition-all"
              >
                <div className="flex flex-col w-full">
                  <span className="font-semibold">{location.name}</span>
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
      </CardContent>
    </Card>
  );
});

LocationSelector.displayName = 'LocationSelector';