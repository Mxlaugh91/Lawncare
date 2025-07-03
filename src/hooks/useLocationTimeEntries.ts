// src/hooks/useLocationTimeEntries.ts
import { useState, useEffect, useCallback } from 'react';
import { TimeEntry } from '@/types';
import * as timeEntryService from '@/services/timeEntryService';
import { useToast } from '@/hooks/use-toast';

interface UseLocationTimeEntriesResult {
  timeEntries: TimeEntry[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useLocationTimeEntries = (locationId: string | undefined): UseLocationTimeEntriesResult => {
  const { toast } = useToast();
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEntries = useCallback(async () => {
    if (!locationId) {
      setTimeEntries([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const fetchedEntries = await timeEntryService.getTimeEntriesForLocation(locationId);
      setTimeEntries(fetchedEntries);
    } catch (err) {
      console.error('Error fetching time entries:', err);
      setError('Kunne ikke hente timeregistreringer.');
      toast({
        title: 'Feil',
        description: 'Kunne ikke hente timeregistreringer for stedet. Prøv igjen senere.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [locationId, toast]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  return { timeEntries, loading, error, refetch: fetchEntries };
};