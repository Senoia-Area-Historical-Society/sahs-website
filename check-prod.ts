import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Explicitly NOT setting FIRESTORE_EMULATOR_HOST

initializeApp({ projectId: 'sahs-archives' });
const db = getFirestore();

async function run() {
  try {
    const snapshot = await db.collection('posts').count().get();
    console.log('Production Posts count:', snapshot.data().count);
    
    const firstFive = await db.collection('posts').limit(5).get();
    if (firstFive.empty) {
      console.log('No posts found in production.');
    } else {
      console.log('Sample production post titles:');
      firstFive.forEach(doc => console.log('- ' + doc.data().title));
    }
  } catch (err) {
    console.error('Error checking production:', err.message);
  }
}
run();
