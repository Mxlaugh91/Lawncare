import { create } from 'zustand';
import { SeasonSettings } from '@/types';
import * as seasonSettingsService from '@/services/seasonSettingsService';

interface SettingsState {
  seasonSettings: SeasonSettings | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  fetchSeasonSettings: () => Promise<void>;
  updateSeasonSettings: (settings: Partial<SeasonSettings>) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  seasonSettings: null,
  loading: false,
  error: null,

  fetchSeasonSettings: async () => {
    try {
      set({ loading: true, error: null });
      const settings = await seasonSettingsService.getSeasonSettings();
      set({ seasonSettings: settings, loading: false });
    } catch (error) {
      set({ error: 'Failed to fetch season settings', loading: false });
      throw error;
    }
  },

  updateSeasonSettings: async (settings) => {
    try {
      set({ loading: true, error: null });
      const updatedSettings = await seasonSettingsService.updateSeasonSettings(settings);
      set({ seasonSettings: updatedSettings, loading: false });
    } catch (error) {
      set({ error: 'Failed to update season settings', loading: false });
      throw error;
    }
  },
}));