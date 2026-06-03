import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp({ projectId: 'sahs-archives' });

const db = getFirestore();
const snap = await db.collection('posts').where('type', '==', 'event').get();
console.log(`Found ${snap.size} events:`);
snap.docs.forEach(d => {
  const data = d.data();
  console.log(`  [${data.status}] ${d.id} — "${data.title}"`);
});
