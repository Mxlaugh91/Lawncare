import { Timestamp } from 'firebase/firestore';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'employee';
  createdAt: Timestamp;
}

export interface Location {
  id: string;
  name: string;
  address: string;
  maintenanceFrequency: number; // in weeks
  edgeCuttingFrequency: number; // in weeks
  startWeek: number;
  notes: string;
  lastMaintenanceWeek?: number;
  lastEdgeCuttingWeek?: number;
  isArchived: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface TimeEntry {
  id: string;
  locationId: string;
  employeeId: string;
  date: Timestamp;
  hours: number;
  edgeCuttingDone: boolean;
  mowerId?: string;
  notes?: string;
  taggedEmployeeIds?: string[];
  createdAt: Timestamp;
}

export interface Mower {
  id: string;
  name: string;
  model: string;
  serialNumber: string;
  totalHours: number;
  serviceIntervals?: ServiceInterval[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ServiceInterval {
  id: string;
  mowerId: string;
  description: string;
  hourInterval: number;
  lastResetHours: number;
  lastResetDate: Timestamp | null;
  lastResetBy: string | null;
  createdAt: Timestamp;
}

export interface ServiceLog {
  id: string;
  mowerId: string;
  serviceIntervalId: string;
  performedBy: string;
  hoursAtService: number;
  date: Timestamp;
  notes?: string;
}

export interface SeasonSettings {
  id: string;
  startWeek: number;
  endWeek: number;
  year: number;
  defaultFrequency: number;
  updatedAt: Timestamp;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: Timestamp;
  type: 'mower_service' | 'time_entry_tag' | 'general';
  data?: Record<string, any>;
}