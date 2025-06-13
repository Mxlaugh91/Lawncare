import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, Scissors, MapPin } from 'lucide-react';
import { LocationWithStatus } from '@/types';

interface OperationsStatsCardsProps {
  locations: LocationWithStatus[];
  loading: boolean;
}

export const OperationsStatsCards = ({ locations, loading }: OperationsStatsCardsProps) => {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-24 bg-muted rounded-md" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const maintenanceCount = locations.filter(loc => loc.isDueForMaintenanceInSelectedWeek).length;
  const edgeCuttingCount = locations.filter(loc => loc.isDueForEdgeCuttingInSelectedWeek).length;
  const totalCount = locations.length;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="card-hover">
        <CardContent className="p-6 flex flex-col items-center">
          <div className="rounded-full bg-primary/10 p-3 mb-4">
            <CheckCircle2 className="h-8 w-8 text-primary" />
          </div>
          <div className="text-3xl font-bold">
            {maintenanceCount}
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Steder planlagt for hovedvedlikehold denne uken
          </p>
        </CardContent>
      </Card>
      
      <Card className="card-hover">
        <CardContent className="p-6 flex flex-col items-center">
          <div className="rounded-full bg-amber-100 p-3 mb-4">
            <Scissors className="h-8 w-8 text-amber-700" />
          </div>
          <div className="text-3xl font-bold">
            {edgeCuttingCount}
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Steder planlagt for kantklipping denne uken
          </p>
        </CardContent>
      </Card>
      
      <Card className="card-hover">
        <CardContent className="p-6 flex flex-col items-center">
          <div className="rounded-full bg-blue-100 p-3 mb-4">
            <MapPin className="h-8 w-8 text-blue-700" />
          </div>
          <div className="text-3xl font-bold">
            {totalCount}
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Totalt antall steder denne uken
          </p>
        </CardContent>
      </Card>
    </div>
  );
};