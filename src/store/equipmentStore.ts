import { create } from 'zustand';
import { Mower, ServiceInterval } from '@/types';
import * as equipmentService from '@/services/equipmentService';

interface EquipmentState {
  mowers: Mower[];
  loading: boolean;
  error: string | null;
  
  // Actions
  fetchMowers: () => Promise<void>;
  addMower: (mowerData: Omit<Mower, 'id' | 'createdAt' | 'updatedAt' | 'totalHours'>) => Promise<string>;
  updateMowerDetails: (mowerId: string, updatedData: Partial<Mower>) => Promise<void>;
  deleteMower: (mowerId: string) => Promise<void>;
  logMowerUsage: (mowerId: string, hoursUsed: number) => Promise<void>;
  resetServiceInterval: (mowerId: string, intervalId: string, userId: string) => Promise<void>;
  addServiceInterval: (mowerId: string, intervalData: { description: string; hourInterval: number }) => Promise<void>;
  deleteServiceInterval: (mowerId: string, intervalId: string) => Promise<void>;
  
  // Computed values / Selectors
  getMowersNeedingService: () => Mower[];
}

export const useEquipmentStore = create<EquipmentState>((set, get) => ({
  mowers: [],
  loading: false,
  error: null,

  fetchMowers: async () => {
    try {
      set({ loading: true, error: null });
      const mowers = await equipmentService.getAllMowers();
      set({ mowers, loading: false });
    } catch (error) {
      set({ error: 'Failed to fetch mowers', loading: false });
      throw error;
    }
  },

  addMower: async (mowerData) => {
    try {
      set({ loading: true, error: null });
      const mowerId = await equipmentService.addMower(mowerData);
      await get().fetchMowers(); // Refresh the mowers list
      return mowerId;
    } catch (error) {
      set({ error: 'Failed to add mower', loading: false });
      throw error;
    }
  },

  updateMowerDetails: async (mowerId, updatedData) => {
    try {
      set({ loading: true, error: null });
      await equipmentService.updateMowerDetails(mowerId, updatedData);
      await get().fetchMowers(); // Refresh the mowers list
    } catch (error) {
      set({ error: 'Failed to update mower', loading: false });
      throw error;
    }
  },

  deleteMower: async (mowerId) => {
    try {
      set({ loading: true, error: null });
      await equipmentService.deleteMower(mowerId);
      await get().fetchMowers(); // Refresh the mowers list
    } catch (error) {
      set({ error: 'Failed to delete mower', loading: false });
      throw error;
    }
  },

  logMowerUsage: async (mowerId, hoursUsed) => {
    try {
      set({ loading: true, error: null });
      await equipmentService.logMowerUsage(mowerId, hoursUsed);
      await get().fetchMowers(); // Refresh the mowers list
    } catch (error) {
      set({ error: 'Failed to log mower usage', loading: false });
      throw error;
    }
  },

  resetServiceInterval: async (mowerId, intervalId, userId) => {
    try {
      set({ loading: true, error: null });
      await equipmentService.resetServiceInterval(mowerId, intervalId, userId);
      await get().fetchMowers(); // Refresh the mowers list
    } catch (error) {
      set({ error: 'Failed to reset service interval', loading: false });
      throw error;
    }
  },

  addServiceInterval: async (mowerId, intervalData) => {
    try {
      set({ loading: true, error: null });
      await equipmentService.addServiceInterval(mowerId, intervalData);
      await get().fetchMowers(); // Refresh the mowers list
    } catch (error) {
      set({ error: 'Failed to add service interval', loading: false });
      throw error;
    }
  },

  deleteServiceInterval: async (mowerId, intervalId) => {
    try {
      set({ loading: true, error: null });
      await equipmentService.deleteServiceInterval(mowerId, intervalId);
      await get().fetchMowers(); // Refresh the mowers list
    } catch (error) {
      set({ error: 'Failed to delete service interval', loading: false });
      throw error;
    }
  },

  // Selectors
  getMowersNeedingService: () => {
    return get().mowers.filter(mower => {
      if (!mower.serviceIntervals) return false;
      return mower.serviceIntervals.some(interval => {
        const lastResetHours = interval.lastResetHours || 0;
        return (mower.totalHours - lastResetHours) >= interval.hourInterval;
      });
    });
  },
}));