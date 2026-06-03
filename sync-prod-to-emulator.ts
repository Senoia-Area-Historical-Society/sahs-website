import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

async function run() {
  console.log('🔄 Fetching data from production Firestore...');
  
  // Initialize production app
  const prodApp = initializeApp({ projectId: 'sahs-archives' }, 'prod');
  const prodDb = getFirestore(prodApp);
  
  // Fetch posts
  const postsSnapshot = await prodDb.collection('posts').get();
  console.log(`Fetched ${postsSnapshot.size} posts from production.`);
  const posts = postsSnapshot.docs.map(doc => ({ id: doc.id, data: doc.data() }));

  // Fetch historical_places
  const hpSnapshot = await prodDb.collection('historical_places').get();
  console.log(`Fetched ${hpSnapshot.size} historical_places from production.`);
  const hp = hpSnapshot.docs.map(doc => ({ id: doc.id, data: doc.data() }));

  // Fetch wiki pages
  const wikiSnapshot = await prodDb.collection('wiki').get();
  console.log(`Fetched ${wikiSnapshot.size} wiki pages from production.`);
  const wiki = wikiSnapshot.docs.map(doc => ({ id: doc.id, data: doc.data() }));

  // Fetch organization_entities
  const orgSnapshot = await prodDb.collection('organization_entities').get();
  console.log(`Fetched ${orgSnapshot.size} organization_entities from production.`);
  const org = orgSnapshot.docs.map(doc => ({ id: doc.id, data: doc.data() }));

  // Delete production app to clean up
  await deleteApp(prodApp);

  console.log('🔌 Connecting to local Firestore emulator...');
  process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
  const emuApp = initializeApp({ projectId: 'sahs-archives' }, 'emulator');
  const emuDb = getFirestore(emuApp);

  console.log('Writing posts to emulator...');
  let postsWritten = 0;
  for (const post of posts) {
    await emuDb.collection('posts').doc(post.id).set(post.data);
    postsWritten++;
  }
  console.log(`✅ Successfully wrote ${postsWritten} posts to emulator.`);

  console.log('Writing historical_places to emulator...');
  let hpWritten = 0;
  for (const item of hp) {
    await emuDb.collection('historical_places').doc(item.id).set(item.data);
    hpWritten++;
  }
  console.log(`✅ Successfully wrote ${hpWritten} historical_places to emulator.`);

  console.log('Writing wiki pages to emulator...');
  let wikiWritten = 0;
  for (const item of wiki) {
    await emuDb.collection('wiki').doc(item.id).set(item.data);
    wikiWritten++;
  }
  console.log(`✅ Successfully wrote ${wikiWritten} wiki pages to emulator.`);

  console.log('Writing organization_entities to emulator...');
  let orgWritten = 0;
  for (const item of org) {
    await emuDb.collection('organization_entities').doc(item.id).set(item.data);
    orgWritten++;
  }
  console.log(`✅ Successfully wrote ${orgWritten} organization_entities to emulator.`);

  // Cleanup
  await deleteApp(emuApp);
  console.log('🎉 Sync complete!');
}

run().catch(console.error);
