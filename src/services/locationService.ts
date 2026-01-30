import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc,
  deleteDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  Timestamp, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from './firebase';
import { Location, LocationStatus, LocationWithStatus } from '@/types';
import * as userService from './userService';
import { getISOWeekNumber, getISOWeekDates } from '@/lib/utils';

export const addLocation = async (locationData: Omit<Location, 'id' | 'createdAt' | 'updatedAt' | 'isArchived'>) => {
  try {
    const locationToAdd = {
      ...locationData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      isArchived: false,
      lastMaintenanceWeek: null,
      lastEdgeCuttingWeek: null
    };

    const docRef = await addDoc(collection(db, 'locations'), locationToAdd);
    return docRef.id;
  } catch (error) {
    console.error('Error adding location:', error);
    throw new Error('Kunne ikke legge til nytt sted');
  }
};

export const getActiveLocations = async () => {
  try {
    const q = query(
      collection(db, 'locations'),
      where('isArchived', '==', false),
      orderBy('name')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Location[];
  } catch (error) {
    console.error('Error getting active locations:', error);
    throw new Error('Kunne ikke hente aktive steder');
  }
};

export const getArchivedLocations = async () => {
  try {
    const q = query(
      collection(db, 'locations'),
      where('isArchived', '==', true),
      orderBy('name')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Location[];
  } catch (error) {
    console.error('Error getting archived locations:', error);
    throw new Error('Kunne ikke hente arkiverte steder');
  }
};

export const getLocationById = async (locationId: string) => {
  try {
    const docRef = doc(db, 'locations', locationId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      } as Location;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting location:', error);
    throw new Error('Kunne ikke hente stedsdetaljer');
  }
};

export const updateLocation = async (locationId: string, updatedData: Partial<Location>) => {
  try {
    const docRef = doc(db, 'locations', locationId);
    
    await updateDoc(docRef, {
      ...updatedData,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating location:', error);
    throw new Error('Kunne ikke oppdatere stedet');
  }
};

export const archiveLocation = async (locationId: string) => {
  try {
    const docRef = doc(db, 'locations', locationId);
    
    await updateDoc(docRef, {
      isArchived: true,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error archiving location:', error);
    throw new Error('Kunne ikke arkivere stedet');
  }
};

export const restoreLocation = async (locationId: string) => {
  try {
    const docRef = doc(db, 'locations', locationId);
    
    await updateDoc(docRef, {
      isArchived: false,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error restoring location:', error);
    throw new Error('Kunne ikke gjenopprette stedet');
  }
};

export const deleteLocation = async (locationId: string) => {
  try {
    await deleteDoc(doc(db, 'locations', locationId));
  } catch (error) {
    console.error('Error deleting location:', error);
    throw new Error('Kunne ikke slette stedet');
  }
};

export const deleteAllLocations = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'locations'));
    await Promise.all(querySnapshot.docs.map(doc => deleteDoc(doc.ref)));
  } catch (error) {
    console.error('Error deleting all locations:', error);
    throw new Error('Kunne ikke slette alle steder');
  }
};

export const getLocationsDueForService = async () => {
  try {
    const q = query(
      collection(db, 'locations'),
      where('isArchived', '==', false),
      orderBy('name')
    );
    
    const querySnapshot = await getDocs(q);
    
    const now = new Date();
    const currentWeek = getISOWeekNumber(now);
    
    return querySnapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      }) as Location)
      .filter(location => {
        const lastMaintenanceWeek = location.lastMaintenanceWeek || 0;
        const frequency = location.maintenanceFrequency || 2;
        
        return (currentWeek - lastMaintenanceWeek) >= frequency;
      });
  } catch (error) {
    console.error('Error getting locations due for service:', error);
    throw new Error('Kunne ikke hente steder som trenger vedlikehold');
  }
};

// Helper function to chunk arrays for Firestore 'in' queries (max 10 items)
const chunkArray = <T>(array: T[], chunkSize: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
};

export const getLocationsWithWeeklyStatus = async (weekNumber: number): Promise<LocationWithStatus[]> => {
  try {
    console.log('🚀 Starting getLocationsWithWeeklyStatus - optimized version');
    
    // 1. Get all active locations (1 query)
    const locationsQuery = query(
      collection(db, 'locations'),
      where('isArchived', '==', false),
      orderBy('name')
    );
    
    const locationsSnapshot = await getDocs(locationsQuery);
    const locations = locationsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Location[];

    console.log(`📍 Found ${locations.length} locations`);

    if (locations.length === 0) {
      return [];
    }

    // 2. Calculate week date range for time entries
    const { start: weekStart, end: weekEnd } = getISOWeekDates(weekNumber);
    weekStart.setHours(0, 0, 0, 0);
    weekEnd.setHours(23, 59, 59, 999);

    // 3. Batch fetch ALL time entries for the week (chunked queries due to Firestore 'in' limit)
    const locationIds = locations.map(loc => loc.id);
    const locationChunks = chunkArray(locationIds, 10); // Firestore 'in' query limit is 10
    
    let allTimeEntries: any[] = [];
    
    for (const chunk of locationChunks) {
      const timeEntriesQuery = query(
        collection(db, 'timeEntries'),
        where('locationId', 'in', chunk),
        where('date', '>=', Timestamp.fromDate(weekStart)),
        where('date', '<=', Timestamp.fromDate(weekEnd)),
        orderBy('date', 'desc')
      );
      
      const timeEntriesSnapshot = await getDocs(timeEntriesQuery);
      const chunkEntries = timeEntriesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      allTimeEntries = [...allTimeEntries, ...chunkEntries];
    }

    console.log(`⏰ Found ${allTimeEntries.length} time entries for week ${weekNumber}`);

    // 4. Collect all unique employee IDs from time entries
    const allEmployeeIds = new Set<string>();
    
    allTimeEntries.forEach(entry => {
      if (entry.employeeId) {
        allEmployeeIds.add(entry.employeeId);
      }
      if (entry.taggedEmployeeIds && Array.isArray(entry.taggedEmployeeIds)) {
        entry.taggedEmployeeIds.forEach((id: string) => allEmployeeIds.add(id));
      }
    });

    console.log(`👥 Found ${allEmployeeIds.size} unique employee IDs`);

    // 5. Batch fetch ALL users (chunked queries)
    let allUsers: any[] = [];
    
    if (allEmployeeIds.size > 0) {
      const employeeIdArray = Array.from(allEmployeeIds);
      const employeeChunks = chunkArray(employeeIdArray, 10);
      
      for (const chunk of employeeChunks) {
        const usersQuery = query(
          collection(db, 'users'),
          where('__name__', 'in', chunk)
        );
        
        const usersSnapshot = await getDocs(usersQuery);
        const chunkUsers = usersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        allUsers = [...allUsers, ...chunkUsers];
      }
    }

    console.log(`👤 Found ${allUsers.length} users`);

    // 6. Create lookup maps for O(1) access
    const timeEntriesByLocation = new Map<string, any[]>();
    const usersById = new Map<string, any>();

    // Group time entries by location
    allTimeEntries.forEach(entry => {
      if (!timeEntriesByLocation.has(entry.locationId)) {
        timeEntriesByLocation.set(entry.locationId, []);
      }
      timeEntriesByLocation.get(entry.locationId)!.push(entry);
    });

    // Index users by ID
    allUsers.forEach(user => {
      usersById.set(user.id, user);
    });

    // 7. Process each location using pre-fetched data (NO additional queries)
    const locationsWithStatus = locations.map(location => {
      // Get time entries for this location from our pre-fetched data
      const timeEntries = timeEntriesByLocation.get(location.id) || [];
      
      // Get tagged employees from our pre-fetched users
      const taggedEmployeeIds = timeEntries.flatMap(entry => entry.taggedEmployeeIds || []);
      const taggedEmployees = taggedEmployeeIds
        .map(id => usersById.get(id))
        .filter(Boolean); // Remove undefined values

      // Add employee names to time entries
      const enrichedTimeEntries = timeEntries.map(entry => ({
        ...entry,
        employeeName: usersById.get(entry.employeeId)?.name || 'Unknown Employee'
      }));

      // Check if maintenance is due this week
      const isDueForMaintenanceInSelectedWeek = 
        weekNumber >= location.startWeek && 
        (weekNumber - location.startWeek) % location.maintenanceFrequency === 0;

      // Check if edge cutting is due this week
      const isDueForEdgeCuttingInSelectedWeek = 
        weekNumber >= location.startWeek && 
        (weekNumber - location.startWeek) % location.edgeCuttingFrequency === 0;

      // If neither maintenance nor edge cutting is due, AND no time entries/tags, return early
      if (!isDueForMaintenanceInSelectedWeek && !isDueForEdgeCuttingInSelectedWeek && enrichedTimeEntries.length === 0 && taggedEmployees.length === 0) {
        return {
          ...location,
          status: 'planlagt' as LocationStatus,
          isDueForMaintenanceInSelectedWeek,
          isDueForEdgeCuttingInSelectedWeek,
          timeEntries: [],
          taggedEmployees: []
        };
      }

      // Determine status based on time entries and tagged employees
      let status: LocationStatus = 'planlagt';

      if (enrichedTimeEntries.length > 0) {
        if (taggedEmployeeIds.length > 0) {
          // Check if all tagged employees have submitted their hours
          const allTaggedEmployeesSubmitted = taggedEmployeeIds.every(employeeId =>
            enrichedTimeEntries.some(entry => entry.employeeId === employeeId)
          );
          status = allTaggedEmployeesSubmitted ? 'fullfort' : 'ikke_utfort';
        } else {
          status = 'fullfort';
        }
      } else if (taggedEmployeeIds.length > 0) {
        status = 'ikke_utfort';
      }

      return {
        ...location,
        status,
        isDueForMaintenanceInSelectedWeek,
        isDueForEdgeCuttingInSelectedWeek,
        timeEntries: enrichedTimeEntries,
        taggedEmployees
      };
    });

    console.log('✅ getLocationsWithWeeklyStatus completed successfully');
    return locationsWithStatus;
    
  } catch (error) {
    console.error('Error getting locations with weekly status:', error);
    throw new Error('Could not get locations with weekly status');
  }
};