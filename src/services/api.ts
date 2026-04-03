import { collection, getDocs, query, orderBy, limit, where, addDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Post, Gallery, HistoricalPlace, OrganizationEntity, Booking } from '../types/index';

// Helpers to transform Firestore docs safely
const toPost = (doc: any): Post => ({ id: doc.id, ...doc.data() } as Post);
const toGallery = (doc: any): Gallery => ({ id: doc.id, ...doc.data() } as Gallery);
const toHistoricalPlace = (doc: any): HistoricalPlace => ({ id: doc.id, ...doc.data() } as HistoricalPlace);
const toOrganizationEntity = (doc: any): OrganizationEntity => ({ id: doc.id, ...doc.data() } as OrganizationEntity);
const toBooking = (doc: any): Booking => ({ id: doc.id, ...doc.data() } as Booking);

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

export async function submitApplication(type: 'vendor' | 'sponsor', data: any): Promise<void> {
  try {
    const colRef = collection(db, 'submissions');
    await addDoc(colRef, {
      type,
      ...data,
      status: 'pending',
      submittedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error(`Error submitting ${type} application:`, err);
    throw err;
  }
}

export async function getBookings(startDate: string, endDate: string): Promise<Booking[]> {
  try {
    const q = query(
      collection(db, 'bookings'),
      where('date', '>=', startDate),
      where('date', '<=', endDate),
      where('status', '==', 'confirmed')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(toBooking);
  } catch (err) {
    console.error('Error fetching bookings:', err);
    return [];
  }
}

export async function getAllBookings(): Promise<Booking[]> {
  try {
    const q = query(
      collection(db, 'bookings'),
      orderBy('submittedAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(toBooking);
  } catch (err) {
    console.error('Error fetching all bookings:', err);
    return [];
  }
}

export async function updateBookingStatus(id: string, status: 'pending' | 'confirmed' | 'cancelled'): Promise<void> {
  try {
    const docRef = doc(db, 'bookings', id);
    await updateDoc(docRef, { status });
  } catch (err) {
    console.error('Error updating booking status:', err);
    throw err;
  }
}

export async function submitBookingRequest(data: Omit<Booking, 'id' | 'status' | 'submittedAt'>): Promise<{ url: string }> {
  try {
    // In production, this URL should come from env variables
    const functionUrl = import.meta.env.VITE_FIREBASE_FUNCTIONS_URL || 'http://127.0.0.1:5001/sahs-archives/us-central1/createBookingCheckoutSession';
    
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
         throw new Error(`Cloud function returned ${response.status}`);
    }

    return await response.json();
  } catch (err) {
    console.error('Error creating checkout session:', err);
    throw err;
  }
}

export async function submitMembershipRequest(data: { email: string; level: string; quantity: number; userId?: string }): Promise<{ url: string }> {
  try {
    const baseUrl = import.meta.env.VITE_FIREBASE_FUNCTIONS_URL || 'http://127.0.0.1:5001/sahs-archives/us-central1';
    const functionUrl = `${baseUrl}/createMembershipCheckoutSession`;
    
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
         throw new Error(`Cloud function returned ${response.status}`);
    }

    return await response.json();
  } catch (err) {
    console.error('Error creating membership checkout session:', err);
    throw err;
  }
}

export async function submitTicketRequest(data: { eventId: string; title: string; price: number; quantity: number; email: string }): Promise<{ url: string }> {
  try {
    const baseUrl = import.meta.env.VITE_FIREBASE_FUNCTIONS_URL || 'http://127.0.0.1:5001/sahs-archives/us-central1';
    const functionUrl = `${baseUrl}/createTicketCheckoutSession`;
    
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
         throw new Error(`Cloud function returned ${response.status}`);
    }

    return await response.json();
  } catch (err) {
    console.error('Error creating ticket checkout session:', err);
    throw err;
  }
}
