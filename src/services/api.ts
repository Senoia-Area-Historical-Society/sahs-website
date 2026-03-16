import { collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Post, Gallery, HistoricalPlace, OrganizationEntity } from '../types/index';

// Helpers to transform Firestore docs safely
const toPost = (doc: any): Post => ({ id: doc.id, ...doc.data() } as Post);
const toGallery = (doc: any): Gallery => ({ id: doc.id, ...doc.data() } as Gallery);
const toHistoricalPlace = (doc: any): HistoricalPlace => ({ id: doc.id, ...doc.data() } as HistoricalPlace);
const toOrganizationEntity = (doc: any): OrganizationEntity => ({ id: doc.id, ...doc.data() } as OrganizationEntity);

export async function getNewsPosts(maxItems: number = 20): Promise<Post[]> {
  try {
    const q = query(
      collection(db, 'posts'),
      where('type', '==', 'news'),
      orderBy('publishDate', 'desc'),
      limit(maxItems)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(toPost);
  } catch (err) {
    console.error('Error fetching News posts:', err);
    return [];
  }
}

export async function getEvents(maxItems: number = 20): Promise<Post[]> {
  try {
    const q = query(
      collection(db, 'posts'),
      where('type', '==', 'event'),
      orderBy('eventDate', 'desc'),
      limit(maxItems)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(toPost);
  } catch (err) {
    console.error('Error fetching Events:', err);
    return [];
  }
}

export async function getGalleries(): Promise<Gallery[]> {
  try {
    const q = query(
      collection(db, 'galleries'),
      orderBy('sortOrder', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(toGallery);
  } catch (err) {
    console.error('Error fetching Galleries:', err);
    return [];
  }
}

export async function getHistoricalPlaces(): Promise<HistoricalPlace[]> {
  try {
    const q = query(collection(db, 'historical_places'));
    // Potentially add ordering if a title or createdAt field is consistent
    const snapshot = await getDocs(q);
    return snapshot.docs.map(toHistoricalPlace);
  } catch (err) {
    console.error('Error fetching Historical Places:', err);
    return [];
  }
}

export async function getBoardMembers(): Promise<OrganizationEntity[]> {
  try {
    const q = query(
      collection(db, 'organization_entities'),
      where('type', '==', 'board_member'),
      orderBy('sortPosition', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(toOrganizationEntity);
  } catch (err) {
    console.error('Error fetching Board Members:', err);
    return [];
  }
}

export async function getCorporateSponsors(): Promise<OrganizationEntity[]> {
  try {
    const q = query(
      collection(db, 'organization_entities'),
      where('type', '==', 'corporate_sponsor')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(toOrganizationEntity);
  } catch (err) {
    console.error('Error fetching Corporate Sponsors:', err);
    return [];
  }
}
