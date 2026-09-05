# Giving the website its own Storage bucket

**Status: one step from done.** The website no longer touches the shared bucket at all —
its rules, its images and its uploads are all on `sahs-website-media`. What remains is
on the *archive-app* side: until it deploys again, the shared bucket still carries the
website's old permissive ruleset. Checklist at the bottom.

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

### 2. Point the site at it — ✅ DONE (2026-09-04)

`VITE_FIREBASE_STORAGE_BUCKET` is read at build time from a **GitHub Actions secret**, so
it lives in repository settings rather than the codebase. Set to `sahs-website-media`, and
the deploy re-run afterwards picked it up — **confirmed in the live bundle**, which now
carries `sahs-website-media` where it previously carried `sahs-archives.firebasestorage.app`.

Note the ordering trap: the secret is read *at run time by the workflow*, so simply
setting it changes nothing until a deploy runs again. Re-running the most recent deploy
is enough — no new commit needed — because a re-run reads secrets fresh.

Remember to update your local `.env` to match, or local uploads will still go to the
shared bucket.

### 3. Deploy rules only to the new bucket — ✅ DONE (in this repo)

`firebase.json` now scopes storage to a target, and `.firebaserc` binds that target to
`sahs-website-media`. `deploy --only storage` from this repo can no longer reach the
shared bucket. Validated with `firebase deploy --only firestore:rules,storage --dry-run`.

`storage.rules` was rewritten accordingly: the shared-bucket warning is gone, and
`allow read: if true` is now an honest statement about website images rather than a
blanket grant over archive media.

### 4. Migrate the existing objects — ✅ DONE (2026-09-04)

`scripts/migrate_storage_to_website_bucket.cjs`, dry-run by default like the seed
scripts.

**Run with `--prod` on 2026-09-04: 31 objects copied, 31 URLs rewritten across 12 posts,
0 source objects missing.** Verified afterwards: all 31 migrated URLs return HTTP 200 to
an anonymous fetch, and Home / News / Box Office render with **0 broken images and 0
images still served from the shared bucket**. The originals were copied, not moved, so
they remain on the old bucket as a fallback.

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

### 6. Let archive-app take its bucket back — ⏳ THE LAST STEP

Steps 1–5 are complete, so this is now safe: no website image lives on the shared bucket
any more, and nothing the website does will put one there.

**Trigger a deploy of `SAHS-archive-app`** so its rules are re-applied to
`sahs-archives.firebasestorage.app`. Its workflow triggers on push to main only, so either
push something or re-run its most recent deploy — check first that its main HEAD still
matches that run's commit, or a re-run deploys an older revision.

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
| 4 | Run the migration with `--prod` (31 objects, 12 posts) | either | ✅ done 2026-09-04 |
| 5 | Point `VITE_FIREBASE_STORAGE_BUCKET` at the new bucket | **owner** | ✅ done 2026-09-04 |
| 6 | Trigger an archive-app deploy to restore its rules | **owner** | ⏳ pending |

### Why this order

**6 must come last.** The shared bucket currently carries the website's old permissive
ruleset, and archive-app's private-media protection stays reverted until archive-app
deploys again. But once it does, every website image still living on that bucket without
a token stops loading — so step 4 has to be finished first. After step 6, re-run the
probe from the top of this document and confirm it returns **403**.
