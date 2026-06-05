# sahs-website — CLAUDE.md

Public website (`senoiahistory.com`) and admin portal (`admin.senoiahistory.com`) for the Senoia Area Historical Society. Part of a two-app monorepo — see `../archive-app/` for the sibling digital archives platform and `../CLAUDE.md` for the monorepo overview.

## Tech Stack

| Layer | Technology |
|---|---|
| Build | Vite 8, TypeScript 5.9 |
| Frontend | React 19, React Router 7 |
| Styling | Tailwind CSS 3.4 + `@tailwindcss/typography` |
| Rich text | TipTap v3 (starter-kit, link, image, underline, text-align, youtube) |
| Icons | Lucide React |
| Auth | Firebase Auth — Google OAuth, `@senoiahistory.com` accounts only |
| Database | Cloud Firestore — **default database** |
| Storage | Firebase Storage (bucket shared with archive-app) |
| Functions | Cloud Functions v2, TypeScript, Node 24, codebase `website` |
| Payments | Stripe Checkout |
| Email | Resend + React Email v6 |
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

Both apps read `user_roles` from the **default Firestore** (same collection, shared logic). `ProtectedRoute` wraps all `/admin/*` routes. Admin subdomain auto-redirects to `/admin/content`. Firestore and Storage rules mirror this via `isSAHSUser()`, `isEditor()`, `isCurator()`, `isAdmin()` helpers.

## Membership & Stripe

Tiers: Sustaining ($25,000/yr) · Family Senior ($75) · Family ($50) · Individual Senior ($40) · Student ($25) · Individual ($35) · Member ($35)

Flow: Stripe Checkout → `stripeWebhook` function → Resend welcome email → contact added to Resend Audience (`RESEND_AUDIENCE_ID` = `725e0bbc-33c0-4bc4-a2de-3252c0ab757c` in Secret Manager). Backfill existing members: `node scripts/backfill_resend_members.cjs`

## Critical File Map

| File | Purpose |
|---|---|
| `src/lib/firebase.ts` | Firebase init; auto-connects emulators on localhost |
| `src/services/api.ts` | All Firestore read/write operations |
| `src/services/storage.ts` | Firebase Storage upload helpers |
| `src/contexts/AuthContext.tsx` | Auth state and role flags (`isAdmin`, `isCurator`, `isEditor`, `isSAHSUser`) |
| `src/App.tsx` | All routes — public and admin |
| `src/pages/admin/ContentAdmin.tsx` | Primary admin UI (~49KB — content, gallery, drafts) |
| `src/pages/admin/AdminHeader.tsx` | Admin nav — add new nav items to `navGroups` here |
| `src/components/admin/RichTextEditor.tsx` | TipTap editor (link/image/YouTube/iframe) |
| `src/index.css` | Global styles, Tailwind overrides, `.prose a` link styling |
| `functions/src/index.ts` | All Cloud Functions |
| `functions/src/emails/WelcomeEmail.tsx` | React Email welcome template |
| `functions/src/emails/NewsletterEmail.tsx` | React Email newsletter template |
| `firestore.rules` | Security rules — mirrors auth role logic |
| `scripts/` | Ad-hoc Firestore maintenance scripts |

## Admin Routes

`/admin/login` · `/admin` · `/admin/content` · `/admin/bookings` · `/admin/memberships` · `/admin/tickets` · `/admin/tickets/scan` · `/admin/wiki` · `/admin/volunteers` · `/admin/shortlinks` · `/admin/newsletter` · `/admin/users`

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
- `.prose a` in `src/index.css` controls hyperlink appearance in public post content rendered from TipTap HTML
- Admin form inputs use `.input-base` utility class

## Commands

```bash
npm run dev              # Vite dev server — auto-connects emulators on localhost
npm run emulators        # Firebase emulators with persisted data (import/export ./emulator-data)
npm run build            # TypeScript compile + Vite production build
npm run lint             # ESLint
npm test                 # Vitest unit tests
npm run test:e2e:local   # Playwright E2E against localhost:5173
npx tsx scripts/<name>.ts   # One-off TypeScript Firestore scripts
node scripts/<name>.cjs     # One-off CJS Firestore scripts
```

## Deployment

```bash
npm run build
firebase deploy --only hosting        # dist/ → Firebase Hosting (both targets)
firebase deploy --only functions      # Cloud Functions (website codebase)
firebase deploy --only firestore:rules
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
