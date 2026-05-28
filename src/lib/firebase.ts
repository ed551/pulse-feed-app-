import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, getDocFromServer, doc, setLogLevel, enableNetwork, disableNetwork, getFirestore } from 'firebase/firestore';
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
setLogLevel('debug'); // Increased for diagnostic purposes

// Use a factory-like initialization to prevent multiple initialization errors
const getDb = () => {
  const forceDefault = typeof localStorage !== 'undefined' && localStorage.getItem('force_firebase_default_db') === 'true';
  const dbId = (firestoreDatabaseId && firestoreDatabaseId !== '(default)' && !forceDefault) ? firestoreDatabaseId : undefined;
  
  if (forceDefault) {
     console.log('[Firebase] Resilience mode active: Forcing (default) database.');
  }
  
  console.log(`[Firebase] Initializing Firestore with Database ID: ${dbId || '(default)'} in Project: ${firebaseConfig.projectId}`);
  
  try {
    // We force long polling for maximum stability in restricted environments.
    // Host is implicitly handled by the SDK for regional databases unless overridden.
    return initializeFirestore(app, {
      experimentalForceLongPolling: true,
    }, dbId);
  } catch (e: any) {
    if (e.message.includes('already exists')) {
      console.log('[Firebase] Firestore instance already exists, retrieving existing.');
      return getFirestore(app, dbId);
    }
    console.error('[Firebase] Error during initializeFirestore:', e);
    return undefined;
  }
};

let dbInstance: any;
try {
  dbInstance = getDb();
} catch (e) {
  console.error("Firestore initialization failed:", e);
}

// Export db with fallback to handle initialization failure gracefully
export let db = dbInstance;

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

async function testConnection(retries = 5) {
  const attempt = 6 - retries;
  try {
    setConnectionStatus('testing');
    console.log(`Testing Firebase connection (Attempt ${attempt}/5) on DB: ${firestoreDatabaseId || '(default)'}...`);
    
    // Using a more robust test: fetch a document that definitely exists and has public read
    // or just fetch any path to trigger a network roundtrip. 
    if (!db) {
      console.warn("Firestore db instance is not available. Skipping connection test.");
      setConnectionStatus('error');
      return;
    }
    
    const testDocRef = doc(db, '_connection_test_', 'ping');
    
    // Timeout-wrapped fetch
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Local fetch timeout (15s)')), 15000)
    );
    
    await Promise.race([
      getDocFromServer(testDocRef),
      timeoutPromise
    ]);
    
    console.log("Firebase connection confirmed (reached server).");
    setConnectionStatus('connected');
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorCode = error?.code;
    
    console.warn(`Firestore connection test attempt failed: [${errorCode || 'unknown'}] ${errorMessage}`);
    
    // If it's permission-denied, it means WE ARE CONNECTED (otherwise we'd get unavailable)
    if (errorCode === 'permission-denied') {
      console.log("Firebase connection confirmed (received permission denial from server).");
      setConnectionStatus('connected');
      return;
    }

    // Resilience Fallback: If configured named DB fails, try (default)
    if (attempt === 3 && firestoreDatabaseId && firestoreDatabaseId !== '(default)') {
       console.warn(`[Resilience] Named database '${firestoreDatabaseId}' is failing. Attempting fallback to (default)...`);
       try {
         // Terminate existing failing instance
         if (db) await (db as any).terminate?.();
         
         // Set to default
         db = getFirestore(app);
         console.log("[Resilience] Switched to (default) database. Retrying connection test...");
         return testConnection(retries); // Retry with same retry count but new DB
       } catch (fallbackErr: any) {
         console.error("[Resilience] Fallback initialization failed:", fallbackErr.message);
       }
    }

    if (retries > 1) {
      console.warn(`Retrying in ${attempt * 2}s...`);
      
      try {
        if (db) {
          await disableNetwork(db);
          await new Promise(resolve => setTimeout(resolve, 1000));
          await enableNetwork(db);
        }
      } catch (e) {
        console.error("Network reset failed:", e);
      }

      await new Promise(resolve => setTimeout(resolve, attempt * 2000));
      return testConnection(retries - 1);
    }
    
    setConnectionStatus('error');
    console.error("CRITICAL: Firestore connection failed after multiple attempts.");
    console.error(`Diagnostic Info: Project=${firebaseConfig.projectId}, DB=${firestoreDatabaseId || "(default)"}`);
    console.error(`Check your internet or if the database ID matches your console.`);

    // Final attempt: if we are here and still haven't tried (default), try it ONE last time silently
    if (firestoreDatabaseId && firestoreDatabaseId !== '(default)') {
       console.warn("[System] Critical failure. Forcing page refresh with (default) database flag...");
       localStorage.setItem('force_firebase_default_db', 'true');
       setTimeout(() => window.location.reload(), 3000);
    }
  }
}

// Run connection test with a delay to ensure network is initialized
setTimeout(() => {
  window.addEventListener('online', () => {
    console.log("[Network] Browser reports ONLINE");
    testConnection();
  });
  window.addEventListener('offline', () => {
    console.warn("[Network] Browser reports OFFLINE");
    setConnectionStatus('error');
  });
  
  testConnection().catch(err => console.error("Background connection test failed:", err));
}, 2000);
