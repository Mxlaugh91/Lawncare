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
    const timeEntryId = await runTransaction(db, async (transaction) => {
      const locationRef = doc(db, 'locations', entryData.locationId);
      const locationDoc = await transaction.get(locationRef);
      
      if (!locationDoc.exists()) {
        throw new Error('Location not found');
      }

      let mowerDoc;
      if (entryData.mowerId) {
        const mowerRef = doc(db, 'mowers', entryData.mowerId);
        mowerDoc = await transaction.get(mowerRef);
        
        if (!mowerDoc.exists()) {
          throw new Error('Mower not found');
        }
      }

      const currentDate = new Date();
      const currentWeek = getISOWeekNumber(currentDate);

      const timeEntryRef = doc(collection(db, 'timeEntries'));
      const newTimeEntryId = timeEntryRef.id;

      const timeEntryData = {
        ...entryData,
        createdAt: serverTimestamp(),
      };

      transaction.set(timeEntryRef, timeEntryData);

      const locationUpdate: Record<string, any> = {
        lastMaintenanceWeek: currentWeek,
        updatedAt: serverTimestamp()
      };

      if (entryData.edgeCuttingDone) {
        locationUpdate.lastEdgeCuttingWeek = currentWeek;
      }

      transaction.update(locationRef, locationUpdate);

      if (entryData.mowerId && mowerDoc) {
        const currentHours = mowerDoc.data().totalHours || 0;
        const mowerRef = doc(db, 'mowers', entryData.mowerId);
        transaction.update(mowerRef, {
          totalHours: currentHours + entryData.hours,
          updatedAt: serverTimestamp()
        });
      }

      return newTimeEntryId;
    });

    return timeEntryId;
  } catch (error) {
    console.error('Error in addTimeEntry:', error);
    throw new Error('Could not add time entry');
  }
};

export const getTimeEntriesForLocation = async (locationId: string, weekNumber?: number) => {
  try {
    let q = query(
      collection(db, 'timeEntries'),
      where('locationId', '==', locationId),
      orderBy('date', 'desc')
    );

    if (weekNumber) {
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
    const timeEntries = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as TimeEntry[];

    // Collect all unique employee IDs from time entries and tagged employees
    const allEmployeeIds = new Set<string>();
    
    timeEntries.forEach(entry => {
      if (entry.employeeId) {
        allEmployeeIds.add(entry.employeeId);
      }
      if (entry.taggedEmployeeIds && Array.isArray(entry.taggedEmployeeIds)) {
        entry.taggedEmployeeIds.forEach(id => allEmployeeIds.add(id));
      }
    });

    // Fetch all users in batches if we have employee IDs
    let allUsers: any[] = [];
    if (allEmployeeIds.size > 0) {
      const employeeIdArray = Array.from(allEmployeeIds);
      
      // Batch fetch users (Firestore 'in' query limit is 10)
      const chunkArray = <T>(array: T[], chunkSize: number): T[][] => {
        const chunks: T[][] = [];
        for (let i = 0; i < array.length; i += chunkSize) {
          chunks.push(array.slice(i, i + chunkSize));
        }
        return chunks;
      };

      const employeeChunks = chunkArray(employeeIdArray, 10);
      
      for (const chunk of employeeChunks) {
        const users = await userService.getUsersByIds(chunk);
        allUsers = [...allUsers, ...users];
      }
    }

    // Create a lookup map for users
    const usersById = new Map<string, any>();
    allUsers.forEach(user => {
      usersById.set(user.id, user);
    });

    // Enrich time entries with employee names
    const enrichedTimeEntries = timeEntries.map(entry => ({
      ...entry,
      employeeName: usersById.get(entry.employeeId)?.name || 'Unknown Employee'
    }));

    return enrichedTimeEntries;
  } catch (error) {
    console.error('Error in getTimeEntriesForLocation:', error);
    throw new Error('Could not get time entries');
  }
};

export const getTimeEntriesForEmployee = async (employeeId: string, startDate?: Date, endDate?: Date) => {
  try {
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
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as TimeEntry[];
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
  try {
    const q = query(
      collection(db, 'timeEntries'),
      orderBy('date', 'desc'),
      limit(count)
    );
    
    const querySnapshot = await getDocs(q);
    const entries = await Promise.all(querySnapshot.docs.map(async doc => {
      const data = doc.data();
      
      const location = await locationService.getLocationById(data.locationId);
      const employee = await userService.getUserById(data.employeeId);
      
      return {
        id: doc.id,
        ...data,
        locationName: location?.name || 'Unknown Location',
        employeeName: employee?.name || 'Unknown Employee'
      };
    }));
    
    return entries as TimeEntry[];
  } catch (error) {
    console.error('Error in getRecentTimeEntries:', error);
    throw new Error('Could not get recent time entries');
  }
};

export const getLatestTimeEntryForLocationAndType = async (locationId: string, isEdgeCutting: boolean = false) => {
  try {
    let q = query(
      collection(db, 'timeEntries'),
      where('locationId', '==', locationId),
      orderBy('date', 'desc'),
      limit(1)
    );

    if (isEdgeCutting) {
      q = query(
        collection(db, 'timeEntries'),
        where('locationId', '==', locationId),
        where('edgeCuttingDone', '==', true),
        orderBy('date', 'desc'),
        limit(1)
      );
    }
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    const timeEntry = {
      id: querySnapshot.docs[0].id,
      ...querySnapshot.docs[0].data()
    } as TimeEntry;
    
    // Always fetch the current employee name from the users collection
    if (timeEntry.employeeId) {
      const employee = await userService.getUserById(timeEntry.employeeId);
      timeEntry.employeeName = employee?.name || 'Ukjent ansatt';
    }
    
    return timeEntry;
  } catch (error) {
    console.error('Error in getLatestTimeEntryForLocationAndType:', error);
    throw new Error('Could not get latest time entry');
  }
};

export const tagEmployeeForTimeEntry = async (timeEntryId: string, taggedEmployeeId: string) => {
  try {
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
  } catch (error) {
    console.error('Error in tagEmployeeForTimeEntry:', error);
    throw new Error('Could not tag employee');
  }
};

export const getPendingTimeEntriesForEmployee = async (employeeId: string) => {
  try {
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
  } catch (error) {
    console.error('Error in getPendingTimeEntriesForEmployee:', error);
    throw new Error('Could not get pending time entries');
  }
};