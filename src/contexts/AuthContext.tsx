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
import { doc, setDoc, getDoc, onSnapshot, serverTimestamp, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType, onConnectionStatusChange, ConnectionStatus } from '../lib/firebase';

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
  twoFactorType?: 'biometric' | 'email_otp' | 'totp';
  twoFactorSecret?: string;
  phoneNumber?: string;
  language?: string;
  timezone?: string;
  timeFormat?: string;
  dateFormat?: string;
  isSportsWatchPrecise?: boolean;
  alarms?: { id: string, time: string, active: boolean }[];
  theme?: 'light' | 'dark' | 'system';
  blockedUsers?: string[];
  blockedGroups?: string[];
  activeSessions?: string[];
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
  isMfaVerified: boolean;
  setIsMfaVerified: (val: boolean) => void;
  sessionError: string | null;
  setSessionError: (val: string | null) => void;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  signupWithEmail: (email: string, pass: string, name: string, mfaOptions?: { type: 'biometric' | 'email_otp' | 'totp', phone?: string, secret?: string }) => Promise<void>;
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
  const [isMfaVerified, setIsMfaVerifiedState] = useState(() => {
    const sessionMfa = sessionStorage.getItem(`pulse_mfa_verified_${sessionStorage.getItem('pulse_session_id')}`);
    return sessionMfa === 'true';
  });

  const setIsMfaVerified = (val: boolean) => {
    setIsMfaVerifiedState(val);
    if (val) {
      sessionStorage.setItem(`pulse_mfa_verified_${currentSessionId}`, 'true');
    } else {
      sessionStorage.removeItem(`pulse_mfa_verified_${currentSessionId}`);
    }
  };

  const [sessionError, setSessionError] = useState<string | null>(null);
  
  // Create a persistent sessionId for this tab/visit
  const [currentSessionId] = useState(() => {
    let id = sessionStorage.getItem('pulse_session_id');
    if (!id) {
      id = 'sess_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
      sessionStorage.setItem('pulse_session_id', id);
    }
    return id;
  });

  const [isFacebookApp, setIsFacebookApp] = useState(false);
  const [connStatus, setConnStatus] = useState<ConnectionStatus>('initial');

  useEffect(() => {
    return onConnectionStatusChange(setConnStatus);
  }, []);

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
          // Check if this session is already verified in sessionStorage
          const sessionMfa = sessionStorage.getItem(`pulse_mfa_verified_${currentSessionId}`);
          if (sessionMfa !== 'true') {
            setIsMfaVerified(false);
          }

          // Fetch user data from Firestore
          const userRef = doc(db, 'users', user.uid);
          unsubscribeUser = onSnapshot(userRef, async (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data() as UserData;
              // Hardcoded admin override for primary developer
              if (user.email === 'edwinmuoha@gmail.com' && data.role !== 'admin') {
                data.role = 'admin';
              }
              setUserData(data);
              
              // ENFORCE MAX 2 SIGN-INS (SESSIONS)
              const activeSessions = data.activeSessions || [];
              const isThisSessionRegistered = activeSessions.includes(currentSessionId);
              
              if (!isThisSessionRegistered) {
                if (activeSessions.length >= 5) {
                  // Auto-rotate: remove oldest session to make room for new one
                  const oldestSession = activeSessions[0];
                  await updateDoc(userRef, {
                    activeSessions: arrayRemove(oldestSession)
                  });
                }
                
                // Register this session
                await updateDoc(userRef, {
                  activeSessions: arrayUnion(currentSessionId)
                });
              }

              // Only auto-verify if MFA is disabled
              if (!data.twoFactorEnabled) {
                setIsMfaVerified(true);
              }
            } else {
              console.log('Initializing new user document...');
              // Initialize user data if it doesn't exist
              const initialData = {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL,
                role: user.email === 'edwinmuoha@gmail.com' ? 'admin' : 'user',
                points: 1250,
                balance: 12.5,
                adRevenue: 0,
                enrolledCourses: [],
                completedModules: [],
                createdAt: serverTimestamp(),
                twoFactorEnabled: false,
                twoFactorType: 'email_otp'
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
                role: user.email === 'edwinmuoha@gmail.com' ? 'admin' : 'user',
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

  const signupWithEmail = async (email: string, pass: string, name: string, mfaOptions?: { type: 'biometric' | 'email_otp' | 'totp', phone?: string, secret?: string }) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, pass);
      if (result.user) {
        await updateProfile(result.user, { displayName: name });
        
        // Proactively create the document to ensure settings are captured
        const userRef = doc(db, 'users', result.user.uid);
        const initialData = {
          uid: result.user.uid,
          email: result.user.email,
          displayName: name,
          photoURL: result.user.photoURL,
          role: result.user.email === 'edwinmuoha@gmail.com' ? 'admin' : 'user',
          points: 1250,
          balance: 12.5,
          adRevenue: 0,
          enrolledCourses: [],
          completedModules: [],
          createdAt: serverTimestamp(),
          twoFactorEnabled: !!mfaOptions,
          twoFactorType: mfaOptions?.type || 'email_otp',
          phoneNumber: mfaOptions?.phone || null,
          twoFactorSecret: mfaOptions?.secret || null
        };
        
        await setDoc(userRef, initialData, { merge: true });

        // Also initialize public profile
        const publicRef = doc(db, 'users_public', result.user.uid);
        await setDoc(publicRef, {
          uid: result.user.uid,
          displayName: name,
          photoURL: result.user.photoURL,
          role: result.user.email === 'edwinmuoha@gmail.com' ? 'admin' : 'user',
          status: "Hey there! I'm using Pulse Feeds.",
          isOnline: true,
          lastSeen: serverTimestamp()
        }, { merge: true });
      }
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    if (currentUser && currentSessionId) {
      try {
        sessionStorage.removeItem(`pulse_mfa_verified_${currentSessionId}`);
        const userRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userRef, {
          activeSessions: arrayRemove(currentSessionId)
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${currentUser.uid}`);
      }
    }
    return signOut(auth);
  };

  const value = {
    currentUser,
    userData,
    loading,
    isMfaVerified,
    setIsMfaVerified,
    sessionError,
    setSessionError,
    loginWithGoogle,
    loginWithEmail,
    signupWithEmail,
    logout,
    isFacebookApp
  };

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white space-y-6 px-6">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-rose-500/10 border-b-rose-500 rounded-full animate-pulse"></div>
            </div>
          </div>
          
          <div className="text-center space-y-2">
            <div className="text-lg font-black tracking-tighter text-white">
              {connStatus === 'error' ? 'Connection Problem Detected' : 'Initializing Secure Session...'}
            </div>
            <div className="text-xs font-bold text-gray-500 uppercase tracking-widest max-w-sm leading-relaxed">
              {connStatus === 'testing' ? 'Verifying Neural Backend Link...' : 
               connStatus === 'error' ? 'Could not reach Cloud Firestore. Protocol retry in progress.' : 
               'Synchronizing Biometric Cluster...'}
            </div>
          </div>

          {connStatus === 'error' && (
            <button 
              onClick={() => window.location.reload()}
              className="mt-4 px-6 py-2 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-black uppercase tracking-widest rounded-full transition-all active:scale-95"
            >
              Force Protocol Reset
            </button>
          )}
          
          {connStatus === 'error' && (
            <p className="text-[10px] text-gray-600 font-medium max-w-xs text-center border-t border-gray-800 pt-4 mt-8">
              Troubleshooting: This platform requires an active internet connection. If you are behind a restrictive proxy or VPN, please ensure Firebase endpoints are allowlisted.
            </p>
          )}
        </div>
      ) : children}
    </AuthContext.Provider>
  );
}
