#!/usr/bin/env node
/**
 * Drives `stripeWebhook` against the Firebase emulators with genuinely signed Stripe
 * events, so fulfillment can be verified end to end without a card or the Stripe CLI.
 *
 * The signature is produced by the Stripe SDK's own `generateTestHeaderString` — the
 * same mechanism `stripe listen` uses — so `constructEvent` inside the function does
 * real verification. A 400 here means the payload was not signed correctly; a 200 or 500
 * means the request reached the fulfillment logic.
 *
 * What it exists to prove, none of which a unit test can:
 *   • a paid ticket lands in Firestore and bumps `ticketsSold`
 *   • replaying the same session neither duplicates the ticket nor bumps again
 *   • a write that cannot succeed answers 5xx, so Stripe retries instead of dropping it
 *
 * ── Before running: create functions/.secret.local ────────────────────────────────
 * It is gitignored, so it does not exist in a fresh clone, and without it the functions
 * emulator fetches the REAL secrets from Secret Manager — signatures would have to match
 * the production signing secret, and the membership path would send a welcome email
 * through the live Resend account. Every value must be NON-EMPTY: an empty one is
 * ignored and silently falls back to Secret Manager.
 *
 *     STRIPE_SECRET_KEY=sk_test_mock
 *     STRIPE_WEBHOOK_SECRET=whsec_mock
 *     RESEND_API_KEY=re_emulator_disabled_not_a_real_key
 *     RESEND_AUDIENCE_ID=aud_emulator_disabled
 *
 * Then: cd functions && npm run build   (functions do not hot-reload)
 *       npx firebase emulators:start --only functions,firestore --project sahs-archives
 *
 * Usage:
 *   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node scripts/replay_stripe_webhook.cjs seed
 *   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node scripts/replay_stripe_webhook.cjs send ticket
 *   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node scripts/replay_stripe_webhook.cjs show
 *
 *   send <ticket|membership|booking|unrelated> [--session ID] [--quantity N]
 *                                             [--drop FIELD] [--event-id ID]
 *   --drop omits one metadata field, to exercise a rejection path.
 */
const Stripe = require('../functions/node_modules/stripe');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

// ── Safety: this script writes test data, so it must never see production ──────────
const EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST;
if (!EMULATOR_HOST) {
    console.error('Refusing to run: FIRESTORE_EMULATOR_HOST is not set.\n' +
        'This script writes fake purchases. Set FIRESTORE_EMULATOR_HOST=127.0.0.1:8080.');
    process.exit(1);
}
if (!/^(127\.0\.0\.1|localhost|\[::1\]):/.test(EMULATOR_HOST)) {
    console.error(`Refusing to run: FIRESTORE_EMULATOR_HOST=${EMULATOR_HOST} is not local.`);
    process.exit(1);
}

const PROJECT_ID = process.env.GCLOUD_PROJECT || 'sahs-archives';
// `whsec_mock` is the fallback `stripeWebhook` uses when STRIPE_WEBHOOK_SECRET is absent,
// which is always the case in the emulator — no Secret Manager access there.
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_mock';
const FUNCTION_URL = process.env.WEBHOOK_URL ||
    `http://127.0.0.1:5001/${PROJECT_ID}/us-central1/stripeWebhook`;

// Fixed ids so `seed`, `send` and `show` agree without threading state through argv.
const POST_ID = 'verify_ticketed_event';
const BOOKING_ID = 'verify_booking';

initializeApp({ projectId: PROJECT_ID });
const db = getFirestore();
const stripe = new Stripe('sk_test_mock', { apiVersion: '2024-04-10' });

const argv = process.argv.slice(2);
const flag = (name, fallback = undefined) => {
    const i = argv.indexOf(`--${name}`);
    return i === -1 ? fallback : argv[i + 1];
};

// ── seed ───────────────────────────────────────────────────────────────────────────
async function seed() {
    await db.collection('posts').doc(POST_ID).set({
        title: 'Verification Event',
        slug: 'verification-event',
        status: 'published',
        type: 'event',
        ticketPrice: 2500,
        ticketsSold: 0,
        // Far enough out that `onPostWritten`'s isLongPast guard does not suppress it,
        // and `getEventsSplit` files it as upcoming.
        eventStartDate: '2027-07-04T18:00',
        content: '<p>Seeded by replay_stripe_webhook.cjs</p>',
    });
    await db.collection('bookings').doc(BOOKING_ID).set({
        organization: 'Verification Society',
        contactName: 'Test Booker',
        email: 'booker@example.com',
        date: '2027-07-04',
        startTime: '10:00',
        endTime: '12:00',
        purpose: 'Verifying webhook fulfillment',
        status: 'pending',
        submittedAt: FieldValue.serverTimestamp(),
    });
    console.log(`seeded posts/${POST_ID} (ticketsSold: 0) and bookings/${BOOKING_ID} (pending)`);
}

// ── send ───────────────────────────────────────────────────────────────────────────
function buildSession(kind, sessionId) {
    // --no-email strips both address fields, to prove a paid ticket is still recorded
    // when Stripe sends no email (a ticket is redeemed by confirmation number).
    const anonymous = argv.includes('--no-email');
    const base = {
        id: sessionId,
        object: 'checkout_session',
        amount_total: 5000,
        customer_email: anonymous ? null : 'buyer@example.com',
        customer_details: anonymous ? null : { name: 'Cat Nolan', email: 'buyer@example.com' },
        payment_intent: 'pi_test_verify',
        payment_status: 'paid',
    };
    const metadata = {
        ticket: {
            type: 'ticket',
            eventId: flag('event-id', POST_ID),
            eventTitle: 'Verification Event',
            customerName: 'Cat Nolan',
            quantity: flag('quantity', '2'),
        },
        membership: {
            type: 'membership',
            level: 'family',
            quantity: flag('quantity', '1'),
            userId: '',
        },
        booking: { bookingId: flag('booking-id', BOOKING_ID) },
        unrelated: { type: 'donation' },
    }[kind];

    if (!metadata) {
        console.error(`Unknown kind '${kind}'. Use ticket, membership, booking or unrelated.`);
        process.exit(1);
    }

    const drop = flag('drop');
    if (drop) {
        delete metadata[drop];
        console.log(`(dropped metadata.${drop} to exercise a rejection path)`);
    }

    return { ...base, metadata };
}

async function send(kind) {
    const sessionId = flag('session', `cs_test_${kind}_verify`);
    const payload = JSON.stringify({
        id: `evt_test_${Date.now()}`,
        object: 'event',
        // Overridable so the "acknowledge, don't fail, events that aren't ours" path can
        // be exercised: the endpoint may be subscribed to more than one event type, and
        // 5xx-ing on those invites Stripe to disable it.
        type: flag('event-type', 'checkout.session.completed'),
        data: { object: buildSession(kind, sessionId) },
    });

    const signature = stripe.webhooks.generateTestHeaderString({
        payload,
        secret: WEBHOOK_SECRET,
    });

    const res = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Stripe-Signature': signature },
        body: payload,
    });
    const body = await res.text();

    console.log(`POST ${kind} session=${sessionId}`);
    console.log(`  → HTTP ${res.status} ${body}`);
    // The point of the whole change: Stripe retries a 5xx and never retries a 2xx.
    console.log(res.status >= 500
        ? '  → 5xx: Stripe WILL retry this event.'
        : '  → 2xx: Stripe considers this delivered and will NOT retry.');
}

// ── show ───────────────────────────────────────────────────────────────────────────
async function show() {
    const post = await db.collection('posts').doc(POST_ID).get();
    console.log(`posts/${POST_ID}.ticketsSold = ${post.exists ? post.get('ticketsSold') : '(missing)'}`);

    for (const name of ['tickets', 'memberships']) {
        const snap = await db.collection(name).get();
        console.log(`${name}: ${snap.size} doc(s)`);
        snap.forEach((d) => {
            const v = d.data();
            const detail = name === 'tickets'
                ? `qty=${v.quantity} confirmation=${v.confirmationNumber} qr=${v.qrCode ? `${v.qrCode.length}B` : 'none'}`
                : `level=${v.level} emailSentAt=${v.welcomeEmailSentAt} emailError=${v.welcomeEmailError}`;
            console.log(`  ${d.id}  ${detail}`);
        });
    }

    const booking = await db.collection('bookings').doc(BOOKING_ID).get();
    console.log(booking.exists
        ? `bookings/${BOOKING_ID}: status=${booking.get('status')} paymentIntentId=${booking.get('paymentIntentId') ?? null}`
        : `bookings/${BOOKING_ID}: (missing)`);
}

// ── dispatch ───────────────────────────────────────────────────────────────────────
const [command, kind] = argv;
const run = { seed, show, send: () => send(kind) }[command];
if (!run) {
    console.error('Usage: replay_stripe_webhook.cjs <seed|send|show> [kind] [flags]');
    process.exit(1);
}
run().then(() => process.exit(0)).catch((err) => {
    console.error(err);
    process.exit(1);
});
