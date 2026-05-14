import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

try {
  initializeApp({
    projectId: 'sahs-archives'
  });
} catch (e) {
  // Already initialized
}

const db = getFirestore();

async function fixSponsorTypes() {
  const collectionRef = db.collection('organization_entities');
  const snapshot = await collectionRef.get();

  console.log(`Analyzing ${snapshot.size} documents...`);

  for (const doc of snapshot.docs) {
    const data = doc.data();
    
    // Check if it looks like a sponsor (has sponsorshipLevel or sponsorshipYear)
    const isSponsor = data.sponsorshipLevel || data.sponsorshipYear;
    
    if (isSponsor && data.type !== 'corporate_sponsor') {
      console.log(`Fixing type for sponsor: ${data.name} (Current type: ${data.type})`);
      await doc.ref.update({
        type: 'corporate_sponsor',
        updatedAt: new Date().toISOString()
      });
    } else if (isSponsor) {
        // Just verify it has a type
        console.log(`Verified sponsor: ${data.name}`);
    }
  }

  console.log('Fix complete!');
}

fixSponsorTypes().catch(console.error);
