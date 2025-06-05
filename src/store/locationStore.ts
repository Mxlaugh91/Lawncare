import { create } from 'zustand';
import { Location, LocationWithStatus } from '@/types';
import * as locationService from '@/services/locationService';

interface LocationState {
  locations: Location[];
  loading: boolean;
  error: string | null;
  
  // Actions
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
      set({ loading: true, error: null });
      const locationId = await locationService.addLocation(locationData);
      await get().fetchLocations(); // Refresh the locations list
      return locationId;
    } catch (error) {
      set({ error: 'Failed to add location', loading: false });
      throw error;
    }
  },

  updateLocation: async (locationId, updatedData) => {
    try {
      set({ loading: true, error: null });
      await locationService.updateLocation(locationId, updatedData);
      await get().fetchLocations(); // Refresh the locations list
    } catch (error) {
      set({ error: 'Failed to update location', loading: false });
      throw error;
    }
  },

  archiveLocation: async (locationId) => {
    try {
      set({ loading: true, error: null });
      await locationService.archiveLocation(locationId);
      await get().fetchLocations(); // Refresh the locations list
    } catch (error) {
      set({ error: 'Failed to archive location', loading: false });
      throw error;
    }
  },

  restoreLocation: async (locationId) => {
    try {
      set({ loading: true, error: null });
      await locationService.restoreLocation(locationId);
      await get().fetchLocations(); // Refresh the locations list
    } catch (error) {
      set({ error: 'Failed to restore location', loading: false });
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