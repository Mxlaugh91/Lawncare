// src/components/admin/locations/LocationDetailsDisplay.tsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Archive, 
  Edit, 
  MapPin, 
  Calendar,
  Clock,
  Scissors,
  RotateCcw,
  FileText,
  ExternalLink,
  Navigation
} from 'lucide-react';
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
  // Function to open location in Google Maps
  const openInMaps = () => {
    const encodedAddress = encodeURIComponent(location.address);
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
    window.open(mapsUrl, '_blank');
  };

  // Function to copy address to clipboard
  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(location.address);
      // You could add a toast notification here
    } catch (err) {
      console.error('Failed to copy address:', err);
    }
  };

  return (
    <Card className="border-2 border-dashed border-gray-200 bg-gradient-to-br from-gray-50 to-white">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-full bg-blue-100">
              <MapPin className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-blue-900 cursor-pointer hover:text-blue-700 transition-colors flex items-center group">
                {location.name}
                <ExternalLink className="ml-2 h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </h2>
              <p className="text-sm text-blue-600 font-medium">Stedsdetaljer</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onEdit}
              disabled={loading}
              className="hover:bg-blue-50 hover:border-blue-300 transition-all"
            >
              <Edit className="mr-2 h-4 w-4" />
              Rediger sted
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={loading}
                  className="hover:bg-red-600 transition-all"
                >
                  <Archive className="mr-2 h-4 w-4" />
                  Arkiver sted
                </Button>
              </AlertDialogTrigger>
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
      <CardContent className="p-6">
        {loading ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-2" />
                <div className="h-8 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Location and Address */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="group">
                <div className="flex items-center space-x-2 mb-2">
                  <Navigation className="h-4 w-4 text-green-600" />
                  <h4 className="font-semibold text-sm text-gray-700">Adresse</h4>
                </div>
                <div className="flex items-center space-x-2">
                  <p 
                    className="text-base bg-green-50 p-3 rounded-lg border border-green-200 flex-1 cursor-pointer hover:bg-green-100 transition-colors"
                    onClick={copyAddress}
                    title="Klikk for å kopiere adresse"
                  >
                    {location.address}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={openInMaps}
                    className="hover:bg-green-50 hover:border-green-300"
                    title="Åpne i Google Maps"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <Calendar className="h-4 w-4 text-purple-600" />
                  <h4 className="font-semibold text-sm text-gray-700">Oppstartsuke</h4>
                </div>
                <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                  <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-300">
                    Uke {location.startWeek}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Maintenance Frequencies */}
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <RotateCcw className="h-4 w-4 text-blue-600" />
                  <h4 className="font-semibold text-sm text-gray-700">Frekvens klipping</h4>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <span className="text-base font-medium">Hver {location.maintenanceFrequency}. uke</span>
                </div>
              </div>
              
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <Scissors className="h-4 w-4 text-amber-600" />
                  <h4 className="font-semibold text-sm text-gray-700">Frekvens kantklipping</h4>
                </div>
                <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-amber-600" />
                  <span className="text-base font-medium">Hver {location.edgeCuttingFrequency}. uke</span>
                </div>
              </div>
            </div>

            {/* Notes Section */}
            {location.notes && (
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <FileText className="h-4 w-4 text-indigo-600" />
                  <h4 className="font-semibold text-sm text-gray-700">Notater og instrukser</h4>
                </div>
                <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                  <p className="text-base whitespace-pre-wrap text-indigo-900">{location.notes}</p>
                </div>
              </div>
            )}

            {/* Last Maintenance Status */}
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <RotateCcw className="h-4 w-4 text-green-600" />
                  <h4 className="font-semibold text-sm text-gray-700">Sist klippet</h4>
                </div>
                <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                  {location.lastMaintenanceWeek ? (
                    <Badge className="bg-green-100 text-green-800 border-green-300">
                      Uke {location.lastMaintenanceWeek}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-gray-100 text-gray-600">
                      Ikke registrert
                    </Badge>
                  )}
                </div>
              </div>
              
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <Scissors className="h-4 w-4 text-orange-600" />
                  <h4 className="font-semibold text-sm text-gray-700">Sist kantklippet</h4>
                </div>
                <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                  {location.lastEdgeCuttingWeek ? (
                    <Badge className="bg-orange-100 text-orange-800 border-orange-300">
                      Uke {location.lastEdgeCuttingWeek}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-gray-100 text-gray-600">
                      Ikke registrert
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="pt-4 border-t border-gray-200">
              <div className="flex items-center space-x-2 mb-3">
                <ExternalLink className="h-4 w-4 text-gray-600" />
                <h4 className="font-semibold text-sm text-gray-700">Hurtighandlinger</h4>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openInMaps}
                  className="hover:bg-blue-50 hover:border-blue-300"
                >
                  <Navigation className="mr-2 h-4 w-4" />
                  Åpne i kart
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyAddress}
                  className="hover:bg-green-50 hover:border-green-300"
                >
                  <MapPin className="mr-2 h-4 w-4" />
                  Kopier adresse
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};