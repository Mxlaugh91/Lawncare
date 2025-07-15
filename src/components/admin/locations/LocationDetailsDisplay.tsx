import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Archive, Edit, MapPin, Copy, Navigation } from 'lucide-react';
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from '@/hooks/use-toast';
import { Location } from '@/types';

interface LocationDetailsDisplayProps {
  location: Location;
  onEdit: () => void;
  onArchive: () => Promise<void>;
  loading: boolean;
}

export const LocationDetailsDisplay: React.FC<LocationDetailsDisplayProps> = ({
  location,
  onEdit,
  onArchive,
  loading,
}) => {
  const { toast } = useToast();

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(location.address);
      toast({
        title: 'Adresse kopiert',
        description: 'Adressen er kopiert til utklippstavlen',
      });
    } catch (error) {
      console.error('Failed to copy address:', error);
      toast({
        title: 'Feil',
        description: 'Kunne ikke kopiere adresse',
        variant: 'destructive',
      });
    }
  };

  const handleOpenInMaps = () => {
    const encodedAddress = encodeURIComponent(location.address);
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
    window.open(mapsUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <MapPin className="mr-2 h-5 w-5" />
            Stedsdetaljer
          </div>
          <div className="flex items-center space-x-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={onEdit}
                    disabled={loading}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Rediger sted</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <AlertDialog>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        disabled={loading}
                        className="text-destructive hover:text-destructive"
                      >
                        <Archive className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Arkiver sted</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Er du sikker?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Dette vil arkivere stedet og fjerne det fra aktive lister. Handlingen kan angres fra arkivet.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Avbryt</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={onArchive}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    Arkiver sted
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-2" />
                <div className="h-6 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {location.description && (
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-1">Beskrivelse</h4>
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-base">{location.description}</p>
                </div>
              </div>
            )}

            {location.imageUrl && (
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-1">Bilde</h4>
                <div className="relative w-full h-48 rounded-lg overflow-hidden bg-muted">
                  <img
                    src={location.imageUrl}
                    alt={location.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              </div>
            )}

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-1">Navn</h4>
                <p className="text-base">{location.name}</p>
              </div>
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-1">Oppstartsuke</h4>
                <p className="text-base">Uke {location.startWeek}</p>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-1">Adresse</h4>
              <div className="flex items-center space-x-1">
                <p className="text-base flex-1">{location.address}</p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleCopyAddress}
                        className="h-8 w-8"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Kopier adresse</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleOpenInMaps}
                        className="h-8 w-8"
                      >
                        <Navigation className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Åpne i Google Maps</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                {location.googleEarthLink && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={handleOpenGoogleEarth}
                          className="h-8 w-8"
                        >
                          <Globe className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Åpne Google Earth-prosjekt</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-1">Frekvens klipping</h4>
                <p className="text-base">Hver {location.maintenanceFrequency}. uke</p>
              </div>
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-1">Frekvens kantklipping</h4>
                <p className="text-base">Hver {location.edgeCuttingFrequency}. uke</p>
              </div>
            </div>

            {location.recommendedEquipment && (
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-1">Anbefalt utstyr</h4>
                <div className="bg-muted/50 p-3 rounded-lg">
                  <div className="space-y-1">
                    {location.recommendedEquipment.split(',').map((equipment, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                        <span className="text-sm">{equipment.trim()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {location.notes && (
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-1">Notater og instrukser</h4>
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-base whitespace-pre-wrap">{location.notes}</p>
                </div>
              </div>
            )}

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-1">Sist klippet</h4>
                <p className="text-base">
                  {location.lastMaintenanceWeek ? `Uke ${location.lastMaintenanceWeek}` : 'Ikke registrert'}
                </p>
              </div>
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-1">Sist kantklippet</h4>
                <p className="text-base">
                  {location.lastEdgeCuttingWeek ? `Uke ${location.lastEdgeCuttingWeek}` : 'Ikke registrert'}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};