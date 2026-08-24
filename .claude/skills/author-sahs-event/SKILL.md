---
name: author-sahs-event
description: >
  Create a new SAHS event — draft the copy, generate the three artwork sizes, seed it to
  Firestore, verify it in the browser, then publish to production. Use when asked to
  create, add, seed, or publish an event, to build event artwork, or to write a new seed
  script. The hazards (--prod, ticketsSold, artwork ratios, Storage) are in CLAUDE.md.
  Sibling: /run-sahs-website.
---

# Author a SAHS Event

An event is a Firestore `posts` document created by a script in `scripts/`, not a
committed content file. `scripts/seed_poker_run.cjs` is the reference implementation —
copy that one.

> **Do not copy `scripts/seed_july4_event.cjs`.** It now upserts by slug and leaves
> `ticketsSold` alone, but it is still only a local fixture: it hardcodes the emulator
> with no `--prod` path, has no artwork pipeline, and points `mainImage` at an Unsplash
> placeholder. Use it to get a ticketed event into the emulator fast, nothing more.

Read the event gotchas in `CLAUDE.md` before starting — this skill is the ordering,
those are the rules.

## 0. Worktree setup (skip in the main checkout)

```bash
cp /Users/jermdw/SAHS/sahs-website/.env .env
```

`.env` is gitignored; without it Firebase init throws `auth/invalid-api-key` and the app
renders a blank page. Vite reads it only at startup, so restart the dev server after
copying. Then `npm install` — worktrees start with no `node_modules`.

## 1. Draft the content

Copy `scripts/seed_poker_run.cjs` to `scripts/seed_<event>.cjs` and edit:

- **`SLUG`** — permanent. It is both the upsert key and the public URL (`/news/<slug>`).
  Include the year for a recurring event.
- **`CONTENT`** — a TipTap-compatible HTML string. Use the tags the editor emits
  (`<p> <h3> <ul> <ol> <strong> <a>`) and HTML entities for typographic punctuation, so
  the post stays editable in `ContentAdmin` afterwards.
- **`eventDate`** — a `Timestamp` built from a date with an **explicit offset**:
  `new Date('2026-09-25T18:00:00-04:00')`. That is absolute and safe to convert, unlike
  the naive `datetime-local` strings the admin form produces — see the timezone gotcha
  in CLAUDE.md.
- **`ticketPrice`** in cents; `capacity: null` for unlimited (a falsy capacity disables
  the remaining-count UI).

### Upsert by slug — never `.add()` unconditionally

```js
const existing = await db.collection('posts').where('slug', '==', SLUG).limit(1).get();

if (existing.empty) {
  await db.collection('posts').add({ ...data, ticketsSold: 0, createdAt: now });
} else {
  // Never clobber ticketsSold — the Stripe webhook owns that counter.
  await existing.docs[0].ref.set({ ...data, ticketsSold: FieldValue.increment(0) }, { merge: true });
}
```

The document ID is the join key for the post's Google Calendar entry
(`googleCalendarEventId`) and for every sold ticket. A fresh ID on re-run strands both
*and* leaves a duplicate post live on the site. Matching on `slug` is what makes the
script safe to run repeatedly while you iterate.

## 2. Generate three graphics

Ratios, sizes, and the ratio-vs-pixels rule are in CLAUDE.md. Generate them with the
`nanobanana` skill, then commit the sources to `.artwork/<event-name>/` with dimensions
in the filename — e.g. `.artwork/poker-run/poker-run-banner-1920x1080.jpg`.

The directory is a **short nickname, not the slug** (`poker-run`, for slug
`cruisin-for-history-poker-run-2026`), and `seed_poker_run.cjs` hardcodes both that path
and the staging path rather than deriving them from `SLUG`. Set them explicitly in your
copy; there is no naming convention to inherit.

**This machine needs a CA bundle for that skill.** Without it every call dies with
`CERTIFICATE_VERIFY_FAILED`, which reads like an auth failure and invites a wrong
diagnosis — it is a host Python trust-store issue, not an API key problem:

```bash
export SSL_CERT_FILE=$(python3 -c "import certifi;print(certifi.where())")
```

Pass `--env-file ~/.claude/skills/nanobanana/.env` when running from another directory;
the `.env` search walks up from cwd.

Compose `mainImage` so the subject survives a **square** crop — it is reused as a 64×64
thumbnail on the Home sidebar and as the `og:image`.

### Derive the download token from the object path

```js
function tokenFor(objectPath) {
  const h = crypto.createHash('sha256').update(objectPath).digest('hex');
  return [h.slice(0,8), h.slice(8,12), h.slice(12,16), h.slice(16,20), h.slice(20,32)].join('-');
}
```

Set it as `metadata.firebaseStorageDownloadTokens` on upload. Firebase embeds the token
in the download URL, so a **random** token would mint a brand-new URL on every re-run —
silently breaking the images already rendered into sent ticket emails and scraped social
previews, neither of which can be re-issued. Deriving it from the path makes re-uploading
a no-op from the URL's point of view. The resulting URL is byte-identical to what the
client SDK's `getDownloadURL()` produces, so script-uploaded and admin-uploaded images
are indistinguishable to the app.

## 3. Seed to the emulator

Use an isolated emulator, not `npm run emulators` — that imports and exports the
persisted `./emulator-data` that only exists in the main checkout:

```bash
npx firebase emulators:start --only firestore,auth
```

Then, in another terminal:

```bash
node scripts/seed_<event>.cjs
```

The emulator is the default; no flag needed. Emulator mode copies artwork into a
staging directory under `public/` rather than uploading — see the Storage gotcha in
CLAUDE.md for why that asymmetry is deliberate and must not be "fixed."

**Name the staging directory `public/<event>-art/`.** The `public/*-art/` glob in
`.gitignore` covers that shape and nothing else — a directory named anything else leaves
binary artwork copies untracked-and-committable. Confirm with `git status --short` after
seeding; the copies must not appear.

## 4. Verify in the browser

Use **/run-sahs-website** for the dev server and screenshots. Check:

- `/news/<slug>` — banner ratio, square block, ticket widget, price
- `/news` and `/` — the card crop and the 64×64 sidebar thumbnail
- `/embed/tickets/<slug>` — the standalone purchase embed

Re-running the seed after an edit is safe; it upserts.

## 5. Publish to production

```bash
node scripts/seed_<event>.cjs --prod
```

**This is not a dry run.** It uploads artwork to production Storage, and a
`status: 'published'` post fires `onPostWritten`, inserting a real entry on the SAHS
Membership Calendar that members see. Confirm with the user before running it.

Afterwards: load the live `/news/<slug>`, and confirm the calendar entry landed on the
Membership Calendar rather than the meeting-room resource (see CLAUDE.md — they used to
be the same constant).

## See Also

- `CLAUDE.md` — event gotchas, artwork contract, calendar and Stripe invariants
- `scripts/seed_poker_run.cjs` — reference implementation
- `/run-sahs-website` — dev server, screenshots, Vite port drift
