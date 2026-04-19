import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, getDocFromServer, doc } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Import the Firebase configuration
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Initialize Firestore
const firestoreDatabaseId = firebaseConfig.firestoreDatabaseId;

console.log('Initializing Firestore with database ID:', firestoreDatabaseId || '(default)', 'and forcing long polling.');

// Using initializeFirestore with experimentalForceLongPolling to fix "Disconnecting idle stream" errors
// This is more stable in proxied environments like AI Studio.
const dbInstance = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, (firestoreDatabaseId && firestoreDatabaseId !== '(default)') ? firestoreDatabaseId : undefined);

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
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
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

async function testConnection(retries = 3) {
  try {
    console.log(`Testing Firebase connection (Attempt ${4 - retries}/3)...`);
    console.log("Project ID:", firebaseConfig.projectId);
    console.log("Database ID:", firestoreDatabaseId || "(default)");
    
    // Attempt to fetch a non-existent document to test connectivity
    // Using getDocFromServer to bypass cache and force a network check
    const testDocRef = doc(db, '_connection_test_', 'ping');
    await getDocFromServer(testDocRef);
    console.log("Firebase connection confirmed (reached server).");
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
      
      console.error("CRITICAL: Firestore connection failed after multiple attempts.");
      console.error(`Last Error: [${errorCode}] ${errorMessage}`);
      console.error("Troubleshooting: 1. Check if the database 'ai-studio-5dd0f0b0-4dc9-4cc3-82e8-070c94b6bcd3' exists in the Firebase console. 2. Ensure the project 'consumer-rewards-app-2026' is active.");
    } else {
      // Other errors (like 404 or permission denied) actually confirm we ARE online and reaching the server
      console.log("Firebase connection confirmed (received server response).");
    }
  }
}

// Run connection test in the background
setTimeout(() => {
  testConnection().catch(err => console.error("Background connection test failed:", err));
}, 1000);
