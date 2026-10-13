// src/hooks/useLocationTimeEntries.ts
import { useState, useEffect, useCallback, useRef } from 'react';
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

  // Monotonic request token: responses from a previous location (or an
  // outdated refetch) are ignored so navigating between /admin/steder/:id
  // routes can never show entries for location A under location B.
  const requestIdRef = useRef(0);

  // Invalidate any in-flight request (used on location change/unmount). Kept as
  // a stable callback so the effect cleanup stays lint-clean.
  const invalidatePendingRequests = useCallback(() => {
    requestIdRef.current += 1;
  }, []);

  const fetchEntries = useCallback(async () => {
    const requestId = ++requestIdRef.current;

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

      if (requestId !== requestIdRef.current) {
        return; // A newer request (or unmount) superseded this one.
      }

      setTimeEntries(fetchedEntries);
    } catch (err) {
      if (requestId !== requestIdRef.current) {
        return;
      }

      console.error('Error fetching time entries:', err);
      setError('Kunne ikke hente timeregistreringer.');
      toast({
        title: 'Feil',
        description: 'Kunne ikke hente timeregistreringer for stedet. Prøv igjen senere.',
        variant: 'destructive',
      });
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [locationId, toast]);

  useEffect(() => {
    fetchEntries();

    return invalidatePendingRequests;
  }, [fetchEntries, invalidatePendingRequests]);

  return { timeEntries, loading, error, refetch: fetchEntries };
};
