import { MowerCard } from './MowerCard';
import { Mower } from '@/types';

interface MowerListProps {
  mowers: Mower[];
  loading: boolean;
  onServiceReset: (mowerId: string, intervalId: string) => Promise<void>;
  onDelete: (mowerId: string) => Promise<void>;
  onAddInterval: (mowerId: string) => void;
  onDeleteInterval: (mowerId: string, intervalId: string) => Promise<void>;
}

export const MowerList = ({ 
  mowers, 
  loading, 
  onServiceReset, 
  onDelete, 
  onAddInterval, 
  onDeleteInterval 
}: MowerListProps) => {
  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-24 bg-muted rounded-md" />
          </div>
        ))}
      </div>
    );
  }

  if (mowers.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">
          Ingen gressklippere funnet
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {mowers.map((mower) => (
        <MowerCard
          key={mower.id}
          mower={mower}
          onServiceReset={onServiceReset}
          onDelete={onDelete}
          onAddInterval={onAddInterval}
          onDeleteInterval={onDeleteInterval}
        />
      ))}
    </div>
  );
};