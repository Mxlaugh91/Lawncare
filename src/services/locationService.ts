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
  serverTimestamp 
} from 'firebase/firestore';
import { db } from './firebase';
import { Location, LocationInput, LocationStatus, LocationWithStatus } from '@/types';
import * as userService from './userService';
import { getISOWeekNumber } from '@/lib/utils';

export const addLocation = async (locationData: LocationInput) => {
  try {
    const locationToAdd = {
      ...locationData,
      notes: locationData.notes ?? '',
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

export const getLocationsByIds = async (locationIds: string[]) => {
  try {
    // Return empty array if no IDs provided
    if (!locationIds.length) {
      return [];
    }

    const uniqueIds = Array.from(new Set(locationIds));
    const chunks = chunkArray(uniqueIds, 30); // 30 is the new limit for 'in' queries

    let allLocations: Location[] = [];

    for (const chunk of chunks) {
      const q = query(
        collection(db, 'locations'),
        where('__name__', 'in', chunk)
      );

      const querySnapshot = await getDocs(q);
      const chunkLocations = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Location[];

      allLocations = [...allLocations, ...chunkLocations];
    }

    return allLocations;
  } catch (error) {
    console.error('Error getting locations by ids:', error);
    throw new Error('Kunne ikke hente stedsdetaljer');
  }
};

/**
 * Returns active locations with their per-type status for the selected ISO
 * week.
 *
 * Weekly status is derived from the denormalized fields on the location
 * document (`lastMaintenanceWeek`/`lastMaintenanceBy`/`lastMaintenanceAt` and
 * the edge-cutting equivalents) because the hardened timeEntries rules only
 * allow reading your own (or tagged) registrations - cross-employee queries
 * against timeEntries are denied.
 */
export const getLocationsWithWeeklyStatus = async (weekNumber: number): Promise<LocationWithStatus[]> => {
  try {
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

    if (locations.length === 0) {
      return [];
    }

    // 2. Resolve performer display names from the shared user directory.
    //    Best-effort: status must not depend on name resolution.
    const performerIds = Array.from(new Set(
      locations
        .flatMap(location => [location.lastMaintenanceBy, location.lastEdgeCuttingBy])
        .filter((uid): uid is string => Boolean(uid))
    ));

    let nameByUid = new Map<string, string>();
    if (performerIds.length > 0) {
      try {
        const directory = await userService.getEmployeeDirectory(performerIds);
        nameByUid = new Map(directory.map(entry => [entry.id, entry.name]));
      } catch (error) {
        console.error('Could not resolve location performer names:', error);
      }
    }

    // 3. Derive per-type weekly status from the location document.
    const locationsWithStatus = locations.map(location => {
      // Check if maintenance is due this week
      const isDueForMaintenanceInSelectedWeek =
        weekNumber >= location.startWeek &&
        (weekNumber - location.startWeek) % location.maintenanceFrequency === 0;

      // Check if edge cutting is due this week
      const isDueForEdgeCuttingInSelectedWeek =
        weekNumber >= location.startWeek &&
        (weekNumber - location.startWeek) % location.edgeCuttingFrequency === 0;

      // A type counts as done when its last completed week is the selected
      // week. Task types are tracked independently so completing one never
      // marks the other as done.
      const maintenanceStatus: LocationStatus =
        location.lastMaintenanceWeek === weekNumber ? 'fullfort' : 'planlagt';
      const edgeCuttingStatus: LocationStatus =
        location.lastEdgeCuttingWeek === weekNumber ? 'fullfort' : 'planlagt';

      const dueStatuses: LocationStatus[] = [];
      if (isDueForMaintenanceInSelectedWeek) {
        dueStatuses.push(maintenanceStatus);
      }
      if (isDueForEdgeCuttingInSelectedWeek) {
        dueStatuses.push(edgeCuttingStatus);
      }

      const status: LocationStatus =
        dueStatuses.length > 0 && dueStatuses.every(dueStatus => dueStatus === 'fullfort')
          ? 'fullfort'
          : 'planlagt';

      return {
        ...location,
        status,
        maintenanceStatus,
        edgeCuttingStatus,
        isDueForMaintenanceInSelectedWeek,
        isDueForEdgeCuttingInSelectedWeek,
        lastMaintenanceByName: location.lastMaintenanceBy
          ? nameByUid.get(location.lastMaintenanceBy)
          : undefined,
        lastEdgeCuttingByName: location.lastEdgeCuttingBy
          ? nameByUid.get(location.lastEdgeCuttingBy)
          : undefined,
      };
    });

    return locationsWithStatus;
  } catch (error) {
    console.error('Error getting locations with weekly status:', error);
    throw new Error('Could not get locations with weekly status');
  }
};
