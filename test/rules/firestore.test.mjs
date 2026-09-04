import { beforeAll, afterAll, beforeEach, describe, it } from 'vitest';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, addDoc, getDocs, query, where, limit, runTransaction } from 'firebase/firestore';
import { ROLES, ROLE_DOCS, makeEnv, dbAs, allowed, denied } from './helpers.mjs';

/**
 * Authorization tests for `firestore.rules`.
 *
 * Every case in the "regression" describes below corresponds to a defect found in the
 * September 2026 audit. They are written as the behaviour we want, and each one failed
 * against the rules as they stood before that audit — that is the only reason to trust
 * them. A rules test written after the fix only proves the rules do what they do.
 */

let env;
const as = (seat) => dbAs(env, ROLES[seat]);

beforeAll(async () => {
  env = await makeEnv('sahs-firestore-rules', { firestore: true });
});

afterAll(async () => {
  await env?.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    for (const [email, role] of Object.entries(ROLE_DOCS)) {
      await setDoc(doc(db, 'user_roles', email), { role });
    }
    await setDoc(doc(db, 'posts/published1'), { title: 'Live', status: 'published', slug: 'live-event', type: 'event' });
    await setDoc(doc(db, 'posts/draft1'), { title: 'Embargoed', status: 'draft', slug: 'secret-santa', type: 'event' });
    await setDoc(doc(db, 'posts/archived1'), { title: 'Old', status: 'archived', slug: 'old', type: 'event' });

    await setDoc(doc(db, 'volunteer_sheets/active1'), { status: 'active', shareToken: 'tokACTIVE', title: 'Family Day' });
    await setDoc(doc(db, 'volunteer_sheets/closed1'), { status: 'closed', shareToken: 'tokCLOSED', title: 'Last Year' });
    await setDoc(doc(db, 'volunteer_sheets/active1/slots/slotA'), { label: 'Greeter', capacity: 2, filledCount: 0 });
    await setDoc(doc(db, 'volunteer_sheets/active1/slots/slotFull'), { label: 'Full', capacity: 1, filledCount: 1 });
    await setDoc(doc(db, 'volunteer_sheets/active1/registrations/r1'), { firstName: 'V', email: 'v@x.com', slotId: 'slotA', status: 'confirmed' });
    await setDoc(doc(db, 'volunteer_sheets/closed1/slots/slotOld'), { label: 'Old', capacity: 5, filledCount: 0 });

    await setDoc(doc(db, 'memberships/m1'), { email: 'member@x.com' });
    await setDoc(doc(db, 'tickets/t1'), { confirmationNumber: 'ABC123', email: 'buyer@x.com' });
    await setDoc(doc(db, 'wiki/w1'), { title: 'Internal runbook' });
    await setDoc(doc(db, 'shortlinks/sl1'), { slug: 'x', targetUrl: 'https://example.com' });
    await setDoc(doc(db, 'submissions/s1'), { name: 'Vendor', kind: 'vendor' });
    await setDoc(doc(db, 'organization_entities/o1'), { type: 'board_member', name: 'B' });
    await setDoc(doc(db, 'galleries/g1'), { title: 'Photos', sortOrder: 1 });
    await setDoc(doc(db, 'historical_places/h1'), { name: 'Carmichael House' });
  });
});

// A valid public volunteer signup: registration + the one-seat increment, atomically.
// This is exactly what `submitVolunteerSignup` in src/services/api.ts performs.
const signupTxn = (db, { sheet = 'active1', slot = 'slotA', extra = {} } = {}) =>
  runTransaction(db, async (tx) => {
    const slotRef = doc(db, `volunteer_sheets/${sheet}/slots/${slot}`);
    const snap = await tx.get(slotRef);
    tx.set(doc(collection(db, `volunteer_sheets/${sheet}/registrations`)), {
      firstName: 'Pat', lastName: 'Public', email: 'pat@example.com',
      phone: null, notes: null, slotId: slot, slotLabel: 'Greeter', slotTimeNote: null,
      status: 'confirmed', signedUpAt: new Date(), ...extra,
    });
    tx.update(slotRef, { filledCount: snap.data().filledCount + 1 });
  });

describe('regression: defects found in the September 2026 audit', () => {
  it('S1-1: an anonymous volunteer can complete a signup', async () => {
    await allowed('anon signup transaction', () => signupTxn(as('anon')));
  });

  it('S1-7: an anonymous visitor can find a sheet by its share token', async () => {
    await allowed('anon share-token lookup', () =>
      getDocs(query(collection(as('anon'), 'volunteer_sheets'),
        where('shareToken', '==', 'tokACTIVE'), where('status', '==', 'active'), limit(1))));
  });

  it('S1-5: drafts are not readable by the public, by id or by slug', async () => {
    await denied('anon get draft', () => getDoc(doc(as('anon'), 'posts/draft1')));
    await denied('anon slug query without a status filter', () =>
      getDocs(query(collection(as('anon'), 'posts'), where('slug', '==', 'secret-santa'), limit(1))));
    await denied('anon unfiltered post list', () => getDocs(collection(as('anon'), 'posts')));
  });

  it('S1-5: the public can still read published posts, by id and by the slug query NewsDetail issues', async () => {
    await allowed('anon get published', () => getDoc(doc(as('anon'), 'posts/published1')));
    await allowed('anon published slug query', () =>
      getDocs(query(collection(as('anon'), 'posts'),
        where('slug', '==', 'live-event'), where('status', '==', 'published'), limit(1))));
    await allowed('anon published list', () =>
      getDocs(query(collection(as('anon'), 'posts'), where('status', '==', 'published'))));
  });

  it('S1-5: staff can still read drafts, so admin previews and dashboard counts work', async () => {
    for (const seat of ['readOnly', 'boardMember', 'editor', 'curator', 'overrideAdmin', 'permanentAdmin']) {
      await allowed(`${seat} get draft`, () => getDoc(doc(as(seat), 'posts/draft1')));
      await allowed(`${seat} unfiltered slug query`, () =>
        getDocs(query(collection(as(seat), 'posts'), where('slug', '==', 'secret-santa'), limit(1))));
      await allowed(`${seat} draft count query`, () =>
        getDocs(query(collection(as(seat), 'posts'), where('status', '==', 'draft'))));
    }
  });

  it('S1-2: the public cannot queue mail (the Trigger Email extension relay)', async () => {
    await denied('anon mail create', () =>
      addDoc(collection(as('anon'), 'mail'), { to: 'victim@example.com', from: 'SAHS <x@senoiahistory.com>', message: { subject: 'x', html: 'x' } }));
    await denied('editor mail create', () => addDoc(collection(as('editor'), 'mail'), { to: 'a@b.com', message: {} }));
  });

  it('S2-1: an override admin can manage user roles, exactly like a permanent admin', async () => {
    for (const seat of ['overrideAdmin', 'permanentAdmin']) {
      await allowed(`${seat} lists user_roles`, () => getDocs(collection(as(seat), 'user_roles')));
      await allowed(`${seat} grants a role`, () =>
        setDoc(doc(as(seat), 'user_roles/newperson@senoiahistory.com'), { role: 'editor' }));
      await allowed(`${seat} revokes a role`, () =>
        deleteDoc(doc(as(seat), 'user_roles/newperson@senoiahistory.com')));
    }
  });

  it('S2-1: non-admins still cannot read or write anyone else\'s role', async () => {
    for (const seat of ['editor', 'curator']) {
      await denied(`${seat} lists user_roles`, () => getDocs(collection(as(seat), 'user_roles')));
      await denied(`${seat} grants a role`, () =>
        setDoc(doc(as(seat), 'user_roles/someone@senoiahistory.com'), { role: 'admin' }));
    }
    await denied('anon reads a role', () => getDoc(doc(as('anon'), 'user_roles/editor@senoiahistory.com')));
    // Self-read must survive: AuthContext reads the caller's own document on every sign-in.
    await allowed('editor reads own role', () => getDoc(doc(as('editor'), 'user_roles/editor@senoiahistory.com')));
    await allowed('read_only reads own role', () => getDoc(doc(as('readOnly'), 'user_roles/readonly@senoiahistory.com')));
  });

  it('S2-5: an editor can read the volunteer roster', async () => {
    for (const seat of ['editor', 'curator', 'overrideAdmin', 'permanentAdmin']) {
      await allowed(`${seat} reads registrations`, () =>
        getDocs(collection(as(seat), 'volunteer_sheets/active1/registrations')));
    }
    for (const seat of ['anon', 'readOnly', 'boardMember']) {
      await denied(`${seat} reads registrations`, () =>
        getDocs(collection(as(seat), 'volunteer_sheets/active1/registrations')));
    }
  });

  it('S2-6: oversized or forged public writes are rejected', async () => {
    const submission = (over) => ({
      type: 'contact', status: 'pending', submittedAt: new Date().toISOString(),
      name: 'X', email: 'x@example.com', message: 'hi', ...over,
    });
    await denied('anon 900KB submission', () =>
      addDoc(collection(as('anon'), 'submissions'), submission({ message: 'A'.repeat(900_000) })));
    await denied('anon submission with unexpected keys', () =>
      addDoc(collection(as('anon'), 'submissions'), submission({ internalNote: 'approved by me' })));
    await denied('anon submission pre-approving itself', () =>
      addDoc(collection(as('anon'), 'submissions'), submission({ status: 'approved' })));
    await denied('anon submission with an unknown type', () =>
      addDoc(collection(as('anon'), 'submissions'), submission({ type: 'refund' })));
    await denied('anon 900KB registration', () =>
      signupTxn(as('anon'), { extra: { notes: 'A'.repeat(900_000) } }));
    await denied('anon registration forging a status', () =>
      signupTxn(as('anon'), { extra: { status: 'vip' } }));
  });
});

describe('volunteer capacity: the increment is constrained, not merely permitted', () => {
  it('rejects a signup that would exceed the slot capacity', async () => {
    await denied('anon signup into a full slot', () => signupTxn(as('anon'), { slot: 'slotFull' }));
  });

  it('rejects an increment larger than one seat', async () => {
    await denied('anon jumps filledCount', () =>
      updateDoc(doc(as('anon'), 'volunteer_sheets/active1/slots/slotA'), { filledCount: 2 }));
  });

  it('rejects a bare counter write with no registration, in either direction', async () => {
    await denied('anon resets the counter', () =>
      updateDoc(doc(as('anon'), 'volunteer_sheets/active1/slots/slotA'), { filledCount: 0 }));
    await denied('anon edits the capacity', () =>
      updateDoc(doc(as('anon'), 'volunteer_sheets/active1/slots/slotA'), { capacity: 999 }));
    await denied('anon renames the slot', () =>
      updateDoc(doc(as('anon'), 'volunteer_sheets/active1/slots/slotA'), { label: 'hacked' }));
  });

  it('rejects a signup against a sheet that is not active', async () => {
    await denied('anon signs up on a closed sheet', () => signupTxn(as('anon'), { sheet: 'closed1', slot: 'slotOld' }));
    await denied('anon reads a closed sheet', () => getDoc(doc(as('anon'), 'volunteer_sheets/closed1')));
  });

  it('still lets an editor manage slots freely, including corrections downward', async () => {
    await allowed('editor edits a slot', () =>
      updateDoc(doc(as('editor'), 'volunteer_sheets/active1/slots/slotA'), { capacity: 10, label: 'Greeter (AM)' }));
    // cancelRegistration decrements; a curator must not be blocked by the public increment rule.
    await allowed('curator decrements after a cancellation', () =>
      updateDoc(doc(as('curator'), 'volunteer_sheets/active1/slots/slotFull'), { filledCount: 0 }));
  });
});

describe('public content: readable by all, writable by editors and above', () => {
  for (const [path, id] of [['galleries', 'g1'], ['historical_places', 'h1'], ['organization_entities', 'o1']]) {
    it(`${path} is world-readable and editor-writable`, async () => {
      await allowed(`anon reads ${path}`, () => getDoc(doc(as('anon'), `${path}/${id}`)));
      await allowed(`editor writes ${path}`, () => setDoc(doc(as('editor'), `${path}/new`), { name: 'x' }));
      await denied(`anon writes ${path}`, () => setDoc(doc(as('anon'), `${path}/evil`), { name: 'x' }));
      await denied(`read_only writes ${path}`, () => setDoc(doc(as('readOnly'), `${path}/evil`), { name: 'x' }));
    });
  }
});

describe('sensitive collections stay closed', () => {
  it('memberships are curator-only', async () => {
    await denied('anon reads memberships', () => getDoc(doc(as('anon'), 'memberships/m1')));
    await denied('editor reads memberships', () => getDoc(doc(as('editor'), 'memberships/m1')));
    await allowed('curator reads memberships', () => getDoc(doc(as('curator'), 'memberships/m1')));
  });

  it('tickets are staff-read, curator-write, and never public', async () => {
    await denied('anon reads tickets', () => getDoc(doc(as('anon'), 'tickets/t1')));
    // The limit-1 cursor that used to page the whole collection.
    await denied('anon limit-1 ticket query', () =>
      getDocs(query(collection(as('anon'), 'tickets'), limit(1))));
    await allowed('read_only reads tickets', () => getDoc(doc(as('readOnly'), 'tickets/t1')));
    await denied('editor cancels a ticket', () => updateDoc(doc(as('editor'), 'tickets/t1'), { status: 'cancelled' }));
    await allowed('curator cancels a ticket', () => updateDoc(doc(as('curator'), 'tickets/t1'), { status: 'cancelled' }));
  });

  it('submissions are write-only for the public', async () => {
    // The exact payload `submitApplication('vendor', …)` builds from VendorApplication.
    await allowed('anon files a vendor application', () =>
      addDoc(collection(as('anon'), 'submissions'), {
        type: 'vendor', status: 'pending', submittedAt: new Date().toISOString(),
        businessName: 'Pat’s Pies', contactName: 'Pat', email: 'pat@example.com',
        phone: '770-555-0100', website: 'https://example.com',
        productDescription: 'Hand pies and coffee.',
      }));
    // …and the contact form, which now files here instead of writing to `mail`.
    await allowed('anon files a contact message', () =>
      addDoc(collection(as('anon'), 'submissions'), {
        type: 'contact', status: 'pending', submittedAt: new Date().toISOString(),
        name: 'Pat', email: 'pat@example.com', message: 'When are you open?',
      }));
    await denied('anon reads submissions', () => getDocs(collection(as('anon'), 'submissions')));
    await allowed('curator reads submissions', () => getDocs(collection(as('curator'), 'submissions')));
  });

  it('wiki is editor-and-above only', async () => {
    await denied('anon reads wiki', () => getDoc(doc(as('anon'), 'wiki/w1')));
    await denied('read_only reads wiki', () => getDoc(doc(as('readOnly'), 'wiki/w1')));
    await allowed('editor reads wiki', () => getDoc(doc(as('editor'), 'wiki/w1')));
  });

  it('shortlinks are admin-only, including override admins', async () => {
    await denied('anon reads shortlinks', () => getDoc(doc(as('anon'), 'shortlinks/sl1')));
    await denied('curator writes a shortlink', () => setDoc(doc(as('curator'), 'shortlinks/sl2'), { slug: 'y' }));
    for (const seat of ['overrideAdmin', 'permanentAdmin']) {
      await allowed(`${seat} writes a shortlink`, () =>
        setDoc(doc(as(seat), 'shortlinks/sl3'), { slug: 'z', targetUrl: 'https://example.com' }));
    }
  });

  it('an authenticated account with no role document gets nothing', async () => {
    // The documented trap: a brand-new @senoiahistory.com Google account is not staff
    // until someone creates its user_roles document.
    const stranger = dbAs(env, 'brand-new@senoiahistory.com');
    await denied('roleless account reads wiki', () => getDoc(doc(stranger, 'wiki/w1')));
    await denied('roleless account reads tickets', () => getDoc(doc(stranger, 'tickets/t1')));
    await denied('roleless account writes a post', () => setDoc(doc(stranger, 'posts/x'), { title: 'x' }));
    await denied('roleless account reads a draft', () => getDoc(doc(stranger, 'posts/draft1')));
  });
});
