import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp({ projectId: 'sahs-archives' });
const db = getFirestore();

async function run() {
  const snapshot = await db.collection('user_roles').get();
  if (snapshot.empty) {
    console.log('No user roles found in production.');
  } else {
    snapshot.forEach(doc => {
      console.log(doc.id, '| role:', doc.data().role);
    });
  }
}
run();
