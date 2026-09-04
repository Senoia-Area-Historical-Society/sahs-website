# Giving the website its own Storage bucket

**Status: in progress.** The bucket exists and this repo is wired to it; three steps
remain, two of which only a project owner can do. Checklist at the bottom.

## The problem

`sahs-website` and `archive-app` both deploy Storage security rules to the **same
bucket**, `sahs-archives.firebasestorage.app`:

| Repo | Deploy step |
|---|---|
| `sahs-website` | `firebase deploy --only firestore:rules,storage` |
| `archive-app` | `firebase deploy --only hosting,functions,storage,firestore` |

Storage rules are per-bucket and wholly replaced on deploy, so **whichever repo merged
most recently owns the policy** and silently discards the other's. The two policies are
not compatible:

- The website's grants `allow read: if true` across `/{allPaths=**}` — the public site
  serves images by download URL.
- archive-app's grants **no** anonymous read at all. Its PR #19 moved public visibility
  to per-object ACLs precisely so private items would stop being served, noting that a
  private item's original had been returning HTTP 200 and 493 KB to an anonymous request.

So every website deploy reverts that fix, and every archive-app deploy re-breaks the
website's images. It oscillates, and nobody is watching which side is up.

**As of 2026-09-04 the website's ruleset is the live one** — it deployed 09-02, after
archive-app's 08-30. Verified without touching archive material: a GET for a path that
does not exist under `archive_media/` returns **404, not 403**, and rules are evaluated
before existence, so anonymous read is currently permitted bucket-wide.

```bash
# 404 => anonymous read allowed (website ruleset live). 403 => denied (archive-app's).
curl -s -o /dev/null -w '%{http_code}\n' \
  'https://firebasestorage.googleapis.com/v0/b/sahs-archives.firebasestorage.app/o/archive_media%2Fdoes-not-exist.jpg'
```

## Why a separate bucket, rather than reconciling the rules

A single reconciled policy would have to be kept byte-identical in two repositories with
independent deploy pipelines — the same arrangement that produced this, one step less
obvious. Separate buckets make the coupling impossible to reintroduce: each repo's rules
apply only to its own bucket, and neither deploy can affect the other.

## Runbook

### 1. Create and register the bucket — ✅ DONE

`sahs-website-media`, US-EAST1, Regional, created 2026-09-04 and **registered with
Firebase** (confirmed against the Firebase Storage API — registration is what makes
Security Rules apply at all; a bucket created only through `gcloud` would silently
ignore them).

### 2. Point the site at it

`VITE_FIREBASE_STORAGE_BUCKET` is read at build time and comes from a **GitHub Actions
secret** (`.github/workflows/deploy.yml`), so this must be changed in repository settings —
it is not in the codebase. Update the local `.env` to match.

### 3. Deploy rules only to the new bucket — ✅ DONE (in this repo)

`firebase.json` now scopes storage to a target, and `.firebaserc` binds that target to
`sahs-website-media`. `deploy --only storage` from this repo can no longer reach the
shared bucket. Validated with `firebase deploy --only firestore:rules,storage --dry-run`.

`storage.rules` was rewritten accordingly: the shared-bucket warning is gone, and
`allow read: if true` is now an honest statement about website images rather than a
blanket grant over archive media.

### 4. Migrate the existing objects — ⏳ SCRIPT READY, NOT YET RUN

`scripts/migrate_storage_to_website_bucket.cjs`, dry-run by default like the seed
scripts. Latest dry run: **31 objects across 12 posts, 0 source objects missing.**

```bash
GOOGLE_APPLICATION_CREDENTIALS=~/.config/gcloud/sahs-firebase-deploy.json \
  node scripts/migrate_storage_to_website_bucket.cjs           # dry run
GOOGLE_APPLICATION_CREDENTIALS=~/.config/gcloud/sahs-firebase-deploy.json \
  node scripts/migrate_storage_to_website_bucket.cjs --prod    # apply
```

The URLs come in **two shapes**, and an early version of the script only handled the
first — the dry run is what caught it:

| Shape | Count | Notes |
|---|---|---|
| `firebasestorage.googleapis.com/v0/b/<bucket>/o/…?token=` | 18 | token authorizes itself, survives any read rule |
| `storage.googleapis.com/<bucket>/<path>` | 13 | **no token** — depends entirely on public read, so these are the ones that break |

Everything else (~100 URLs) is Webflow CDN or site-relative and is left alone.

The script copies rather than moves, and mints a download token for each copy, so the
migrated URLs no longer depend on the bucket's read rule at all. It is idempotent — a
URL already pointing at the new bucket is skipped — so a re-run after a partial failure
resumes cleanly.

### 5. Verify, then let archive-app take its bucket back — ⏳ PENDING

Once the migration has run and the secret is changed, **trigger an archive-app deploy** so
its rules are re-applied to `sahs-archives.firebasestorage.app`. Until that runs, the
shared bucket keeps the permissive ruleset that is live today, and archive-app's
private-media protection stays reverted.

Then re-run the probe from the top of this document. It should return **403**, not 404.

That probe is also the regression test: if it ever returns 404 again, something has
deployed website-shaped storage rules to the shared bucket, and the separation has come
undone.

## Related

- `AUDIT.md` — S1-8 (this) and S3-1 (the read exposure it causes)
- `storage.rules` — carries a pointer to this file

---

## Checklist

| # | Step | Who | Status |
|---|---|---|---|
| 1 | Create + register `sahs-website-media` | owner | ✅ done |
| 2 | Scope this repo's storage deploys to it (`firebase.json`, `.firebaserc`) | repo | ✅ done |
| 3 | Rewrite `storage.rules` for a website-only bucket | repo | ✅ done |
| 4 | Run the migration with `--prod` (31 objects, 12 posts) | either | ⏳ pending |
| 5 | Point `VITE_FIREBASE_STORAGE_BUCKET` at the new bucket | **owner** | ⏳ pending |
| 6 | Trigger an archive-app deploy to restore its rules | **owner** | ⏳ pending |

### Why this order

**5 is a GitHub Actions secret**, read at build time, so it is not in the codebase and
cannot be changed from here. Until it changes, *new* uploads still land in the shared
bucket. Existing images are unaffected either way — their URLs are absolute.

**6 must come last.** The shared bucket currently carries the website's old permissive
ruleset, and archive-app's private-media protection stays reverted until archive-app
deploys again. But once it does, every website image still living on that bucket without
a token stops loading — so step 4 has to be finished first. After step 6, re-run the
probe from the top of this document and confirm it returns **403**.
