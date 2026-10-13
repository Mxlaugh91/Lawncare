import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  Timestamp, 
  serverTimestamp,
  runTransaction,
  limit,
  updateDoc,
  arrayUnion
} from 'firebase/firestore';
import { db } from './firebase';
import { TimeEntry, TimeEntryInput, UserLookup } from '@/types';
import * as userService from './userService';
import * as locationService from './locationService';
import { getISOWeekNumber, getISOWeekDates } from '@/lib/utils';

/** Maximum number of hours that can be registered for a single time entry. */
export const MAX_TIME_ENTRY_HOURS = 24;
/** Maximum number of employees that can be tagged on a single time entry. */
export const MAX_TAGGED_EMPLOYEES = 20;
/** Maximum length of the notes field (enforced by the security rules). */
export const MAX_TIME_ENTRY_NOTES_LENGTH = 2000;

/**
 * Validates time entry input against the hardened security-rules contract:
 * hours must be > 0 and <= 24, and at most 20 employee ids may be tagged.
 * Returns the normalized tagged employee list.
 */
const validateTimeEntryInput = (entryData: TimeEntryInput): string[] => {
  if (!entryData.locationId || !entryData.employeeId || !entryData.date) {
    throw new Error('Missing required time entry fields');
  }

  if (
    typeof entryData.hours !== 'number' ||
    !Number.isFinite(entryData.hours) ||
    entryData.hours <= 0 ||
    entryData.hours > MAX_TIME_ENTRY_HOURS
  ) {
    throw new Error(`Hours must be greater than 0 and at most ${MAX_TIME_ENTRY_HOURS}`);
  }

  if ((entryData.notes ?? '').length > MAX_TIME_ENTRY_NOTES_LENGTH) {
    throw new Error(`Notes cannot exceed ${MAX_TIME_ENTRY_NOTES_LENGTH} characters`);
  }

  const taggedEmployeeIds = entryData.taggedEmployeeIds ?? [];
  if (
    !Array.isArray(taggedEmployeeIds) ||
    taggedEmployeeIds.length > MAX_TAGGED_EMPLOYEES ||
    taggedEmployeeIds.some(id => typeof id !== 'string' || id.length === 0)
  ) {
    throw new Error(`At most ${MAX_TAGGED_EMPLOYEES} tagged employees are allowed`);
  }

  return taggedEmployeeIds;
};

export const addTimeEntry = async (entryData: TimeEntryInput) => {
  try {
    const taggedEmployeeIds = validateTimeEntryInput(entryData);

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

      // Only write the fields allowed by the hardened timeEntries rules.
      // Display-only fields (employeeName/locationName) are intentionally not
      // persisted; names are resolved at read time from userDirectory.
      const timeEntryData: Record<string, unknown> = {
        employeeId: entryData.employeeId,
        locationId: entryData.locationId,
        hours: entryData.hours,
        date: entryData.date,
        notes: entryData.notes ?? '',
        edgeCuttingDone: entryData.edgeCuttingDone === true,
        taggedEmployeeIds,
        createdAt: serverTimestamp(),
      };

      if (entryData.mowerId) {
        timeEntryData.mowerId = entryData.mowerId;
      }

      transaction.set(timeEntryRef, timeEntryData);

      // The location document is the read source for weekly status (employees
      // cannot read other employees' time entries), so record who performed
      // the work and when alongside the week number.
      const locationUpdate: Record<string, unknown> = {
        lastMaintenanceWeek: currentWeek,
        lastMaintenanceBy: entryData.employeeId,
        lastMaintenanceAt: entryData.date,
        updatedAt: serverTimestamp()
      };

      if (entryData.edgeCuttingDone) {
        locationUpdate.lastEdgeCuttingWeek = currentWeek;
        locationUpdate.lastEdgeCuttingBy = entryData.employeeId;
        locationUpdate.lastEdgeCuttingAt = entryData.date;
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
      // Use the shared ISO-week helpers so week ranges always start on Monday
      // and include the full final day.
      const { start: weekStart, end: weekEnd } = getISOWeekDates(weekNumber);
      weekStart.setHours(0, 0, 0, 0);
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
    // (userDirectory-backed lookup: employees cannot read the users collection)
    let allUsers: UserLookup[] = [];
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
      
      const userChunks = await Promise.all(
        employeeChunks.map(chunk => userService.getUsersByIds(chunk))
      );

      allUsers = [...allUsers, ...userChunks.flat()];
    }

    // Create a lookup map for users
    const usersById = new Map<string, UserLookup>();
    allUsers.forEach(user => {
      usersById.set(user.id, user);
    });

    // Enrich time entries with employee names
    const enrichedTimeEntries = timeEntries.map(entry => ({
      ...entry,
      employeeName: usersById.get(entry.employeeId)?.name || 'Ukjent ansatt'
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
  // ISO weeks start on Monday. The ISO year can differ from the calendar year
  // around New Year, so pass it explicitly to the week helper.
  const currentWeek = getISOWeekNumber(now);
  const dayNumber = (now.getDay() + 6) % 7;
  const thursday = new Date(now.valueOf());
  thursday.setDate(thursday.getDate() - dayNumber + 3);
  const { start: startOfWeek, end: endOfWeek } = getISOWeekDates(currentWeek, thursday.getFullYear());
  startOfWeek.setHours(0, 0, 0, 0);
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

    // Initial mapping to get IDs
    const initialEntries = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as TimeEntry[];

    const locationIds = initialEntries.map(e => e.locationId).filter(Boolean);
    const employeeIds = initialEntries.map(e => e.employeeId).filter(Boolean);

    // Batch fetch related data
    const [locations, employees] = await Promise.all([
      locationService.getLocationsByIds(locationIds),
      userService.getUsersByIds(employeeIds)
    ]);

    // Create lookup maps
    const locationMap = new Map(locations.map(l => [l.id, l]));
    const employeeMap = new Map(employees.map(e => [e.id, e]));

    // Enrich entries
    const entries = initialEntries.map(entry => ({
      ...entry,
      locationName: locationMap.get(entry.locationId)?.name || 'Unknown Location',
      employeeName: employeeMap.get(entry.employeeId)?.name || 'Unknown Employee'
    }));
    
    return entries;
  } catch (error) {
    console.error('Error in getRecentTimeEntries:', error);
    throw new Error('Could not get recent time entries');
  }
};

export const tagEmployeeForTimeEntry = async (timeEntryId: string, taggedEmployeeId: string) => {
  try {
    const timeEntryRef = doc(db, 'timeEntries', timeEntryId);
    const timeEntryDoc = await getDoc(timeEntryRef);
    
    if (!timeEntryDoc.exists()) {
      throw new Error('Time entry not found');
    }
    
    const currentTaggedEmployees: string[] = timeEntryDoc.data().taggedEmployeeIds || [];
    
    if (!currentTaggedEmployees.includes(taggedEmployeeId)) {
      if (currentTaggedEmployees.length >= MAX_TAGGED_EMPLOYEES) {
        throw new Error(`At most ${MAX_TAGGED_EMPLOYEES} tagged employees are allowed`);
      }

      // arrayUnion avoids read-modify-write races on concurrently tagged employees.
      await updateDoc(timeEntryRef, {
        taggedEmployeeIds: arrayUnion(taggedEmployeeId),
        updatedAt: serverTimestamp()
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