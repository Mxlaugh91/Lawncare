import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  limit,
  addDoc,
  updateDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from './firebase';
import { SeasonSettings } from '@/types';

export const getSeasonSettings = async () => {
  try {
    const currentYear = new Date().getFullYear();
    const q = query(
      collection(db, 'season_settings'),
      where('year', '==', currentYear),
      orderBy('updatedAt', 'desc'),
      limit(1)
    );
    
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data()
      } as SeasonSettings;
    }
    
    // Return default settings if none exist
    return {
      year: currentYear,
      startWeek: 18,
      endWeek: 42,
      defaultFrequency: 2,
      updatedAt: serverTimestamp()
    } as SeasonSettings;
  } catch (error) {
    console.error('Error getting season settings:', error);
    throw new Error('Kunne ikke hente sesonginnstillinger');
  }
};

export const updateSeasonSettings = async (settings: Partial<SeasonSettings>) => {
  try {
    const currentYear = new Date().getFullYear();
    const q = query(
      collection(db, 'season_settings'),
      where('year', '==', currentYear)
    );
    
    const querySnapshot = await getDocs(q);
    let docRef;
    
    if (!querySnapshot.empty) {
      // Update existing settings
      docRef = doc(db, 'season_settings', querySnapshot.docs[0].id);
      await updateDoc(docRef, {
        ...settings,
        updatedAt: serverTimestamp()
      });
    } else {
      // Create new settings
      docRef = await addDoc(collection(db, 'season_settings'), {
        year: currentYear,
        ...settings,
        updatedAt: serverTimestamp()
      });
    }
    
    // Get and return the updated settings
    const updatedDoc = await getDoc(docRef);
    return {
      id: updatedDoc.id,
      ...updatedDoc.data()
    } as SeasonSettings;
  } catch (error) {
    console.error('Error updating season settings:', error);
    throw new Error('Kunne ikke oppdatere sesonginnstillinger');
  }
};