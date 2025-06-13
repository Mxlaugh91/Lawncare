import { 
  User,
  signInWithEmailAndPassword as firebaseSignIn,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseAuthStateChanged,
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

export const loginWithEmailAndPassword = async (email: string, password: string) => {
  try {
    const userCredential = await firebaseSignIn(auth, email, password);
    const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
    return {
      user: userCredential.user,
      role: userDoc.exists() ? userDoc.data().role : null
    };
  } catch (error) {
    throw new Error('Innlogging mislyktes. Sjekk e-post og passord.');
  }
};

export const logoutUser = async () => {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    throw new Error('Kunne ikke logge ut. Prøv igjen senere.');
  }
};

export const onAuthStateChanged = (callback: (user: User | null) => void) => {
  return firebaseAuthStateChanged(auth, callback);
};

export const createUserAccount = async (
  email: string, 
  password: string, 
  name: string,
  role: 'admin' | 'employee' = 'employee'
) => {
  try {
    // Create the user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Update the user's display name
    await updateProfile(user, { displayName: name });

    // Create the user document in Firestore
    await setDoc(doc(db, 'users', user.uid), {
      email,
      name,
      role,
      createdAt: new Date()
    });

    return user;
  } catch (error) {
    throw new Error('Kunne ikke opprette bruker. Prøv igjen senere.');
  }
};

export const getCurrentUser = () => {
  return auth.currentUser;
};

export const getUserRole = async (userId: string) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    return userDoc.exists() ? userDoc.data().role : null;
  } catch (error) {
    throw new Error('Kunne ikke hente brukerrolle.');
  }
};