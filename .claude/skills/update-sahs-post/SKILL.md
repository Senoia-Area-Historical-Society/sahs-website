---
name: update-sahs-post
description: >
  Change an SAHS event or news post that is already live — corrected copy, a new date or
  time, re-cut artwork. Use when asked to fix, correct, reword, reschedule, or update an
  existing post, or when an organiser sends feedback on a listing. Creating a brand-new
  event is /author-sahs-event instead. Siblings: /author-sahs-event, /run-sahs-website.
---

# Update a Live SAHS Post

An event is a Firestore `posts` document. The seed script in `scripts/` is its
*reproducible source*, not its storage — so a live post can have drifted from the script,
and the script is not automatically the truth.

Read the event gotchas in `CLAUDE.md` first. This skill is the ordering; those are the
rules. `scripts/lib/seedEvent.cjs` owns the shared mechanics.

## 1. Read the live document before touching anything

The script and the document can disagree. Someone may have edited the post in
`ContentAdmin` — the Poker Run had a hand-added "Senoia Pizza will offer food" sentence
that existed only in Firestore. A full re-run of the seed silently discards that.

```bash
cat > scripts/.tmp_read.cjs <<'EOF'
const path=require('path');
const {initializeApp,cert}=require('firebase-admin/app');
const {getFirestore}=require('firebase-admin/firestore');
initializeApp({projectId:'sahs-archives',
  credential:cert(require(path.join(process.env.HOME,'.config/gcloud/sahs-firebase-deploy.json')))});
(async()=>{const s=await getFirestore().collection('posts')
  .where('slug','==','<SLUG>').limit(1).get();
 const x=s.docs[0].data();
 console.log('id',s.docs[0].id,'ticketsSold',x.ticketsSold,'gcal',x.googleCalendarEventId);
 console.log(x.content);})();
EOF
node scripts/.tmp_read.cjs; rm -f scripts/.tmp_read.cjs
```

It must live in `scripts/` — `node_modules` does not resolve from a temp directory.
Diff what you see against the script's `CONTENT` and fold in anything that only exists
live before you rewrite it.

## 2. Choose the narrowest run that does the job

| Change | Command |
|---|---|
| Copy, dates, price, status | `node scripts/seed_<event>.cjs --prod --content-only` |
| Anything touching the images | `node scripts/seed_<event>.cjs --prod` |

`--content-only` merges the copy and date fields and never opens Storage. Prefer it.

A full `--prod` run re-uploads all artwork to the same object paths. The download token
is derived from the object path so that is normally a no-op for existing URLs — **but
the bucket migration re-minted tokens on the copied objects**, so for any post whose
images predate that migration a full run *rotates its live image URLs*. Nothing in
`functions/src/` embeds post artwork in email, so the blast radius is scraped social
previews; check before assuming.

## 3. Edit the seed script, never the admin UI

Put the change in `scripts/seed_<event>.cjs` and re-run. Editing in `ContentAdmin`
instead re-creates the drift from step 1 and leaves no reviewable diff.

Fields the script must never write are already handled by `scripts/lib/seedEvent.cjs` —
do not reintroduce them into a `data` block:

- **`ticketsSold`** — `stripeWebhook` owns it. Written as `increment(0)` on update.
- **`publishDate`** — create-only. Rewriting it reorders the past-events surfaces.
- **`googleCalendarEventId`** — set by the trigger. Never seed it.
- **the document ID** — the join key for the calendar entry and every sold ticket. The
  upsert is on `slug` for exactly this reason.

`excerpt` is not just a summary: it is the **Google Calendar description** and the
`og:description`. Any fact you correct in `content` has to be corrected there too.

## 4. Re-cut artwork when the copy is baked into the image

Posters carry prices, times and rules as *pixels*. Correcting the page while the banner
still says the old time is worse than not correcting it. Check every image, not just the
one on the detail page.

```bash
./.artwork/generate-<event>.sh          # masters → .artwork/<name>/masters (gitignored)
./.artwork/derive-sizes.sh <name>       # → the committed 1920x1080 / 1200x675 / 1200x1200
```

`.artwork/generate-poker-run-2026.sh` is the model. Copy its `STYLE` / `LAYOUT` / `TYPO`
/ `NEGATIVE` blocks verbatim — every SAHS poster is one family — and change only the
scene and the `Text, exactly:` lines. Then:

- **Inspect every master for spelling before deriving.** Garbled lettering is this
  model's characteristic failure and no downstream step checks for it.
- **Check the derived files actually bleed.** `derive_sizes.py` trims the cream matte the
  model adds, but its `LIGHT = 235` threshold sits right where some mattes land — one
  poker-run square measured 232–237 and slipped through *both* the trim and the gate.
  Look at the output. If a border survives, regenerate that master; do not retune the
  threshold, which the shipped fall/winter set depends on.
- Keep detail lines short. Long lines are where the model starts inventing words.

Regenerating is **not** deterministic — you get a different illustration, not the same
one with new text. That is a visible change to a live listing; confirm it with whoever
owns the event.

## 5. Verify locally, then publish

```bash
npx firebase emulators:start --only firestore,auth    # NOT npm run emulators
node scripts/seed_<event>.cjs                          # emulator is the default
```

Then use **/run-sahs-website** to read the rendered page. Check `/news/<slug>`, the card
on `/news`, and — if ticketed — `/embed/tickets/<slug>`.

```bash
node scripts/seed_<event>.cjs --prod --content-only
```

Confirm with the user first: production writes are a release.

## 6. Confirm the calendar afterwards

Any change to `title`, `excerpt`, `content`, `location` or the dates makes the trigger
patch the post's calendar entry. That patch is caught-and-logged, so it fails **silently**:

```bash
gcloud functions logs read onPostWritten --region=us-central1 \
  --project=sahs-archives --limit=40 --format='value(time_utc,log)' | grep -i "calendar\|error"
```

A `404` means `googleCalendarEventId` points at an entry that no longer exists, or one on
a *different* calendar — the id is scoped to the calendar it was minted on. The Poker Run
had an id from the meeting-room resource calendar, so the post had never appeared on the
Membership Calendar and every patch 404'd into the catch. `scripts/migrate_calendar_to_
membership.cjs --dry-run` reports which posts are in that state; note the sync account has
**reader, not writer** on the room resource, so it cannot delete those entries — that
needs a human in the Calendar UI.

## See Also

- `CLAUDE.md` — event gotchas, artwork contract, calendar and Stripe invariants
- `scripts/lib/seedEvent.cjs` — the shared seeding mechanics and why each rule exists
- `/author-sahs-event` — creating a new event from scratch
- `/run-sahs-website` — dev server and browser verification
