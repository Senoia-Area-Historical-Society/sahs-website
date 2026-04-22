import { createContext, useContext, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut
} from 'firebase/auth';
import { auth, googleProvider, db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  isCurator: boolean;
  isEditor: boolean;
  isSAHSUser: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

// Hardcoded permanent admins
const PERMANENT_ADMINS = [
    'catnolan@senoiahistory.com',
    'jeremywarren@senoiahistory.com'
];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCurator, setIsCurator] = useState(false);

  const [isEditor, setIsEditor] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser && currentUser.email) {
        const email = currentUser.email.toLowerCase();
        
        // 1. Check permanent admins
        if (PERMANENT_ADMINS.includes(email)) {
          setIsAdmin(true);
          setIsCurator(false);
          setIsEditor(false);
        } else {
          // 2. Check Firestore overrides
          try {
            const roleDoc = await getDoc(doc(db, 'user_roles', email));
            if (roleDoc.exists()) {
              const role = roleDoc.data().role;
              setIsAdmin(role === 'admin');
              setIsCurator(role === 'curator');
              setIsEditor(role === 'editor');
            } else {
              setIsAdmin(false);
              setIsCurator(false);
              setIsEditor(false);
            }
          } catch (error) {
            console.error('Error fetching user role:', error);
            setIsAdmin(false);
            setIsCurator(false);
            setIsEditor(false);
          }
        }
      } else {
        setIsAdmin(false);
        setIsCurator(false);
        setIsEditor(false);
      }
      
      setUser(currentUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const loginWithGoogle = async () => {
    try {
      googleProvider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Error signing in with Google", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  const isSAHSUser = isAdmin || isCurator || isEditor;

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, isCurator, isEditor, isSAHSUser, loginWithGoogle, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
