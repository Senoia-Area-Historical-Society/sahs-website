import { collection, getDocs, query, orderBy, limit, where, addDoc, doc, updateDoc, getDoc, runTransaction, Timestamp, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Post, Gallery, HistoricalPlace, OrganizationEntity, Booking, Membership, Ticket, VolunteerSheet, VolunteerSlot, VolunteerRegistration } from '../types/index';

// Helpers to transform Firestore docs safely
const toPost = (doc: any): Post => ({ id: doc.id, ...doc.data() } as Post);
const toGallery = (doc: any): Gallery => ({ id: doc.id, ...doc.data() } as Gallery);
const toHistoricalPlace = (doc: any): HistoricalPlace => ({ id: doc.id, ...doc.data() } as HistoricalPlace);
const toOrganizationEntity = (doc: any): OrganizationEntity => ({ id: doc.id, ...doc.data() } as OrganizationEntity);
const toBooking = (doc: any): Booking => ({ id: doc.id, ...doc.data() } as Booking);

export async function getNewsPosts(maxItems: number = 20): Promise<Post[]> {
  try {
    // Querying all posts ordered by publishDate to avoid complex composite index requirements.
    // We will filter in memory for news and past events.
    const q = query(
      collection(db, 'posts'),
      orderBy('publishDate', 'desc'),
      limit(maxItems * 4) // Fetch extra to account for filtering
    );
    const snapshot = await getDocs(q);
    const allPosts = snapshot.docs.map(toPost);
    const now = new Date();
    
    return allPosts.filter(post => {
      if (post.status !== 'published') return false;
      
      if (post.type === 'event') {
        // Only include past events
        if (!post.eventDate) return false;
        return post.eventDate.toDate() < now;
      }
      
      return post.type === 'news';
    }).slice(0, maxItems);
  } catch (err) {
    console.error('Error fetching News & Past Events:', err);
    return [];
  }
}

export async function getEvents(maxItems: number = 20): Promise<Post[]> {
  try {
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Include events happening today
    
    // Querying eventDate >= now automatically filters out non-events (since they lack eventDate)
    const q = query(
      collection(db, 'posts'),
      where('eventDate', '>=', now),
      orderBy('eventDate', 'asc'),
      limit(maxItems * 2)
    );
    const snapshot = await getDocs(q);
    const allPosts = snapshot.docs.map(toPost);
    return allPosts.filter(post => post.status === 'published' && post.type === 'event').slice(0, maxItems);
  } catch (err) {
    console.error('Error fetching Events:', err);
    return [];
  }
}

export async function getPastEvents(maxItems: number = 50): Promise<Post[]> {
  try {
    const now = new Date();
    
    // Querying all posts with eventDate to find past ones
    const q = query(
      collection(db, 'posts'),
      where('eventDate', '<', now),
      orderBy('eventDate', 'desc'),
      limit(maxItems * 2)
    );
    const snapshot = await getDocs(q);
    const allPosts = snapshot.docs.map(toPost);
    return allPosts.filter(post => post.status === 'published' && post.type === 'event').slice(0, maxItems);
  } catch (err) {
    console.error('Error fetching Past Events:', err);
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

export async function submitTicketRequest(data: { eventId: string; title: string; price: number; quantity: number; email: string; customerName?: string; slug?: string }): Promise<{ url: string }> {
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

export async function getTicketBySessionId(sessionId: string): Promise<import('../types').Ticket | null> {
  try {
    const { collection: col, query: q, where: w, getDocs: gd, limit: lim } = await import('firebase/firestore');
    const { db: firestoreDb } = await import('../lib/firebase');
    const snap = await gd(q(col(firestoreDb, 'tickets'), w('stripeSessionId', '==', sessionId), lim(1)));
    if (snap.empty) return null;
    const d = snap.docs[0];
    return { id: d.id, ...d.data() } as import('../types').Ticket;
  } catch (err) {
    console.error('Error fetching ticket by session:', err);
    return null;
  }
}

export async function verifyTicketConfirmation(confirmationNumber: string): Promise<{ valid: boolean; reason?: string; ticket?: any }> {
  const baseUrl = import.meta.env.VITE_FIREBASE_FUNCTIONS_URL || 'http://127.0.0.1:5001/sahs-archives/us-central1';
  const res = await fetch(`${baseUrl}/verifyTicket?confirmationNumber=${encodeURIComponent(confirmationNumber.trim())}`);
  return res.json();
}

export async function getMemberships(): Promise<Membership[]> {
  try {
    const isProd = !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1');
    const functionsBaseUrl = import.meta.env.VITE_FIREBASE_FUNCTIONS_URL || 
      (isProd 
        ? 'https://us-central1-sahs-archives.cloudfunctions.net' 
        : 'http://127.0.0.1:5001/sahs-archives/us-central1');
    
    const functionUrl = `${functionsBaseUrl}/listStripeSubscriptions`;
    
    const response = await fetch(functionUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Cloud function returned ${response.status}`);
    }

    return await response.json();
  } catch (err) {
    console.error('Error fetching memberships from Stripe:', err);
    return [];
  }
}

export async function getTickets(): Promise<Ticket[]> {
  try {
    const q = query(
      collection(db, 'tickets'),
      orderBy('purchasedAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ticket));
  } catch (err) {
    console.error('Error fetching tickets:', err);
    return [];
  }
}

// ── Volunteer Management ──────────────────────────────────────────────────────

/** Generate a random URL-safe token for volunteer sheet share links */
function generateShareToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 12; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

/** Fetch all volunteer sheets (admin view) */
export async function getVolunteerSheets(): Promise<VolunteerSheet[]> {
  try {
    const q = query(collection(db, 'volunteer_sheets'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as VolunteerSheet));
  } catch (err) {
    console.error('Error fetching volunteer sheets:', err);
    return [];
  }
}

/** Fetch a single active sheet by its public share token */
export async function getVolunteerSheetByToken(token: string): Promise<VolunteerSheet | null> {
  try {
    const q = query(
      collection(db, 'volunteer_sheets'),
      where('shareToken', '==', token),
      limit(1)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    const d = snapshot.docs[0];
    return { id: d.id, ...d.data() } as VolunteerSheet;
  } catch (err) {
    console.error('Error fetching volunteer sheet by token:', err);
    return null;
  }
}

/** Create a new volunteer sheet */
export async function createVolunteerSheet(
  data: Omit<VolunteerSheet, 'id' | 'shareToken' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const docRef = await addDoc(collection(db, 'volunteer_sheets'), {
    ...data,
    shareToken: generateShareToken(),
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return docRef.id;
}

/** Update an existing volunteer sheet */
export async function updateVolunteerSheet(
  id: string,
  data: Partial<Omit<VolunteerSheet, 'id' | 'shareToken' | 'createdAt'>>
): Promise<void> {
  await updateDoc(doc(db, 'volunteer_sheets', id), {
    ...data,
    updatedAt: Timestamp.now(),
  });
}

/** Fetch all slots for a given sheet (ordered by sortOrder) */
export async function getVolunteerSlots(sheetId: string): Promise<VolunteerSlot[]> {
  try {
    const q = query(
      collection(db, 'volunteer_sheets', sheetId, 'slots'),
      orderBy('sortOrder', 'asc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as VolunteerSlot));
  } catch (err) {
    console.error('Error fetching volunteer slots:', err);
    return [];
  }
}

/** Create or update a slot */
export async function saveVolunteerSlot(
  sheetId: string,
  slot: Omit<VolunteerSlot, 'id'> & { id?: string }
): Promise<void> {
  const { id, ...data } = slot;
  if (id) {
    await updateDoc(doc(db, 'volunteer_sheets', sheetId, 'slots', id), data);
  } else {
    await addDoc(collection(db, 'volunteer_sheets', sheetId, 'slots'), {
      ...data,
      filledCount: 0,
    });
  }
}

/** Delete a slot */
export async function deleteVolunteerSlot(sheetId: string, slotId: string): Promise<void> {
  await deleteDoc(doc(db, 'volunteer_sheets', sheetId, 'slots', slotId));
}

/** Public signup — transactionally checks capacity, creates registration, sends confirmation email */
export async function submitVolunteerSignup(
  sheetId: string,
  data: Omit<VolunteerRegistration, 'id' | 'status' | 'signedUpAt'>
): Promise<void> {
  const slotRef = doc(db, 'volunteer_sheets', sheetId, 'slots', data.slotId);
  const registrationsRef = collection(db, 'volunteer_sheets', sheetId, 'registrations');
  const mailRef = collection(db, 'mail');

  await runTransaction(db, async (tx) => {
    const slotSnap = await tx.get(slotRef);
    if (!slotSnap.exists()) throw new Error('Slot not found.');

    const slot = slotSnap.data() as VolunteerSlot;
    if (slot.filledCount >= slot.capacity) {
      throw new Error('This slot is full. Please choose another.');
    }

    // Create registration
    const regRef = doc(registrationsRef);
    tx.set(regRef, {
      ...data,
      status: 'confirmed',
      signedUpAt: Timestamp.now(),
    });

    // Increment filled count
    tx.update(slotRef, { filledCount: slot.filledCount + 1 });
  });

  // After successful transaction, trigger confirmation email via Firebase extension
  try {
    const sheetSnap = await getDoc(doc(db, 'volunteer_sheets', sheetId));
    const sheet = sheetSnap.data() as VolunteerSheet;
    const slotSnap = await getDoc(slotRef);
    const slot = slotSnap.data() as VolunteerSlot;

    const eventDateStr = sheet.eventDate
      ? sheet.eventDate.toDate().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
      : '';

    await addDoc(mailRef, {
      to: data.email,
      from: 'Senoia Area Historical Society <volunteers@senoiahistory.com>',
      replyTo: 'info@senoiahistory.com',
      message: {
        subject: `You're signed up! – ${sheet.title}`,
        html: `
          <div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; color: #2c2c2c;">
            <h2 style="color: #8B6914;">Senoia Area Historical Society</h2>
            <p>Hi ${data.firstName},</p>
            <p>Thank you for volunteering for <strong>${sheet.title}</strong>! Here are your signup details:</p>
            <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
              <tr><td style="padding: 8px; border: 1px solid #e0d8c0; font-weight: bold;">Role</td><td style="padding: 8px; border: 1px solid #e0d8c0;">${data.slotLabel}</td></tr>
              ${data.slotTimeNote ? `<tr><td style="padding: 8px; border: 1px solid #e0d8c0; font-weight: bold;">Time</td><td style="padding: 8px; border: 1px solid #e0d8c0;">${data.slotTimeNote}</td></tr>` : ''}
              ${slot.shiftDuration ? `<tr><td style="padding: 8px; border: 1px solid #e0d8c0; font-weight: bold;">Duration</td><td style="padding: 8px; border: 1px solid #e0d8c0;">${slot.shiftDuration}</td></tr>` : ''}
              ${eventDateStr ? `<tr><td style="padding: 8px; border: 1px solid #e0d8c0; font-weight: bold;">Date</td><td style="padding: 8px; border: 1px solid #e0d8c0;">${eventDateStr}</td></tr>` : ''}
              ${sheet.eventLocation ? `<tr><td style="padding: 8px; border: 1px solid #e0d8c0; font-weight: bold;">Location</td><td style="padding: 8px; border: 1px solid #e0d8c0;">${sheet.eventLocation}</td></tr>` : ''}
            </table>
            <p>We look forward to seeing you there! If you have any questions, please contact us at <a href="mailto:info@senoiahistory.com">info@senoiahistory.com</a>.</p>
            <p style="color: #888; font-size: 13px; margin-top: 32px;">Senoia Area Historical Society &bull; Senoia, GA</p>
          </div>
        `,
      },
    });
  } catch (emailErr) {
    // Don't fail the signup if the email write fails
    console.warn('Confirmation email could not be queued:', emailErr);
  }
}

/** Fetch all registrations for a sheet (admin) */
export async function getRegistrations(sheetId: string): Promise<VolunteerRegistration[]> {
  try {
    const q = query(
      collection(db, 'volunteer_sheets', sheetId, 'registrations'),
      orderBy('signedUpAt', 'asc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as VolunteerRegistration));
  } catch (err) {
    console.error('Error fetching registrations:', err);
    return [];
  }
}

/** Cancel a registration (admin) */
export async function updateRegistrationStatus(
  sheetId: string,
  regId: string,
  status: 'confirmed' | 'cancelled'
): Promise<void> {
  const regRef = doc(db, 'volunteer_sheets', sheetId, 'registrations', regId);

  // If cancelling, decrement filledCount on the slot
  if (status === 'cancelled') {
    const regSnap = await getDoc(regRef);
    if (regSnap.exists()) {
      const reg = regSnap.data() as VolunteerRegistration;
      const slotDocRef = doc(db, 'volunteer_sheets', sheetId, 'slots', reg.slotId);
      await runTransaction(db, async (tx) => {
        const slotSnap = await tx.get(slotDocRef);
        if (slotSnap.exists()) {
          const currentCount = slotSnap.data().filledCount || 0;
          tx.update(slotDocRef, { filledCount: Math.max(0, currentCount - 1) });
        }
        tx.update(regRef, { status: 'cancelled' });
      });
      return;
    }
  }

  await updateDoc(regRef, { status });
}
