#!/usr/bin/env node
// Guards against this app deploying Storage rules to, or uploading into, a bucket it
// does not own.
//
// Incident: sahs-website and SAHS-archive-app both deployed storage rules to
// `sahs-archives.firebasestorage.app`. Storage rules are per-bucket and wholly replaced
// on deploy, so whichever repo merged most recently owned the policy and silently
// discarded the other's — and the two policies are incompatible. The website's
// `allow read: if true` reverted archive-app's per-object-ACL protection for private
// media; archive-app's ruleset (no anonymous read) broke the 13 website images that
// carried no download token. It oscillated for months with nobody watching which side
// was up. See docs/storage-bucket-separation.md and AUDIT.md S1-8.
//
// The website now owns exactly one bucket. Two things must stay true, and neither has a
// visible symptom when it breaks — which is why they are checked here rather than left
// to review:
//
//   1. firebase.json must scope storage to a TARGET. A bare `{ "rules": ... }` object
//      deploys to the project's DEFAULT bucket, which is the shared one — that single
//      character of config is the whole coupling.
//   2. VITE_FIREBASE_STORAGE_BUCKET must name the website bucket, or new uploads land
//      in the shared bucket and break the next time archive-app deploys.
//   3. No script may hardcode the shared bucket. Three seed scripts still named it in
//      September 2026 — months after the separation — because each was copied from an
//      older one. Nothing was broken at the time; a `--prod` run of any of them would
//      have uploaded its event's artwork to the shared bucket and repointed the post
//      there, undoing the separation for those events with no visible symptom. The
//      shared mechanics now live in scripts/lib/seedEvent.cjs, but a library only helps
//      the scripts that use it — this check is what stops the next copy-paste.
//
// (2) is only checked when the variable is present, so local runs and PR CI — which have
// no secret — still pass. The deploy workflow sets it, which is where it matters.

const WEBSITE_BUCKET = 'sahs-website-media';
const SHARED_BUCKET = 'sahs-archives.firebasestorage.app';

const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..');
const firebaseJson = JSON.parse(fs.readFileSync(path.join(repoRoot, 'firebase.json'), 'utf8'));

const problems = [];

// ── 1. firebase.json must use a target, not the default bucket ──────────────────
const storageConfig = firebaseJson.storage;
const entries = Array.isArray(storageConfig) ? storageConfig : storageConfig ? [storageConfig] : [];

if (entries.length === 0) {
  problems.push('firebase.json has no `storage` config at all — storage rules would not deploy.');
} else {
  for (const entry of entries) {
    if (!entry.target) {
      problems.push(
        'firebase.json `storage` entry has no `target`. Without one, `firebase deploy ' +
          `--only storage\` writes rules to the project's DEFAULT bucket — ${SHARED_BUCKET}, ` +
          'which archive-app owns. Use `{ "target": "website-media", "rules": "storage.rules" }`.'
      );
    }
  }

  // The target must actually resolve to the website bucket in .firebaserc.
  const rc = JSON.parse(fs.readFileSync(path.join(repoRoot, '.firebaserc'), 'utf8'));
  const targets = rc.targets?.['sahs-archives']?.storage ?? {};
  for (const entry of entries) {
    if (!entry.target) continue;
    const buckets = targets[entry.target];
    if (!buckets) {
      problems.push(
        `firebase.json targets storage "${entry.target}", but .firebaserc has no such ` +
          'target for project sahs-archives. Run: firebase target:apply storage ' +
          `${entry.target} ${WEBSITE_BUCKET}`
      );
    } else if (buckets.includes(SHARED_BUCKET)) {
      problems.push(
        `.firebaserc binds storage target "${entry.target}" to ${SHARED_BUCKET}, the bucket ` +
          'archive-app owns. Deploying there overwrites its rules and re-exposes private media.'
      );
    }
  }
}

// ── 2. The build-time bucket must be the website's ──────────────────────────────
const envBucket = process.env.VITE_FIREBASE_STORAGE_BUCKET;
if (envBucket && envBucket !== WEBSITE_BUCKET) {
  problems.push(
    `VITE_FIREBASE_STORAGE_BUCKET is "${envBucket}", expected "${WEBSITE_BUCKET}". ` +
      'New uploads would go to the wrong bucket — silently, until archive-app next ' +
      'deploys and its rules stop serving them.'
  );
}

// ── 3. No script may hardcode the shared bucket ─────────────────────────────────
// Allowlisted by exact path, never by directory: these two legitimately name the shared
// bucket — one migrates away from it, the other is this file. A directory-shaped
// exemption would have covered nothing today and everything tomorrow.
const BUCKET_LITERAL_ALLOWED = new Set([
  'scripts/migrate_storage_to_website_bucket.cjs',
  'scripts/check-storage-bucket-target.cjs',
]);

/**
 * Drop comments so prose about the shared bucket does not trip the check.
 *
 * Deliberately conservative: block comments, and lines that *begin* with `//` or `*`.
 * Stripping from any mid-line `//` would also eat the rest of a line containing a URL,
 * turning a real hardcoded bucket into a false negative — and a guard that misses is
 * worse than one that occasionally over-reports. A trailing comment mentioning the
 * bucket therefore fails the check; reword it or use the allowlist.
 */
function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((line) => !/^\s*(\/\/|\*)/.test(line))
    .join('\n');
}

const scriptsDir = path.join(repoRoot, 'scripts');
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return walk(full);
    return /\.(cjs|mjs|js|ts)$/.test(e.name) ? [full] : [];
  });
}

for (const file of walk(scriptsDir)) {
  const rel = path.relative(repoRoot, file);
  if (BUCKET_LITERAL_ALLOWED.has(rel)) continue;
  if (stripComments(fs.readFileSync(file, 'utf8')).includes(SHARED_BUCKET)) {
    problems.push(
      `${rel} hardcodes ${SHARED_BUCKET}, the bucket archive-app owns. Website artwork ` +
        `belongs in ${WEBSITE_BUCKET} — use the shared constant from scripts/lib/seedEvent.cjs ` +
        'rather than copying a bucket name into a new script.'
    );
  }
}

if (problems.length > 0) {
  console.error('Storage bucket target check FAILED:\n');
  problems.forEach((p) => console.error(`  • ${p}\n`));
  console.error('See docs/storage-bucket-separation.md.');
  process.exit(1);
}

console.log(
  `OK — storage scoped to target(s) ${entries.map((e) => e.target).join(', ')} ` +
    `→ ${WEBSITE_BUCKET}` +
    (envBucket ? `; VITE_FIREBASE_STORAGE_BUCKET=${envBucket}` : '; (bucket env var not set in this context)')
);
