#!/usr/bin/env node
/**
 * Sends the membership welcome email to members who never received one.
 *
 * Why any of them are owed it: every real membership is bought through the Stripe
 * Pricing Table, which mints its own Checkout Session carrying no metadata. Until the
 * `mode === 'subscription'` rule was added to `classifyCheckoutSession`, `stripeWebhook`
 * classified those sessions as `unrelated` and dropped them, so `fulfillMembership` — and
 * with it `sendWelcomeEmail` — never ran for a single member. Confirmed against Resend:
 * every message ever sent from this account was a ticket confirmation.
 *
 * DRY RUN BY DEFAULT. `--send` is a real send to real people and cannot be undone.
 * The Resend client is not even constructed without it, so there is no one-line edit
 * that turns a rehearsal into 75 emails.
 *
 * Every active member gets the same letter, carrying a short note introducing the welcome
 * email as part of the 2026 digital transformation. It is deliberately not an apology: an
 * apology would have to claim the recipient was owed this letter when they joined, and the
 * welcome email did not exist before mid-2026 while most of the membership joined in 2024
 * and 2025.
 *
 * Only `active` subscriptions are mailed. Canceled and `unpaid` members are skipped: the
 * letter opens with "your ongoing support and active membership", and sending that to
 * someone whose card failed three weeks ago, or who left last year, is worse than
 * sending nothing.
 *
 * Idempotent. Each send writes `memberships/{sessionId}` with `welcomeEmailSentAt`, and
 * a subscription already carrying a `stripeSubscriptionId` record with that field set is
 * skipped — so this converges with `stripeWebhook`, which writes the same shape, and
 * neither can mail the same member twice.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=~/.config/gcloud/sahs-firebase-deploy.json \
 *   STRIPE_SECRET_KEY=sk_live_... RESEND_API_KEY=re_... \
 *     node scripts/backfill_welcome_emails.cjs [--send] [--limit N] [--only a@b.com]
 *
 * Rehearse first, then send to yourself, then send for real:
 *   node scripts/backfill_welcome_emails.cjs
 *   node scripts/backfill_welcome_emails.cjs --only you@senoiahistory.com --send
 *   node scripts/backfill_welcome_emails.cjs --send
 */
const fs = require('fs');
const path = require('path');
const { createRequire } = require('module');

// `firebase-admin`, `stripe`, `resend` and `react-email` are dependencies of the
// functions package, not the site package. Prefer this checkout's own copy; fall back to
// the main checkout's when running from a git worktree, which has no node_modules.
const FUNCTIONS_DIR = [
  path.join(__dirname, '..', 'functions'),
  path.join(__dirname, '..', '..', '..', '..', 'functions'),
].find(dir => fs.existsSync(path.join(dir, 'node_modules', 'firebase-admin')));

if (!FUNCTIONS_DIR) {
  console.error('Could not find functions/node_modules. Run `npm install` in functions/ first.');
  process.exit(1);
}

const req = createRequire(path.join(FUNCTIONS_DIR, 'package.json'));
const { initializeApp, applicationDefault } = req('firebase-admin/app');
const { getFirestore } = req('firebase-admin/firestore');
const Stripe = req('stripe');

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}

const SEND    = process.argv.includes('--send');
const ONLY    = (arg('only', '') || '').toLowerCase().trim();
// Comma-separated addresses to skip. Exists because a member's name can be wrong in
// Stripe in a way we cannot correct -- see issue #61, where a legacy Webflow integration
// reverts `customer.name` edits within seconds. Excluding them here keeps the bulk send
// clean while their letter is sent separately with the right name.
const EXCLUDE = (arg('exclude', '') || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
const LIMIT   = parseInt(arg('limit', '0'), 10) || 0;
// ISO-8601 instant to hand Resend as `scheduledAt`. Scheduling happens on Resend's side,
// not here, so the send survives this machine sleeping, the terminal closing, or the
// laptop being closed entirely -- which a local cron or a background process would not.
// Each scheduled message returns an id, recorded on the membership document, so an
// individual letter can still be cancelled before it goes out.
const SCHEDULE_AT = (arg('schedule-at', '') || '').trim();

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
const RESEND_KEY = process.env.RESEND_API_KEY;

if (!STRIPE_KEY) { console.error('STRIPE_SECRET_KEY not set'); process.exit(1); }
if (SEND && !RESEND_KEY) { console.error('RESEND_API_KEY not set — required with --send'); process.exit(1); }

// Matches the version `functions/src/index.ts` pins, so this script sees the same shape
// the deployed code does — notably `current_period_end` on the subscription itself.
const stripe = new Stripe(STRIPE_KEY, { apiVersion: '2024-04-10' });

initializeApp({ credential: applicationDefault() });
const db = getFirestore();

/** Mirrors `guessFirstName` in functions/src/checkoutFulfillment.ts: first token only. */
function guessFirstName(fullName) {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
  return parts[0] || '';
}

/** Sleep between sends — 75 emails fired at once is a spike Resend will rate-limit. */
const pause = ms => new Promise(r => setTimeout(r, ms));

async function alreadyGreeted(subscriptionId) {
  const snap = await db
    .collection('memberships')
    .where('stripeSubscriptionId', '==', subscriptionId)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return doc.data().welcomeEmailSentAt ? doc.id : null;
}

async function main() {
  console.log(`Mode:   ${SEND ? '*** LIVE SEND ***' : 'dry run (no email will be sent)'}`);
  console.log('Letter: welcome email introduced as part of the 2026 digital transformation');
  if (ONLY) console.log(`Filter: only ${ONLY}`);
  if (EXCLUDE.length) console.log(`Filter: excluding ${EXCLUDE.join(', ')}`);
  if (SCHEDULE_AT) console.log(`Schedule: queued at Resend for ${SCHEDULE_AT}`);
  console.log('');

  const subs = await stripe.subscriptions
    .list({ status: 'active', expand: ['data.customer'], limit: 100 })
    .autoPagingToArray({ limit: 5000 });

  console.log(`Found ${subs.length} active subscriptions.\n`);

  // Only constructed for a real send, so a dry run cannot possibly deliver.
  let resend = null;
  let renderWelcome = null;
  if (SEND) {
    const { Resend } = req('resend');
    const { render } = req('react-email');
    const React = req('react');
    // The compiled template — run `cd functions && npm run build` first.
    const { WelcomeEmail } = req('./lib/emails/WelcomeEmail.js');
    resend = new Resend(RESEND_KEY);
    renderWelcome = props => render(React.createElement(WelcomeEmail, props));
  }

  const stats = { sent: 0, skippedAlreadySent: 0, skippedFilter: 0, failed: 0 };
  let processed = 0;

  for (const sub of subs) {
    const customer = sub.customer;
    const email = (customer && customer.email ? customer.email : '').toLowerCase().trim();
    if (!email) {
      console.warn(`  SKIP ${sub.id}: subscription has no customer email`);
      continue;
    }
    if (ONLY && email !== ONLY) { stats.skippedFilter++; continue; }
    if (EXCLUDE.includes(email)) {
      console.log(`  SKIP ${email}: excluded via --exclude`);
      stats.skippedFilter++;
      continue;
    }
    if (LIMIT && processed >= LIMIT) break;

    const greetedDocId = await alreadyGreeted(sub.id);
    if (greetedDocId) {
      console.log(`  SKIP ${email}: already greeted (memberships/${greetedDocId})`);
      stats.skippedAlreadySent++;
      continue;
    }

    const joinedMs = sub.created * 1000;
    const firstName = guessFirstName(customer && customer.name);
    const level = sub.items.data[0] && sub.items.data[0].plan ? sub.items.data[0].plan.nickname : null;
    processed++;

    if (!SEND) {
      console.log(`  [dry-run] → ${email}  (joined ${new Date(joinedMs).toISOString().slice(0, 10)}, "Dear ${firstName || 'Friend'},")`);
      continue;
    }

    try {
      const html = await renderWelcome({ firstName, sentToExistingMember: true });
      const { data, error } = await resend.emails.send({
        from: 'Senoia Area Historical Society <membership@updates.senoiahistory.com>',
        to: email,
        subject: 'Thank You for Your SAHS Membership',
        html,
        ...(SCHEDULE_AT ? { scheduledAt: SCHEDULE_AT } : {}),
      });
      // Resend reports failures in the response body rather than by rejecting — the same
      // trap `sendWelcomeEmail` documents. Not checking `error` would log a success for
      // an email that never left.
      if (error) throw new Error(error.message);

      const now = new Date().toISOString();
      // When scheduled, this is the moment the letter actually reaches the member, and it
      // is what `alreadyGreeted` keys on -- so a re-run between now and then correctly
      // treats these members as done and cannot queue a second copy.
      const deliveryAt = SCHEDULE_AT ? new Date(SCHEDULE_AT).toISOString() : now;
      // Written in the shape `fulfillMembership` writes, keyed by a synthetic id so a
      // later real webhook delivery (keyed by session id) cannot collide with it, while
      // `stripeSubscriptionId` still makes both discoverable as the same member.
      await db.collection('memberships').doc(`backfill_${sub.id}`).set({
        email,
        level: level || 'Membership',
        quantity: sub.items.data[0] ? (sub.items.data[0].quantity || 1) : 1,
        status: 'active',
        expirationDate: sub.current_period_end
          ? new Date(sub.current_period_end * 1000).toISOString()
          : null,
        paymentId: null,
        stripeSubscriptionId: sub.id,
        userId: null,
        welcomeEmailSentAt: deliveryAt,
        welcomeEmailScheduledAt: SCHEDULE_AT ? deliveryAt : null,
        welcomeEmailResendId: (data && data.id) || null,
        welcomeEmailError: null,
        backfilledAt: now,
        updatedAt: now,
      }, { merge: true });

      console.log(`  SENT → ${email}`);
      stats.sent++;
      await pause(600);
    } catch (err) {
      console.error(`  FAIL ${email}: ${err.message}`);
      stats.failed++;
    }
  }

  console.log('\n─── Summary ───');
  console.log(`  would-send / sent   : ${SEND ? stats.sent : processed}`);
  console.log(`  skipped (greeted)   : ${stats.skippedAlreadySent}`);
  if (ONLY || EXCLUDE.length) console.log(`  skipped (filters)   : ${stats.skippedFilter}`);
  if (SEND) console.log(`  failed              : ${stats.failed}`);
  if (!SEND) console.log('\nNothing was sent. Re-run with --send to deliver.');
}

main().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
