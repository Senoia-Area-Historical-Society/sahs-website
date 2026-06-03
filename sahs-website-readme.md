# SAHS Website Architecture & Operations Guide

This document contains critical context, common pitfalls, and operational commands for managing the Senoia Area Historical Society (SAHS) website and its Firebase backend. It is intended to help future engineers and AI agents quickly understand the environment and avoid known failure modes.

## ⚠️ Critical Gotchas & Pitfalls

### 1. Environment Variables & Worktrees
The local development server (`npm run dev`) will **fail silently** and render a completely blank white screen if `.env` is missing. 
* **The Error:** `FirebaseError: Firebase: Error (auth/invalid-api-key)`.
* **The Cause:** When using `git worktree add`, `.gitignore` files (like `.env`) are **not** copied to the new worktree automatically. 
* **The Fix:** Always copy the `.env` file from the main project root to your active worktree before starting the Vite dev server.

### 2. Zombie Emulators & Connection Refused
If the local Vite server throws an `auth/network-request-failed` error but the Firestore emulator appears to be running on port `8080`:
* **The Cause:** You likely have an orphaned Java process running the Firestore emulator from a previous session, but the Auth emulator (Node.js on `9099`) has crashed or is missing.
* **The Fix:** Kill all stray emulators before restarting:
  ```bash
  pkill -f "firebase"
  pkill -f "java.*firestore"
  npm run emulators
  ```

### 3. Emulator Data Hydration
Starting the emulators (`npm run emulators`) imports data from the local `emulator-data` directory. If this directory is empty or missing, your local site will have no posts, events, or content.
* **The Fix:** We have provided a script `sync-prod-to-emulator.ts` that will safely connect to the live production database, fetch all collections (posts, historical_places, wiki, organization_entities), and seamlessly write them into your running local emulator.

### 4. Firestore Security Rules & Deployments
The automated GitHub Actions workflow (`.github/workflows/deploy.yml`) deployed upon merges to `main` **only deploys hosting and functions**.
* **The Gotcha:** It **DOES NOT** deploy `firestore.rules`.
* **The Impact:** If you change local security rules but only push to `main`, the frontend will deploy but the production database will retain old rules, leading to immediate `FirebaseError: Missing or insufficient permissions` for end users.
* **The Fix:** Always manually deploy Firestore rules to production when making changes:
  ```bash
  npx firebase-tools deploy --only firestore:rules --project sahs-archives
  ```

### 5. Client SDK vs Admin SDK Quirks
When testing queries (especially complex `where` filters), **do not rely solely on the Admin SDK**.
* The Firebase Admin SDK bypasses **both** Security Rules and complex composite index requirements. A query that succeeds in an Admin SDK script may immediately crash the React frontend if a composite index is missing in `firestore.indexes.json` or if `firestore.rules` blocks the read.
* **The Fix:** Always test your read queries using the standard Firebase Client SDK to accurately mirror frontend behavior.

---

## 🛠️ Important Commands

**Start the Local Frontend:**
```bash
npm run dev
```

**Start the Local Firebase Emulators:**
```bash
npm run emulators
```
*(Runs Auth on 9099, Functions on 5001, Firestore on 8080, and the Emulator UI on 4000)*

**Sync Production Data to Local Emulator:**
*(Ensure `npm run emulators` is actively running first)*
```bash
npx tsx sync-prod-to-emulator.ts
```

**Deploy Security Rules to Production:**
```bash
npx firebase-tools deploy --only firestore:rules --project sahs-archives
```

**Deploy Hosting & Functions to Production (Manual Override):**
```bash
npx firebase-tools deploy --only hosting,functions --project sahs-archives
```
*(Note: Pushing to the `main` branch on GitHub automatically handles this via GitHub Actions).*
