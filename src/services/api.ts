import { collection, getDocs, query, orderBy, limit, where, addDoc, doc, updateDoc, getDoc, runTransaction, Timestamp, deleteDoc, serverTimestamp, type FirestoreError } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Post, Gallery, HistoricalPlace, OrganizationEntity, Membership, Ticket, VolunteerSheet, VolunteerSlot, VolunteerRegistration } from '../types/index';

// Helpers to transform Firestore docs safely
const toPost = (doc: any): Post => ({ id: doc.id, ...doc.data() } as Post);
const toGallery = (doc: any): Gallery => ({ id: doc.id, ...doc.data() } as Gallery);
const toHistoricalPlace = (doc: any): HistoricalPlace => ({ id: doc.id, ...doc.data() } as HistoricalPlace);
const toOrganizationEntity = (doc: any): OrganizationEntity => ({ id: doc.id, ...doc.data() } as OrganizationEntity);

const getFunctionsBaseUrl = () => {
  const isProd = !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1');
  return import.meta.env.VITE_FIREBASE_FUNCTIONS_URL || 
    (isProd 
      ? 'https://us-central1-sahs-archives.cloudfunctions.net' 
      : 'http://127.0.0.1:5001/sahs-archives/us-central1');
};

/**
 * When a post happened. `eventDate` is the real date for anything scheduled;
 * legacy news articles carry only a `publishDate`, and a handful of imported
 * documents carry neither, so `createdAt` is the last resort.
 */
function occurredAt(post: Post): number {
  return post.eventDate?.toMillis() || post.publishDate?.toMillis() || post.createdAt?.toMillis() || 0;
}

/**
 * Every published post, partitioned around a single midnight cutoff.
 *
 * **The split is by date, not by `type`.** There is no longer a news/event
 * distinction: the `type` field survives on legacy documents but no read path
 * branches on it. A post is `upcoming` only if it carries an `eventDate` that
 * has not passed; everything else — finished events and the pre-2025 news
 * articles alike — lands in `past` as one bucket, most recent first. An
 * undated post is therefore always past, which is what we want: it is a
 * write-up of something that already happened.
 *
 * A post can never appear in both lists. `upcoming` is soonest-first.
 */
export async function getEventsSplit(): Promise<{ upcoming: Post[]; past: Post[] }> {
  try {
    // Fetch all published posts once. Firestore requires any field used in an
    // orderBy/where-range to exist on the document, and imported posts are
    // missing fields, so the ordering and the cutoff are applied client-side.
    const q = query(collection(db, 'posts'), where('status', '==', 'published'));
    const snapshot = await getDocs(q);
    const allPosts = snapshot.docs.map(toPost);
    const cutoff = new Date();
    cutoff.setHours(0, 0, 0, 0); // An event happening today still counts as upcoming

    const upcoming = allPosts
      .filter(post => post.eventDate && post.eventDate.toDate() >= cutoff)
      .sort((a, b) => (a.eventDate?.toMillis() || 0) - (b.eventDate?.toMillis() || 0));

    const past = allPosts
      .filter(post => !post.eventDate || post.eventDate.toDate() < cutoff)
      .sort((a, b) => occurredAt(b) - occurredAt(a));

    return { upcoming, past };
  } catch (err) {
    console.error('Error fetching posts:', err);
    return { upcoming: [], past: [] };
  }
}

export async function getEvents(maxItems: number = 20): Promise<Post[]> {
  return (await getEventsSplit()).upcoming.slice(0, maxItems);
}

/** Finished events and legacy news articles, most recent first — one bucket. */
export async function getPastEvents(maxItems: number = 50): Promise<Post[]> {
  return (await getEventsSplit()).past.slice(0, maxItems);
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

// `submitMembershipRequest` was removed along with the `createMembershipCheckoutSession`
// function it POSTed to. Nothing called it: memberships are bought through the Stripe
// Pricing Table in `src/pages/Support.tsx`, which goes straight to Stripe Checkout with no
// endpoint of ours in between. See the note at the top of `functions/src/index.ts`.

/**
 * The server derives price, title and the cancel-URL slug from `posts/{eventId}`;
 * sending them from here would be decorative at best and, for `price`, a way to
 * charge whatever the browser felt like. Only the buyer's own inputs go on the wire.
 */
export async function submitTicketRequest(data: { eventId: string; quantity: number; email: string; customerName?: string }): Promise<{ url: string }> {
  try {
    const baseUrl = getFunctionsBaseUrl();
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

/**
 * Look up the buyer's ticket for a Stripe Checkout Session.
 *
 * Goes through the `getTicketBySession` Cloud Function rather than reading
 * Firestore directly: the `tickets` collection is no longer publicly readable,
 * because the rule that allowed it (`request.query.limit == 1`) let anyone page
 * through every ticket in the collection. The session id is the buyer's own
 * secret, so the function can serve them without a login.
 *
 * Returns null for a genuine miss *and* for any transport error — the caller
 * (`TicketSuccess`) polls, and deliberately treats an unresolved lookup as
 * 'pending' rather than claiming the purchase was confirmed.
 */
export async function getTicketBySessionId(sessionId: string): Promise<import('../types').Ticket | null> {
  try {
    const baseUrl = getFunctionsBaseUrl();
    const res = await fetch(`${baseUrl}/getTicketBySession?session_id=${encodeURIComponent(sessionId)}`);
    if (!res.ok) throw new Error(`Cloud function returned ${res.status}`);
    const data = await res.json();
    if (!data?.found || !data.ticket) return null;
    return data.ticket as import('../types').Ticket;
  } catch (err) {
    console.error('Error fetching ticket by session:', err);
    return null;
  }
}

export async function verifyTicketConfirmation(confirmationNumber: string): Promise<{ valid: boolean; reason?: string; ticket?: any }> {
  const baseUrl = getFunctionsBaseUrl();
  const res = await fetch(`${baseUrl}/verifyTicket?confirmationNumber=${encodeURIComponent(confirmationNumber.trim())}`);
  return res.json();
}

/**
 * Throws on failure rather than returning `[]`.
 *
 * The previous version caught everything and returned an empty array, which made
 * `MembershipsAdmin`'s error banner unreachable: a 500 from `listStripeSubscriptions`,
 * an expired Stripe key, or a network failure all rendered as the empty-state copy
 * "No membership records found matching your filters." Someone checking the roster
 * during an outage would conclude the society has no members, which is the one wrong
 * answer this page must never give. The caller already has a `catch` that surfaces the
 * message.
 */
export async function getMemberships(): Promise<Membership[]> {
  const functionsBaseUrl = getFunctionsBaseUrl();
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
}

/** Fetch all tickets (admin view). Throws on failure so the caller can surface the error. */
export async function getTickets(): Promise<Ticket[]> {
  const q = query(
    collection(db, 'tickets'),
    orderBy('purchasedAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ticket));
}

// ── Volunteer Management ──────────────────────────────────────────────────────

/** Generate a random URL-safe token for volunteer sheet share links */
function generateShareToken(): string {
  return Math.random().toString(36).substring(2, 10);
}

/** Fetch all volunteer sheets (admin view). Throws on failure so the caller can surface the error. */
export async function getVolunteerSheets(): Promise<VolunteerSheet[]> {
  const q = query(collection(db, 'volunteer_sheets'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as VolunteerSheet));
}

/** Fetch a specific volunteer sheet by ID if it's active (public). Denied/missing sheets resolve to null rather than throwing. */
export async function getVolunteerSheetById(id: string): Promise<VolunteerSheet | null> {
  try {
    const snap = await getDoc(doc(db, 'volunteer_sheets', id));
    if (!snap.exists() || snap.data().status !== 'active') return null;
    return { id: snap.id, ...snap.data() } as VolunteerSheet;
  } catch (err) {
    // Security rules only allow public reads of active sheets, so
    // permission-denied is the expected outcome for draft/closed sheets.
    if ((err as FirestoreError)?.code !== 'permission-denied') {
      console.error('Error fetching volunteer sheet by ID:', err);
    }
    return null;
  }
}

/** Fetch a single active sheet by its public share token */
export async function getVolunteerSheetByToken(token: string): Promise<VolunteerSheet | null> {
  try {
    const q = query(
      collection(db, 'volunteer_sheets'),
      where('shareToken', '==', token),
      where('status', '==', 'active'),
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
  sheet: Omit<VolunteerSheet, 'id' | 'createdAt' | 'shareToken' | 'updatedAt'>
): Promise<string> {
  const payload = {
    ...sheet,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    shareToken: generateShareToken(),
  };
  
  // Final safety check to remove any accidental undefineds
  Object.keys(payload).forEach(key => {
    if ((payload as any)[key] === undefined) delete (payload as any)[key];
  });

  const docRef = await addDoc(collection(db, 'volunteer_sheets'), payload);
  return docRef.id;
}

/** Update an existing volunteer sheet */
export async function updateVolunteerSheet(id: string, sheet: Partial<VolunteerSheet>): Promise<void> {
  const payload: any = {
    ...sheet,
    updatedAt: serverTimestamp(),
  };
  
  // Final safety check to remove any accidental undefineds
  Object.keys(payload).forEach(key => {
    if (payload[key] === undefined) delete payload[key];
  });

  await updateDoc(doc(db, 'volunteer_sheets', id), payload);
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
export async function saveVolunteerSlot(sheetId: string, slot: Partial<VolunteerSlot> & { id?: string }): Promise<void> {
  const { id, ...data } = slot;
  const payload: any = { ...data };
  
  // Remove fields that should not be in the document
  delete payload.id;
  
  // Final safety check to remove any accidental undefineds
  Object.keys(payload).forEach(key => {
    if (payload[key] === undefined) delete payload[key];
  });

  if (id && id !== '') {
    await updateDoc(doc(db, 'volunteer_sheets', sheetId, 'slots', id), payload);
  } else {
    await addDoc(collection(db, 'volunteer_sheets', sheetId, 'slots'), {
      ...payload,
      filledCount: payload.filledCount || 0,
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
