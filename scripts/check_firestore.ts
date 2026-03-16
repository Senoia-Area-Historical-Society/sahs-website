import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

try {
  initializeApp({
    projectId: 'sahs-archives'
  });
} catch (e) {
  console.error("Firebase Admin initialization failed.");
  process.exit(1);
}

const defaultDb = getFirestore();
const namedDb = getFirestore('sahs-archives');

async function diagnose() {
  console.log('--- Firestore Diagnosis ---');
  
  console.log('\n[Checking (default) Database]');
  const postsDefault = await defaultDb.collection('posts').get();
  console.log(`Total documents in 'posts': ${postsDefault.size}`);
  
  console.log('\n[Checking (sahs-archives) Database]');
  try {
    const postsNamed = await namedDb.collection('posts').get();
    console.log(`Total documents in 'posts': ${postsNamed.size}`);
    
    const newsNamed = await namedDb.collection('posts').where('type', '==', 'news').get();
    console.log(`Documents with type 'news': ${newsNamed.size}`);
    
    const eventNamed = await namedDb.collection('posts').where('type', '==', 'event').get();
    console.log(`Documents with type 'event': ${eventNamed.size}`);
  } catch (e) {
    console.warn('Could not access sahs-archives database. It might not exist.');
  }
}

diagnose().catch(console.error);
