const admin = require("firebase-admin");
const serviceAccount = require("./functions/serviceAccountKey.json");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}
const db = admin.firestore();

async function getBoard() {
  const snapshot = await db.collection("organization").get();
  snapshot.forEach(doc => {
    console.log(doc.id, "=>", doc.data());
  });
}
getBoard();
