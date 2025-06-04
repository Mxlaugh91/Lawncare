import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  User, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/services/firebase';

interface AuthContextType {
  currentUser: User | null;
  isAdmin: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  isAdmin: false,
  loading: true,
  login: async () => false,
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // Debug effect for isAdmin changes
  useEffect(() => {
    console.log('isAdmin state changed:', { 
      isAdmin,
      userEmail: currentUser?.email,
      timestamp: new Date().toISOString()
    });
  }, [isAdmin, currentUser?.email]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('Auth state changed - User:', user?.email);
      setCurrentUser(user);
      
      if (user) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          
          console.log('User document exists:', userDoc.exists());
          console.log('User document data:', userDoc.data());
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            console.log('User role from DB:', userData.role);
            const userIsAdmin = userData.role === 'admin';
            console.log('Setting isAdmin to:', userIsAdmin);
            setIsAdmin(userIsAdmin);
          } else {
            console.log('No user document found, setting isAdmin to false');
            setIsAdmin(false);
          }
        } catch (error) {
          console.error('Error checking user role:', error);
          setIsAdmin(false);
        }
      } else {
        console.log('No user, setting isAdmin to false');
        setIsAdmin(false);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    console.log('Login attempt for:', email);
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log('Login successful, fetching user document');
    
    const userDocRef = doc(db, 'users', userCredential.user.uid);
    const userDoc = await getDoc(userDocRef);
    console.log('User document:', userDoc.exists() ? userDoc.data() : 'not found');
    
    const isUserAdmin = userDoc.exists() && userDoc.data()?.role === 'admin';
    console.log('Login - User role:', userDoc.data()?.role);
    console.log('Login - Setting isAdmin to:', isUserAdmin);
    setIsAdmin(isUserAdmin);
    return isUserAdmin;
  };

  const logout = async () => {
    console.log('Logout initiated');
    await signOut(auth);
    console.log('Logout successful, setting isAdmin to false');
    setIsAdmin(false);
  };

  const value = {
    currentUser,
    isAdmin,
    loading,
    login,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};