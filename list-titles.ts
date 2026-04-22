import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp({ projectId: 'sahs-archives' });
const db = getFirestore();

async function run() {
  console.log('--- DEFAULT DATABASE ---');
  const snapshot = await db.collection('posts').get();
  snapshot.forEach(doc => console.log('- ' + doc.data().title));
  
  console.log('\n--- SAHS-ARCHIVES DATABASE ---');
  const dbOther = getFirestore('sahs-archives');
  const snapshotOther = await dbOther.collection('posts').get();
  snapshotOther.forEach(doc => console.log('- ' + doc.data().title));
}
run();
