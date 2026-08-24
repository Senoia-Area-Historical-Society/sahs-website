#!/usr/bin/env node
/**
 * Read-only ticket sales report for one or more events, cross-checked two ways.
 *
 * `posts.ticketsSold` is a denormalized counter that `stripeWebhook` increments
 * inside the same transaction as each `tickets/{session.id}` write (see the
 * "stripeWebhook must answer 5xx..." gotcha in CLAUDE.md) — it should already be
 * correct, but this script never trusts a single source. It also live-sums the
 * `tickets` collection by `eventId`, counting only `status === 'paid'`, and flags
 * any mismatch between the two instead of silently picking one.
 *
 * Matches on a case-insensitive substring of the post title, and prints every
 * match rather than guessing — event titles repeat year over year (e.g. an
 * annual "Yacht Rock Party" has a separate post per year), and disambiguating by
 * `eventDate` is the caller's job, not this script's.
 *
 * This script only reads. It never writes `ticketsSold` or anything else —
 * see "Never write ticketsSold from a script" in CLAUDE.md.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=~/.config/gcloud/sahs-firebase-deploy.json \
 *   node scripts/box_office_report.cjs --title "yacht rock"
 *
 *   # Every ticketed event (ticketPrice set), regardless of title:
 *   GOOGLE_APPLICATION_CREDENTIALS=~/.config/gcloud/sahs-firebase-deploy.json \
 *   node scripts/box_office_report.cjs --all
 *
 * Targets PRODUCTION default Firestore unless FIRESTORE_EMULATOR_HOST is set.
 * The target is printed before anything runs.
 */
const fs = require('fs');
const path = require('path');
const { createRequire } = require('module');

// firebase-admin is a dependency of the functions package, not the site
// package. Prefer this checkout's copy; fall back to the main checkout's so
// this runs from a git worktree, which has no node_modules of its own.
const FUNCTIONS_DIR = [
    path.join(__dirname, '..', 'functions'),
    path.join(__dirname, '..', '..', '..', '..', 'functions'),
].find((dir) => fs.existsSync(path.join(dir, 'node_modules', 'firebase-admin')));

if (!FUNCTIONS_DIR) {
    console.error('Could not find functions/node_modules. Run `npm install` in functions/ first.');
    process.exit(1);
}

const req = createRequire(path.join(FUNCTIONS_DIR, 'package.json'));
const { initializeApp } = req('firebase-admin/app');
const { getFirestore } = req('firebase-admin/firestore');

const argv = process.argv.slice(2);
const val = (name, fallback) => {
    const i = argv.indexOf(`--${name}`);
    return i === -1 ? fallback : argv[i + 1];
};
const ALL = argv.includes('--all');
const TITLE = val('title');

if (!ALL && !TITLE) {
    console.error('Usage: node scripts/box_office_report.cjs --title "<substring>" | --all');
    process.exit(1);
}

const PROJECT_ID = process.env.GCLOUD_PROJECT || 'sahs-archives';
const TARGET = process.env.FIRESTORE_EMULATOR_HOST
    ? `EMULATOR ${process.env.FIRESTORE_EMULATOR_HOST}`
    : `PRODUCTION (${PROJECT_ID})`;
console.log(`Target: ${TARGET} default Firestore\n`);

initializeApp({ projectId: PROJECT_ID });
const db = getFirestore();

(async () => {
    const postsSnap = await db.collection('posts').get();
    const candidates = [];
    postsSnap.forEach((doc) => {
        const d = doc.data();
        if (ALL) {
            if (typeof d.ticketPrice === 'number') candidates.push({ id: doc.id, ...d });
        } else if ((d.title || '').toLowerCase().includes(TITLE.toLowerCase())) {
            candidates.push({ id: doc.id, ...d });
        }
    });

    if (candidates.length === 0) {
        console.log(ALL ? 'No ticketed events found.' : `No post found with "${TITLE}" in the title.`);
        return;
    }

    // Oldest first, so an annual event's history reads chronologically.
    candidates.sort((a, b) => (a.eventDate?._seconds ?? 0) - (b.eventDate?._seconds ?? 0));

    for (const post of candidates) {
        const eventDate = post.eventDate?._seconds
            ? new Date(post.eventDate._seconds * 1000).toISOString()
            : '(none)';

        console.log('---');
        console.log(`${post.title}  [${post.slug}]`);
        console.log(`  id: ${post.id}`);
        console.log(`  status: ${post.status}   eventDate: ${eventDate}`);
        if (typeof post.ticketPrice === 'number') {
            console.log(`  ticketPrice: $${(post.ticketPrice / 100).toFixed(2)}`);
        }

        const ticketsSnap = await db.collection('tickets').where('eventId', '==', post.id).get();
        let paidQty = 0, paidOrders = 0, cancelledQty = 0, cancelledOrders = 0;
        ticketsSnap.forEach((t) => {
            const td = t.data();
            if (td.status === 'paid') { paidQty += td.quantity || 0; paidOrders += 1; }
            else if (td.status === 'cancelled') { cancelledQty += td.quantity || 0; cancelledOrders += 1; }
        });

        const counter = post.ticketsSold ?? 0;
        console.log(`  ticketsSold (denormalized counter): ${counter}`);
        console.log(`  live sum over tickets collection: ${paidQty} paid across ${paidOrders} orders` +
            (cancelledOrders ? ` (+ ${cancelledQty} cancelled across ${cancelledOrders} orders, excluded)` : ''));
        console.log(counter === paidQty ? '  ✅ counter matches live sum' : `  ⚠️  MISMATCH: counter=${counter} live=${paidQty}`);
    }
})().catch((err) => {
    console.error('Error:', err);
    process.exit(1);
});
