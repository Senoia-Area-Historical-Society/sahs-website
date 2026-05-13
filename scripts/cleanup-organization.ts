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

const db = getFirestore();

const activeBoardMembers = [
  "Shelley Kiley",
  "Jeremy Warren",
  "Bill Wood",
  "Angela Rogers",
  "Greg Crook",
  "Margaret Ordoñez",
  "Tim Baker",
  "Cat Nolan"
];

const activeCorporateSponsors = [
  "Coastal Packaging",
  "First People's Bank of Senoia",
  "Fuller Insurance Agency",
  "Kim Peacock Properties",
  "Norcom Inc",
  "SANY America",
  "TDK",
  "TenCate Protective Fabrics"
];

const activePatronSponsors = [
  "Country Junction Soaps",
  "Hearn Landscape",
  "Senoia DDA"
];

async function cleanup() {
  console.log('--- Cleaning up organization_entities ---');
  
  const orgRef = db.collection('organization_entities');
  
  // Handle Board Members
  const boardSnapshot = await orgRef.where('type', '==', 'board_member').get();
  const boardBatch = db.batch();
  let deletedBoard = 0;
  
  boardSnapshot.docs.forEach(doc => {
    const data = doc.data();
    if (!activeBoardMembers.includes(data.name)) {
      console.log(`Deleting old board member: ${data.name}`);
      boardBatch.delete(doc.ref);
      deletedBoard++;
    }
  });
  
  if (deletedBoard > 0) {
    await boardBatch.commit();
    console.log(`Deleted ${deletedBoard} old board members.`);
  } else {
    console.log('No outdated board members to delete.');
  }
  
  // Handle Sponsors
  const sponsorSnapshot = await orgRef.where('type', '==', 'corporate_sponsor').get();
  const sponsorBatch = db.batch();
  let deletedSponsors = 0;
  let updatedSponsors = 0;
  
  sponsorSnapshot.docs.forEach(doc => {
    const data = doc.data();
    
    const isCorporate = activeCorporateSponsors.includes(data.name);
    const isPatron = activePatronSponsors.includes(data.name);
    
    if (!isCorporate && !isPatron) {
      console.log(`Deleting old sponsor: ${data.name}`);
      sponsorBatch.delete(doc.ref);
      deletedSponsors++;
    } else {
      // Ensure sponsorshipLevel is correct
      const expectedLevel = isPatron ? 'Patron' : 'Corporate';
      if (data.sponsorshipLevel !== expectedLevel) {
        console.log(`Updating sponsorshipLevel for ${data.name} to ${expectedLevel}`);
        sponsorBatch.update(doc.ref, { sponsorshipLevel: expectedLevel });
        updatedSponsors++;
      }
    }
  });
  
  if (deletedSponsors > 0 || updatedSponsors > 0) {
    await sponsorBatch.commit();
    console.log(`Deleted ${deletedSponsors} old sponsors. Updated ${updatedSponsors} sponsors.`);
  } else {
    console.log('No outdated sponsors to delete or update.');
  }

  console.log('--- Cleanup complete ---');
}

cleanup().catch(console.error);
