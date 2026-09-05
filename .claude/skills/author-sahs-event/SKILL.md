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
committed content file. The shared mechanics live in **`scripts/lib/seedEvent.cjs`**;
`scripts/seed_poker_run.cjs` is the reference *caller* — copy that one, and read the
library before changing how any of it works.

The library exists because these scripts used to be copies of each other and drifted:
two of them were still uploading to the shared archive bucket months after the website
got its own, and two rewrote `publishDate` on every run. Nothing per-event belongs in the
library, and nothing shared belongs in your script.

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

Copy `scripts/seed_poker_run.cjs` to `scripts/seed_<event>.cjs`. It is a `CONTENT`
string plus one `runSeed({...})` call; edit:

- **`slug`** — permanent. It is both the upsert key and the public URL (`/news/<slug>`).
  Include the year for a recurring event.
- **`artwork`** — the nickname that names *both* `.artwork/<name>/` and the local staging
  directory `public/<name>-art/`. One value, so they cannot disagree.
- **`eventDate`** — pass a plain `Date`; the library converts it. Never a `Timestamp`.
- **`CONTENT`** — a TipTap-compatible HTML string. Use the tags the editor emits
  (`<p> <h3> <ul> <ol> <strong> <a>`) and HTML entities for typographic punctuation, so
  the post stays editable in `ContentAdmin` afterwards.
- Give `eventDate` an **explicit offset** — `new Date('2026-09-25T15:00:00-04:00')`. That
  is an absolute instant. `eventEndDate`, if you set one, is the opposite: a *naive*
  Eastern wall-clock string (`'2026-09-25T18:30'`) of the shape the admin form produces,
  which the Calendar request interprets with its own `timeZone`. Never convert one of
  those — see the timezone gotcha in CLAUDE.md.
- **`ticketPrice`** in cents; `capacity: null` for unlimited (a falsy capacity disables
  the remaining-count UI).
- **`excerpt`** is also the Google Calendar description and the `og:description`, so it
  is the field that cannot be quietly wrong.

### The library owns the upsert — do not hand-roll it

`seedEventPost` matches on `slug` and never `.add()`s unconditionally. The document ID is
the join key for the post's Google Calendar entry (`googleCalendarEventId`) and for every
sold ticket; a fresh ID on re-run strands both *and* leaves a duplicate post live on the
site. Matching on `slug` is what makes the script safe to run repeatedly while you
iterate. `ticketsSold` is written as `increment(0)` and `publishDate` only on create.

## 2. Generate three graphics

Ratios, sizes, and the ratio-vs-pixels rule are in CLAUDE.md. Generate them with the
`nanobanana` skill, then commit the sources to `.artwork/<event-name>/` with dimensions
in the filename — e.g. `.artwork/poker-run/poker-run-banner-1920x1080.jpg`.

The directory is a **short nickname, not the slug** (`poker-run`, for slug
`cruisin-for-history-poker-run-2026`). Pass it once as `artwork:` and the library derives
both `.artwork/<name>/` and the staging directory `public/<name>-art/` from it — the
`-art` suffix matters, because `.gitignore` covers exactly `public/*-art/` and a
directory missing that shape leaves binary artwork copies committable.

Write a `.artwork/generate-<event>.sh` alongside the images, modelled on
`.artwork/generate-poker-run-2026.sh`, and copy its `STYLE` / `LAYOUT` / `TYPO` /
`NEGATIVE` blocks verbatim so the set stays one family. Masters are gitignored, so
without a generator there is no way to re-render the poster when a detail changes — which
is exactly the hole the poker run fell into. Derive with `./.artwork/derive-sizes.sh <name>`.

**This machine needs a CA bundle for that skill.** Without it every call dies with
`CERTIFICATE_VERIFY_FAILED`, which reads like an auth failure and invites a wrong
diagnosis — it is a host Python trust-store issue, not an API key problem:

```bash
export SSL_CERT_FILE=$(python3 -c "import certifi;print(certifi.where())")
```

Pass `--env-file ~/.claude/skills/nanobanana/.env` when running from another directory;
the `.env` search walks up from cwd.

Compose `mainImage` so the subject survives a **square** crop. The reason usually given —
"a 64×64 thumbnail on the Home sidebar" — is only half right: that sidebar is **Past
Events**, so it does not apply to an upcoming event at all. What does apply immediately is
the `og:image` (`Seo.tsx`) and the JSON-LD image (`EventCard.tsx`), and the square crop
becomes real once the event is over. `mainImage` has no enforced ratio; every consumer is
a fixed-height `object-cover` box.

### The download token is derived from the object path (library-owned)

`seedEvent.cjs` sets `metadata.firebaseStorageDownloadTokens` to a SHA-256 of the object
path. You do not write this, but you should know why it exists. Firebase embeds the token
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
- `scripts/lib/seedEvent.cjs` — the shared seeding mechanics
- `scripts/seed_poker_run.cjs` — reference caller
- `/update-sahs-post` — changing an event that is already live
- `/run-sahs-website` — dev server, screenshots, Vite port drift
