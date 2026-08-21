#!/usr/bin/env node
/**
 * Reconciles paid Stripe Checkout Sessions into Firestore.
 *
 * Background: no webhook endpoint was ever registered in the live Stripe
 * account, so `stripeWebhook` never ran and no paid ticket or membership was
 * ever recorded. This walks the full Checkout Session history and writes the
 * records that the webhook should have written.
 *
 * Writes are keyed by Checkout Session id — the same key `applyCheckoutSession`
 * uses — so this is safe to re-run, and safe to run alongside a now-live
 * webhook: whichever gets there first wins and the other skips.
 *
 * Does NOT send any email. Confirmation emails for the backfilled buyers are a
 * deliberate, separate decision.
 *
 * Usage:
 *   STRIPE_SECRET_KEY=sk_live_... \
 *   GOOGLE_APPLICATION_CREDENTIALS=~/.config/gcloud/sahs-firebase-deploy.json \
 *     node scripts/backfill_stripe_orders.cjs [--apply]
 *
 * Defaults to a dry run. Pass --apply to write.
 */
const Stripe = require('../functions/node_modules/stripe');
const admin = require('firebase-admin');
const QRCode = require('../functions/node_modules/qrcode');

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
const APPLY = process.argv.includes('--apply');

if (!STRIPE_KEY) { console.error('STRIPE_SECRET_KEY not set'); process.exit(1); }
// Never interpolate any part of the key into output — this runs in terminals and
// CI logs, and a widened slice would leak key material.
if (!STRIPE_KEY.startsWith('sk_live_')) {
  console.warn('! STRIPE_SECRET_KEY is not a live-mode key — reconciling a test/sandbox account.');
}

const stripe = new Stripe(STRIPE_KEY, { apiVersion: '2024-04-10' });
admin.initializeApp();
const db = admin.firestore();

// Mirrors functions/src/index.ts so backfilled records are indistinguishable
// from webhook-written ones.
function generateConfirmationNumber() {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}
const generateQRCode = (text) => QRCode.toDataURL(text, {
  errorCorrectionLevel: 'M',
  margin: 2,
  width: 300,
  color: { dark: '#2c2c2c', light: '#fffdf8' },
});

async function* allPaidSessions() {
  // auto-pagination walks the entire history, oldest sessions included
  for await (const s of stripe.checkout.sessions.list({ limit: 100 })) {
    if (s.payment_status === 'paid') yield s;
  }
}

async function main() {
  console.log(APPLY ? '=== APPLYING ===' : '=== DRY RUN (pass --apply to write) ===');

  const ticketsToAdd = [];
  const membershipsToAdd = [];
  const soldByEvent = {};
  let scanned = 0, alreadyPresent = 0, skippedOther = 0;

  for await (const s of allPaidSessions()) {
    scanned++;
    const type = s.metadata?.type;
    const email = s.customer_details?.email || s.customer_email || null;

    if (type === 'ticket') {
      if ((await db.collection('tickets').doc(s.id).get()).exists) { alreadyPresent++; continue; }
      const quantity = parseInt(s.metadata?.quantity || '1');
      const eventId = s.metadata?.eventId || '';
      ticketsToAdd.push({ session: s, email, quantity, eventId });
      if (eventId) soldByEvent[eventId] = (soldByEvent[eventId] || 0) + quantity;
    } else if (type === 'membership') {
      if ((await db.collection('memberships').doc(s.id).get()).exists) { alreadyPresent++; continue; }
      membershipsToAdd.push({ session: s, email });
    } else {
      // Bookings and pre-metadata legacy sessions — reported, never guessed at.
      skippedOther++;
    }
  }

  console.log(`\nScanned ${scanned} paid sessions.`);
  console.log(`  already recorded : ${alreadyPresent}`);
  console.log(`  tickets missing  : ${ticketsToAdd.length}`);
  console.log(`  memberships miss : ${membershipsToAdd.length}`);
  console.log(`  untyped/bookings : ${skippedOther}  (not written — review by hand)`);

  const money = [...ticketsToAdd, ...membershipsToAdd]
    .reduce((sum, r) => sum + (r.session.amount_total || 0), 0);
  console.log(`  unrecorded value : $${(money / 100).toFixed(2)}\n`);

  for (const t of ticketsToAdd) {
    console.log(`  TICKET  ${new Date(t.session.created * 1000).toISOString().slice(0, 10)}  ` +
      `$${((t.session.amount_total || 0) / 100).toFixed(2)}  x${t.quantity}  ${t.email}  ` +
      `${t.session.metadata?.eventTitle || '?'}`);
  }
  for (const m of membershipsToAdd) {
    console.log(`  MEMBER  ${new Date(m.session.created * 1000).toISOString().slice(0, 10)}  ` +
      `$${((m.session.amount_total || 0) / 100).toFixed(2)}  ${m.email}  ${m.session.metadata?.level || '?'}`);
  }

  console.log('\nticketsSold to set per event:');
  for (const [eventId, qty] of Object.entries(soldByEvent)) {
    console.log(`  ${eventId}  +${qty}`);
  }

  if (!APPLY) { console.log('\nDry run — nothing written.'); return; }

  // If the webhook goes live mid-run it may write the same session first.
  // .create() throws ALREADY_EXISTS rather than overwriting, so a collision is
  // a skip, not a failure — but only the run that actually wrote the ticket may
  // count it, or ticketsSold gets incremented twice for one sale.
  const ALREADY_EXISTS = 6;
  const written = {};
  let collisions = 0, failures = 0;

  for (const t of ticketsToAdd) {
    const confirmationNumber = generateConfirmationNumber();
    try {
      await db.collection('tickets').doc(t.session.id).create({
        eventId: t.eventId,
        eventTitle: t.session.metadata?.eventTitle || '',
        customerName: t.session.metadata?.customerName || t.session.customer_details?.name || '',
        email: t.email,
        quantity: t.quantity,
        totalAmount: t.session.amount_total || 0,
        status: 'paid',
        confirmationNumber,
        qrCode: await generateQRCode(confirmationNumber),
        stripeSessionId: t.session.id,
        purchasedAt: new Date(t.session.created * 1000).toISOString(),
        backfilled: true,
      });
      if (t.eventId) written[t.eventId] = (written[t.eventId] || 0) + t.quantity;
      console.log(`  wrote ticket ${confirmationNumber} for ${t.email}`);
    } catch (err) {
      if (err.code === ALREADY_EXISTS) {
        collisions++;
        console.log(`  skipped ${t.session.id} — written by the webhook already`);
      } else {
        failures++;
        console.error(`  ! FAILED ${t.session.id} (${t.email}):`, err.message);
      }
    }
  }

  for (const m of membershipsToAdd) {
    try {
      await db.collection('memberships').doc(m.session.id).create({
        email: m.email,
        level: m.session.metadata?.level,
        quantity: parseInt(m.session.metadata?.quantity || '1'),
        status: 'active',
        // One year from the purchase, not from today — a backfill must not
        // silently extend a membership that already lapsed.
        expirationDate: new Date(m.session.created * 1000 + 365 * 24 * 60 * 60 * 1000).toISOString(),
        paymentId: m.session.id,
        userId: m.session.metadata?.userId || null,
        updatedAt: new Date().toISOString(),
        backfilled: true,
      });
      console.log(`  wrote membership for ${m.email}`);
    } catch (err) {
      if (err.code === ALREADY_EXISTS) {
        collisions++;
        console.log(`  skipped ${m.session.id} — written by the webhook already`);
      } else {
        failures++;
        console.error(`  ! FAILED ${m.session.id} (${m.email}):`, err.message);
      }
    }
  }

  // Counts only what this run actually wrote, so a webhook collision above
  // doesn't get double-counted here.
  for (const [eventId, qty] of Object.entries(written)) {
    const ref = db.collection('posts').doc(eventId);
    if (!(await ref.get()).exists) { console.warn(`  ! post ${eventId} missing — skipped`); continue; }
    await ref.update({ ticketsSold: admin.firestore.FieldValue.increment(qty) });
    console.log(`  ticketsSold += ${qty} on ${eventId}`);
  }

  console.log(`\nDone. ${collisions} skipped as already-written, ${failures} failed.`);
  if (failures) {
    console.error('Re-run to retry the failures — written records are skipped automatically.');
    process.exitCode = 1;
  }
}

// Deliberately not process.exit(0) — that would discard the exitCode set when
// individual records fail, and report a partial backfill as a clean run.
main().catch(err => { console.error(err); process.exitCode = 1; });
