import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp({ projectId: 'sahs-archives' });
const db = getFirestore();

async function run() {
  const doc = await db.collection('posts').doc('64b1962bdd56b5834a5702bb').get();
  const data = doc.data();
  console.log('Title:', data.title);
  console.log('Type:', data.type);
  console.log('Status:', data.status);
  console.log('Event Date:', data.eventDate ? data.eventDate.toDate().toISOString() : 'NULL');
  console.log('Publish Date:', data.publishDate ? data.publishDate.toDate().toISOString() : 'NULL');
}
run();
