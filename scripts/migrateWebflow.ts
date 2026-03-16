import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp, GeoPoint } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import { Post, Gallery, HistoricalPlace, OrganizationEntity } from '../src/types/index';

dotenv.config();

// Intialize Firebase Admin using Application Default Credentials
// In a CI environment this depends on SA keys or Workload Identity Federation
initializeApp();
const db = getFirestore();

// Webflow Configuration
const WEBFLOW_TOKEN = process.env.WEBFLOW_TOKEN;
if (!WEBFLOW_TOKEN) {
  console.error("Missing WEBFLOW_TOKEN environment variable.");
  process.exit(1);
}

const COLLECTIONS = {
  NEWS: '64b1962bdd56b5834a57029b',
  PHOTO_GALLERIES: '64b1962bdd56b5834a5702a1',
  HISTORICAL_PLACES: '64b1962bdd56b5834a5702a4',
  BOARD_MEMBERS: '64b1962bdd56b5834a5702a0',
  CORP_SPONSORS: '64b1962bdd56b5834a5702a3',
  EVENT_SPONSORS: '67e77815b72b74b574500770'
};

const WEBFLOW_API_URL = 'https://api.webflow.com/v2/collections';

async function fetchWebflowItems(collectionId: string) {
  const url = `${WEBFLOW_API_URL}/${collectionId}/items?limit=100`;
  const options = {
    method: 'GET',
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${WEBFLOW_TOKEN}`
    }
  };

  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`Failed to fetch items for ${collectionId}: ${response.statusText}`);
    }
    const data = await response.json();
    return data.items || [];
  } catch (err) {
    console.error(`Error fetching collection ${collectionId}:`, err);
    return [];
  }
}

// Helpers
const safeString = (val: any) => val || '';
const safeArray = (val: any) => Array.isArray(val) ? val : [];
const parseDate = (val: any): Timestamp | null => val ? Timestamp.fromDate(new Date(val)) : null;

// Extractor and transformer for Posts
async function migratePosts() {
  console.log('Migrating Posts (News)...');
  const newsItems = await fetchWebflowItems(COLLECTIONS.NEWS);
  
  for (const item of newsItems) {
    const fieldData = item.fieldData;
    
    // Map to Post interface
    const post: Partial<Post> = {
      legacyWebflowId: item.id,
      type: fieldData.type === 'fc74355a86f63238e17f9704e56b0b0c' ? 'news' : 'event',
      title: safeString(fieldData.name),
      slug: safeString(fieldData.slug),
      publishDate: parseDate(fieldData['publish-date']),
      eventDate: parseDate(fieldData['event-date']),
      content: safeString(fieldData['full-description']),
      excerpt: safeString(fieldData['summary-description']),
      mainImage: safeString(fieldData['main-image']?.url),
      galleryImages: safeArray(fieldData['image-gallery']).map((img: any) => img.url),
      location: safeString(fieldData['google-maps-location']),
      createdAt: item.createdOn ? Timestamp.fromDate(new Date(item.createdOn)) : Timestamp.now(),
      updatedAt: item.lastUpdated ? Timestamp.fromDate(new Date(item.lastUpdated)) : null
    };

    await db.collection('posts').doc(item.id).set(post, { merge: true });
  }
  console.log(`Migrated ${newsItems.length} core posts.`);
}

async function migrateGalleries() {
  console.log('Migrating Photo Galleries...');
  const galleryItems = await fetchWebflowItems(COLLECTIONS.PHOTO_GALLERIES);
  
  for (const item of galleryItems) {
    const fieldData = item.fieldData;
    
    const images = [
      ...safeArray(fieldData['gallery-images-5']).map((img: any) => img.url),
      ...safeArray(fieldData['gallery-images-2-2']).map((img: any) => img.url),
      ...safeArray(fieldData['gallery-images-3-2']).map((img: any) => img.url),
      ...safeArray(fieldData['gallery-images-4-2']).map((img: any) => img.url),
    ];
    
    const gallery: Partial<Gallery> = {
      legacyWebflowId: item.id,
      title: safeString(fieldData.name),
      slug: safeString(fieldData.slug),
      description: safeString(fieldData['full-description']),
      excerpt: safeString(fieldData['summary-description-2']),
      coverImage: safeString(fieldData['main-image-2']?.url),
      images: images,
      relatedPostIds: safeArray(fieldData['news-or-event']),
      sortOrder: fieldData['sort-order'] || 0,
      createdAt: item.createdOn ? Timestamp.fromDate(new Date(item.createdOn)) : Timestamp.now(),
      updatedAt: item.lastUpdated ? Timestamp.fromDate(new Date(item.lastUpdated)) : null
    };

    await db.collection('galleries').doc(item.id).set(gallery, { merge: true });
  }
  console.log(`Migrated ${galleryItems.length} photo galleries.`);
}

async function migrateHistoricalPlaces() {
  console.log('Migrating Historical Places...');
  const placeItems = await fetchWebflowItems(COLLECTIONS.HISTORICAL_PLACES);
  
  for (const item of placeItems) {
    const fieldData = item.fieldData;
    let type = 'Place or Thing';
    if (fieldData.type === 'fa44d5cb32302cbe521a51c355b0d0ff') type = 'Home';
    else if (fieldData.type === 'becb3bca0cbcd83ef630125ca16855bb') type = 'Business';

    const images = [
      ...safeArray(fieldData['gallery-images']).map((img: any) => img.url),
      ...safeArray(fieldData['gallery-images-2']).map((img: any) => img.url),
    ];

    const place: Partial<HistoricalPlace> = {
      legacyWebflowId: item.id,
      title: safeString(fieldData.name),
      slug: safeString(fieldData.slug),
      type: type as 'Home' | 'Business' | 'Place or Thing',
      description: safeString(fieldData['full-description']),
      excerpt: safeString(fieldData['summary-description']),
      mainImage: safeString(fieldData['main-image']?.url),
      galleryImages: images,
      historical_address: safeString(fieldData['google-maps-location']),
      createdAt: item.createdOn ? Timestamp.fromDate(new Date(item.createdOn)) : Timestamp.now(),
      updatedAt: item.lastUpdated ? Timestamp.fromDate(new Date(item.lastUpdated)) : null
    };

    await db.collection('historical_places').doc(item.id).set(place, { merge: true });
  }
  console.log(`Migrated ${placeItems.length} historical places.`);
}

async function migrateOrganizationEntities() {
  console.log('Migrating Organization Entities...');
  const boards = await fetchWebflowItems(COLLECTIONS.BOARD_MEMBERS);
  const corpSponsors = await fetchWebflowItems(COLLECTIONS.CORP_SPONSORS);
  const eventSponsors = await fetchWebflowItems(COLLECTIONS.EVENT_SPONSORS);
  
  for (const item of boards) {
    const fieldData = item.fieldData;
    const entity: Partial<OrganizationEntity> = {
      legacyWebflowId: item.id,
      type: 'board_member',
      name: safeString(fieldData.name),
      slug: safeString(fieldData.slug),
      position: safeString(fieldData.position),
      bio: safeString(fieldData.bio),
      summaryBio: safeString(fieldData['summary-bio']),
      email: safeString(fieldData.email),
      phone: safeString(fieldData.phone),
      headshot: safeString(fieldData.headshot?.url),
      sortPosition: fieldData['sort-postion'] || 0,
      createdAt: item.createdOn ? Timestamp.fromDate(new Date(item.createdOn)) : Timestamp.now(),
      updatedAt: item.lastUpdated ? Timestamp.fromDate(new Date(item.lastUpdated)) : null
    };
    await db.collection('organization_entities').doc(item.id).set(entity, { merge: true });
  }

  const mapSponsorLevel = (id: string) => {
    switch(id) {
       case 'a10ccd776e9557fd6b31325446f6490e': return 'Corporate';
       case '1c210f13076af990bd1583e89679560e': return 'Historian';
       case '9b5db2ec132739c807ff5c423dd62967': return 'Event Sponsor';
       case '7c89b8862a9bae1f2181a6e4915329c2': return 'Title';
       case '00550c5dfe92d767dd8c6d480cafb87f': return 'Gold';
       case '2e063a7542f4480f1661c26357d6ef34': return 'Silver';
       case '371b5d00a7517a9d036fcb4b5a220c97': return 'Bronze';
       default: return '';
    }
  };

  const mapYear = (id: string) => {
    switch(id) {
      case 'baecb763806fe1965a1ee84567038df0': return '2025';
      case 'd0812c5ab076632b90d1799b081c0dfd': return '2024';
      case 'f9144bc6cb3b1e27de58449619a1932e': return '2023';
      case '06f8c6092f0506a7da79e1eef6b51db9': return '2026';
      default: return '';
    }
  }

  for (const item of corpSponsors) {
    const fieldData = item.fieldData;
    const entity: Partial<OrganizationEntity> = {
      legacyWebflowId: item.id,
      type: 'corporate_sponsor',
      name: safeString(fieldData.name),
      slug: safeString(fieldData.slug),
      sponsorshipLevel: mapSponsorLevel(fieldData.level),
      sponsorshipYear: mapYear(fieldData.year),
      websiteUrl: safeString(fieldData['link-url']?.url),
      logoUrl: safeString(fieldData['logo-or-image']?.url),
      createdAt: item.createdOn ? Timestamp.fromDate(new Date(item.createdOn)) : Timestamp.now(),
      updatedAt: item.lastUpdated ? Timestamp.fromDate(new Date(item.lastUpdated)) : null
    };
    await db.collection('organization_entities').doc(item.id).set(entity, { merge: true });
  }

  for (const item of eventSponsors) {
    const fieldData = item.fieldData;
    const entity: Partial<OrganizationEntity> = {
      legacyWebflowId: item.id,
      type: 'event_sponsor',
      name: safeString(fieldData.name),
      slug: safeString(fieldData.slug),
      createdAt: item.createdOn ? Timestamp.fromDate(new Date(item.createdOn)) : Timestamp.now(),
      updatedAt: item.lastUpdated ? Timestamp.fromDate(new Date(item.lastUpdated)) : null
    };
    await db.collection('organization_entities').doc(item.id).set(entity, { merge: true });
  }

  console.log(`Migrated ${boards.length} board members, ${corpSponsors.length} corporate sponsors, ${eventSponsors.length} event sponsors.`);
}


async function runMigration() {
  console.log('Starting Webflow to Firestore migration...');
  
  await migratePosts();
  await migrateGalleries();
  await migrateHistoricalPlaces();
  await migrateOrganizationEntities();
  
  console.log('Migration successfully completed.');
}

runMigration().catch(console.error);
