import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, AlertCircle, History } from 'lucide-react';
import { Mower } from '@/types';

interface EquipmentStatsCardsProps {
  mowers: Mower[];
  loading: boolean;
}

export const EquipmentStatsCards = ({ mowers, loading }: EquipmentStatsCardsProps) => {
  const getMowersNeedingServiceCount = () => {
    return mowers.reduce((count, mower) => {
      return count + (mower.serviceIntervals?.filter(interval => {
        const lastResetHours = interval.lastResetHours || 0;
        return (mower.totalHours - lastResetHours) >= interval.hourInterval;
      }).length || 0);
    }, 0);
  };

  const getTotalHours = () => {
    return mowers.reduce((total, mower) => total + (mower.totalHours || 0), 0);
  };

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

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="card-hover">
        <CardContent className="p-6">
          <div className="flex flex-col items-center">
            <div className="rounded-full bg-green-100 p-3 mb-4">
              <CheckCircle2 className="h-6 w-6 text-green-700" />
            </div>
            <div className="text-2xl font-bold">
              {mowers.length}
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Aktive gressklippere
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="card-hover">
        <CardContent className="p-6">
          <div className="flex flex-col items-center">
            <div className="rounded-full bg-amber-100 p-3 mb-4">
              <AlertCircle className="h-6 w-6 text-amber-700" />
            </div>
            <div className="text-2xl font-bold">
              {getMowersNeedingServiceCount()}
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Service forfalt
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="card-hover">
        <CardContent className="p-6">
          <div className="flex flex-col items-center">
            <div className="rounded-full bg-blue-100 p-3 mb-4">
              <History className="h-6 w-6 text-blue-700" />
            </div>
            <div className="text-2xl font-bold">
              {getTotalHours()}
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Timer totalt
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};