import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { Mower } from '@/types';
import * as equipmentService from '@/services/equipmentService';
import { useToast } from '@/hooks/use-toast';

// Import the new sub-components
import { EquipmentStatsCards } from '@/components/admin/equipment/EquipmentStatsCards';
import { MowerList } from '@/components/admin/equipment/MowerList';
import { AddMowerDialog } from '@/components/admin/equipment/AddMowerDialog';
import { AddIntervalDialog } from '@/components/admin/equipment/AddIntervalDialog';

const AdminEquipment = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [mowers, setMowers] = useState<Mower[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredMowers, setFilteredMowers] = useState<Mower[]>([]);
  const [selectedMowerId, setSelectedMowerId] = useState<string | null>(null);
  const [isAddIntervalDialogOpen, setIsAddIntervalDialogOpen] = useState(false);

  useEffect(() => {
    const fetchMowers = async () => {
      try {
        setLoading(true);
        const mowerData = await equipmentService.getAllMowers();
        setMowers(mowerData);
        setFilteredMowers(mowerData);
      } catch (error) {
        console.error('Error fetching mowers:', error);
        toast({
          title: 'Feil',
          description: 'Kunne ikke hente gressklippere. Prøv igjen senere.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchMowers();
  }, [toast]);

  useEffect(() => {
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      const filtered = mowers.filter(
        (mower) => 
          mower.name.toLowerCase().includes(lowerQuery) || 
          mower.model.toLowerCase().includes(lowerQuery) ||
          mower.serialNumber.toLowerCase().includes(lowerQuery)
      );
      setFilteredMowers(filtered);
    } else {
      setFilteredMowers(mowers);
    }
  }, [searchQuery, mowers]);

  const refreshMowers = async () => {
    const updatedMowers = await equipmentService.getAllMowers();
    setMowers(updatedMowers);
    setFilteredMowers(updatedMowers);
  };

  const handleAddMower = async (data: any) => {
    try {
      await equipmentService.addMower(data);
      
      toast({
        title: 'Suksess',
        description: 'Ny gressklipper ble lagt til',
      });
      
      await refreshMowers();
    } catch (error) {
      console.error('Error adding mower:', error);
      toast({
        title: 'Feil',
        description: 'Kunne ikke legge til ny gressklipper. Prøv igjen senere.',
        variant: 'destructive',
      });
    }
  };

  const handleServiceReset = async (mowerId: string, intervalId: string) => {
    try {
      await equipmentService.resetServiceInterval(mowerId, intervalId, 'current-user');
      await refreshMowers();
      
      toast({
        title: 'Suksess',
        description: 'Serviceintervall ble nullstilt',
      });
    } catch (error) {
      console.error('Error resetting service interval:', error);
      toast({
        title: 'Feil',
        description: 'Kunne ikke nullstille serviceintervall. Prøv igjen senere.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (mowerId: string) => {
    try {
      await equipmentService.deleteMower(mowerId);
      
      const updatedMowers = mowers.filter(m => m.id !== mowerId);
      setMowers(updatedMowers);
      setFilteredMowers(updatedMowers);
      
      toast({
        title: 'Suksess',
        description: 'Gressklipperen ble slettet',
      });
    } catch (error) {
      console.error('Error deleting mower:', error);
      toast({
        title: 'Feil',
        description: 'Kunne ikke slette gressklipperen. Prøv igjen senere.',
        variant: 'destructive',
      });
    }
  };

  const handleAddInterval = (mowerId: string) => {
    setSelectedMowerId(mowerId);
    setIsAddIntervalDialogOpen(true);
  };

  const handleDeleteInterval = async (mowerId: string, intervalId: string) => {
    try {
      await equipmentService.deleteServiceInterval(mowerId, intervalId);
      await refreshMowers();
      
      toast({
        title: 'Suksess',
        description: 'Serviceintervall ble slettet',
      });
    } catch (error) {
      console.error('Error deleting service interval:', error);
      toast({
        title: 'Feil',
        description: 'Kunne ikke slette serviceintervall. Prøv igjen senere.',
        variant: 'destructive',
      });
    }
  };

  const handleSubmitNewInterval = async (data: { description: string; hourInterval: number }) => {
    if (!selectedMowerId) return;

    try {
      await equipmentService.addServiceInterval(selectedMowerId, data);
      await refreshMowers();

      setIsAddIntervalDialogOpen(false);
      setSelectedMowerId(null);

      toast({
        title: 'Suksess',
        description: 'Nytt serviceintervall ble lagt til',
      });
    } catch (error) {
      console.error('Error adding service interval:', error);
      toast({
        title: 'Feil',
        description: 'Kunne ikke legge til serviceintervall. Prøv igjen senere.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Vedlikehold</h1>
        <div className="flex space-x-2">
          <AddMowerDialog onSubmit={handleAddMower} loading={loading} />
        </div>
      </div>

      <EquipmentStatsCards mowers={mowers} loading={loading} />

      <Card>
        <CardHeader>
          <CardTitle>Gressklippere</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4">
            <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4 md:items-center">
              <div className="relative flex-grow max-w-md">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Søk etter navn eller modell..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <MowerList
              mowers={filteredMowers}
              loading={loading}
              onServiceReset={handleServiceReset}
              onDelete={handleDelete}
              onAddInterval={handleAddInterval}
              onDeleteInterval={handleDeleteInterval}
            />
          </div>
        </CardContent>
      </Card>

      <AddIntervalDialog
        isOpen={isAddIntervalDialogOpen}
        onClose={() => {
          setIsAddIntervalDialogOpen(false);
          setSelectedMowerId(null);
        }}
        onSubmit={handleSubmitNewInterval}
        loading={loading}
      />
    </div>
  );
};

export default AdminEquipment;