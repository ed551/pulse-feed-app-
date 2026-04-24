import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile
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
  adRevenue?: number;
  educationRevenue?: number;
  activeTimeRevenue?: number;
  bio?: string;
  createdAt: any;
  badges?: {
    name: string;
    date: string;
    type: string;
    icon: string;
    description?: string;
  }[];
  // Dating Hub parameters
  isDatingActive?: boolean;
  tribe?: string;
  radius?: number;
  age?: number;
  gender?: string;
  location?: string;
  lat?: number;
  lng?: number;
  hobbies?: string[];
  job?: string;
  religion?: string;
  foods?: string[];
  education?: string;
  status?: string;
  sports?: string[];
  enrolledCourses?: string[];
  completedModules?: string[];
  customCourses?: any[];
  isPointsRecovered?: boolean;
  isRestoredTo6337?: boolean;
  recoveredAt?: any;
  membershipLevel?: 'bronze' | 'silver' | 'gold';
  membershipStatus?: 'active' | 'expired' | 'canceled';
  twoFactorEnabled?: boolean;
  twoFactorType?: 'biometric' | 'email_otp' | 'sms_otp';
  phoneNumber?: string;
  theme?: 'light' | 'dark' | 'system';
  blockedUsers?: string[];
  blockedGroups?: string[];
  contentFilters?: {
    sensitiveContent: boolean;
    spamFilter: boolean;
    directMessagePrivacy: 'everyone' | 'followed' | 'none';
    photoVisibility: 'everyone' | 'followers' | 'none';
    publicProfile: boolean;
    allowFollowers: boolean;
  };
}

interface AuthContextType {
  currentUser: User | null;
  userData: UserData | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  signupWithEmail: (email: string, pass: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  isFacebookApp: boolean;
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

  const [isFacebookApp, setIsFacebookApp] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent || navigator.vendor || (window as any).opera;
    const isFB = /FBAN|FBAV/i.test(ua) || /Instagram/i.test(ua);
    setIsFacebookApp(isFB);
    if (isFB) {
      console.warn('Facebook/Instagram In-App Browser detected. Switching to compatible login modes.');
    }
  }, []);

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

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      try {
        console.log('Auth state changed:', user ? `User ${user.uid}` : 'No user');
        
        // Handle redirect result for in-app browsers
        if (!user && isFacebookApp) {
          const result = await getRedirectResult(auth);
          if (result?.user) {
            console.log("Recovered user from redirect result");
            // Auth state changed will fire again with the user
            return;
          }
        }

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
              const initialData = {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL,
                role: 'user',
                points: 1250,
                balance: 12.5,
                adRevenue: 0,
                enrolledCourses: [],
                completedModules: [],
                createdAt: serverTimestamp(),
                twoFactorEnabled: true,
                twoFactorType: 'biometric'
              };
              
              setDoc(userRef, initialData, { merge: true }).catch(err => {
                console.error('Error initializing user document:', err);
              });

              // Also initialize public profile
              const publicRef = doc(db, 'users_public', user.uid);
              setDoc(publicRef, {
                uid: user.uid,
                displayName: user.displayName,
                photoURL: user.photoURL,
                role: 'user',
                status: "Hey there! I'm using Pulse Feeds.",
                isOnline: true,
                lastSeen: serverTimestamp()
              }, { merge: true }).catch(err => {
                console.error('Error initializing public user document:', err);
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
      if (isFacebookApp) {
        await signInWithRedirect(auth, provider);
      } else {
        await signInWithPopup(auth, provider);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'users');
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (error) {
      throw error;
    }
  };

  const signupWithEmail = async (email: string, pass: string, name: string) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, pass);
      if (result.user) {
        await updateProfile(result.user, { displayName: name });
        // The onAuthStateChanged listener will handle provisioning the Firestore document
      }
    } catch (error) {
      throw error;
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
    loginWithEmail,
    signupWithEmail,
    logout,
    isFacebookApp
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
