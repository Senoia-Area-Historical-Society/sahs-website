# sahs-website — CLAUDE.md

Public website (`senoiahistory.com`) and admin portal (`admin.senoiahistory.com`) for the Senoia Area Historical Society. Part of a two-app monorepo — see `../archive-app/` for the sibling digital archives platform and `../CLAUDE.md` for the monorepo overview.

## Tech Stack

| Layer | Technology |
|---|---|
| Build | Vite 8, TypeScript 5.9 |
| Frontend | React 19, React Router 7 |
| Styling | Tailwind CSS 3.4 + `@tailwindcss/typography` |
| Rich text | TipTap v3 (starter-kit, link, image, underline, text-align, youtube + custom iframe) |
| Icons | Lucide React |
| Forms | react-hook-form v7 |
| Dates | date-fns v4 |
| Auth | Firebase Auth — Google OAuth; access granted by a `user_roles` doc (see Gotchas) |
| Database | Cloud Firestore — **default database** |
| Storage | Firebase Storage (bucket shared with archive-app) |
| Functions | Cloud Functions v2, TypeScript, Node 24, codebase `website` |
| Payments | Stripe Checkout |
| Email | Resend + React Email v6 |
| Calendar | Google Calendar API (public event sync via service account) |
| Gallery lightbox | yet-another-react-lightbox |
| Testing | Vitest (unit) + Playwright (E2E) |

## Firebase / GCP

- **GCP project:** `sahs-archives` — shared with archive-app
- **Firestore:** default database (website data only). Archive-app uses the `sahs-archives` named DB.
- **Hosting targets:** `sahs-website-public` (main site), `sahs-shortlinks` (shortlink redirect function)
- **Functions codebase:** `website` — distinct from archive-app's `archives` codebase
- **Auth:** Shared Firebase Auth instance across both apps — same `user_roles` gate
- **Storage:** Shared bucket — website images and archive media coexist
- **Emulator ports:** Auth 9099 · Functions 5001 · Firestore 8080 · Storage 9199
- **Secrets (GCP Secret Manager — never in .env):** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `RESEND_AUDIENCE_ID`
- **Service account key:** `~/.config/gcloud/sahs-firebase-deploy.json` — never move to the project directory or commit to git

## Auth & Role System

Permanent admins (hardcoded): `catnolan@senoiahistory.com`, `jeremywarren@senoiahistory.com`

Role overrides: Firestore `user_roles/{email}` document → `admin > curator > editor > read_only`

Role flags exposed via `AuthContext` (`src/contexts/AuthContext.tsx`):

| Flag | Who has it |
|---|---|
| `isAdmin` | Permanent admins + `admin` role override |
| `isCurator` | Admins + `curator` role override |
| `isEditor` | Curators + `editor` role override |
| `isReadOnly` | All roles including `read_only` / `board_member` |
| `isSAHSUser` | Any authenticated user with any role (gate for `/admin/*`) |

Both apps read `user_roles` from the **default Firestore** (same collection, shared logic). `ProtectedRoute` wraps all `/admin/*` routes. Admin subdomain auto-redirects to `/admin/content`. Firestore and Storage rules mirror this via `isSAHSUser()`, `isEditor()`, `isCurator()`, `isAdmin()` helpers.

## Membership & Stripe

Tiers: Sustaining ($25,000/yr) · Family Senior ($75) · Family ($50) · Individual Senior ($40) · Student ($25) · Individual ($35) · Member ($35)

Flow: Stripe Checkout → `stripeWebhook` function → Resend welcome email → contact added to Resend Audience (`RESEND_AUDIENCE_ID` = `725e0bbc-33c0-4bc4-a2de-3252c0ab757c` in Secret Manager). Backfill existing members: `node scripts/backfill_resend_members.cjs`

## Firestore Collections

| Collection | Description | Access |
|---|---|---|
| `posts` | Events (TipTap HTML content, ticketing fields). No news/event split — see Gotchas | Public read published; editors+ write |
| `galleries` | Photo galleries with cover image, ordered by `sortOrder` | Public read; editors+ write |
| `historical_places` | Museum exhibit database with coordinates | Public read; editors+ write |
| `organization_entities` | Board members (`board_member`), corporate sponsors (`corporate_sponsor`), event sponsors (`event_sponsor`) | Public read; editors+ write |
| `memberships` | Member records created by Stripe webhook | Curators only |
| `tickets` | Event ticket purchases with QR codes | Public lookup by stripeSessionId (limit 1); curators manage |
| `submissions` | Vendor and sponsor application forms | Public create-only; curators read |
| `volunteer_sheets` | Volunteer signup campaigns — draft/active/closed | Active sheets public read; editors manage |
| `volunteer_sheets/{id}/slots` | Time slots within a volunteer sheet | Public read active; editors manage |
| `volunteer_sheets/{id}/registrations` | Individual volunteer signups | Public create; editors read |
| `shortlinks` | Custom 301 redirect slugs | Admin only |
| `user_roles` | Role overrides by email address | Self-read; admin-write |
| `mail` | Trigger Email extension queue | Public create; no read |
| `wiki` | Internal knowledge base articles | Editors+ only |

## Critical File Map

| File | Purpose |
|---|---|
| `src/lib/firebase.ts` | Firebase init; auto-connects emulators on localhost |
| `src/services/api.ts` | All Firestore read/write operations (20KB+) |
| `src/services/storage.ts` | Firebase Storage upload helpers |
| `src/contexts/AuthContext.tsx` | Auth state and role flags (`isAdmin`, `isCurator`, `isEditor`, `isReadOnly`, `isSAHSUser`) |
| `src/types/index.ts` | TypeScript interfaces for all data models (Post, Membership, Ticket, Gallery, etc.) |
| `src/App.tsx` | All routes — public and admin |
| `src/index.css` | Global styles, Tailwind overrides, `.prose a` link styling |
| `src/pages/admin/ContentAdmin.tsx` | Primary admin UI (~49KB — posts, galleries, drafts) |
| `src/pages/admin/AdminHeader.tsx` | Admin nav — add new nav items to `navGroups` here |
| `src/pages/admin/AdminDashboard.tsx` | Admin home — stats and quick links |
| `src/pages/admin/WikiAdmin.tsx` | Internal knowledge base CRUD |
| `src/pages/admin/VolunteersAdmin.tsx` | Volunteer sheet and signup management (~27KB) |
| `src/components/admin/RichTextEditor.tsx` | TipTap editor (link/image/YouTube/iframe) |
| `src/components/admin/extensions/Iframe.ts` | Custom TipTap extension for YouTube iframes |
| `functions/src/index.ts` | All Cloud Functions (680+ lines) |
| `functions/src/emails/WelcomeEmail.tsx` | React Email welcome template |
| `functions/src/emails/NewsletterEmail.tsx` | React Email newsletter template |
| `firestore.rules` | Security rules — mirrors auth role logic |
| `scripts/` | Ad-hoc Firestore maintenance scripts |

## Routes

### Admin Routes (all protected by `ProtectedRoute` — requires `isSAHSUser`)

| Path | Component | Notes |
|---|---|---|
| `/admin/login` | `Login.tsx` | Unprotected — Google OAuth |
| `/admin` | `AdminDashboard.tsx` | Stats and quick links |
| `/admin/content` | `ContentAdmin.tsx` | Primary content editor |
| `/admin/memberships` | `MembershipsAdmin.tsx` | Member database (Stripe) |
| `/admin/tickets` | `TicketsAdmin.tsx` | Ticket sales history |
| `/admin/tickets/scan` | `TicketScanner.tsx` | QR code verification |
| `/admin/wiki` | `WikiAdmin.tsx` | Internal knowledge base |
| `/admin/volunteers` | `VolunteersAdmin.tsx` | Volunteer signup management |
| `/admin/shortlinks` | `ShortLinksAdmin.tsx` | Custom URL manager |
| `/admin/newsletter` | `NewsletterComposer.tsx` | Email builder + broadcast |
| `/admin/users` | `UsersAdmin.tsx` | Role assignments (admin only) |

Admin subdomain (`admin.senoiahistory.com`) auto-redirects to `/admin/content` via `HostnameRedirect` in `App.tsx`.


## Cloud Functions (`functions/src/index.ts`)

All HTTP functions use `onRequest({ cors: true, secrets: [...] })`.

| Function | Trigger | Purpose |
|---|---|---|
| `createTicketCheckoutSession` | HTTP POST | Stripe checkout for event tickets |
| `listStripeSubscriptions` | HTTP GET/POST | Lists all Stripe subscriptions for admin view |
| `stripeWebhook` | HTTP POST | Handles `checkout.session.completed` — creates membership/ticket records, sends welcome email, adds Resend contact |
| `verifyTicket` | HTTP GET/POST | QR scanner endpoint — validates ticket by `confirmationNumber` |
| `onPostWritten` | Firestore trigger | Watches `posts/{id}`; syncs create/update/delete to the **Membership Calendar** (see Gotchas) |
| `renderEmailPreview` | HTTP POST | Returns rendered HTML for admin email preview iframe |
| `sendNewsletter` | HTTP POST | Test send or Resend broadcast to audience |
| `shortlinkRedirect` | HTTP GET | `shortlinks` → `posts` → homepage fallback 301 redirect |
| `onSubmissionCreated` | Firestore trigger | Emails info@ when a contact/vendor/sponsor `submissions` doc is created |
| `onVolunteerRegistration` | Firestore trigger | Sends a volunteer their confirmation once the registration exists |

**Every admin-facing HTTP function verifies a Firebase ID token** via `requireStaff`
(`functions/src/requireStaff.ts`) and re-reads the role from `user_roles` server-side.
`onRequest` has no implicit auth, and these URLs are in the public JS bundle. Clients
attach the header with `authHeaders()` from `src/services/api.ts`. Minimums today:
`listStripeSubscriptions` and `sendNewsletter` are curator; `renderEmailPreview` is
editor; `verifyTicket` is board_member (check-in is a volunteer's job).

## Common Edit Patterns

**Adding an admin page**
1. Create `src/pages/admin/NewPage.tsx`
2. Add a `<ProtectedRoute>` route in `src/App.tsx`
3. Add a nav item in `AdminHeader.tsx` under the right `navGroups` entry (import a Lucide icon)

**Adding a Cloud Function**
1. Add to `functions/src/index.ts` using `onRequest({ cors: true, secrets: ['SECRET_NAME'] })`
2. Every secret read via `process.env` must be listed in the `secrets` array — missing one returns `undefined` on Cloud Run even if the secret exists in Secret Manager
3. Build: `cd functions && npm run build`
4. Deploy: `firebase deploy --only functions`

**Adding a public page**
1. Create `src/pages/NewPage.tsx` using `PublicLayout` (provides Header + Footer)
2. Add a route in `src/App.tsx`

**Styling**
- Global base and utilities: `src/index.css`
- Color tokens: `cream`, `charcoal`, `tan`, `tan-dark`, `tan-light` (defined in `tailwind.config.js`)
- Fonts: Playfair Display (serif headings), Inter (sans body)
- `.prose a` in `src/index.css` controls hyperlink appearance in public post content rendered from TipTap HTML
- Admin form inputs use `.input-base` utility class

**Adding a new data type**
1. Add the interface to `src/types/index.ts`
2. Add read/write helpers to `src/services/api.ts`
3. Add Firestore security rules to `firestore.rules`

## Commands

```bash
npm run dev              # Vite dev server — auto-connects emulators on localhost
npm run emulators        # Firebase emulators with persisted data (import/export ./emulator-data)
npm run build            # TypeScript compile + Vite production build
npm run lint             # ESLint
npm test                 # Vitest unit tests
npm run test:rules       # firestore.rules + storage.rules against the emulators
npm run test:watch       # Vitest in watch mode
npm run test:ui          # Vitest with browser UI
npm run test:e2e:local   # Playwright E2E against localhost:5173
npx tsx scripts/<name>.ts   # One-off TypeScript Firestore scripts
node scripts/<name>.cjs     # One-off CJS Firestore scripts
```

## Deployment

**Merging to `main` deploys to production.** `.github/workflows/deploy.yml` runs on every
push to `main` and ships hosting **and** functions **and** Firestore/Storage rules to
`sahs-archives` via OIDC. Merging a PR is a production release — there is no separate
"deploy" step to run afterwards, and running one by hand races the Actions run.

The workflow's steps, in order: guard `firebase.json`'s Firestore target
(`scripts/check-firestore-database-target.cjs`) → build → deploy hosting + functions →
dry-run validate rules → deploy rules. Watch a run with:

```bash
gh run watch "$(gh run list --workflow=deploy.yml --limit 1 --json databaseId -q '.[0].databaseId')"
```

Manual deploys are for when CI is unavailable, or for `firestore:indexes` — which the
workflow deliberately never deploys, because `firebase deploy --only firestore:indexes`
is declarative and deletes any production index missing from `firestore.indexes.json`:

```bash
npm run build
firebase deploy --only hosting        # dist/ → Firebase Hosting (both targets)
firebase deploy --only functions      # Cloud Functions (website codebase)
firebase deploy --only firestore:rules
firebase deploy --only storage        # Storage rules
firebase deploy --only firestore:indexes   # manual and deliberate only — see above
```

## Gotchas

**Portal access is granted by a `user_roles` document, not by the email domain** —
the docs used to say "`@senoiahistory.com` accounts only", and that is not what
either layer enforces. `AuthContext` looks up `user_roles/{email}` and grants
nothing when the document is absent; `firestore.rules` does the same via
`isAdmin()`/`isCurator()`/`isEditor()`/`isSAHSStaff()`. **Neither checks the
domain.** Two consequences, in opposite directions:

1. A brand-new `@senoiahistory.com` Google account has **no** access until
   someone adds `user_roles/{email}`. Signing in is not enough — `isSAHSUser` is
   false, so `ProtectedRoute` bounces straight back to `/admin/login`. Only
   `catnolan@` and `jeremywarren@` are hardcoded (`PERMANENT_ADMINS`).
2. A `user_roles` document for *any* address — a personal Gmail, an outside
   contractor — grants that address real access. Nothing rejects it. Treat
   creating one as the security decision it is, and prefer granting the
   `@senoiahistory.com` identity so access follows Workspace offboarding.

In practice the common support report is neither: people sign in with their
personal Google account out of habit, land on a denial, and assume they were
never granted access. Several board members hold a role on an
`@senoiahistory.com` address they have never once signed in with. `Login.tsx`
therefore leads its denial message with "switch accounts" and only offers
"contact an administrator" as the fallback — keep that ordering.

Adding a domain check to the rules would close (2), but it would also lock out
any personal address already relied on, so it is a deliberate change and not a
tidy-up. Roles are managed at `/admin/users`, admin-only.

**macOS / Linux filesystem casing** — macOS is case-insensitive; Linux Cloud Run is not. If a compiled output file gets wrong casing (e.g. `welcomeEmail.js` instead of `WelcomeEmail.js`), the container fails at startup. Fix: `rm -rf functions/lib && cd functions && npm run build`.

**Secrets must be declared in the function** — `onRequest({ secrets: ['RESEND_API_KEY', 'RESEND_AUDIENCE_ID'] })`. A secret omitted from this array is `undefined` at runtime on Cloud Run, even if the version exists in Secret Manager.

**Resend API key must be full-access** — Not send-only. The Audiences API (adding contacts) returns 401 with a restricted send-only key.

**Deploying a single function by name sometimes fails** — `firebase deploy --only functions:funcName` can error with "No function matches." Use `firebase deploy --only functions` to deploy all.

**TipTap v3 BubbleMenu is not exported from `@tiptap/react`** — Use custom React state to display a link action bar below the editor instead.

**TipTap link styling is two layers** — `HTMLAttributes` on the Link extension styles links inside the editor. For public post pages (which render saved TipTap HTML), add `.prose a` CSS in `src/index.css`.

**React Email `render()` is async** — Always `await render(React.createElement(Template, props))`.

**Firefox drag-and-drop** — HTML5 drag requires `e.dataTransfer.setData('text/plain', String(idx))` in `onDragStart`. Chrome works without it; Firefox does not.

**Legacy Firestore documents may lack new fields** — Guard with optional chaining: `item.galleryImages?.length ?? 0`.

**Functions don't hot-reload** — After editing `functions/src/`, rebuild (`cd functions && npm run build`) and restart the emulator.

**Lightbox CSS must be imported explicitly** — `import 'yet-another-react-lightbox/styles.css'`. Each plugin (e.g. Counter) has its own import.

**Volunteer slot capacity is maintained via transaction** — `filledCount` on `VolunteerSlot` is incremented atomically via Firestore transaction on public signup. Never write it directly outside that path.

**Never write `undefined` to Firestore — use `null`** — `src/lib/firebase.ts` uses a bare `getFirestore(app)`, so the SDK throws `Unsupported field value: undefined` and the entire write fails. A UI handler that clears a field with `x: undefined` therefore breaks the whole save, not just that field. Do **not** "fix" this with `ignoreUndefinedProperties: true`: that makes the SDK *skip* undefined keys, so a Remove button would stop throwing but also stop removing, silently keeping the old value. `src/lib/postEditorMapping.ts` normalizes `undefined` → `null` as the last step of `buildPostData`.

**`datetime-local` strings have no timezone — never `.toISOString()` them in a Cloud Function** — `eventStartDate` / `eventEndDate` are naive wall-clock strings typed in Eastern (`"2026-07-04T22:00"`). Cloud Run's local zone is UTC, so `new Date(str).toISOString()` reads 10 PM Eastern as 10 PM UTC (6 PM Eastern) and can put an event's end *before* its start — which `calendar.events.insert` rejects with a 400 that gets caught and logged, so the sync silently does nothing. Pass naive values through unchanged and let the request's `timeZone: 'America/New_York'` interpret them; see `functions/src/calendarTime.ts`. A Firestore `Timestamp` (`eventDate`) is absolute and is safe to `.toISOString()`.

**The post editor round-trips through display-only fields** — `ContentAdmin` edits `eventLocation`, `eventStartDate`, `publishDateDisplay` and `_ticketPriceDisplay`, and `buildPostData` writes the *stored* fields (`location`, `eventDate`, `publishDate`, `ticketPrice`) from them. Any new field renamed between the form and Firestore must be seeded from its stored counterpart in `buildEditorState`, or saving a post silently blanks it. `src/test/postEditorMapping.test.ts` enforces this with a generic round-trip invariant — every stored field on the fixture must survive `buildPostData(buildEditorState(doc))` unchanged.

**There is no news/event split — every post is an event** — `posts` documents used to
carry `type: 'news' | 'event'`, and read paths branched on it. They no longer do.
`getEventsSplit` partitions **by date**: a post whose `eventDate` is in the future is
`upcoming`, and everything else — finished events and the pre-2025 news articles alike —
is `past`, sorted by `eventDate ?? publishDate ?? createdAt` descending. A post with no
`eventDate` is therefore always past, which is the intent: it is a write-up of something
that already happened. All three surfaces (Home sidebar, `/news`, `/past-sahs-events`)
read that one bucket. `buildPostData` writes `type: 'event'` unconditionally, so re-saving
a legacy document normalizes it. Do **not** reintroduce a `type` filter in a query — that
is what made a 2023 article appear in Home's sidebar but not in `/past-sahs-events`.
Anything that used to key off `type === 'event'` should key off `!!post.eventDate` instead.

**Checkout amounts are derived server-side — never from the request body** —
`createTicketCheckoutSession` builds `line_items[0].price_data.unit_amount` from the
`ticketPrice` stored on `posts/{eventId}`, not from a `price` field on the wire. That
amount is a *dynamic* price: Stripe charges whatever the function sends, so forwarding
a client value let a crafted POST to the public function URL buy a $50 ticket for a
penny. `functions/src/ticketPricing.ts` owns the whole decision — price, product name,
`cancel_url` slug, and the quantity bounds — and refuses a post that is missing,
not `status: 'published'`, or has no positive integer `ticketPrice`. Do **not** re-add
`price` or `title` to `submitTicketRequest`'s payload; the server ignores them by
design, and a stale cached bundle that still sends them keeps working. The sibling
sibling function is already safe the same way: `createMembershipCheckoutSession` uses
a server-side `priceMap` keyed by tier.
Capacity is deliberately *not* enforced here — overselling needs transaction
semantics around `ticketsSold` and is a separate problem.

**`stripeWebhook` must answer 5xx when a write fails, and every record is keyed by the
Checkout Session id** — fulfillment used to wrap each path in a `catch` that only
`console.error`d, then answered `res.json({ received: true })` unconditionally. Stripe
saw a successful delivery and never retried, so any throw on the way to the write — QR
generation, a Firestore blip, an `undefined` field the Admin SDK refuses — destroyed a
paid order permanently. That cost ~25 ticket buyers their confirmation number over
several months. Three rules now hold, and all three are load-bearing:

1. `tickets/{session.id}` and `memberships/{session.id}` — never `.add()`. A retry is
   only safe once the write is idempotent. The ticket doc and the `ticketsSold`
   increment commit in **one transaction**, because a second write after the ticket
   write added a seat on every retry. All `tx.get()` calls must precede all writes.
2. A failed fulfillment returns 500 so Stripe retries on its own backoff and the event
   shows as failing in the dashboard — that dashboard *is* the dead-letter queue, which
   is why there is no `webhook_failures` collection.
3. Traffic that is not ours — an `event.type` we don't handle, or a session with no
   recognized `metadata.type` — returns **200**. An endpoint that 5xxs on unrelated
   events invites Stripe to disable it, breaking every future purchase. A session
   carrying only a `metadata.bookingId` lands here now that room booking is retired.

`src/test/checkoutFulfillment.test.ts` pins the dispatch rule and the required-field
matrix; `scripts/replay_stripe_webhook.cjs` proves the idempotency against the emulator
with genuinely signed events.

**A green `functions` build does not mean CI passes — run the ROOT `npm run build` too**
— the site's build is `tsc -b && vite build`, and `tsc -b` type-checks `src/`, which means
it follows the imports in `src/test/*.test.ts` **into whatever `functions/src/` module they
name**. The site tsconfig has no `node` types and none of the functions dependencies, so a
test importing a module that touches `process.env` or `resend` fails the root build with
`TS2591: Cannot find name 'process'` — while `cd functions && npm run build` passes
happily, because that project does have them. CI's only build step is the root one, so
this ships as a *failed deploy on main*: nothing is released, and the previous revision
keeps serving while everyone assumes the merge went out.

Therefore: every `functions/src/` module a site test imports stays free of Node globals and
external packages — that is why `calendarTime.ts`, `ticketPricing.ts`,
`checkoutFulfillment.ts` and `ticketEmailContent.ts` have no imports at all, while the
Resend/`process.env` half lives in `ticketEmail.ts`, which re-exports the pure half so
callers keep one import site. Before pushing anything under `functions/src/`, run:

```bash
npm run build && (cd functions && npm run build) && npx vitest run && npm run test:rules
```

**Emulator secret overrides in `functions/.secret.local` must be NON-EMPTY** — the file
is gitignored, so a fresh clone has none and the functions emulator fetches the *real*
values from Secret Manager. An empty assignment (`RESEND_API_KEY=`) does not override
anything: the emulator ignores it and falls back to Secret Manager, loading the live
key. Testing the membership path that way sends a genuine welcome email from the
production Resend account — the only thing that stopped one here was Resend refusing
`example.com` recipients. Use a non-empty dummy (`re_emulator_disabled_not_a_real_key`)
and confirm with `grep "Trying to access secret" ` on the emulator log: zero hits means
the overrides took.

**There are three SAHS calendars, and only one is a publication calendar** — the sync
writes to `PUBLIC_EVENTS_CALENDAR_ID` (SAHS Membership Calendar), which is the id
`src/components/public/CalendarSubscribe.tsx` offers visitors on Home and News.
`ROOM_RESOURCE_CALENDAR_ID` is a Workspace **room resource** ("Carmichael House-1-Meeting
Room (50)"); booking it means the physical conference room is unavailable to everyone
else. Both live in `functions/src/calendarIds.ts`, named, because they used to be one
constant called `CALENDAR_ID`: the sync was bolted onto the room-booking system's id and
every published website event silently booked the meeting room, including events held
miles away. There is also a "SAHS Board Calendar" that no code touches. Note that
`googleCalendarEventId` on a post is scoped to the calendar the entry was minted on —
repointing the constant without clearing that field strands the post silently, because
patch/delete then 404 into a catch that only logs. `scripts/migrate_calendar_to_
membership.cjs` is the pattern for moving entries between calendars.

**Writes to the Membership Calendar need an explicit ACL grant** — the sync service
account `sahs-calendar-sync@sahs-archives.iam.gserviceaccount.com` must hold "Make
changes to events" (role `writer`) on it. Without the grant every insert 403s into a
catch that only logs, so the sync fails completely silently. A read succeeding does not
prove the grant: reader access is enough for that, and the failure mode is precisely a
grant that reads but cannot write.

**`onPostWritten` will happily put a years-old event on the public calendar** — the
Google Calendar insert path is gated only on the post lacking a `googleCalendarEventId`,
so re-saving an old write-up (or a migration that touches one) is indistinguishable from
publishing a new event. `isLongPast` in `functions/src/calendarTime.ts` suppresses inserts
for anything that started more than 48 hours ago. The window is generous on purpose: naive
Eastern strings are parsed as UTC there, a five-hour error at worst, and an event from
earlier today must still sync. Patching an entry that already exists is deliberately not
guarded — keeping a real calendar entry accurate is right whatever its date.

**Events are seeded by script, and `--prod` is a publish, not a dry run** — an event is
a Firestore `posts` document created by `node scripts/seed_<event>.cjs`, not a committed
content file. Writing a `status: 'published'` post to production fires `onPostWritten`,
which inserts a *real* entry on the SAHS Membership Calendar that members see (subject
to `isLongPast` — see above), and uploads artwork to production Storage. Every seed therefore defaults to the emulator and
requires an explicit `--prod` flag to do anything real. Treat running it as a release.
`scripts/seed_poker_run.cjs` is the reference implementation; `/author-sahs-event` has
the full authoring workflow.

**Never write `ticketsSold` from a script** — `stripeWebhook` owns that counter and
increments it inside a transaction alongside the ticket document. A seed that sets
`ticketsSold: 0` on re-run erases real sales, and the number is not recoverable from the
post. Use `FieldValue.increment(0)` on any update path so the field is left exactly as
found; only the create path may write `ticketsSold: 0`. The same applies to ad-hoc
repair scripts in `scripts/` — read the counter, never assign it. `seed_july4_event.cjs`
violated both halves of this (unconditional `.add()`, `ticketsSold: 0` every run) until
it was brought in line; it is still emulator-only throwaway test data, so copy
`seed_poker_run.cjs` when authoring a real event.

**Event artwork: the aspect ratio is the contract, the pixel size is only a floor** — a
post carries up to three images, and because every consumer uses `object-cover`, only
the ratio is load-bearing:

| Field | Ratio | Seed convention | Where it renders |
|---|---|---|---|
| `bannerImage` (optional) | **16:9** | 1920×1080 | `NewsDetail` hero, `aspect-[16/9]` |
| `mainImage` (required) | none enforced | 1200×675 | every card + `og:image` + JSON-LD |
| `squareImage` (optional) | **1:1** | 1200×1200 | mid-article block, `aspect-square` |

`mainImage` has no ratio contract at all — every consumer is a fixed-height
`object-cover` box, including a 64×64 **square** thumbnail in the Home sidebar. Compose
it so the subject survives a square crop, and remember it is also the social-preview
image (`Seo.tsx`) and the structured-data image (`EventCard.tsx`), so it is the one that
cannot be quietly wrong. Note that `ContentAdmin`'s upload hints advertise 1280×720 and
`ContentAdmin`'s upload hints carry these same numbers — keep the two in sync. Source files
are committed to `.artwork/<event-name>/` with dimensions in the filename so a fresh
clone can re-run a seed reproducibly. The directory is a short nickname, not the slug —
the only instance is `.artwork/poker-run/` for slug
`cruisin-for-history-poker-run-2026` — and the script hardcodes the path rather than
deriving it, so pick it explicitly.

**A script's emulator mode must never touch Firebase Storage** — `firebase.json`
configures a Storage emulator on 9199, but nothing in the codebase sets
`STORAGE_EMULATOR_HOST`, so the Admin SDK ignores it entirely. An `upload()` call in
emulator mode authenticates with the real service-account key and writes to
**production** Storage. That is why `seed_poker_run.cjs` copies artwork into
`public/poker-run-art/` and references it by site-relative path for local runs, instead
of uploading for parity. Do not "fix" that asymmetry without wiring
`STORAGE_EMULATOR_HOST` first — the obvious cleanup is the bug.

Staging directories are ignored by the glob `public/*-art/`, so **name yours
`<event>-art`** and it is covered automatically. It was a literal `public/poker-run-art/`
line until a second event would have silently left its artwork copies committable;
a name that misses the glob reintroduces exactly that.

**Security rules are code, and they are tested — run `npm run test:rules`** — a
September 2026 audit found six defects in `firestore.rules`/`storage.rules` and none
anywhere else. The pure logic had 213 tests; authorization had zero, and was only ever
exercised by clicking the admin UI *as an admin* — the one identity that passes every
check. So public volunteer signup was denied for four and a half months (the slot
`filledCount` write in `submitVolunteerSignup` needed a rule that did not exist, and it
shares a transaction with the registration, so the whole signup rolled back), editors
and curators could not upload any image, and `/admin/users` silently did nothing for
anyone but the two hardcoded admins.

`test/rules/` covers each collection from every seat — anonymous, `read_only`,
`board_member`, `editor`, `curator`, role-granted admin, permanent admin. **Add a case
whenever you touch a rule**, and write it failing first: a rules test written after the
fix only proves the rules do what they do. The suites live outside `src/` and are `.mjs`
on purpose — they need `node:fs` to read the rules files, and the site tsconfig has no
`node` types, so under `src/` they would fail the ROOT build (the TS2591 trap above).

Two things the emulator cannot do, so do not be misled:

- **Storage rules cannot call `firestore.get()` in the emulator.**
  `cloud-storage-rules-runtime` evaluates it to null and denies. It works in production.
  Those cases are `describe.skip`'d in `test/rules/storage.test.mjs`; the role path that
  *is* covered is the Auth custom claim. After changing `storage.rules`, verify the
  document path by hand: sign in as an editor and attach an image to a post.
- **Rules are not filters.** A `list` query is rejected outright unless the query itself
  carries a constraint satisfying the rule — it does not silently return fewer rows. So
  `posts` being gated on `status == 'published'` means every *public* query must include
  `where('status','==','published')`: `NewsDetail` and `EmbedTickets` both do, and both
  break loudly if it is removed. Staff queries may omit it because `isSAHSStaff()` does
  not reference `resource`.

**`storage.rules` is deployed to a bucket shared with archive-app, and the two repos
overwrite each other** — both deploy `--only storage` to `sahs-archives.firebasestorage.app`,
so whichever merged last owns the policy. The website's `allow read: if true` reverts
archive-app's per-object-ACL fix for private media; archive-app's ruleset breaks the 13
website images that carry no download token. It oscillates. `docs/storage-bucket-separation.md`
is the runbook for giving the website its own bucket; until that lands, change
`storage.rules` as little as possible and never assume only website objects live there.

**Email sends server-side through Resend, from `updates.senoiahistory.com` only** — the
apex `senoiahistory.com` is *not* a verified Resend domain. The Firebase Trigger Email
extension was configured to send as the apex, so all sixteen messages it queued between
April and August 2026 failed with `550 ... domain is not verified` — including real
contact-form enquiries in May and August that nobody ever saw, because the extension
records the error on the document and stops. The `mail` collection is now
`allow read, write: if false`; the contact form files a `submissions` document and
`onSubmissionCreated` sends the notification, while `onVolunteerRegistration` sends the
volunteer confirmation. Both build their bodies in `functions/src/notifyEmailContent.ts`,
which has **no imports** so a site test can pull it into the root build safely.

Closing `mail` also shut an open relay: it was `allow create: if true` so the client
could queue its own mail, which let anyone with the project id send arbitrary HTML from
the society's own authenticated sending domain.

**A site test may only import a functions module that is itself import-free** — this is
the sharper form of the root-build rule above, and the loose form is not enough. TypeScript
type-checks per **module**, not per imported symbol: importing one pure function from
`requireStaff.ts` still makes `tsc -b` resolve *that file's* `firebase-functions/v2/https`
and `express` types.

The trap is that `ci.yml` and `deploy.yml` differ in step order. CI used to install
functions dependencies before building, so those types resolved and the PR went green;
`deploy.yml` installs them *after* the build, so main failed with `TS2307: Cannot find
module 'firebase-functions/v2/https'` and released nothing, leaving the previous revision
serving. PR #71 shipped exactly that.

Two things now prevent it. `ci.yml` builds the site **before** installing functions
dependencies, mirroring deploy.yml so the PR fails instead of main. And every
functions module a site test imports is import-free by construction:
`calendarTime.ts`, `calendarSync.ts`, `ticketPricing.ts`, `checkoutFulfillment.ts`,
`ticketEmailContent.ts`, `notifyEmailContent.ts`, `confirmationNumber.ts` and
`roleLadder.ts`. The dependency-carrying halves — `ticketEmail.ts`, `notifyEmail.ts`,
`requireStaff.ts` — re-export their pure counterparts so callers keep one import site.

Before pushing anything under `functions/src/`, reproduce the deploy condition:

```bash
mv functions/node_modules /tmp/fn_nm && npm run build; mv /tmp/fn_nm functions/node_modules
```
