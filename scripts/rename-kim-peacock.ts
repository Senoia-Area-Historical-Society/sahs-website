import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const app = initializeApp({
  projectId: 'sahs-archives'
});
const db = getFirestore(app);

async function run() {
  const docRef = db.collection('organization_entities').doc('64b1962bdd56b5834a570357');
  await docRef.update({
    name: 'Southern Real Estate Connections',
    slug: 'southern-real-estate-connections',
    updatedAt: new Date()
  });
  console.log('Renamed entry successfully');
}

run().catch(console.error);
