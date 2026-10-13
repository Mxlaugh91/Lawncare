import { Timestamp } from 'firebase/firestore';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'employee';
  fcmToken?: string;
  createdAt: Timestamp;
}

export interface Location {
  id: string;
  name: string;
  address: string;
  description?: string;
  imageUrl?: string;
  googleEarthLink?: string;
  recommendedEquipment?: string;
  maintenanceFrequency: number; // in weeks
  edgeCuttingFrequency: number; // in weeks
  startWeek: number;
  notes: string;
  lastMaintenanceWeek?: number;
  lastEdgeCuttingWeek?: number;
  /** Uid of the employee who last registered maintenance for this location. */
  lastMaintenanceBy?: string;
  /** When the last maintenance time entry was registered. */
  lastMaintenanceAt?: Timestamp;
  /** Uid of the employee who last registered edge cutting for this location. */
  lastEdgeCuttingBy?: string;
  /** When the last edge cutting time entry was registered. */
  lastEdgeCuttingAt?: Timestamp;
  isArchived: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Narrow, publicly readable user data stored in the `userDirectory`
 * collection (synced by a Cloud Function). Used for name lookups by
 * non-admin users, who may not read the full `users` collection.
 */
export interface UserDirectoryEntry {
  id: string;
  name: string;
  role: 'admin' | 'employee';
  updatedAt?: Timestamp;
}

/** Minimal display data for plain name lookups. */
export interface UserLookup {
  id: string;
  name: string;
}

export interface TimeEntry {
  id: string;
  locationId: string;
  locationName?: string;
  employeeId: string;
  employeeName?: string;
  date: Timestamp;
  hours: number;
  edgeCuttingDone: boolean;
  mowerId?: string | null;
  notes?: string;
  taggedEmployeeIds?: string[];
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

/**
 * Shape accepted when creating a time entry.
 * Only these fields are written to Firestore (plus createdAt), matching the
 * hardened security rules. Display-only fields such as employeeName are NOT
 * part of the persisted payload.
 */
export interface TimeEntryInput {
  locationId: string;
  employeeId: string;
  hours: number;
  date: Timestamp;
  mowerId?: string | null;
  notes?: string;
  taggedEmployeeIds?: string[];
  edgeCuttingDone?: boolean;
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

/** Input accepted when creating a new mower (service intervals are optional). */
export interface NewMowerInput {
  name: string;
  model: string;
  serialNumber: string;
  serviceIntervals?: Array<{ description: string; hourInterval: number }>;
}

export interface ServiceInterval {
  id: string;
  mowerId: string;
  description: string;
  hourInterval: number;
  lastResetHours: number;
  lastResetDate: Timestamp | null;
  /**
   * Uid of the user who reset the interval. Service read functions resolve it
   * to a display name before returning data to the UI.
   */
  lastResetBy: string | null;
  createdAt: Timestamp;
}

export interface ServiceLog {
  id: string;
  mowerId: string;
  serviceIntervalId: string;
  /** Uid of the user who performed the service. Resolve names via the user directory. */
  performedBy: string;
  /** Display name resolved at read time from the user directory. */
  performedByName?: string;
  hoursAtService: number;
  date: Timestamp;
  notes?: string;
}

/**
 * Input shape for creating a location. `notes` may be omitted by forms and
 * defaults to an empty string.
 */
export type LocationInput = Omit<
  Location,
  'id' | 'createdAt' | 'updatedAt' | 'isArchived' | 'notes' | 'lastMaintenanceWeek' | 'lastEdgeCuttingWeek'
> & {
  notes?: string;
};

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
  type: 'job_tagged' | 'service_needed' | 'general' | 'time_entry_reminder' | 'manual_job_reminder';
  data?: {
    locationId?: string;
    locationName?: string;
    timeEntryId?: string;
    mowerId?: string;
    mowerName?: string;
    pendingEntries?: number;
  };
}

export type LocationStatus = 'planlagt' | 'ikke_utfort' | 'fullfort';

export interface LocationWithStatus extends Location {
  status: LocationStatus;
  /** Completion of grass cutting for the selected ISO week (per-type). */
  maintenanceStatus: LocationStatus;
  /** Completion of edge cutting for the selected ISO week (per-type). */
  edgeCuttingStatus: LocationStatus;
  isDueForMaintenanceInSelectedWeek: boolean;
  isDueForEdgeCuttingInSelectedWeek: boolean;
  /** Display names resolved from userDirectory for the last performers. */
  lastMaintenanceByName?: string;
  lastEdgeCuttingByName?: string;
  timeEntries?: TimeEntry[];
  taggedEmployees?: UserDirectoryEntry[];
}