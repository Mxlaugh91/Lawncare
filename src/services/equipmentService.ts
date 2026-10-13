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
  serverTimestamp,
  increment
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { Mower, NewMowerInput, ServiceInterval, ServiceLog } from '@/types';
import * as userService from './userService';

/**
 * The database stores uids for `lastResetBy`. Resolve them to display names
 * from the shared user directory at read time so the UI stays readable while
 * employees only ever read the restricted `users` collection as owners/admins.
 */
const resolveIntervalPerformerNames = async (intervals: ServiceInterval[]): Promise<ServiceInterval[]> => {
  const uids = Array.from(new Set(
    intervals
      .map(interval => interval.lastResetBy)
      .filter((uid): uid is string => Boolean(uid))
  ));

  if (uids.length === 0) {
    return intervals;
  }

  try {
    const directory = await userService.getEmployeeDirectory(uids);
    const nameByUid = new Map(directory.map(entry => [entry.id, entry.name]));

    return intervals.map(interval =>
      interval.lastResetBy
        ? { ...interval, lastResetBy: nameByUid.get(interval.lastResetBy) ?? interval.lastResetBy }
        : interval
    );
  } catch (error) {
    // Display-name resolution is best-effort: never block the equipment list
    // because the directory could not be read.
    console.error('Could not resolve service performer names:', error);
    return intervals;
  }
};

export const addMower = async (mowerData: NewMowerInput) => {
  const mowerToAdd = {
    ...mowerData,
    totalHours: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, 'mowers'), mowerToAdd);
  
  // Add service intervals
  if (mowerData.serviceIntervals) {
    for (const interval of mowerData.serviceIntervals) {
      await addDoc(collection(db, 'serviceIntervals'), {
        mowerId: docRef.id,
        description: interval.description,
        hourInterval: interval.hourInterval,
        lastResetHours: 0,
        lastResetDate: null,
        lastResetBy: null,
        createdAt: serverTimestamp(),
      });
    }
  }
  
  return docRef.id;
};

export const getAllMowers = async () => {
  const q = query(
    collection(db, 'mowers'),
    orderBy('name')
  );
  
  const querySnapshot = await getDocs(q);
  const mowers = querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Mower[];
  
  // Get service intervals for each mower
  for (const mower of mowers) {
    const serviceIntervalsQuery = query(
      collection(db, 'serviceIntervals'),
      where('mowerId', '==', mower.id)
    );
    
    const serviceIntervalsSnapshot = await getDocs(serviceIntervalsQuery);
    const intervals = serviceIntervalsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ServiceInterval[];

    mower.serviceIntervals = await resolveIntervalPerformerNames(intervals);
  }
  
  return mowers;
};

export const getMowerById = async (mowerId: string) => {
  const docRef = doc(db, 'mowers', mowerId);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    const mower = {
      id: docSnap.id,
      ...docSnap.data()
    } as Mower;
    
    // Get service intervals
    const serviceIntervalsQuery = query(
      collection(db, 'serviceIntervals'),
      where('mowerId', '==', mowerId)
    );
    
    const serviceIntervalsSnapshot = await getDocs(serviceIntervalsQuery);
    const intervals = serviceIntervalsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ServiceInterval[];

    mower.serviceIntervals = await resolveIntervalPerformerNames(intervals);
    
    return mower;
  }
  
  return null;
};

export const updateMowerDetails = async (mowerId: string, updatedData: Partial<Mower>) => {
  const docRef = doc(db, 'mowers', mowerId);
  
  // Remove serviceIntervals from the update data, as they're stored separately
  const { serviceIntervals, ...dataToUpdate } = updatedData;
  
  await updateDoc(docRef, {
    ...dataToUpdate,
    updatedAt: serverTimestamp()
  });
  
  // Update service intervals if provided
  if (serviceIntervals) {
    // Implementation would depend on how you want to handle updating intervals
    // This is a placeholder
  }
};

export const deleteMower = async (mowerId: string) => {
  try {
    // Delete service intervals first
    const serviceIntervalsQuery = query(
      collection(db, 'serviceIntervals'),
      where('mowerId', '==', mowerId)
    );
    const serviceIntervalsSnapshot = await getDocs(serviceIntervalsQuery);
    
    await Promise.all(serviceIntervalsSnapshot.docs.map(doc => deleteDoc(doc.ref)));
    
    // Then delete the mower
    await deleteDoc(doc(db, 'mowers', mowerId));
  } catch (error) {
    console.error('Error deleting mower:', error);
    throw new Error('Kunne ikke slette gressklipperen');
  }
};

export const logMowerUsage = async (mowerId: string, hoursUsed: number) => {
  if (typeof hoursUsed !== 'number' || !Number.isFinite(hoursUsed) || hoursUsed <= 0) {
    throw new Error('hoursUsed must be a positive number');
  }

  // Atomic increment instead of read-then-set, and only the fields the
  // hardened mowers rule allows employees to update.
  await updateDoc(doc(db, 'mowers', mowerId), {
    totalHours: increment(hoursUsed),
    updatedAt: serverTimestamp()
  });
};

export const getMowersNeedingService = async () => {
  // Get all mowers first
  const mowers = await getAllMowers();
  
  // Filter mowers that need service based on their service intervals
  return mowers.filter(mower => {
    if (!mower.serviceIntervals) return false;
    
    // Check if any service interval is due
    return mower.serviceIntervals.some(interval => {
      const lastResetHours = interval.lastResetHours || 0;
      const hourInterval = interval.hourInterval || 0;
      
      return (mower.totalHours - lastResetHours) >= hourInterval;
    });
  });
};

export const resetServiceInterval = async (mowerId: string, serviceIntervalId: string, userId: string) => {
  const mowerRef = doc(db, 'mowers', mowerId);
  const mowerSnap = await getDoc(mowerRef);
  
  if (!mowerSnap.exists()) {
    throw new Error('Mower not found');
  }
  
  const mowerData = mowerSnap.data();
  const currentHours = mowerData.totalHours || 0;

  // Store the caller's uid (never a display name) for audit purposes.
  // Names are resolved at read time from userDirectory.
  const performedBy = auth.currentUser?.uid || userId;
  
  // Update the service interval
  const intervalRef = doc(db, 'serviceIntervals', serviceIntervalId);
  await updateDoc(intervalRef, {
    lastResetHours: currentHours,
    lastResetDate: serverTimestamp(),
    lastResetBy: performedBy
  });
  
  // Log the service
  await addDoc(collection(db, 'serviceLogs'), {
    mowerId,
    serviceIntervalId,
    performedBy,
    hoursAtService: currentHours,
    date: serverTimestamp(),
  });
};

/**
 * Reads the service history for a mower and resolves `performedBy` (stored
 * uid) to a display name for the UI.
 */
export const getServiceLogsForMower = async (mowerId: string): Promise<ServiceLog[]> => {
  const q = query(
    collection(db, 'serviceLogs'),
    where('mowerId', '==', mowerId)
  );

  const snapshot = await getDocs(q);
  const logs = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as ServiceLog[];

  logs.sort((a, b) => (b.date?.toMillis?.() ?? 0) - (a.date?.toMillis?.() ?? 0));

  const uids = Array.from(new Set(logs.map(log => log.performedBy).filter(Boolean)));
  if (uids.length === 0) {
    return logs;
  }

  try {
    const directory = await userService.getEmployeeDirectory(uids);
    const nameByUid = new Map(directory.map(entry => [entry.id, entry.name]));

    return logs.map(log => ({
      ...log,
      performedByName: nameByUid.get(log.performedBy)
    }));
  } catch (error) {
    console.error('Could not resolve service log performer names:', error);
    return logs;
  }
};

export const addServiceInterval = async (mowerId: string, intervalData: { description: string; hourInterval: number }) => {
  return await addDoc(collection(db, 'serviceIntervals'), {
    mowerId,
    description: intervalData.description,
    hourInterval: intervalData.hourInterval,
    lastResetHours: 0,
    lastResetDate: null,
    lastResetBy: null,
    createdAt: serverTimestamp(),
  });
};

export const deleteServiceInterval = async (_mowerId: string, intervalId: string) => {
  await deleteDoc(doc(db, 'serviceIntervals', intervalId));
};