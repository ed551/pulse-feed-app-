import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, getDocFromServer, doc, setLogLevel } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Import the Firebase configuration
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Initializing Firestore with optional database ID
const firestoreDatabaseId = firebaseConfig.firestoreDatabaseId;

console.log('Initializing Firestore with database ID:', firestoreDatabaseId || '(default)');

// Silence noisy non-fatal Firestore warnings (like idle stream timeouts) in the browser
setLogLevel('error');

// Use a factory-like initialization to prevent multiple initialization errors
const getDb = () => {
  try {
    const dbId = (firestoreDatabaseId && firestoreDatabaseId !== '(default)') ? firestoreDatabaseId : undefined;
    
    // We use initializeFirestore for persistent settings in proxied/IAB environments
    // forcing long polling is essential for stability in the AI Studio preview
    return initializeFirestore(app, {
      experimentalForceLongPolling: true,
    }, dbId);
  } catch (e: any) {
    console.warn("Primary Firestore initialization notice:", e.message);
    
    // Attempting a simpler initialization if first one failed
    try {
      return initializeFirestore(app, {
        experimentalForceLongPolling: true,
      }, (firestoreDatabaseId && firestoreDatabaseId !== '(default)') ? firestoreDatabaseId : undefined);
    } catch (innerErr: any) {
      console.error("Secondary Firestore initialization failed:", innerErr.message);
      // Final attempt: fallback to basic getter which might use existing instance
      return (app as any)._firestoreInst || initializeFirestore(app, {});
    }
  }
};

let dbInstance;
try {
  dbInstance = getDb();
} catch (e) {
  // If we REALLY can't init via initializeFirestore, we'll have to use the standard getter 
  // though it won't have the long polling settings.
  console.error("Critical Firestore Init Failure, falling back to getFirestore");
  // We'll import it just in case, but we already have it from earlier SDKs usually
  // For v9 web it's best to use initialized instance.
  // We'll just try to recover the app if possible.
  dbInstance = (app as any)._firestoreInst; // Hacky fallback if needed
}

export const db = dbInstance;

// Initialize Storage
export const storage = getStorage(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  // If it's an Auth error, we want to know, but maybe not hide it in a Firestore JSON if we can help it
  if (errorMessage.includes('auth/unauthorized-domain')) {
    const domain = window.location.hostname;
    const personalizedError = `Authentication Error: The domain "${domain}" is not authorized in your Firebase Project. Please add it to "Authorized Domains" in the Firebase Console.`;
    console.error(personalizedError);
    throw new Error(personalizedError);
  }

  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || 'UNAUTHENTICATED',
      email: auth.currentUser?.email || 'N/A',
      emailVerified: auth.currentUser?.emailVerified || false,
      isAnonymous: auth.currentUser?.isAnonymous || false,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export type ConnectionStatus = 'initial' | 'testing' | 'connected' | 'error';
let connectionStatus: ConnectionStatus = 'initial';
const statusListeners = new Set<(status: ConnectionStatus) => void>();

export function getConnectionStatus() {
  return connectionStatus;
}

export function onConnectionStatusChange(callback: (status: ConnectionStatus) => void) {
  statusListeners.add(callback);
  callback(connectionStatus);
  return () => { statusListeners.delete(callback); };
}

export function setConnectionStatus(status: ConnectionStatus) {
  connectionStatus = status;
  statusListeners.forEach(listener => listener(status));
}

/**
 * Force-terminates the Firestore instance and attempts a fresh connection.
 * Used to resolve persistent "unavailable" or "[code=unavailable]" errors.
 */
export async function reconnectFirestore() {
  try {
    setConnectionStatus('testing');
    console.log("Starting Firestore Neural Reset...");
    
    // Explicitly terminate the current instance to clear stuck internal streams
    if (db) {
      await (db as any).terminate?.();
    }
    
    // Brief delay to allow sockets to close
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Re-initialization happens automatically on next access if terminated correctly
    // or we can just reload the page as the ultimate self-healing loop
    window.location.reload(); 
  } catch (err) {
    console.error("Neural reset failed:", err);
    setConnectionStatus('error');
  }
}

async function testConnection(retries = 3) {
  try {
    setConnectionStatus('testing');
    console.log(`Testing Firebase connection (Attempt ${4 - retries}/3)...`);
    console.log("Project ID:", firebaseConfig.projectId);
    console.log("Database ID:", firestoreDatabaseId || "(default)");
    
    // Attempt to fetch a non-existent document to test connectivity
    // Using getDocFromServer to bypass cache and force a network check
    const testDocRef = doc(db, '_connection_test_', 'ping');
    await getDocFromServer(testDocRef);
    console.log("Firebase connection confirmed (reached server).");
    setConnectionStatus('connected');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorCode = (error as any)?.code;
    
    console.warn(`Firestore connection test result: [${errorCode || 'unknown'}] ${errorMessage}`);
    
    if (errorMessage.includes('the client is offline') || errorMessage.includes('unavailable') || errorCode === 'unavailable') {
      if (retries > 1) {
        console.warn(`Connection unavailable (Code: ${errorCode}). Retrying in 3s...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
        return testConnection(retries - 1);
      }
      
      setConnectionStatus('error');
      console.error("CRITICAL: Firestore connection failed after multiple attempts.");
      console.error(`Last Error: [${errorCode}] ${errorMessage}`);
      console.error("Troubleshooting: 1. Check if the database 'ai-studio-5dd0f0b0-4dc9-4cc3-82e8-070c94b6bcd3' exists in the Firebase console. 2. Ensure the project 'consumer-rewards-app-2026' is active.");
    } else {
      // Other errors (like 404 or permission denied) actually confirm we ARE online and reaching the server
      console.log("Firebase connection confirmed (received server response).");
      setConnectionStatus('connected');
    }
  }
}

// Run connection test in the background
setTimeout(() => {
  testConnection().catch(err => console.error("Background connection test failed:", err));
}, 1000);
