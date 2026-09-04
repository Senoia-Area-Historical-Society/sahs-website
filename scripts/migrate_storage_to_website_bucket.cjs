#!/usr/bin/env node
/**
 * Moves the website's images off the shared bucket and onto `sahs-website-media`,
 * rewriting the download URLs stored on Firestore documents as it goes.
 *
 * WHY
 * ---
 * `sahs-archives.firebasestorage.app` is shared with archive-app, and both repos
 * deployed Storage rules to it, so whichever merged last owned the policy. The
 * website's `allow read: if true` reverted archive-app's per-object-ACL protection
 * for private media; archive-app's ruleset (no anonymous read) breaks the website
 * images that carry no download token. See docs/storage-bucket-separation.md.
 *
 * ORDER MATTERS
 * -------------
 * Run this BEFORE archive-app next deploys. Stored URLs are absolute, so today's
 * images keep resolving from the old bucket — but the moment archive-app's rules
 * apply there, every website image WITHOUT a `token=` query parameter stops loading.
 * Those are the ones this migration exists to rescue.
 *
 * WHAT IT TOUCHES
 * ---------------
 *   posts.mainImage / bannerImage / squareImage
 *   galleries.galleryImages[]            (string or { url })
 *   historical_places.image / images[] / photoUrl
 *
 * It copies objects (never moves), so the originals stay put and a rollback is just
 * "don't deploy the URL rewrite". It is idempotent: a URL already pointing at the new
 * bucket is skipped, so a re-run after a partial failure resumes cleanly.
 *
 * `ticketsSold` and every other counter are untouched — this only rewrites URL
 * strings, and only ones it has already copied successfully.
 *
 * USAGE
 *   GOOGLE_APPLICATION_CREDENTIALS=~/.config/gcloud/sahs-firebase-deploy.json \
 *     node scripts/migrate_storage_to_website_bucket.cjs            # dry run (default)
 *
 *   GOOGLE_APPLICATION_CREDENTIALS=... \
 *     node scripts/migrate_storage_to_website_bucket.cjs --prod     # actually do it
 *
 * Like the seed scripts, --prod is a deliberate act, not a formality: it writes to
 * production Storage and production Firestore.
 */

const admin = require('firebase-admin');
const { Storage } = require('@google-cloud/storage');

const SOURCE_BUCKET = 'sahs-archives.firebasestorage.app';
const TARGET_BUCKET = 'sahs-website-media';
const PROD = process.argv.includes('--prod');

admin.initializeApp({ projectId: 'sahs-archives' });
const db = admin.firestore();
const storage = new Storage({ projectId: 'sahs-archives' });

/**
 * Pulls the object path out of a URL pointing at `bucket`, or null if it isn't one.
 *
 * TWO shapes are in use, and missing the second is the whole reason this function has
 * a comment. A dry run found 18 URLs of the first kind and 13 of the second:
 *
 *   1. Firebase download URL — what `getDownloadURL()` returns:
 *      https://firebasestorage.googleapis.com/v0/b/<bucket>/o/<encoded path>?alt=media&token=…
 *
 *   2. Direct GCS URL — no token, therefore entirely dependent on the bucket's public
 *      read rule, which makes these exactly the ones that break when archive-app's
 *      ruleset (no anonymous read) is applied to the shared bucket:
 *      https://storage.googleapis.com/<bucket>/<path>
 *
 * Everything else — Webflow CDN URLs from the original site, site-relative paths — is
 * left alone, which is the ~92 the summary reports as untouched.
 */
function objectPathFor(url, bucket) {
  if (typeof url !== 'string') return null;

  const firebaseMarker = `/v0/b/${bucket}/o/`;
  const i = url.indexOf(firebaseMarker);
  if (i !== -1) return decodeURIComponent(url.slice(i + firebaseMarker.length).split('?')[0]);

  for (const directPrefix of [
    `https://storage.googleapis.com/${bucket}/`,
    `https://${bucket}.storage.googleapis.com/`,
  ]) {
    if (url.startsWith(directPrefix)) {
      return decodeURIComponent(url.slice(directPrefix.length).split('?')[0]);
    }
  }
  return null;
}

const stats = {
  copied: 0, alreadyThere: 0, missing: 0, urlsRewritten: 0, docsUpdated: 0, untouched: 0,
};

/**
 * Copies one object and returns the new download URL.
 *
 * A token is minted for the copy so the resulting URL authorizes itself, rather than
 * depending on the bucket's read rule — that dependency is exactly what made the
 * untokenized images fragile in the first place.
 */
async function migrateUrl(url) {
  const path = objectPathFor(url, SOURCE_BUCKET);
  if (!path) {
    if (objectPathFor(url, TARGET_BUCKET)) stats.alreadyThere++;
    else stats.untouched++;
    return null; // site-relative, external host, or already migrated
  }

  const src = storage.bucket(SOURCE_BUCKET).file(path);
  const [exists] = await src.exists();
  if (!exists) {
    console.warn(`    ⚠ source object missing, leaving URL alone: ${path}`);
    stats.missing++;
    return null;
  }

  const token = require('crypto').randomUUID();
  if (PROD) {
    await src.copy(storage.bucket(TARGET_BUCKET).file(path));
    await storage.bucket(TARGET_BUCKET).file(path).setMetadata({
      metadata: { firebaseStorageDownloadTokens: token },
    });
  }
  stats.copied++;
  return `https://firebasestorage.googleapis.com/v0/b/${TARGET_BUCKET}/o/` +
    `${encodeURIComponent(path)}?alt=media&token=${token}`;
}

/** Walks a document's image fields, returning the patch to apply (or null). */
async function patchFor(data, fields) {
  const patch = {};
  for (const field of fields) {
    const value = data[field];
    if (!value) continue;

    if (typeof value === 'string') {
      const next = await migrateUrl(value);
      if (next) { patch[field] = next; stats.urlsRewritten++; }
      continue;
    }

    if (Array.isArray(value)) {
      let changed = false;
      const out = [];
      for (const entry of value) {
        const url = typeof entry === 'string' ? entry : entry?.url;
        const next = url ? await migrateUrl(url) : null;
        if (next) {
          changed = true;
          stats.urlsRewritten++;
          out.push(typeof entry === 'string' ? next : { ...entry, url: next });
        } else {
          out.push(entry);
        }
      }
      if (changed) patch[field] = out;
    }
  }
  return Object.keys(patch).length ? patch : null;
}

async function migrateCollection(name, fields) {
  const snap = await db.collection(name).get();
  console.log(`\n${name} — ${snap.size} documents`);
  for (const doc of snap.docs) {
    const patch = await patchFor(doc.data(), fields);
    if (!patch) continue;
    console.log(`  ${doc.id}: ${Object.keys(patch).join(', ')}`);
    if (PROD) await doc.ref.update(patch);
    stats.docsUpdated++;
  }
}

(async () => {
  console.log(PROD
    ? `\n*** PROD RUN — copying to ${TARGET_BUCKET} and rewriting Firestore URLs ***`
    : `\n--- DRY RUN — nothing will be written. Pass --prod to apply. ---`);
  console.log(`    ${SOURCE_BUCKET}  ->  ${TARGET_BUCKET}`);

  await migrateCollection('posts', ['mainImage', 'bannerImage', 'squareImage']);
  await migrateCollection('galleries', ['coverImage', 'galleryImages']);
  await migrateCollection('historical_places', ['image', 'images', 'photoUrl']);

  console.log('\nSummary');
  console.log(`  objects copied           ${stats.copied}`);
  console.log(`  already on the new bucket ${stats.alreadyThere}`);
  console.log(`  source objects missing    ${stats.missing}`);
  console.log(`  URLs rewritten            ${stats.urlsRewritten}`);
  console.log(`  documents updated         ${stats.docsUpdated}`);
  console.log(`  URLs left alone           ${stats.untouched}  (site-relative or external)`);
  if (!PROD) console.log('\n  Dry run only. Re-run with --prod to apply.');
  process.exit(0);
})().catch((err) => {
  console.error('\nMigration failed:', err.message);
  process.exit(1);
});
