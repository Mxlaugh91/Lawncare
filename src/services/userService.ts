import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { User } from '@/types';

export const getAllEmployees = async () => {
  try {
    const q = query(
      collection(db, 'users'),
      where('role', '==', 'employee'),
      orderBy('name')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as User[];
  } catch (error) {
    console.error('Error getting employees:', error);
    throw new Error('Kunne ikke hente ansatte');
  }
};

export const getUserById = async (userId: string) => {
  try {
    const docRef = doc(db, 'users', userId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      } as User;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting user:', error);
    throw new Error('Kunne ikke hente brukerdetaljer');
  }
};

export const addEmployee = async (employeeData: { email: string; name: string; }) => {
  try {
    const userToAdd = {
      ...employeeData,
      role: 'employee',
      createdAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, 'users'), userToAdd);
    return docRef.id;
  } catch (error) {
    console.error('Error adding employee:', error);
    throw new Error('Kunne ikke legge til ny ansatt');
  }
};