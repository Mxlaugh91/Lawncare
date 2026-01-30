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
import { Mower, ServiceInterval, ServiceLog } from '@/types';
import * as userService from './userService';

export const addMower = async (mowerData: Omit<Mower, 'id' | 'createdAt' | 'updatedAt' | 'totalHours'>) => {
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
    mower.serviceIntervals = serviceIntervalsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ServiceInterval[];
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
    mower.serviceIntervals = serviceIntervalsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ServiceInterval[];
    
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
  const mowerRef = doc(db, 'mowers', mowerId);
  const mowerSnap = await getDoc(mowerRef);
  
  if (mowerSnap.exists()) {
    const mowerData = mowerSnap.data();
    const currentHours = mowerData.totalHours || 0;
    const newTotalHours = currentHours + hoursUsed;
    
    await updateDoc(mowerRef, {
      totalHours: newTotalHours,
      updatedAt: serverTimestamp()
    });
  }
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
  
  // Get user name
  const user = await userService.getUserById(userId);
  const userName = user?.name || userId;
  
  // Update the service interval
  const intervalRef = doc(db, 'serviceIntervals', serviceIntervalId);
  await updateDoc(intervalRef, {
    lastResetHours: currentHours,
    lastResetDate: serverTimestamp(),
    lastResetBy: userName
  });
  
  // Log the service
  await addDoc(collection(db, 'serviceLogs'), {
    mowerId,
    serviceIntervalId,
    performedBy: userName,
    hoursAtService: currentHours,
    date: serverTimestamp(),
  });
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

export const deleteServiceInterval = async (mowerId: string, intervalId: string) => {
  await deleteDoc(doc(db, 'serviceIntervals', intervalId));
};