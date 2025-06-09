import { create } from 'zustand';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { Location, LocationWithStatus } from '@/types';
import * as locationService from '@/services/locationService';

interface LocationState {
  locations: Location[];
  loading: boolean;
  error: string | null;
  unsubscribe: (() => void) | null;
  
  // Actions
  initRealtimeUpdates: () => void;
  cleanup: () => void;
  fetchLocations: () => Promise<void>;
  addLocation: (locationData: Omit<Location, 'id' | 'createdAt' | 'updatedAt' | 'isArchived'>) => Promise<string>;
  updateLocation: (locationId: string, updatedData: Partial<Location>) => Promise<void>;
  archiveLocation: (locationId: string) => Promise<void>;
  restoreLocation: (locationId: string) => Promise<void>;
  getLocationsDueForService: () => Promise<Location[]>;
  getLocationsWithWeeklyStatus: (weekNumber: number) => Promise<LocationWithStatus[]>;
  
  // Computed values / Selectors
  getActiveLocations: () => Location[];
  getArchivedLocations: () => Location[];
}

export const useLocationStore = create<LocationState>((set, get) => ({
  locations: [],
  loading: false,
  error: null,
  unsubscribe: null,

  initRealtimeUpdates: () => {
    // Clean up any existing subscription
    get().cleanup();

    // Set up real-time listener for locations
    const q = query(
      collection(db, 'locations'),
      orderBy('name')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const locations = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Location[];
      
      set({ locations });
    }, (error) => {
      set({ error: 'Failed to listen to location updates' });
      console.error('Location listener error:', error);
    });

    set({ unsubscribe });
  },

  cleanup: () => {
    const { unsubscribe } = get();
    if (unsubscribe) {
      unsubscribe();
      set({ unsubscribe: null });
    }
  },

  fetchLocations: async () => {
    try {
      set({ loading: true, error: null });
      const activeLocations = await locationService.getActiveLocations();
      const archivedLocations = await locationService.getArchivedLocations();
      set({ locations: [...activeLocations, ...archivedLocations], loading: false });
    } catch (error) {
      set({ error: 'Failed to fetch locations', loading: false });
      throw error;
    }
  },

  addLocation: async (locationData) => {
    try {
      // Optimistically add the location
      const optimisticLocation: Location = {
        id: 'temp-' + Date.now(),
        ...locationData,
        isArchived: false,
        createdAt: new Date() as any,
        updatedAt: new Date() as any,
      };

      set(state => ({
        locations: [...state.locations, optimisticLocation]
      }));

      // Actually add the location
      const locationId = await locationService.addLocation(locationData);
      return locationId;
    } catch (error) {
      // Revert optimistic update on error
      set(state => ({
        locations: state.locations.filter(loc => loc.id !== 'temp-' + Date.now()),
        error: 'Failed to add location'
      }));
      throw error;
    }
  },

  updateLocation: async (locationId, updatedData) => {
    // Store original location data for rollback
    const originalLocation = get().locations.find(loc => loc.id === locationId);
    
    try {
      // Optimistically update the location
      set(state => ({
        locations: state.locations.map(loc =>
          loc.id === locationId ? { ...loc, ...updatedData } : loc
        )
      }));

      // Actually update the location
      await locationService.updateLocation(locationId, updatedData);
    } catch (error) {
      // Revert optimistic update on error
      if (originalLocation) {
        set(state => ({
          locations: state.locations.map(loc =>
            loc.id === locationId ? originalLocation : loc
          ),
          error: 'Failed to update location'
        }));
      }
      throw error;
    }
  },

  archiveLocation: async (locationId) => {
    // Store original location data for rollback
    const originalLocation = get().locations.find(loc => loc.id === locationId);
    
    try {
      // Optimistically archive the location
      set(state => ({
        locations: state.locations.map(loc =>
          loc.id === locationId ? { ...loc, isArchived: true } : loc
        )
      }));

      // Actually archive the location
      await locationService.archiveLocation(locationId);
    } catch (error) {
      // Revert optimistic update on error
      if (originalLocation) {
        set(state => ({
          locations: state.locations.map(loc =>
            loc.id === locationId ? originalLocation : loc
          ),
          error: 'Failed to archive location'
        }));
      }
      throw error;
    }
  },

  restoreLocation: async (locationId) => {
    // Store original location data for rollback
    const originalLocation = get().locations.find(loc => loc.id === locationId);
    
    try {
      // Optimistically restore the location
      set(state => ({
        locations: state.locations.map(loc =>
          loc.id === locationId ? { ...loc, isArchived: false } : loc
        )
      }));

      // Actually restore the location
      await locationService.restoreLocation(locationId);
    } catch (error) {
      // Revert optimistic update on error
      if (originalLocation) {
        set(state => ({
          locations: state.locations.map(loc =>
            loc.id === locationId ? originalLocation : loc
          ),
          error: 'Failed to restore location'
        }));
      }
      throw error;
    }
  },

  getLocationsDueForService: async () => {
    try {
      return await locationService.getLocationsDueForService();
    } catch (error) {
      set({ error: 'Failed to get locations due for service' });
      throw error;
    }
  },

  getLocationsWithWeeklyStatus: async (weekNumber) => {
    try {
      return await locationService.getLocationsWithWeeklyStatus(weekNumber);
    } catch (error) {
      set({ error: 'Failed to get locations with weekly status' });
      throw error;
    }
  },

  // Selectors
  getActiveLocations: () => {
    return get().locations.filter(location => !location.isArchived);
  },

  getArchivedLocations: () => {
    return get().locations.filter(location => location.isArchived);
  },
}));