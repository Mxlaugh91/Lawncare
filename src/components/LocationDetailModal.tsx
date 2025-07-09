import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  ArrowLeft, 
  MapPin, 
  Copy, 
  Navigation, 
  Wrench,
  FileText,
  Calendar,
  Scissors
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Location } from '@/types';

interface LocationDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  location: Location | null;
  lastMaintenanceEmployeeName?: string | null;
  lastEdgeCuttingEmployeeName?: string | null;
}

export const LocationDetailModal: React.FC<LocationDetailModalProps> = ({
  isOpen,
  onClose,
  location,
  lastMaintenanceEmployeeName,
  lastEdgeCuttingEmployeeName,
}) => {
  const { toast } = useToast();

  if (!location) return null;

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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        {/* Header with back button */}
        <DialogHeader className="flex-shrink-0 p-6 pb-4">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <DialogTitle className="text-xl font-semibold">
              Stedsdetaljer
            </DialogTitle>
          </div>
        </DialogHeader>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <div className="space-y-6">
            {/* Hero Image */}
            <div className="relative w-full h-64 rounded-xl overflow-hidden bg-gradient-to-br from-green-100 to-green-200">
              {location.imageUrl ? (
                <img
                  src={location.imageUrl}
                  alt={location.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback to gradient background if image fails to load
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center">
                    <MapPin className="h-16 w-16 text-green-600 mx-auto mb-4" />
                    <p className="text-green-700 font-medium">Ingen bilde tilgjengelig</p>
                    <p className="text-green-600 text-sm">Bilde kan legges til av administrator</p>
                  </div>
                </div>
              )}
              
              {/* Location name overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-6">
                <h1 className="text-2xl font-bold text-white mb-2">{location.name}</h1>
                {location.description && (
                  <p className="text-white/90 text-sm">{location.description}</p>
                )}
              </div>
            </div>

            {/* Description Section */}
            {location.description && (
              <div className="bg-muted/30 rounded-lg p-4">
                <h3 className="font-semibold mb-2 flex items-center">
                  <FileText className="h-4 w-4 mr-2 text-primary" />
                  Beskrivelse
                </h3>
                <p className="text-muted-foreground">{location.description}</p>
              </div>
            )}

            {/* Key Details Grid */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Address Section */}
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center">
                  <MapPin className="h-4 w-4 mr-2 text-primary" />
                  Adresse
                </h3>
                <div className="bg-card border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium">{location.address}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Klikk for å kopiere eller åpne i kart
                      </p>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
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
                    </div>
                  </div>
                </div>
              </div>

              {/* Schedule Information */}
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center">
                  <Calendar className="h-4 w-4 mr-2 text-primary" />
                  Vedlikeholdsplan
                </h3>
                <div className="bg-card border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Gressklipping</span>
                    <Badge variant="outline">Hver {location.maintenanceFrequency}. uke</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground flex items-center">
                      <Scissors className="h-3 w-3 mr-1" />
                      Kantklipping
                    </span>
                    <Badge variant="outline">Hver {location.edgeCuttingFrequency}. uke</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Oppstartsuke</span>
                    <Badge variant="secondary">Uke {location.startWeek}</Badge>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Recommended Equipment Section */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center">
                <Wrench className="h-4 w-4 mr-2 text-primary" />
                Anbefalt utstyr
              </h3>
              <div className="bg-card border rounded-lg p-4">
                {location.recommendedEquipment ? (
                  <div className="space-y-2">
                    {location.recommendedEquipment.split(',').map((equipment, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                        <span className="text-sm">{equipment.trim()}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Wrench className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground text-sm">
                      Ingen spesifikt utstyr anbefalt
                    </p>
                    <p className="text-muted-foreground text-xs mt-1">
                      Administrator kan legge til anbefalinger
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Notes Section */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center">
                <FileText className="h-4 w-4 mr-2 text-primary" />
                Notater og instrukser
              </h3>
              <div className="bg-card border rounded-lg p-4">
                {location.notes ? (
                  <div className="whitespace-pre-wrap text-sm">
                    {location.notes}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground text-sm">
                      Ingen spesielle notater registrert
                    </p>
                    <p className="text-muted-foreground text-xs mt-1">
                      Administrator kan legge til instrukser og merknader
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Status Information */}
            <div className="bg-muted/30 rounded-lg p-4">
              <h4 className="font-medium mb-3">Status informasjon</h4>
              <div className="space-y-3 text-sm">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Sist klippet:</span>
                    <div className="text-right">
                      <div className="font-medium">
                        {location.lastMaintenanceWeek ? `Uke ${location.lastMaintenanceWeek}` : 'Ikke registrert'}
                      </div>
                      {lastMaintenanceEmployeeName && (
                        <div className="text-xs text-muted-foreground">
                          av {lastMaintenanceEmployeeName}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Sist kantklippet:</span>
                    <div className="text-right">
                      <div className="font-medium">
                        {location.lastEdgeCuttingWeek ? `Uke ${location.lastEdgeCuttingWeek}` : 'Ikke registrert'}
                      </div>
                      {lastEdgeCuttingEmployeeName && (
                        <div className="text-xs text-muted-foreground">
                          av {lastEdgeCuttingEmployeeName}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};