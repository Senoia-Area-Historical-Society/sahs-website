#!/usr/bin/env node
/**
 * Moves already-synced event posts off the meeting-room resource calendar and onto
 * the SAHS Membership Calendar.
 *
 * WHY A SCRIPT AND NOT JUST THE CODE CHANGE
 *
 * `googleCalendarEventId` on a post is scoped to the calendar the entry was minted
 * on. Repointing the constant alone strands every already-synced post, silently:
 *
 *   - Case A won't re-insert, because the post still has an id.
 *   - Cases B and C patch/delete against the NEW calendar using an id that only
 *     exists on the OLD one — a 404, swallowed by the existing try/catch.
 *
 * So the id has to be cleared. Clearing it is itself a write to the post, which
 * fires `onPostWritten`, which takes Case A (published, no calendar id) and inserts
 * a fresh entry on whatever `PUBLIC_EVENTS_CALENDAR_ID` now points at. That is the
 * whole migration: delete the stale entry, clear the field, let the trigger work.
 *
 * ORDERING — this script is useless, and quietly so, if run at the wrong time:
 *
 *   1. The deploy carrying `PUBLIC_EVENTS_CALENDAR_ID` must already be live.
 *      Run this before that and it re-inserts onto the room resource again.
 *   2. `sahs-calendar-sync@sahs-archives.iam.gserviceaccount.com` must hold
 *      "Make changes to events" (ACL role `writer`) on the Membership Calendar.
 *      Without it every insert 403s into a catch that only logs — this script
 *      reports success and nothing appears. `--check-access` verifies the grant.
 *
 * `isLongPast` suppresses re-insert for anything that started more than 48 hours
 * ago, so this only meaningfully migrates future events. Past ones have their stale
 * id cleared and no new entry created, which is the intent.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=~/.config/gcloud/sahs-firebase-deploy.json \
 *   node scripts/migrate_calendar_to_membership.cjs --check-access
 *   node scripts/migrate_calendar_to_membership.cjs --dry-run
 *   node scripts/migrate_calendar_to_membership.cjs
 */
const fs = require('fs');
const path = require('path');
const { createRequire } = require('module');

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
const { getFirestore, FieldValue } = req('firebase-admin/firestore');
const { google } = req('googleapis');

// Kept in step with functions/src/calendarIds.ts.
const PUBLIC_EVENTS_CALENDAR_ID =
  'c_8091ac457763e6b17b3b132fca317eb1f412e7a32b4dfc4803aab93b6049cbd3@group.calendar.google.com';
const ROOM_RESOURCE_CALENDAR_ID =
  'c_188962a8uva3ijbpl6cdtc9621g6m@resource.calendar.google.com';

const DRY_RUN = process.argv.includes('--dry-run');
const CHECK_ACCESS = process.argv.includes('--check-access');

initializeApp({ credential: applicationDefault() });
const db = getFirestore();

const auth = new google.auth.GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/calendar.events', 'https://www.googleapis.com/auth/calendar.readonly'],
});
const calendar = google.calendar({ version: 'v3', auth });

/**
 * Confirm the service account can actually write to the Membership Calendar.
 *
 * A read succeeding proves nothing — reader access is enough for that, and the
 * failure mode this exists to catch is precisely a grant that reads but cannot
 * write. So insert a throwaway event and delete it again.
 */
async function checkAccess() {
  const probe = {
    summary: '[migration access probe — delete me if you see this]',
    start: { dateTime: '2030-01-01T03:00:00', timeZone: 'America/New_York' },
    end: { dateTime: '2030-01-01T04:00:00', timeZone: 'America/New_York' },
  };
  try {
    const res = await calendar.events.insert({ calendarId: PUBLIC_EVENTS_CALENDAR_ID, requestBody: probe });
    await calendar.events.delete({ calendarId: PUBLIC_EVENTS_CALENDAR_ID, eventId: res.data.id });
    console.log('✓ Service account can write to the Membership Calendar.');
    return true;
  } catch (err) {
    const status = err?.response?.status ?? err?.code;
    console.error(`✗ Service account CANNOT write to the Membership Calendar (${status}).`);
    console.error('  Grant "Make changes to events" to sahs-calendar-sync@sahs-archives.iam.gserviceaccount.com.');
    console.error(`  ${err?.message ?? err}`);
    return false;
  }
}

async function main() {
  if (CHECK_ACCESS) {
    process.exit((await checkAccess()) ? 0 : 1);
  }

  // Every post still carrying an id minted against the room resource.
  const snap = await db.collection('posts').where('googleCalendarEventId', '!=', null).get();
  const posts = snap.docs.filter(d => d.data().googleCalendarEventId);

  if (posts.length === 0) {
    console.log('No posts carry a googleCalendarEventId. Nothing to migrate.');
    return;
  }

  console.log(`${posts.length} post(s) carry a calendar id.${DRY_RUN ? '  (dry run — no writes)' : ''}\n`);

  // A write grant is a precondition for the whole migration, not a per-post concern:
  // without it, clearing ids strands every post with no entry on either calendar.
  if (!DRY_RUN && !(await checkAccess())) {
    console.error('\nRefusing to clear calendar ids while the sync cannot write. Nothing changed.');
    process.exit(1);
  }

  for (const doc of posts) {
    const data = doc.data();
    const eventId = data.googleCalendarEventId;
    const label = `${doc.id} — ${data.title ?? '(untitled)'}`;

    // Only delete the room-calendar entry if it is genuinely there. A 404 here is
    // expected for anything already cleaned up by hand, and is not a failure.
    let roomEntryExists = false;
    try {
      await calendar.events.get({ calendarId: ROOM_RESOURCE_CALENDAR_ID, eventId });
      roomEntryExists = true;
    } catch (err) {
      const status = err?.response?.status ?? err?.code;
      if (status !== 404 && status !== 410) {
        console.error(`  ! ${label}: could not check room calendar (${status}) — skipping`);
        continue;
      }
    }

    if (DRY_RUN) {
      console.log(`  would clear ${label}${roomEntryExists ? ' (and delete its room-calendar entry)' : ' (no room entry — already gone)'}`);
      continue;
    }

    if (roomEntryExists) {
      try {
        await calendar.events.delete({ calendarId: ROOM_RESOURCE_CALENDAR_ID, eventId });
      } catch (err) {
        console.error(`  ! ${label}: failed to delete room-calendar entry — skipping so the id stays recoverable`);
        console.error(`    ${err?.message ?? err}`);
        continue;
      }
    }

    // This write is what re-triggers the sync. onPostWritten takes Case A and
    // inserts onto PUBLIC_EVENTS_CALENDAR_ID.
    await doc.ref.update({ googleCalendarEventId: FieldValue.delete() });
    console.log(`  ✓ ${label}`);
  }

  console.log('\nDone. Give the trigger a moment, then confirm the new entries on the Membership Calendar.');
}

main().catch(err => { console.error(err); process.exit(1); });
