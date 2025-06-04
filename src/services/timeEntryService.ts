// src/services/timeEntryService.ts
import { 
  collection, 
  doc, 
  addDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  Timestamp, 
  serverTimestamp,
  runTransaction,
  limit,
  DocumentData,
  QueryDocumentSnapshot
} from 'firebase/firestore';
import { db } from './firebase';
import { TimeEntry, TimeEntryWithDetails } from '@/types';
import * as userService from './userService';
import * as locationService from './locationService';

// Type-safe converter for TimeEntry documents
const timeEntryConverter = {
  toFirestore: (timeEntry: Omit<TimeEntry, 'id'>): DocumentData => {
    return timeEntry as DocumentData;
  },
  fromFirestore: (snapshot: QueryDocumentSnapshot): TimeEntry => {
    const data = snapshot.data();
    return {
      id: snapshot.id,
      locationId: data.locationId,
      employeeId: data.employeeId,
      date: data.date,
      hours: data.hours,
      edgeCuttingDone: data.edgeCuttingDone,
      mowerId: data.mowerId || null,
      notes: data.notes || '',
      taggedEmployeeIds: data.taggedEmployeeIds || [],
      createdAt: data.createdAt,
    } as TimeEntry;
  }
};

// Helper function to safely extract TimeEntry data
const extractTimeEntryData = (doc: QueryDocumentSnapshot): TimeEntry => {
  const data = doc.data();
  
  // Validate required fields exist
  if (!data.locationId || !data.employeeId || !data.date) {
    throw new Error(`Invalid time entry document: ${doc.id}`);
  }
  
  return {
    id: doc.id,
    locationId: data.locationId,
    employeeId: data.employeeId,
    date: data.date,
    hours: Number(data.hours) || 0,
    edgeCuttingDone: Boolean(data.edgeCuttingDone),
    mowerId: data.mowerId || null,
    notes: data.notes || '',
    taggedEmployeeIds: data.taggedEmployeeIds || [],
    createdAt: data.createdAt,
  };
};

// ✅ FIXED VERSION - Type safe with proper error handling
export const getRecentTimeEntries = async (count: number = 5): Promise<TimeEntryWithDetails[]> => {
  try {
    const q = query(
      collection(db, 'timeEntries'),
      orderBy('date', 'desc'),
      limit(count)
    );
    
    const querySnapshot = await getDocs(q);
    
    // ✅ Extract and type the data safely
    const timeEntries: TimeEntry[] = querySnapshot.docs.map(doc => {
      try {
        return extractTimeEntryData(doc);
      } catch (error) {
        console.warn(`Skipping invalid document ${doc.id}:`, error);
        return null;
      }
    }).filter((entry): entry is TimeEntry => entry !== null);
    
    // ✅ Batch the related data fetching for better performance
    const locationIds = [...new Set(timeEntries.map(entry => entry.locationId))];
    const employeeIds = [...new Set(timeEntries.map(entry => entry.employeeId))];
    
    // Fetch all unique locations and employees in parallel
    const [locationsMap, employeesMap] = await Promise.all([
      fetchLocationsMap(locationIds),
      fetchEmployeesMap(employeeIds)
    ]);
    
    // ✅ Combine data with proper typing
    const entriesWithDetails: TimeEntryWithDetails[] = timeEntries.map(entry => ({
      ...entry,
      locationName: locationsMap.get(entry.locationId) || 'Unknown Location',
      employeeName: employeesMap.get(entry.employeeId) || 'Unknown Employee'
    }));
    
    return entriesWithDetails;
    
  } catch (error) {
    console.error('Error fetching recent time entries:', error);
    throw new Error('Could not fetch recent time entries');
  }
};

// Helper function to batch fetch locations
const fetchLocationsMap = async (locationIds: string[]): Promise<Map<string, string>> => {
  const locationsMap = new Map<string, string>();
  
  // Batch fetch locations (Firebase allows max 10 in whereIn)
  const batches = chunkArray(locationIds, 10);
  
  for (const batch of batches) {
    try {
      const q = query(
        collection(db, 'locations'),
        where('__name__', 'in', batch)
      );
      const snapshot = await getDocs(q);
      
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.name) {
          locationsMap.set(doc.id, data.name);
        }
      });
    } catch (error) {
      console.warn('Error fetching location batch:', error);
      // Continue with other batches
    }
  }
  
  return locationsMap;
};

// Helper function to batch fetch employees
const fetchEmployeesMap = async (employeeIds: string[]): Promise<Map<string, string>> => {
  const employeesMap = new Map<string, string>();
  
  const batches = chunkArray(employeeIds, 10);
  
  for (const batch of batches) {
    try {
      const q = query(
        collection(db, 'users'),
        where('__name__', 'in', batch)
      );
      const snapshot = await getDocs(q);
      
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.name) {
          employeesMap.set(doc.id, data.name);
        }
      });
    } catch (error) {
      console.warn('Error fetching employee batch:', error);
    }
  }
  
  return employeesMap;
};

// Utility function to split array into chunks
const chunkArray = <T>(array: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

// ✅ Alternative approach using converters
export const getTimeEntriesForLocation = async (
  locationId: string, 
  weekNumber?: number
): Promise<TimeEntry[]> => {
  try {
    let q = query(
      collection(db, 'timeEntries').withConverter(timeEntryConverter),
      where('locationId', '==', locationId),
      orderBy('date', 'desc')
    );

    if (weekNumber) {
      const weekDates = getWeekDateRange(weekNumber);
      q = query(
        collection(db, 'timeEntries').withConverter(timeEntryConverter),
        where('locationId', '==', locationId),
        where('date', '>=', Timestamp.fromDate(weekDates.start)),
        where('date', '<=', Timestamp.fromDate(weekDates.end)),
        orderBy('date', 'desc')
      );
    }
    
    const querySnapshot = await getDocs(q);
    
    // ✅ Now properly typed as TimeEntry[]
    return querySnapshot.docs.map(doc => doc.data());
    
  } catch (error) {
    console.error('Error fetching time entries for location:', error);
    throw new Error('Could not fetch time entries for location');
  }
};

// Helper function to get week date range
const getWeekDateRange = (weekNumber: number): { start: Date; end: Date } => {
  const currentYear = new Date().getFullYear();
  const januaryFirst = new Date(currentYear, 0, 1);
  const firstThursday = new Date(currentYear, 0, 1 + ((4 - januaryFirst.getDay()) + 7) % 7);
  const firstWeekStart = new Date(firstThursday);
  firstWeekStart.setDate(firstThursday.getDate() - 3);
  
  const weekStart = new Date(firstWeekStart);
  weekStart.setDate(firstWeekStart.getDate() + (weekNumber - 1) * 7);
  weekStart.setHours(0, 0, 0, 0);
  
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  return { start: weekStart, end: weekEnd };
};

// ✅ Type-safe version of other functions
export const getTimeEntriesForEmployee = async (
  employeeId: string, 
  startDate?: Date, 
  endDate?: Date
): Promise<TimeEntry[]> => {
  try {
    let q = query(
      collection(db, 'timeEntries').withConverter(timeEntryConverter),
      where('employeeId', '==', employeeId),
      orderBy('date', 'desc')
    );
    
    if (startDate && endDate) {
      q = query(
        collection(db, 'timeEntries').withConverter(timeEntryConverter),
        where('employeeId', '==', employeeId),
        where('date', '>=', Timestamp.fromDate(startDate)),
        where('date', '<=', Timestamp.fromDate(endDate)),
        orderBy('date', 'desc')
      );
    }
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data());
    
  } catch (error) {
    console.error('Error fetching time entries for employee:', error);
    throw new Error('Could not fetch time entries for employee');
  }
};