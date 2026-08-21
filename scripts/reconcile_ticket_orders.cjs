#!/usr/bin/env node
/**
 * Finds paid ticket orders that Stripe collected money for but Firestore never
 * recorded, and — with --write — creates the missing ticket documents.
 *
 * Why these exist: `stripeWebhook` used to wrap fulfillment in a `catch` that only
 * logged, then answer Stripe 200 unconditionally. Stripe recorded a successful
 * delivery and never retried, so any throw on the way to the write destroyed the order.
 * ~25 buyers paid and never got a confirmation number. That handler is fixed; this
 * script recovers the orders it already lost. Stripe is the system of record here —
 * a completed, paid Checkout Session with no ticket document is, by definition, an
 * order we owe someone.
 *
 * ── The trap this script is built around ──────────────────────────────────────────
 * Tickets written BEFORE the fix used `.add()`, so they carry an auto-generated
 * document id and record the session only in a `stripeSessionId` field. Tickets
 * written after use `tickets/{session.id}`. An existence check that looks only at
 * `tickets/{session.id}` therefore misses every historical ticket and would duplicate
 * all of them. This script indexes the whole collection by `stripeSessionId` (falling
 * back to the doc id) and matches on that.
 *
 * Safe to re-run: writes are keyed by session id and skipped when already present.
 *
 * ── Usage ────────────────────────────────────────────────────────────────────────
 *   # Audit only — reads Stripe and Firestore, writes nothing:
 *   STRIPE_SECRET_KEY=sk_live_... node scripts/reconcile_ticket_orders.cjs
 *
 *   # Audit, then create the missing ticket documents:
 *   STRIPE_SECRET_KEY=sk_live_... node scripts/reconcile_ticket_orders.cjs --write
 *
 *   Flags:
 *     --write            create the missing ticket docs (omit for a dry run)
 *     --send-emails      also email each recovered buyer their confirmation number and
 *                        QR code (requires --write and RESEND_API_KEY). Deliberately
 *                        opt-in and separate from --write: creating records is
 *                        reversible, contacting ~24 customers is not. Requires a built
 *                        functions/lib — run `cd functions && npm run build` first.
 *     --since YYYY-MM-DD only consider sessions created on/after this date
 *     --csv FILE         write the recovered orders to FILE for notifying buyers
 *     --recount          reset ticketsSold on affected events to the true sum
 *     --fixture FILE     read sessions from a local JSON array instead of Stripe
 *                        (used to verify this script against the emulator)
 *
 * Targets production Firestore unless FIRESTORE_EMULATOR_HOST is set. The target is
 * printed before anything happens.
 */
const fs = require('fs');
const path = require('path');
const { createRequire } = require('module');

// `stripe`, `qrcode` and `firebase-admin` are dependencies of the functions package, not
// the site package. Prefer this checkout's copy and fall back to the main checkout's, so
// this runs from a git worktree that has no node_modules of its own. (Same approach as
// scripts/backfill_missed_ticket.cjs.)
const FUNCTIONS_DIR = [
    path.join(__dirname, '..', 'functions'),
    path.join(__dirname, '..', '..', '..', '..', 'functions'),
].find((dir) => fs.existsSync(path.join(dir, 'node_modules', 'firebase-admin')));

if (!FUNCTIONS_DIR) {
    console.error('Could not find functions/node_modules. Run `npm install` in functions/ first.');
    process.exit(1);
}

// Resolved as though from inside functions/, so `exports` subpaths like
// `firebase-admin/app` resolve — a bare path.join() cannot.
const req = createRequire(path.join(FUNCTIONS_DIR, 'package.json'));
const Stripe = req('stripe');
const QRCode = req('qrcode');
const { initializeApp } = req('firebase-admin/app');
const { getFirestore } = req('firebase-admin/firestore');

const argv = process.argv.slice(2);
const has = (name) => argv.includes(`--${name}`);
const val = (name, fallback) => {
    const i = argv.indexOf(`--${name}`);
    return i === -1 ? fallback : argv[i + 1];
};

const WRITE = has('write');
const SEND_EMAILS = has('send-emails');
const RECOUNT = has('recount');
const FIXTURE = val('fixture');
const CSV_PATH = val('csv');
const SINCE = val('since');
const PROJECT_ID = process.env.GCLOUD_PROJECT || 'sahs-archives';
const TARGET = process.env.FIRESTORE_EMULATOR_HOST
    ? `EMULATOR ${process.env.FIRESTORE_EMULATOR_HOST}`
    : `PRODUCTION (${PROJECT_ID})`;

if (!FIXTURE && !process.env.STRIPE_SECRET_KEY) {
    console.error('STRIPE_SECRET_KEY not set. Stripe is the source of truth for which\n' +
        'orders were paid — without it there is nothing to reconcile against.\n' +
        'Pass --fixture FILE to run against a local session list instead.');
    process.exit(1);
}

initializeApp({ projectId: PROJECT_ID });
const db = getFirestore();

/** null in --fixture mode, where there is no Stripe to talk to. */
const stripe = FIXTURE ? null : new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-04-10' });

/**
 * The webhook's own email code, loaded from the compiled output so a recovered buyer gets
 * a byte-identical email to a live purchaser — a second copy of the template here would
 * drift from the real one the moment either changed.
 */
let ticketEmail = null;
if (SEND_EMAILS) {
    if (!WRITE) {
        console.error('--send-emails requires --write: there is nothing to send until the tickets exist.');
        process.exit(1);
    }
    const compiled = path.join(FUNCTIONS_DIR, 'lib', 'ticketEmail.js');
    if (!fs.existsSync(compiled)) {
        console.error(`Missing ${compiled}. Run \`cd functions && npm run build\` first.`);
        process.exit(1);
    }
    ticketEmail = req('./lib/ticketEmail.js');
    if (!process.env.RESEND_API_KEY) {
        console.error('--send-emails needs RESEND_API_KEY, or every send is silently skipped.');
        process.exit(1);
    }
}

/** Matches `generateConfirmationNumber` in functions/src/index.ts. */
function generateConfirmationNumber() {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
}

/** Matches `generateQRCode` in functions/src/index.ts, so scanners behave identically. */
function generateQRCode(text) {
    return QRCode.toDataURL(text, {
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 300,
        color: { dark: '#2c2c2c', light: '#fffdf8' },
    });
}

/**
 * Whether a session is an order we owe a ticket for.
 *
 * Deliberately outside the loader so the Stripe path and the --fixture path apply the
 * SAME test — an earlier version filtered inside the Stripe branch only, which left the
 * fixture path (the one used to verify this script) happy to turn an abandoned cart and
 * a membership purchase into tickets. `complete` + `paid` is the money test: an expired
 * or unpaid session is not an order and must never become a ticket.
 */
function isPaidTicketSession(session) {
    return session.metadata?.type === 'ticket'
        && session.status === 'complete'
        && session.payment_status === 'paid';
}

/**
 * Cents refunded against a session, or 0.
 *
 * `payment_status` is NOT sufficient on its own: it stays `'paid'` after a refund,
 * because the refund lives on the Charge, not the Session. Without this check the
 * backfill happily issues a ticket for an order that was already refunded — and that is
 * not hypothetical here, since this incident involves duplicate charges being cleaned up.
 *
 * One extra API call per candidate order, which is fine at this volume and avoids the
 * fragile deep `expand` a list call would need.
 */
async function refundedCentsFor(session, stripe) {
    // Fixture mode has no Stripe to ask; `_refundedCents` lets the tests exercise this
    // branch. Real sessions never carry that field.
    if (!stripe) return session._refundedCents || 0;

    const paymentIntentId = typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id;
    if (!paymentIntentId) return 0;

    const refunds = await stripe.refunds.list({ payment_intent: paymentIntentId, limit: 100 });
    return refunds.data
        .filter((r) => r.status === 'succeeded' || r.status === 'pending')
        .reduce((sum, r) => sum + (r.amount || 0), 0);
}

/** Every ticket Checkout Session Stripe considers paid, oldest first. */
async function loadPaidTicketSessions() {
    let all;
    let source;

    if (FIXTURE) {
        all = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
        source = `fixture ${FIXTURE}`;
    } else {
        const query = { limit: 100 };
        if (SINCE) {
            const gte = Math.floor(new Date(`${SINCE}T00:00:00Z`).getTime() / 1000);
            if (Number.isNaN(gte)) { console.error(`--since ${SINCE} is not a date`); process.exit(1); }
            query.created = { gte };
        }
        // Stripe cannot filter by metadata, so every session is paged through.
        all = [];
        for await (const session of stripe.checkout.sessions.list(query)) all.push(session);
        source = 'Stripe';
    }

    const sessions = all.filter(isPaidTicketSession);
    console.log(`Scanned ${all.length} Checkout Session(s) from ${source}; ` +
        `${sessions.length} are paid ticket orders ` +
        `(${all.length - sessions.length} skipped: not tickets, unpaid, or abandoned).`);
    return sessions.sort((a, b) => (a.created || 0) - (b.created || 0));
}

/**
 * Session ids already represented in Firestore.
 *
 * Reads the whole `tickets` collection once rather than querying per session: it is a
 * few hundred documents at most, and one pass is both faster and immune to the auto-id
 * vs session-id split described in the header.
 */
async function loadRecordedSessionIds() {
    const snap = await db.collection('tickets').get();
    const ids = new Set();
    let legacy = 0;
    snap.forEach((doc) => {
        const sessionId = doc.get('stripeSessionId');
        if (sessionId) {
            ids.add(sessionId);
            if (doc.id !== sessionId) legacy++;
        } else {
            // No stripeSessionId at all — fall back to the doc id, which is the session
            // id for anything written by the current handler.
            ids.add(doc.id);
        }
    });
    console.log(`Firestore holds ${snap.size} ticket doc(s), covering ${ids.size} session(s) ` +
        `(${legacy} with a pre-fix auto-id).`);
    return ids;
}

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://senoiahistory.com';

/** Post lookups are cached: one event accounts for most of the backlog. */
const postCache = new Map();
async function postFor(eventId) {
    if (!eventId) return undefined;
    if (!postCache.has(eventId)) {
        const snap = await db.collection('posts').doc(eventId).get();
        postCache.set(eventId, snap.exists ? snap.data() : undefined);
    }
    return postCache.get(eventId);
}

const fmtMoney = (cents) => `$${((cents || 0) / 100).toFixed(2)}`;
const fmtDate = (unix) => (unix ? new Date(unix * 1000).toISOString().slice(0, 10) : '—');

function describe(session) {
    const m = session.metadata || {};
    return {
        sessionId: session.id,
        email: session.customer_email || session.customer_details?.email || '',
        customerName: m.customerName || session.customer_details?.name || '',
        eventId: m.eventId || '',
        eventTitle: m.eventTitle || '',
        quantity: Number.parseInt(m.quantity || '1', 10) || 1,
        totalAmount: session.amount_total || 0,
        created: session.created,
    };
}

async function main() {
    console.log(`\nTarget: ${TARGET}`);
    console.log(WRITE ? 'Mode:   WRITE — missing tickets will be created.'
                      : 'Mode:   dry run — nothing will be written. Pass --write to fix.');
    console.log('');

    const [sessions, recorded] = await Promise.all([loadPaidTicketSessions(), loadRecordedSessionIds()]);
    const unrecorded = sessions.filter((s) => !recorded.has(s.id));

    // Refunds are checked only for orders we might actually write, to keep the number of
    // Stripe calls proportional to the work rather than to the account's history.
    const missing = [];
    const refunded = [];
    for (const session of unrecorded) {
        const refundedCents = await refundedCentsFor(session, stripe);
        if (refundedCents > 0) {
            refunded.push({ ...describe(session), refundedCents });
        } else {
            missing.push(describe(session));
        }
    }

    if (refunded.length) {
        // Surfaced rather than silently dropped: a partial refund may mean some of the
        // order still stands, which is a judgment call for a human, not this script.
        console.log(`\n${refunded.length} unrecorded order(s) SKIPPED as refunded — review these by hand:\n`);
        for (const o of refunded) {
            console.log(`  ${fmtDate(o.created)}  ${fmtMoney(o.totalAmount)} paid, ` +
                `${fmtMoney(o.refundedCents)} refunded  ${o.email}  ${o.sessionId}`);
        }
    }

    if (missing.length === 0) {
        console.log('\nNo unrecorded paid ticket orders. Nothing to recover.');
        return;
    }

    console.log(`\n${missing.length} PAID ORDER(S) WITH NO TICKET RECORD\n`);
    console.log('date        qty  amount    event                          buyer');
    console.log('─'.repeat(100));
    for (const o of missing) {
        console.log(
            `${fmtDate(o.created)}  ${String(o.quantity).padStart(3)}  ` +
            `${fmtMoney(o.totalAmount).padStart(8)}  ${(o.eventTitle || '(unknown)').slice(0, 29).padEnd(29)}  ` +
            `${o.customerName} <${o.email}>`
        );
    }
    const owed = missing.reduce((n, o) => n + o.quantity, 0);
    console.log('─'.repeat(100));
    console.log(`${owed} ticket(s) across ${missing.length} order(s), ` +
        `${fmtMoney(missing.reduce((n, o) => n + o.totalAmount, 0))} collected.`);

    if (!WRITE) {
        console.log('\nDry run — nothing written. Re-run with --write to create these records.');
        return;
    }

    console.log('\nCreating ticket records…');
    const created = [];
    for (const order of missing) {
        const confirmationNumber = generateConfirmationNumber();
        const qrCode = await generateQRCode(confirmationNumber);
        const ref = db.collection('tickets').doc(order.sessionId);

        // Transaction + existence check so a re-run, or a webhook retry landing at the
        // same moment, cannot produce a second ticket for one order.
        const outcome = await db.runTransaction(async (tx) => {
            if ((await tx.get(ref)).exists) return 'skipped';
            tx.set(ref, {
                eventId: order.eventId,
                eventTitle: order.eventTitle,
                customerName: order.customerName,
                email: order.email,
                quantity: order.quantity,
                totalAmount: order.totalAmount,
                status: 'paid',
                confirmationNumber,
                qrCode,
                stripeSessionId: order.sessionId,
                // The original purchase time from Stripe, not now — the door list and
                // any revenue report should reflect when the buyer actually paid.
                purchasedAt: new Date((order.created || 0) * 1000).toISOString(),
                // Marks this as recovered rather than fulfilled live, so the gap stays
                // auditable after the fact.
                recoveredBy: 'reconcile_ticket_orders.cjs',
                recoveredAt: new Date().toISOString(),
            });
            return 'created';
        });

        if (outcome !== 'created') {
            console.log(`  – ${order.sessionId}  already present, skipped`);
            continue;
        }

        created.push({ ...order, confirmationNumber });
        console.log(`  ✔ ${order.sessionId}  ${confirmationNumber}  ${order.email}`);

        if (!ticketEmail) continue;

        // Sent per order rather than batched at the end, so an interrupted run leaves
        // every buyer it reached already emailed and recorded — and a re-run skips them,
        // because their ticket now exists.
        try {
            const post = await postFor(order.eventId);
            const delivery = await ticketEmail.sendTicketConfirmation({
                email: order.email,
                customerName: order.customerName,
                eventTitle: order.eventTitle,
                quantity: order.quantity,
                confirmationNumber,
                qrCode,
                sessionId: order.sessionId,
                eventWhen: ticketEmail.formatEventWhen(post),
                eventLocation: ticketEmail.resolveEventLocation(post),
            }, FRONTEND_URL);
            if (delivery === 'sent') {
                await ref.update({ confirmationEmailSentAt: new Date().toISOString() });
            }
            console.log(`      email ${delivery} → ${order.email}`);
        } catch (err) {
            // Non-fatal: the ticket is what the buyer needs, and the CSV still lists them
            // so a failed address can be handled by hand.
            const message = err instanceof Error ? err.message : String(err);
            console.error(`      email FAILED → ${order.email}: ${message}`);
            await ref.update({ confirmationEmailError: message }).catch(() => undefined);
        }
    }

    console.log(`\nCreated ${created.length} ticket record(s).`);

    if (CSV_PATH && created.length) {
        const rows = [
            'email,name,event,quantity,amount,confirmationNumber,purchasedAt,stripeSessionId',
            ...created.map((o) => [
                o.email, o.customerName, o.eventTitle, o.quantity,
                (o.totalAmount / 100).toFixed(2), o.confirmationNumber,
                fmtDate(o.created), o.sessionId,
            ].map((f) => `"${String(f).replace(/"/g, '""')}"`).join(',')),
        ].join('\n');
        fs.writeFileSync(path.resolve(CSV_PATH), `${rows}\n`);
        console.log(`Wrote ${created.length} row(s) to ${CSV_PATH} — use it to notify these buyers.`);
    }

    // ticketsSold was never incremented for these orders, since the throw happened
    // before any write. Recomputed from the tickets themselves rather than incremented,
    // so running this twice cannot inflate the count.
    if (RECOUNT) {
        const eventIds = [...new Set(created.map((o) => o.eventId).filter(Boolean))];
        console.log(`\nRecounting ticketsSold on ${eventIds.length} event(s)…`);
        for (const eventId of eventIds) {
            const snap = await db.collection('tickets').where('eventId', '==', eventId).get();
            const sold = snap.docs
                .filter((d) => d.get('status') !== 'cancelled')
                .reduce((n, d) => n + (d.get('quantity') || 0), 0);
            const postRef = db.collection('posts').doc(eventId);
            if (!(await postRef.get()).exists) {
                console.log(`  – ${eventId}: post missing, skipped`);
                continue;
            }
            await postRef.update({ ticketsSold: sold });
            console.log(`  ✔ ${eventId}: ticketsSold = ${sold}`);
        }
    } else if (created.length) {
        console.log('\nticketsSold was NOT adjusted — pass --recount to reconcile event counts.');
    }
}

main().then(() => process.exit(0)).catch((err) => {
    console.error('\nReconciliation failed:', err);
    process.exit(1);
});
