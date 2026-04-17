import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Co-op Bank Transaction Callback Handler
 * This function receives POST requests from Co-op Bank's API
 * and updates the transaction status in Firestore.
 */
export const coopBankCallback = functions.https.onRequest(async (req, res) => {
  // 1. Log the incoming request for debugging
  console.log("Co-op Bank Callback Received:", JSON.stringify(req.body, null, 2));

  // 2. Only allow POST requests
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  const { MessageReference, TransactionStatus, TransactionStatusDescription } = req.body;

  if (!MessageReference) {
    console.error("Missing MessageReference in callback body");
    res.status(400).send("Bad Request: Missing MessageReference");
    return;
  }

  try {
    // 3. Update the payout document in Firestore
    // We assume payouts are stored in a 'payouts' collection with MessageReference as the ID
    const payoutRef = db.collection("payouts").doc(MessageReference);
    const doc = await payoutRef.get();

    if (doc.exists) {
      await payoutRef.update({
        status: TransactionStatus === "00" ? "completed" : "failed",
        bankResponse: req.body,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        callbackProcessed: true
      });
      console.log(`Successfully updated payout ${MessageReference} to ${TransactionStatus === "00" ? "completed" : "failed"}`);
    } else {
      // If the document doesn't exist, log it to a separate collection for manual review
      console.warn(`Payout document ${MessageReference} not found. Logging to callback_logs.`);
      await db.collection("callback_logs").add({
        type: "coop_bank_unmatched",
        messageReference: MessageReference,
        data: req.body,
        receivedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    // 4. Return 200 OK to Co-op Bank as required
    res.status(200).send("OK");
  } catch (error) {
    console.error("Error processing Co-op Bank callback:", error);
    // Even on error, we usually return 200 to the bank to stop retries, 
    // but log the error internally.
    res.status(200).send("OK (Logged Error)");
  }
});
