import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut 
} from 'firebase/auth';
import { doc, setDoc, getDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';

interface UserData {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: string;
  points: number;
  balance: number;
  bio?: string;
  createdAt: any;
}

interface AuthContextType {
  currentUser: User | null;
  userData: UserData | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeUser: (() => void) | undefined;

    // Set a safety timeout for loading state
    const timeoutId = setTimeout(() => {
      setLoading(currentLoading => {
        if (currentLoading) {
          console.warn('Auth state check timed out after 8s. Proceeding with unauthenticated state.');
          return false;
        }
        return currentLoading;
      });
    }, 8000);

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      try {
        console.log('Auth state changed:', user ? `User ${user.uid}` : 'No user');
        setCurrentUser(user);
        
        // Clean up previous user listener if it exists
        if (unsubscribeUser) {
          unsubscribeUser();
          unsubscribeUser = undefined;
        }

        if (user) {
          // Fetch user data from Firestore
          const userRef = doc(db, 'users', user.uid);
          unsubscribeUser = onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists()) {
              setUserData(docSnap.data() as UserData);
            } else {
              console.log('Initializing new user document...');
              // Initialize user data if it doesn't exist
              setDoc(userRef, {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL,
                role: 'user',
                points: 1250,
                balance: 0,
                createdAt: serverTimestamp()
              }, { merge: true }).catch(err => {
                console.error('Error initializing user document:', err);
              });
            }
          }, (error) => {
            console.error('User document snapshot error:', error);
            // Don't throw here to avoid crashing the auth state
          });
        } else {
          setUserData(null);
        }
      } catch (err) {
        console.error('Error in onAuthStateChanged callback:', err);
      } finally {
        // Always clear loading state once we get an initial auth response
        setLoading(false);
        clearTimeout(timeoutId);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUser) unsubscribeUser();
      clearTimeout(timeoutId);
    };
  }, []);

  const loginWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      if (user) {
        // Sync user data to Firestore
        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          role: 'user', // Default role
          createdAt: serverTimestamp()
        }, { merge: true });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'users');
    }
  };

  const logout = () => {
    return signOut(auth);
  };

  const value = {
    currentUser,
    userData,
    loading,
    loginWithGoogle,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white space-y-4">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          <div className="text-sm font-medium text-gray-400 animate-pulse">Initializing Secure Session...</div>
        </div>
      ) : children}
    </AuthContext.Provider>
  );
}
