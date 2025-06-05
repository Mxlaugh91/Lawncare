import { create } from 'zustand';
import { TimeEntry } from '@/types';
import * as timeEntryService from '@/services/timeEntryService';

interface TimeEntryState {
  timeEntries: TimeEntry[];
  loading: boolean;
  error: string | null;
  
  // Actions
  addTimeEntry: (entryData: Omit<TimeEntry, 'id' | 'createdAt'>) => Promise<string>;
  getTimeEntriesForLocation: (locationId: string, weekNumber?: number) => Promise<TimeEntry[]>;
  getTimeEntriesForEmployee: (employeeId: string, startDate?: Date, endDate?: Date) => Promise<TimeEntry[]>;
  getWeeklyAggregatedHoursByEmployee: () => Promise<Record<string, number>>;
  getRecentTimeEntries: (count?: number) => Promise<TimeEntry[]>;
  tagEmployeeForTimeEntry: (timeEntryId: string, taggedEmployeeId: string) => Promise<void>;
  getPendingTimeEntriesForEmployee: (employeeId: string) => Promise<TimeEntry[]>;
}

export const useTimeEntryStore = create<TimeEntryState>((set, get) => ({
  timeEntries: [],
  loading: false,
  error: null,

  addTimeEntry: async (entryData) => {
    try {
      set({ loading: true, error: null });
      const timeEntryId = await timeEntryService.addTimeEntry(entryData);
      return timeEntryId;
    } catch (error) {
      set({ error: 'Failed to add time entry', loading: false });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  getTimeEntriesForLocation: async (locationId, weekNumber) => {
    try {
      set({ loading: true, error: null });
      const entries = await timeEntryService.getTimeEntriesForLocation(locationId, weekNumber);
      return entries;
    } catch (error) {
      set({ error: 'Failed to get time entries for location', loading: false });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  getTimeEntriesForEmployee: async (employeeId, startDate, endDate) => {
    try {
      set({ loading: true, error: null });
      const entries = await timeEntryService.getTimeEntriesForEmployee(employeeId, startDate, endDate);
      return entries;
    } catch (error) {
      set({ error: 'Failed to get time entries for employee', loading: false });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  getWeeklyAggregatedHoursByEmployee: async () => {
    try {
      set({ loading: true, error: null });
      const hours = await timeEntryService.getWeeklyAggregatedHoursByEmployee();
      return hours;
    } catch (error) {
      set({ error: 'Failed to get weekly hours', loading: false });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  getRecentTimeEntries: async (count = 5) => {
    try {
      set({ loading: true, error: null });
      const entries = await timeEntryService.getRecentTimeEntries(count);
      return entries;
    } catch (error) {
      set({ error: 'Failed to get recent time entries', loading: false });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  tagEmployeeForTimeEntry: async (timeEntryId, taggedEmployeeId) => {
    try {
      set({ loading: true, error: null });
      await timeEntryService.tagEmployeeForTimeEntry(timeEntryId, taggedEmployeeId);
    } catch (error) {
      set({ error: 'Failed to tag employee', loading: false });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  getPendingTimeEntriesForEmployee: async (employeeId) => {
    try {
      set({ loading: true, error: null });
      const entries = await timeEntryService.getPendingTimeEntriesForEmployee(employeeId);
      return entries;
    } catch (error) {
      set({ error: 'Failed to get pending time entries', loading: false });
      throw error;
    } finally {
      set({ loading: false });
    }
  },
}));