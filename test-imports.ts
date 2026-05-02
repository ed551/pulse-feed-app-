import { FieldValue } from "firebase-admin/firestore";
console.log("FieldValue:", typeof FieldValue);
if (FieldValue) {
  console.log("serverTimestamp:", typeof FieldValue.serverTimestamp);
  console.log("increment:", typeof FieldValue.increment);
}
