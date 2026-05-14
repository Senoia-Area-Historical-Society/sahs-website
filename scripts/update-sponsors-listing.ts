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

async function updateSponsors() {
  const collectionRef = db.collection('organization_entities');

  // 1. Remove Hearn Landscape
  console.log('Removing Hearn Landscape...');
  await collectionRef.doc('666092e82e979fbafff38f01').delete();

  // 2. Update TenCate Protective Fabrics logo
  console.log('Updating TenCate logo...');
  await collectionRef.doc('6908ee804299441e02672acd').update({
    logoUrl: '/images/sponsors/tencate-logo.jpg',
    updatedAt: new Date().toISOString()
  });

  // 3. Add Synovus Bank (Corporate)
  console.log('Adding Synovus Bank...');
  await collectionRef.add({
    name: 'Synovus Bank',
    slug: 'synovus-bank',
    type: 'corporate_sponsor',
    sponsorshipLevel: 'Corporate',
    sponsorshipYear: '2026',
    logoUrl: '/images/sponsors/synovus-logo.png',
    websiteUrl: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  // 4. Add D&R Ventures (Patron)
  console.log('Adding D&R Ventures...');
  await collectionRef.add({
    name: 'D&R Ventures',
    slug: 'dr-ventures-logo',
    type: 'corporate_sponsor',
    sponsorshipLevel: 'Patron',
    sponsorshipYear: '2026',
    logoUrl: '/images/sponsors/dr-ventures-logo.png',
    websiteUrl: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  console.log('Sponsor updates complete!');
}

updateSponsors().catch(console.error);
