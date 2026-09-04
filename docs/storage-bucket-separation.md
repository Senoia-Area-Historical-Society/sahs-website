# Giving the website its own Storage bucket

**Status: not done. This is a runbook, not a record.** It needs steps only a project
owner can perform, so it could not land with the audit fixes.

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

### 1. Create and register the bucket

Firebase Security Rules only apply to buckets registered with Firebase, so a plain
`gcloud storage buckets create` is not enough — it must be added in the Firebase console
(**Storage → Add bucket**), or through the Firebase Management API. Match the existing
bucket's region so latency and egress do not change:

- Name: `sahs-website-media` (suggestion)
- Location: `US-EAST1` (same as `sahs-archives.firebasestorage.app`)
- Storage class: Regional

### 2. Point the site at it

`VITE_FIREBASE_STORAGE_BUCKET` is read at build time and comes from a **GitHub Actions
secret** (`.github/workflows/deploy.yml`), so this must be changed in repository settings —
it is not in the codebase. Update the local `.env` to match.

### 3. Deploy rules only to the new bucket

`firebase.json` takes a list, with targets defined in `.firebaserc`:

```json
"storage": [
  { "target": "website-media", "rules": "storage.rules" }
]
```

```bash
firebase target:apply storage website-media sahs-website-media
```

Once this lands, `--only storage` from this repo can no longer touch the shared bucket.

### 4. Migrate the existing objects

31 post images are hosted on the shared bucket, of which **18 carry a download token and
13 do not** — the 13 rely on the blanket public read, so they are the ones that break if
the website's rules stop applying to that bucket. Copy the objects, then rewrite the URLs
stored on the `posts` documents. Write this as a script under `scripts/`, default it to a
dry run, and require an explicit `--prod` flag, the same as the seed scripts.

Fields to rewrite: `mainImage`, `bannerImage`, `squareImage` on `posts`;
`galleries.galleryImages` (currently 0 on Storage); `historical_places` photo fields.

### 5. Verify, then let archive-app take its bucket back

After the website deploys with the new bucket, **trigger an archive-app deploy** so its
rules are re-applied to `sahs-archives.firebasestorage.app`. Until that runs, the shared
bucket keeps the permissive ruleset that is live today. Then re-run the probe from the top
of this document and confirm it returns **403**.

### 6. Simplify `storage.rules`

Once the bucket is the website's alone, the warning banner at the top of `storage.rules`
can go, `allow read: if true` becomes an honest statement about website images only, and
the `firestore.get()` role lookup can stay as the single source of truth.

## Related

- `AUDIT.md` — S1-8 (this) and S3-1 (the read exposure it causes)
- `storage.rules` — carries a pointer to this file
