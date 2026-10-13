import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  addDoc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { User, UserDirectoryEntry, UserLookup } from '@/types';

const DIRECTORY_CHUNK_SIZE = 30;

/**
 * Reads display data from the shared `userDirectory` collection
 * (id, name, role), which is readable by every authenticated user and is kept
 * in sync by a Cloud Function. This is the correct source for name lookups by
 * non-admin users, because the `users` collection is owner/admin-only.
 *
 * When `userIds` is provided, only those entries are returned (chunked to
 * respect Firestore's `in` query limit). Otherwise every directory entry is
 * returned ordered by name.
 */
export const getEmployeeDirectory = async (userIds?: string[]): Promise<UserDirectoryEntry[]> => {
  try {
    if (userIds) {
      if (!userIds.length) {
        return [];
      }

      const uniqueIds = Array.from(new Set(userIds));
      const chunks = chunkArray(uniqueIds, DIRECTORY_CHUNK_SIZE);

      let allEntries: UserDirectoryEntry[] = [];

      for (const chunk of chunks) {
        const q = query(
          collection(db, 'userDirectory'),
          where('__name__', 'in', chunk)
        );

        const querySnapshot = await getDocs(q);
        const chunkEntries = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as UserDirectoryEntry[];

        allEntries = [...allEntries, ...chunkEntries];
      }

      return allEntries;
    }

    const q = query(
      collection(db, 'userDirectory'),
      orderBy('name')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as UserDirectoryEntry[];
  } catch (error) {
    console.error('Error getting employee directory:', error);
    throw new Error('Kunne ikke hente ansattoversikt');
  }
};

/**
 * Batch name lookup backed by `userDirectory`.
 *
 * Retained for backwards compatibility with existing call sites/tests; new
 * code should prefer `getEmployeeDirectory`. Only names/ids are returned and
 * the restricted `users` collection is never read.
 */
export const getUsersByIds = async (userIds: string[]): Promise<UserLookup[]> => {
  const entries = await getEmployeeDirectory(userIds);
  return entries.map(entry => ({ id: entry.id, name: entry.name }));
};

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

// Helper function to chunk arrays for Firestore 'in' queries
const chunkArray = <T>(array: T[], chunkSize: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
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

export const updateUserFCMToken = async (userId: string, fcmToken: string) => {
  try {
    const docRef = doc(db, 'users', userId);
    await updateDoc(docRef, {
      fcmToken,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating FCM token:', error);
    throw new Error('Kunne ikke oppdatere FCM token');
  }
};

export const removeUserFCMToken = async (userId: string) => {
  try {
    const docRef = doc(db, 'users', userId);
    await updateDoc(docRef, {
      fcmToken: null,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error removing FCM token:', error);
    throw new Error('Kunne ikke fjerne FCM token');
  }
};