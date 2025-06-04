import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import * as seasonSettingsService from '@/services/seasonSettingsService';
import { SeasonSettings } from '@/types';

const AdminSettings = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<SeasonSettings | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const data = await seasonSettingsService.getSeasonSettings();
        setSettings(data);
      } catch (error) {
        console.error('Error fetching settings:', error);
        toast({
          title: 'Feil',
          description: 'Kunne ikke hente innstillinger. Prøv igjen senere.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [toast]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData(event.currentTarget);
      const updatedSettings = {
        startWeek: parseInt(formData.get('startWeek') as string),
        endWeek: parseInt(formData.get('endWeek') as string),
        defaultFrequency: parseInt(formData.get('defaultFrequency') as string)
      };

      await seasonSettingsService.updateSeasonSettings(updatedSettings);
      
      toast({
        title: 'Innstillinger lagret',
        description: 'Systeminnstillingene ble oppdatert.',
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Feil',
        description: 'Kunne ikke lagre innstillinger. Prøv igjen senere.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Innstillinger</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sesonginnstillinger</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="startWeek">Sesongstart (uke)</Label>
                <Input
                  id="startWeek"
                  name="startWeek"
                  type="number"
                  min="1"
                  max="52"
                  defaultValue={settings?.startWeek ?? 18}
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <Label htmlFor="endWeek">Sesongslutt (uke)</Label>
                <Input
                  id="endWeek"
                  name="endWeek"
                  type="number"
                  min="1"
                  max="52"
                  defaultValue={settings?.endWeek ?? 42}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="defaultFrequency">Standard vedlikeholdsfrekvens (uker)</Label>
              <Input
                id="defaultFrequency"
                name="defaultFrequency"
                type="number"
                min="1"
                defaultValue={settings?.defaultFrequency ?? 2}
                required
                disabled={loading}
              />
            </div>

            <Button type="submit" disabled={loading}>
              {loading ? 'Lagrer...' : 'Lagre innstillinger'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSettings;