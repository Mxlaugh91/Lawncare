// src/components/admin/locations/LocationDetailsDisplay.tsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Archive, Edit, MapPin } from 'lucide-react';
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
  loading: boolean; // For overall page loading
}

export const LocationDetailsDisplay: React.FC<LocationDetailsDisplayProps> = ({
  location,
  onEdit,
  onArchive,
  loading,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <MapPin className="mr-2 h-5 w-5" />
            {location.name}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onEdit}
              disabled={loading}
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
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-1">Adresse</h4>
                <p className="text-base">{location.address}</p>
              </div>
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-1">Oppstartsuke</h4>
                <p className="text-base">Uke {location.startWeek}</p>
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