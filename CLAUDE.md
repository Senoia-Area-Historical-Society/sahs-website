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
| Auth | Firebase Auth — Google OAuth, `@senoiahistory.com` accounts only |
| Database | Cloud Firestore — **default database** |
| Storage | Firebase Storage (bucket shared with archive-app) |
| Functions | Cloud Functions v2, TypeScript, Node 24, codebase `website` |
| Payments | Stripe Checkout |
| Email | Resend + React Email v6 |
| Calendar | Google Calendar API (event/booking sync via service account) |
| Gallery lightbox | yet-another-react-lightbox |
| Testing | Vitest (unit) + Playwright (E2E) |

## Firebase / GCP

- **GCP project:** `sahs-archives` — shared with archive-app
- **Firestore:** default database (website data only). Archive-app uses the `sahs-archives` named DB.
- **Hosting targets:** `sahs-website-public` (main site), `sahs-shortlinks` (shortlink redirect function)
- **Functions codebase:** `website` — distinct from archive-app's `archives` codebase
- **Auth:** Shared Firebase Auth instance across both apps — same `@senoiahistory.com` gate
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
| `bookings` | Meeting room rental requests — pending/confirmed/cancelled | Public read confirmed; curators manage |
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
| `/admin/bookings` | `BookingsAdmin.tsx` | Room booking management |
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
| `checkCalendarAvailability` | HTTP POST | Google Calendar free/busy query for meeting room |
| `createBookingCheckoutSession` | HTTP POST | Creates pending booking doc + Stripe checkout ($50) |
| `createMembershipCheckoutSession` | HTTP POST | Stripe checkout for membership tiers |
| `createTicketCheckoutSession` | HTTP POST | Stripe checkout for event tickets |
| `listStripeSubscriptions` | HTTP GET/POST | Lists all Stripe subscriptions for admin view |
| `stripeWebhook` | HTTP POST | Handles `checkout.session.completed` — creates membership/ticket/booking records, sends welcome email, adds Resend contact |
| `verifyTicket` | HTTP GET/POST | QR scanner endpoint — validates ticket by `confirmationNumber` |
| `onBookingConfirmed` | Firestore trigger | Watches `bookings/{id}` status → `confirmed`; inserts Google Calendar event |
| `onPostWritten` | Firestore trigger | Watches `posts/{id}` type=`event`; syncs create/update/delete to Google Calendar |
| `getMembershipByEmail` | HTTP GET/POST | Self-service Stripe lookup by email |
| `renderEmailPreview` | HTTP POST | Returns rendered HTML for admin email preview iframe |
| `sendNewsletter` | HTTP POST | Test send or Resend broadcast to audience |
| `shortlinkRedirect` | HTTP GET | `shortlinks` → `posts` → homepage fallback 301 redirect |

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
functions are already safe the same way: `createMembershipCheckoutSession` uses a
server-side `priceMap` keyed by tier, `createBookingCheckoutSession` hardcodes 5000.
Capacity is deliberately *not* enforced here — overselling needs transaction
semantics around `ticketsSold` and is a separate problem.

**`onPostWritten` will happily put a years-old event on the public calendar** — the
Google Calendar insert path is gated only on the post lacking a `googleCalendarEventId`,
so re-saving an old write-up (or a migration that touches one) is indistinguishable from
publishing a new event. `isLongPast` in `functions/src/calendarTime.ts` suppresses inserts
for anything that started more than 48 hours ago. The window is generous on purpose: naive
Eastern strings are parsed as UTC there, a five-hour error at worst, and an event from
earlier today must still sync. Patching an entry that already exists is deliberately not
guarded — keeping a real calendar entry accurate is right whatever its date.
