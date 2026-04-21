
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import axios from "axios";

async function checkIdentity() {
  try {
    // Try to get service account from metadata server
    const response = await axios.get("http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/email", {
      headers: { "Metadata-Flavor": "Google" },
      timeout: 2000
    });
    console.log("Current Service Account:", response.data);

    const projResponse = await axios.get("http://metadata.google.internal/computeMetadata/v1/project/project-id", {
      headers: { "Metadata-Flavor": "Google" },
      timeout: 2000
    });
    const hostProj = projResponse.data;
    console.log("Actual Project ID (from metadata):", hostProj);

    console.log("\n--- Testing Access to Host Project Firestore ---");
    try {
      const app = initializeApp({ projectId: hostProj }, "host-test");
      const db = getFirestore(app); // Default db
      const collections = await db.listCollections();
      console.log("Success on Host Project! Collections:", collections.map(c => c.id));
    } catch (e: any) {
      console.error("Host Project Access Failed:", e.message);
    }
  } catch (e: any) {
    console.error("Metadata check failed (maybe not on GCP?):", e.message);
  }
}

checkIdentity();
