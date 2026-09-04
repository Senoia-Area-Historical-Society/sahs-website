import { defineConfig } from 'vitest/config';

// Rules tests live outside `src/` on purpose.
//
// `tsconfig.app.json` includes only `src`, and the root build is `tsc -b && vite build`.
// A rules test needs `node:fs` to read the .rules file, and the site project has no
// `@types/node` — so a rules test under `src/` would fail the ROOT build with TS2591
// while `npm test` passed, which is the exact trap documented in CLAUDE.md. Keeping
// them here (and as .mjs) means tsc never sees them at all.
//
// These need live emulators, so they are a separate `npm run test:rules` rather than
// part of `npm test`: `firebase emulators:exec` supplies Firestore and Storage.
export default defineConfig({
  test: {
    include: ['test/rules/**/*.test.mjs'],
    environment: 'node',
    globals: true,
    // Rule evaluation against an emulator is slower than a pure unit test, and the
    // suites share one emulator instance, so they must not run concurrently.
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 30000,
  },
});
