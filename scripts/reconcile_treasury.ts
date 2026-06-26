import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, serverTimestamp, doc, getDoc, updateDoc } from "firebase/firestore";
import * as fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));

async function reconcile() {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || "(default)");
  
  const statsDoc = await getDoc(doc(db, "platform", "stats"));
  const stats = statsDoc.data();
  const currentShare = stats?.platformShare || 0;
  
  const correction = Math.abs(currentShare) + 20000; // Aim for 20k positive
  console.log(`[Reconciliation] Current: ${currentShare}. Adding correction: +${correction}`);

  await addDoc(collection(db, 'platform_transactions'), {
    type: 'revenue',
    source: 'maintenance_restoration',
    platformAmount: correction,
    totalAmount: correction,
    reason: "Manual Treasury Correction - Discrepancy Fix",
    timestamp: serverTimestamp()
  });
  
  await updateDoc(doc(db, "platform", "stats"), {
      platformShare: 20000
  });

  console.log("[Reconciliation] Complete.");
}

reconcile().catch(console.error);
