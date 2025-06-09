import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
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
import { Plus, Trash2 } from 'lucide-react';
import { Mower, ServiceInterval } from '@/types';

interface MowerCardProps {
  mower: Mower;
  onServiceReset: (mowerId: string, intervalId: string) => Promise<void>;
  onDelete: (mowerId: string) => Promise<void>;
  onAddInterval: (mowerId: string) => void;
  onDeleteInterval: (mowerId: string, intervalId: string) => Promise<void>;
}

export const MowerCard = ({ 
  mower, 
  onServiceReset, 
  onDelete, 
  onAddInterval, 
  onDeleteInterval 
}: MowerCardProps) => {
  const formatDate = (date: Date | null) => {
    if (!date) return 'Aldri';
    return new Intl.DateTimeFormat('no-NO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  };

  const getServiceStatus = (mower: Mower, interval: ServiceInterval) => {
    const lastResetHours = interval.lastResetHours || 0;
    const hoursSinceReset = mower.totalHours - lastResetHours;
    const hoursUntilService = interval.hourInterval - hoursSinceReset;

    if (hoursUntilService <= 0) {
      return {
        status: 'overdue',
        text: `${Math.abs(hoursUntilService)} timer over tid`,
        badge: <Badge variant="destructive">Over tid</Badge>
      };
    } else if (hoursUntilService <= interval.hourInterval * 0.2) {
      return {
        status: 'warning',
        text: `${hoursUntilService} timer igjen`,
        badge: <Badge variant="outline" className="border-amber-500 text-amber-700">Nærmer seg</Badge>
      };
    } else {
      return {
        status: 'ok',
        text: `${hoursUntilService} timer igjen`,
        badge: <Badge variant="outline" className="border-green-500 text-green-700">OK</Badge>
      };
    }
  };

  return (
    <Card className="card-hover">
      <CardContent className="p-6">
        <div className="flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">{mower.name}</h3>
              <p className="text-sm text-muted-foreground">
                {mower.model} • {mower.serialNumber}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="text-right">
                <div className="text-2xl font-bold">
                  {mower.totalHours}
                </div>
                <p className="text-sm text-muted-foreground">
                  timer totalt
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Er du sikker?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Dette vil permanent slette gressklipperen og all tilhørende servicehistorikk.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Avbryt</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => onDelete(mower.id)}
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      Slett
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Serviceintervaller</h4>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onAddInterval(mower.id)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Legg til intervall
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Beskrivelse</TableHead>
                  <TableHead>Intervall</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sist nullstilt</TableHead>
                  <TableHead className="text-right">Handling</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mower.serviceIntervals?.map((interval) => {
                  const status = getServiceStatus(mower, interval);
                  return (
                    <TableRow key={interval.id}>
                      <TableCell>{interval.description}</TableCell>
                      <TableCell>{interval.hourInterval} timer</TableCell>
                      <TableCell>
                        <div className="flex flex-col space-y-1">
                          {status.badge}
                          <span className="text-xs text-muted-foreground">
                            {status.text}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{formatDate(interval.lastResetDate?.toDate())}</span>
                          {interval.lastResetBy && (
                            <span className="text-xs text-muted-foreground">
                              av {interval.lastResetBy}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            disabled={status.status === 'ok'}
                            onClick={() => onServiceReset(mower.id, interval.id)}
                          >
                            Nullstill
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Er du sikker?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Dette vil permanent slette dette serviceintervallet.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Avbryt</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => onDeleteInterval(mower.id, interval.id)}
                                  className="bg-destructive hover:bg-destructive/90"
                                >
                                  Slett
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};