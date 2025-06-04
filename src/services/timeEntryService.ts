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
  updateDoc
} from 'firebase/firestore';
import { db } from './firebase';
import { TimeEntry } from '@/types';
import * as userService from './userService';
import * as locationService from './locationService';

export const addTimeEntry = async (entryData: Omit<TimeEntry, 'id' | 'createdAt'>) => {
  try {
    let timeEntryId: string;

    await runTransaction(db, async (transaction) => {
      // First, perform all reads
      const locationRef = doc(db, 'locations', entryData.locationId);
      const locationDoc = await transaction.get(locationRef);
      
      if (!locationDoc.exists()) {
        throw new Error('Location not found');
      }

      // Only get mower doc if a mower was actually used
      let mowerDoc;
      if (entryData.mowerId) {
        const mowerRef = doc(db, 'mowers', entryData.mowerId);
        mowerDoc = await transaction.get(mowerRef);
        
        if (!mowerDoc.exists()) {
          throw new Error('Mower not found');
        }
      }

      // Calculate current week number
      const currentDate = new Date();
      const startOfYear = new Date(currentDate.getFullYear(), 0, 1);
      const days = Math.floor((currentDate.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
      const currentWeek = Math.ceil(days / 7);

      // Create a new document reference
      const timeEntryRef = doc(collection(db, 'timeEntries'));
      timeEntryId = timeEntryRef.id; // Store the ID

      const timeEntryData = {
        ...entryData,
        createdAt: serverTimestamp(),
      };

      // Write the time entry
      transaction.set(timeEntryRef, timeEntryData);

      // Update the location
      transaction.update(locationRef, {
        lastMaintenanceWeek: currentWeek,
        ...(entryData.edgeCuttingDone ? { lastEdgeCuttingWeek: currentWeek } : {}),
        updatedAt: serverTimestamp()
      });

      // Only update mower hours if a mower was actually used
      if (entryData.mowerId && mowerDoc) {
        const currentHours = mowerDoc.data().totalHours || 0;
        const mowerRef = doc(db, 'mowers', entryData.mowerId);
        transaction.update(mowerRef, {
          totalHours: currentHours + entryData.hours,
          updatedAt: serverTimestamp()
        });
      }
    });

    return timeEntryId; // Return the ID after transaction completes
  } catch (error) {
    console.error('Error adding time entry:', error);
    throw new Error('Could not add time entry');
  }
};

export const getTimeEntriesForLocation = async (locationId: string, weekNumber?: number) => {
  let q = query(
    collection(db, 'timeEntries'),
    where('locationId', '==', locationId),
    orderBy('date', 'desc')
  );

  if (weekNumber) {
    // Get the start and end dates for the specified week
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

    q = query(
      collection(db, 'timeEntries'),
      where('locationId', '==', locationId),
      where('date', '>=', Timestamp.fromDate(weekStart)),
      where('date', '<=', Timestamp.fromDate(weekEnd)),
      orderBy('date', 'desc')
    );
  }
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as TimeEntry[];
};

export const getTimeEntriesForEmployee = async (employeeId: string, startDate?: Date, endDate?: Date) => {
  let q = query(
    collection(db, 'timeEntries'),
    where('employeeId', '==', employeeId),
    orderBy('date', 'desc')
  );
  
  // Add date filters if provided
  if (startDate && endDate) {
    q = query(
      collection(db, 'timeEntries'),
      where('employeeId', '==', employeeId),
      where('date', '>=', Timestamp.fromDate(startDate)),
      where('date', '<=', Timestamp.fromDate(endDate)),
      orderBy('date', 'desc')
    );
  }
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as TimeEntry[];
};

export const getWeeklyAggregatedHoursByEmployee = async () => {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);
  
  const q = query(
    collection(db, 'timeEntries'),
    where('date', '>=', Timestamp.fromDate(startOfWeek)),
    where('date', '<=', Timestamp.fromDate(endOfWeek))
  );
  
  const querySnapshot = await getDocs(q);
  const entries = querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as TimeEntry[];
  
  // Group by employee and sum hours
  const aggregated: Record<string, number> = {};
  
  entries.forEach(entry => {
    if (!aggregated[entry.employeeId]) {
      aggregated[entry.employeeId] = 0;
    }
    aggregated[entry.employeeId] += entry.hours;
  });
  
  return aggregated;
};

export const getRecentTimeEntries = async (count: number = 5) => {
  const q = query(
    collection(db, 'timeEntries'),
    orderBy('date', 'desc'),
    limit(count)
  );
  
  const querySnapshot = await getDocs(q);
  const entries = await Promise.all(querySnapshot.docs.map(async doc => {
    const data = doc.data();
    
    // Get location name
    const location = await locationService.getLocationById(data.locationId);
    
    // Get employee name
    const employee = await userService.getUserById(data.employeeId);
    
    return {
      id: doc.id,
      ...data,
      locationName: location?.name || 'Unknown Location',
      employeeName: employee?.name || 'Unknown Employee'
    };
  }));
  
  return entries as TimeEntry[];
};

export const tagEmployeeForTimeEntry = async (timeEntryId: string, taggedEmployeeId: string) => {
  const timeEntryRef = doc(db, 'timeEntries', timeEntryId);
  const timeEntryDoc = await getDoc(timeEntryRef);
  
  if (!timeEntryDoc.exists()) {
    throw new Error('Time entry not found');
  }
  
  const currentTaggedEmployees = timeEntryDoc.data().taggedEmployeeIds || [];
  
  if (!currentTaggedEmployees.includes(taggedEmployeeId)) {
    await updateDoc(timeEntryRef, {
      taggedEmployeeIds: [...currentTaggedEmployees, taggedEmployeeId]
    });
  }
};

export const getPendingTimeEntriesForEmployee = async (employeeId: string) => {
  const q = query(
    collection(db, 'timeEntries'),
    where('taggedEmployeeIds', 'array-contains', employeeId),
    orderBy('date', 'desc')
  );
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as TimeEntry[];
};