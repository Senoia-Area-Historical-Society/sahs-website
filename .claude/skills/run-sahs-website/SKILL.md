---
name: run-sahs-website
description: >
  Run, start, screenshot, or verify the SAHS public website and admin portal.
  Use when asked to launch the dev server, take a screenshot, confirm a change
  works in the browser, or test a public/admin page. For architecture and edit
  patterns, see CLAUDE.md in this directory. Sibling: /run-archive-app.
---

# Run: SAHS Website

Web app — driven with `chromium-cli` against the Vite dev server. All architectural context is in `sahs-website/CLAUDE.md`.

## Prerequisites

Node and npm must be installed. Firebase emulators optional — the dev server connects to them automatically if running, otherwise it hits production Firestore.

## Start Dev Server

```bash
# From sahs-website/
npm run dev
# Vite starts on http://localhost:5173
```

To also run Firebase emulators (isolated local data):
```bash
npx firebase emulators:start --only firestore,auth   # separate terminal
npm run dev                                          # connects automatically on localhost
```

**Prefer that over `npm run emulators` for page verification.** The full command also
starts the **Functions** emulator, which runs `onPostWritten` for real — and there is no
Google Calendar emulator, so a seeded post authenticates with real Application Default
Credentials and writes to the live SAHS Membership Calendar that members subscribe to.
`functions/src/calendarGuard.ts` now suppresses that, but the principle stands: don't
start a trigger you don't need. `npm run emulators` also imports/exports the persisted
`./emulator-data`, which only exists in the main checkout.

Use `npm run emulators` when you are actually testing a Cloud Function.

## Browser Verification (Agent Path)

`chromium-cli` on this machine is **chrome-cli**: the verbs are `open` / `source` /
`execute`, and there is **no `navigate` and no `screenshot`** — `chromium-cli navigate`
answers "No matching handler found", which reads like a broken extension rather than a
wrong verb. For screenshots and rendered-text reads, use the Claude-in-Chrome browser
tools instead; use `chromium-cli` for quick page-source checks.

```bash
# Public site
chromium-cli open http://localhost:5173
chromium-cli source | head -40

# Other pages worth checking
chromium-cli open http://localhost:5173/news
chromium-cli open http://localhost:5173/admin/login      # auth required to go further
chromium-cli open http://localhost:5173/support-sahs
```

## Build & Lint

```bash
npm run build    # TypeScript compile + Vite production build — confirms no type errors
npm run lint     # ESLint
```

## Run-Specific Gotchas

**Functions don't hot-reload** — After editing `functions/src/`, rebuild and restart the emulator:
```bash
cd functions && npm run build
# then restart: Ctrl-C the emulator, npm run emulators again
```

**The Functions emulator reaches production for anything Firebase doesn't emulate** — it
prints `Application Default Credentials detected. Non-emulated services will access
production using these credentials` at startup and it is easy to read past. Google
Calendar and Firebase Storage are both in that category. See the gotchas in CLAUDE.md.

**Emulator data persists between runs** — `npm run emulators` imports from `./emulator-data` and exports on exit. Delete that directory to start clean.

**Lightbox CSS imports are required** — `import 'yet-another-react-lightbox/styles.css'` (and per-plugin CSS). Missing these causes invisible or broken lightbox UI.

**Vite port** — Default is `5173`. If something else is on that port, Vite increments to `5174` — update your `chromium-cli` URL accordingly.

## See Also

- `sahs-website/CLAUDE.md` — architecture, file map, edit patterns, Stripe/Resend, all gotchas
- `/author-sahs-event` — create a new event: draft, artwork, seed, verify, publish
- `/update-sahs-post` — change an event that is already live
- `/run-archive-app` — sibling digital archives platform
