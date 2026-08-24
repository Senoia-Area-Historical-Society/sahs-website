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
npm run emulators   # separate terminal — starts Auth/Functions/Firestore/Storage
npm run dev         # connects automatically on localhost
```

## Browser Verification (Agent Path)

```bash
# Public site
chromium-cli navigate http://localhost:5173
chromium-cli screenshot --output /tmp/sahs-home.png

# News listing
chromium-cli navigate http://localhost:5173/news
chromium-cli screenshot --output /tmp/sahs-news.png

# Admin login page (auth required to go further)
chromium-cli navigate http://localhost:5173/admin/login
chromium-cli screenshot --output /tmp/sahs-admin.png

# Support / memberships page
chromium-cli navigate http://localhost:5173/support-sahs
chromium-cli screenshot --output /tmp/sahs-support.png
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

**Emulator data persists between runs** — `npm run emulators` imports from `./emulator-data` and exports on exit. Delete that directory to start clean.

**Lightbox CSS imports are required** — `import 'yet-another-react-lightbox/styles.css'` (and per-plugin CSS). Missing these causes invisible or broken lightbox UI.

**Vite port** — Default is `5173`. If something else is on that port, Vite increments to `5174` — update your `chromium-cli` URL accordingly.

## See Also

- `sahs-website/CLAUDE.md` — architecture, file map, edit patterns, Stripe/Resend, all gotchas
- `/author-sahs-event` — create a new event: draft, artwork, seed, verify, publish
- `/run-archive-app` — sibling digital archives platform
