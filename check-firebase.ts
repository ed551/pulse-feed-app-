
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";

async function check() {
  try {
    const firebaseConfig = JSON.parse(fs.readFileSync(path.join(process.cwd(), "firebase-applet-config.json"), "utf8"));
    console.log("Config Project ID:", firebaseConfig.projectId);
    
    // Attempt to force the project context
    process.env.GOOGLE_CLOUD_PROJECT = firebaseConfig.projectId;

    const app = initializeApp({
      projectId: firebaseConfig.projectId
    }, "check-app-" + Date.now());

    console.log("App Initialized. Effective Project ID:", app.options.projectId);

    const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || "(default)");
    console.log("Firestore client created for database:", firebaseConfig.firestoreDatabaseId || "(default)");

    try {
      const collections = await db.listCollections();
      console.log("Success! Collections found:", collections.map(c => c.id));
    } catch (e: any) {
      console.error("Firestore Error (Config Project):", e.message);
      if (e.code) console.error("Error Code:", e.code);

      console.log("\n--- Attempting Host Project Discovery ---");
      // Try to get proj from env if possible, though echo failed we can try node process.env
      const hostProj = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT;
      console.log("Detected Host Project ID:", hostProj);
      
      if (hostProj && hostProj !== firebaseConfig.projectId) {
         try {
           const hostApp = initializeApp({ projectId: hostProj }, "host-app");
           const hostDb = getFirestore(hostApp, "(default)");
           const hostColls = await hostDb.listCollections();
           console.log("Success on Host Project! Collections:", hostColls.map(c => c.id));
         } catch (hErr: any) {
           console.error("Host Project also failed:", hErr.message);
         }
      }
    }
  } catch (e: any) {
    console.error("Setup Error:", e.message);
  }
}

check();
