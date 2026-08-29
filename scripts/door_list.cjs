#!/usr/bin/env node
/**
 * Printable / importable door list for one event: every paid ticket order,
 * sorted alphabetically by buyer name, with a blank check-in column.
 *
 * Read-only — this never writes `ticketsSold`, ticket documents, or anything
 * else (see "Never write ticketsSold from a script" in CLAUDE.md). It only
 * queries `tickets` where `eventId` matches the post found by title.
 *
 * Matches on a case-insensitive substring of the post title, and prints every
 * matching post rather than guessing — event titles repeat year over year
 * (e.g. an annual "Yacht Rock Party" has a separate post per year). Pass
 * `--id <postId>` instead to skip title matching entirely once you know the
 * exact post id (e.g. from box_office_report.cjs).
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=~/.config/gcloud/sahs-firebase-deploy.json \
 *   node scripts/door_list.cjs --title "yacht rock 2026"
 *
 *   GOOGLE_APPLICATION_CREDENTIALS=~/.config/gcloud/sahs-firebase-deploy.json \
 *   node scripts/door_list.cjs --id AbCdEf123456
 *
 *   # Write a CSV alongside the console table:
 *   GOOGLE_APPLICATION_CREDENTIALS=~/.config/gcloud/sahs-firebase-deploy.json \
 *   node scripts/door_list.cjs --title "yacht rock 2026" --csv door-list.csv
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
const TITLE = val('title');
const POST_ID = val('id');
const CSV_PATH = val('csv');

if (!TITLE && !POST_ID) {
    console.error('Usage: node scripts/door_list.cjs --title "<substring>" | --id <postId> [--csv <path>]');
    process.exit(1);
}

const PROJECT_ID = process.env.GCLOUD_PROJECT || 'sahs-archives';
const TARGET = process.env.FIRESTORE_EMULATOR_HOST
    ? `EMULATOR ${process.env.FIRESTORE_EMULATOR_HOST}`
    : `PRODUCTION (${PROJECT_ID})`;
console.log(`Target: ${TARGET} default Firestore\n`);

initializeApp({ projectId: PROJECT_ID });
const db = getFirestore();

function csvEscape(value) {
    const s = String(value ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

(async () => {
    let posts;
    if (POST_ID) {
        const doc = await db.collection('posts').doc(POST_ID).get();
        if (!doc.exists) {
            console.log(`No post found with id "${POST_ID}".`);
            return;
        }
        posts = [{ id: doc.id, ...doc.data() }];
    } else {
        const postsSnap = await db.collection('posts').get();
        posts = [];
        postsSnap.forEach((doc) => {
            const d = doc.data();
            if ((d.title || '').toLowerCase().includes(TITLE.toLowerCase())) {
                posts.push({ id: doc.id, ...d });
            }
        });
    }

    if (posts.length === 0) {
        console.log(`No post found with "${TITLE}" in the title.`);
        return;
    }

    if (posts.length > 1) {
        console.log(`Multiple posts match — pass --id to pick one:\n`);
        posts
            .sort((a, b) => (a.eventDate?._seconds ?? 0) - (b.eventDate?._seconds ?? 0))
            .forEach((post) => {
                const eventDate = post.eventDate?._seconds
                    ? new Date(post.eventDate._seconds * 1000).toISOString()
                    : '(none)';
                console.log(`  ${post.id}  ${post.title}  [${post.slug}]  eventDate: ${eventDate}`);
            });
        return;
    }

    const post = posts[0];
    console.log(`${post.title}  [${post.slug}]`);
    console.log(`  id: ${post.id}\n`);

    const ticketsSnap = await db.collection('tickets').where('eventId', '==', post.id).get();
    const rows = [];
    let cancelledCount = 0;
    ticketsSnap.forEach((t) => {
        const td = t.data();
        if (td.status !== 'paid') { cancelledCount += 1; return; }
        rows.push({
            name: td.customerName || '(no name on file)',
            email: td.email || '',
            quantity: td.quantity || 0,
            confirmationNumber: td.confirmationNumber || '',
        });
    });

    rows.sort((a, b) => a.name.localeCompare(b.name));

    const totalTickets = rows.reduce((sum, r) => sum + r.quantity, 0);
    console.log(`${rows.length} paid orders, ${totalTickets} tickets` +
        (cancelledCount ? ` (+ ${cancelledCount} cancelled orders, excluded)` : ''));
    console.log('');

    const nameW = Math.max(4, ...rows.map((r) => r.name.length));
    const confW = Math.max(6, ...rows.map((r) => r.confirmationNumber.length));
    console.log(`${'Name'.padEnd(nameW)}  Qty  ${'Confirm#'.padEnd(confW)}  Checked in`);
    rows.forEach((r) => {
        console.log(`${r.name.padEnd(nameW)}  ${String(r.quantity).padEnd(3)}  ${r.confirmationNumber.padEnd(confW)}  [ ]`);
    });

    if (CSV_PATH) {
        const header = 'Name,Email,Quantity,ConfirmationNumber,CheckedIn';
        const lines = rows.map((r) =>
            [r.name, r.email, r.quantity, r.confirmationNumber, ''].map(csvEscape).join(',')
        );
        fs.writeFileSync(CSV_PATH, [header, ...lines].join('\n') + '\n');
        console.log(`\nWrote ${rows.length} rows to ${CSV_PATH}`);
    }
})().catch((err) => {
    console.error('Error:', err);
    process.exit(1);
});
