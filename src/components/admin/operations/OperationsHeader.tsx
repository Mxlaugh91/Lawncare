import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
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
import { Archive, MapPin } from 'lucide-react';

interface OperationsHeaderProps {
  onArchiveAll: () => Promise<void>;
}

export const OperationsHeader = ({ onArchiveAll }: OperationsHeaderProps) => {
  return (
    <div className="flex items-center justify-between">
      <h1 className="text-2xl font-bold tracking-tight">Drift</h1>
      <div className="flex space-x-2">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive">
              <Archive className="mr-2 h-4 w-4" />
              Arkiver alle steder
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Er du sikker?</AlertDialogTitle>
              <AlertDialogDescription>
                Dette vil arkivere alle aktive steder. Denne handlingen kan ikke angres.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Avbryt</AlertDialogCancel>
              <AlertDialogAction
                onClick={onArchiveAll}
                className="bg-destructive hover:bg-destructive/90"
              >
                Arkiver alle
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <Button asChild>
          <Link to="/admin/steder/nytt">
            <MapPin className="mr-2 h-4 w-4" />
            Legg til nytt sted
          </Link>
        </Button>
      </div>
    </div>
  );
};