import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
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

  useEffect(() => {
    let cancelled = false;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);

        // The lookup may resolve after a logout or an account switch: only
        // apply the role if this user is still the signed-in one.
        if (cancelled || auth.currentUser?.uid !== user.uid) return;

        const userData = userDoc.data();
        setIsAdmin(userDoc.exists() && userData?.role === 'admin');
      } catch (error) {
        console.error('Error checking user role:', error);
        if (!cancelled && auth.currentUser?.uid === user.uid) {
          setIsAdmin(false);
        }
      } finally {
        if (!cancelled && auth.currentUser?.uid === user.uid) {
          setLoading(false);
        }
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);

    const userDocRef = doc(db, 'users', userCredential.user.uid);
    const userDoc = await getDoc(userDocRef);
    const isUserAdmin = userDoc.exists() && userDoc.data()?.role === 'admin';

    setIsAdmin(isUserAdmin);
    return isUserAdmin;
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
    setIsAdmin(false);
  }, []);

  const value = useMemo(
    () => ({
      currentUser,
      isAdmin,
      loading,
      login,
      logout,
    }),
    [currentUser, isAdmin, loading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
