import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
    <div className="flex space-x-2">
      <TooltipProvider>
        <Tooltip>
          <AlertDialog>
            <TooltipTrigger asChild>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Archive className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>Arkiver alle steder</p>
            </TooltipContent>
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
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="sm" asChild>
              <Link to="/admin/steder/nytt">
                <MapPin className="h-4 w-4" />
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Legg til nytt sted</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};