#!/usr/bin/env node
/**
 * Backfills a `tickets` record for a Stripe Checkout Session that was paid but
 * never processed, because `stripeWebhook` was never invoked (no live-mode
 * webhook endpoint was registered in Stripe, so `checkout.session.completed`
 * was never delivered — see the incident notes in the PR description).
 *
 * Writes the ticket doc in the exact shape `stripeWebhook` would have written
 * it, and increments `ticketsSold` on the event post in the same transaction.
 *
 * Idempotent: refuses to write if a ticket already exists for the session, so
 * it is safe to run after Stripe's "Resend" has replayed the same event.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=~/.config/gcloud/sahs-firebase-deploy.json \
 *   node scripts/backfill_missed_ticket.cjs \
 *     --session cs_live_... --event <postId> --email a@b.com \
 *     --name "Full Name" --quantity 2 --amount 10000 \
 *     --purchased-at 2026-08-20T13:23:40Z [--dry-run]
 *
 * --amount is in cents, matching Stripe's `amount_total` and the stored
 * `totalAmount`. --purchased-at should be the session's Stripe creation time,
 * not now: the whole point of a backfill is to record when they actually paid.
 */
const fs = require('fs');
const path = require('path');
const { createRequire } = require('module');

// `firebase-admin` and `qrcode` are dependencies of the functions package, not
// the site package. Prefer this checkout's own copy; fall back to the main
// checkout's when running from a git worktree, which has no node_modules.
const FUNCTIONS_DIR = [
  path.join(__dirname, '..', 'functions'),
  path.join(__dirname, '..', '..', '..', '..', 'functions'),
].find(dir => fs.existsSync(path.join(dir, 'node_modules', 'firebase-admin')));

if (!FUNCTIONS_DIR) {
  console.error('Could not find functions/node_modules. Run `npm install` in functions/ first.');
  process.exit(1);
}

// Resolve as though we were inside functions/, so the packages' `exports`
// subpaths (`firebase-admin/app`) resolve — a bare path.join() cannot.
const req = createRequire(path.join(FUNCTIONS_DIR, 'package.json'));
const admin = req('firebase-admin');
const { initializeApp, applicationDefault } = req('firebase-admin/app');
const { getFirestore, FieldValue } = req('firebase-admin/firestore');
const QRCode = req('qrcode');

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}
const DRY_RUN = process.argv.includes('--dry-run');

const stripeSessionId = arg('session');
const eventId         = arg('event');
const email           = arg('email');
const customerName    = arg('name', '');
const quantity        = parseInt(arg('quantity', '1'), 10);
const totalAmount     = parseInt(arg('amount', '0'), 10);
const purchasedAtRaw  = arg('purchased-at');

for (const [k, v] of Object.entries({ session: stripeSessionId, event: eventId, email })) {
  if (!v) { console.error(`Missing required --${k}`); process.exit(1); }
}
if (!Number.isInteger(quantity) || quantity < 1) { console.error('--quantity must be a positive integer'); process.exit(1); }
if (!Number.isInteger(totalAmount) || totalAmount < 0) { console.error('--amount must be a non-negative integer (cents)'); process.exit(1); }
if (purchasedAtRaw && Number.isNaN(Date.parse(purchasedAtRaw))) {
  console.error(`--purchased-at is not a parseable date: ${purchasedAtRaw}`);
  process.exit(1);
}

// Normalized so the stored value is formatted exactly like the webhook's
// `new Date().toISOString()` (millisecond precision), not the bare CLI string —
// `TicketsAdmin` and the printable ticket both parse this field.
const purchasedAt = purchasedAtRaw
  ? new Date(purchasedAtRaw).toISOString()
  : new Date().toISOString();

// Mirrors `generateConfirmationNumber` in functions/src/index.ts.
function generateConfirmationNumber() {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

// Mirrors `generateQRCode` in functions/src/index.ts — options must match, since
// the success page and the printable ticket render this data URI directly.
function generateQRCode(text) {
  return QRCode.toDataURL(text, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 300,
    color: { dark: '#2c2c2c', light: '#fffdf8' },
  });
}

if (admin.apps.length === 0) {
  initializeApp({ credential: applicationDefault(), projectId: 'sahs-archives' });
}
const db = getFirestore();

async function main() {
  const existing = await db.collection('tickets')
    .where('stripeSessionId', '==', stripeSessionId).limit(1).get();
  if (!existing.empty) {
    const doc = existing.docs[0];
    console.log(`Ticket already exists for ${stripeSessionId}: tickets/${doc.id} ` +
                `(confirmation ${doc.data().confirmationNumber}). Nothing to do.`);
    return;
  }

  const postRef = db.collection('posts').doc(eventId);
  const postSnap = await postRef.get();
  if (!postSnap.exists) { console.error(`No post ${eventId}`); process.exit(1); }
  const post = postSnap.data();

  const confirmationNumber = generateConfirmationNumber();
  const qrCode = await generateQRCode(confirmationNumber);

  const ticket = {
    eventId,
    eventTitle: post.title,
    customerName,
    email,
    quantity,
    totalAmount,
    status: 'paid',
    confirmationNumber,
    qrCode,
    stripeSessionId,
    purchasedAt,
  };

  console.log(`Event:        ${post.title} (${eventId})`);
  console.log(`Buyer:        ${customerName || '(no name)'} <${email}>`);
  console.log(`Quantity:     ${quantity}   Amount: $${(totalAmount / 100).toFixed(2)}`);
  console.log(`Purchased at: ${purchasedAt}`);
  console.log(`Confirmation: ${confirmationNumber}`);
  console.log(`ticketsSold:  ${post.ticketsSold ?? 0} -> ${(post.ticketsSold ?? 0) + quantity}` +
              (post.capacity ? ` (capacity ${post.capacity})` : ''));

  if (DRY_RUN) { console.log('\n--dry-run: nothing written.'); return; }

  // Ticket doc and the capacity counter move together — a backfill has no
  // retry harness behind it, so a partial write would go unnoticed.
  const ticketRef = db.collection('tickets').doc();
  await db.runTransaction(async (tx) => {
    tx.set(ticketRef, ticket);
    tx.update(postRef, { ticketsSold: FieldValue.increment(quantity) });
  });
  console.log(`\nWrote tickets/${ticketRef.id}`);
}

main().catch(err => { console.error(err); process.exit(1); });
