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
import { getISOWeekNumber } from '@/lib/utils';

export const addTimeEntry = async (entryData: Omit<TimeEntry, 'id' | 'createdAt'>) => {
  try {
    console.log('Starting addTimeEntry with data:', entryData);
    let timeEntryId: string;

    await runTransaction(db, async (transaction) => {
      console.log('Starting transaction');
      
      // First, perform all reads
      const locationRef = doc(db, 'locations', entryData.locationId);
      const locationDoc = await transaction.get(locationRef);
      
      if (!locationDoc.exists()) {
        throw new Error('Location not found');
      }
      console.log('Location found:', locationDoc.data());

      // Only get mower doc if a mower was actually used
      let mowerDoc;
      if (entryData.mowerId) {
        const mowerRef = doc(db, 'mowers', entryData.mowerId);
        mowerDoc = await transaction.get(mowerRef);
        
        if (!mowerDoc.exists()) {
          throw new Error('Mower not found');
        }
        console.log('Mower found:', mowerDoc.data());
      }

      // Calculate current week number
      const currentDate = new Date();
      const currentWeek = getISOWeekNumber(currentDate);
      console.log('Current week:', currentWeek);

      // Create a new document reference
      const timeEntryRef = doc(collection(db, 'timeEntries'));
      timeEntryId = timeEntryRef.id;
      console.log('Generated timeEntryId:', timeEntryId);

      const timeEntryData = {
        ...entryData,
        createdAt: serverTimestamp(),
      };

      // Write the time entry
      transaction.set(timeEntryRef, timeEntryData);
      console.log('Time entry data prepared:', timeEntryData);

      // Update the location with the current week
      const locationUpdate: Record<string, any> = {
        lastMaintenanceWeek: currentWeek,
        updatedAt: serverTimestamp()
      };

      if (entryData.edgeCuttingDone) {
        locationUpdate.lastEdgeCuttingWeek = currentWeek;
      }

      transaction.update(locationRef, locationUpdate);
      console.log('Location update prepared:', locationUpdate);

      // Only update mower hours if a mower was actually used
      if (entryData.mowerId && mowerDoc) {
        const currentHours = mowerDoc.data().totalHours || 0;
        const mowerRef = doc(db, 'mowers', entryData.mowerId);
        transaction.update(mowerRef, {
          totalHours: currentHours + entryData.hours,
          updatedAt: serverTimestamp()
        });
        console.log('Mower hours update prepared:', { 
          currentHours, 
          newHours: currentHours + entryData.hours 
        });
      }
    });

    console.log('Transaction completed successfully');
    return timeEntryId;
  } catch (error) {
    console.error('Error in addTimeEntry:', error);
    throw new Error('Could not add time entry');
  }
};

export const getTimeEntriesForLocation = async (locationId: string, weekNumber?: number) => {
  try {
    console.log('Getting time entries for location:', locationId, 'week:', weekNumber);
    
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

      console.log('Week date range:', { weekStart, weekEnd });

      q = query(
        collection(db, 'timeEntries'),
        where('locationId', '==', locationId),
        where('date', '>=', Timestamp.fromDate(weekStart)),
        where('date', '<=', Timestamp.fromDate(weekEnd)),
        orderBy('date', 'desc')
      );
    }
    
    const querySnapshot = await getDocs(q);
    const entries = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as TimeEntry[];

    console.log('Found time entries:', entries.length);
    return entries;
  } catch (error) {
    console.error('Error in getTimeEntriesForLocation:', error);
    throw new Error('Could not get time entries');
  }
};

export const getTimeEntriesForEmployee = async (employeeId: string, startDate?: Date, endDate?: Date) => {
  try {
    console.log('Getting time entries for employee:', employeeId, { startDate, endDate });
    
    let q = query(
      collection(db, 'timeEntries'),
      where('employeeId', '==', employeeId),
      orderBy('date', 'desc')
    );
    
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
    const entries = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as TimeEntry[];

    console.log('Found time entries:', entries.length);
    return entries;
  } catch (error) {
    console.error('Error in getTimeEntriesForEmployee:', error);
    throw new Error('Could not get time entries');
  }
};

export const getWeeklyAggregatedHoursByEmployee = async () => {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);
  
  console.log('Getting weekly hours between:', { startOfWeek, endOfWeek });

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
  
  console.log('Weekly hours by employee:', aggregated);
  return aggregated;
};

export const getRecentTimeEntries = async (count: number = 5) => {
  try {
    console.log('Getting recent time entries, count:', count);
    
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
    
    console.log('Found recent entries:', entries.length);
    return entries as TimeEntry[];
  } catch (error) {
    console.error('Error in getRecentTimeEntries:', error);
    throw new Error('Could not get recent time entries');
  }
};

export const tagEmployeeForTimeEntry = async (timeEntryId: string, taggedEmployeeId: string) => {
  try {
    console.log('Tagging employee for time entry:', { timeEntryId, taggedEmployeeId });
    
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
      console.log('Employee tagged successfully');
    } else {
      console.log('Employee already tagged');
    }
  } catch (error) {
    console.error('Error in tagEmployeeForTimeEntry:', error);
    throw new Error('Could not tag employee');
  }
};

export const getPendingTimeEntriesForEmployee = async (employeeId: string) => {
  try {
    console.log('Getting pending time entries for employee:', employeeId);
    
    const q = query(
      collection(db, 'timeEntries'),
      where('taggedEmployeeIds', 'array-contains', employeeId),
      orderBy('date', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const entries = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as TimeEntry[];

    console.log('Found pending entries:', entries.length);
    return entries;
  } catch (error) {
    console.error('Error in getPendingTimeEntriesForEmployee:', error);
    throw new Error('Could not get pending time entries');
  }
};