
import { initializeApp } from "firebase/app";
import { getFirestore, doc, updateDoc, increment, collection, addDoc, serverTimestamp, setDoc } from "firebase/firestore";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function restore() {
  const configPath = fs.existsSync(path.join(__dirname, "..", "firebase-applet-config.json"))
    ? path.join(__dirname, "..", "firebase-applet-config.json")
    : path.join(__dirname, "../../", "firebase-applet-config.json");
    
  const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || "(default)");
  
  const amountToRestore = 20000;
  const statsRef = doc(db, "platform", "stats");

  console.log(`[Maintenance] Restoring ${amountToRestore} to platformShare via Client SDK...`);

  try {
    // Attempt update with increment
    await updateDoc(statsRef, {
      platformShare: increment(amountToRestore),
      lastUpdated: new Date().toISOString(),
      serverSecret: "pulse-feeds-server-secret-2026" // Needed for firestore.rules
    });
    console.log("✅ Platform treasury restored successfully.");
  } catch (err: any) {
    console.warn("Update failed, attempting set or create:", err.message);
    await setDoc(statsRef, {
      platformShare: increment(amountToRestore),
      lastUpdated: new Date().toISOString(),
      serverSecret: "pulse-feeds-server-secret-2026"
    }, { merge: true });
    console.log("✅ Platform treasury merged successfully.");
  }
  
  // Also add a reconciliation transaction to prevent audit discrepancy
  await addDoc(collection(db, 'platform_transactions'), {
    type: 'refund',
    source: 'maintenance_restoration',
    platformAmount: amountToRestore,
    totalAmount: amountToRestore,
    reason: "Maintenance: Automated restoration of simulated platform payout.",
    userId: 'system-maintenance',
    timestamp: serverTimestamp(),
    serverSecret: "pulse-feeds-server-secret-2026"
  });

  console.log("✅ Reconciliation log added.");
}

restore().catch(console.error);
