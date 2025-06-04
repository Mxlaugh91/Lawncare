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
import { Location } from '@/types';
import * as timeEntryService from './timeEntryService';
import { getISOWeekNumber } from '@/lib/utils';

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
    const currentWeek = Math.ceil((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));
    
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

export const getLocationsWithWeeklyStatus = async (weekNumber: number) => {
  try {
    // Get all active locations
    const q = query(
      collection(db, 'locations'),
      where('isArchived', '==', false),
      orderBy('name')
    );
    
    const querySnapshot = await getDocs(q);
    const locations = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Location[];

    // Process each location to determine its weekly status
    const locationsWithStatus = await Promise.all(locations.map(async location => {
      // Check if maintenance is due this week
      const isDueForMaintenanceInSelectedWeek = 
        weekNumber >= location.startWeek && 
        (weekNumber - location.startWeek) % location.maintenanceFrequency === 0;

      // Get time entries for this location in the selected week
      const timeEntries = await timeEntryService.getTimeEntriesForLocation(location.id, weekNumber);
      
      // Location is considered completed if there are any time entries for this week
      const isMaintenanceCompletedInSelectedWeek = timeEntries.length > 0;

      return {
        ...location,
        isDueForMaintenanceInSelectedWeek,
        isMaintenanceCompletedInSelectedWeek
      };
    }));

    return locationsWithStatus;
  } catch (error) {
    console.error('Error getting locations with weekly status:', error);
    throw new Error('Could not get locations with weekly status');
  }
};