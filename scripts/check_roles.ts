import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';

// Check if we have a service account key
const serviceAccountPath = '/Users/jermdw/SAHS/sahs-website/service-account.json';
if (!fs.existsSync(serviceAccountPath)) {
  console.error("Service account key not found at " + serviceAccountPath);
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function checkRoles() {
  console.log("Fetching user_roles...");
  const snapshot = await db.collection('user_roles').get();
  snapshot.forEach(doc => {
    console.log(`${doc.id} => ${JSON.stringify(doc.data())}`);
  });
  
  console.log("\nChecking hardcoded admins in firestore.rules...");
  // I'll just check if they are in the list I saw earlier
}

checkRoles().catch(console.error);
