/**
 * The role ladder shared by the admin-facing Cloud Functions and `firestore.rules`.
 *
 * This module has NO imports, and that is the whole reason it exists separately from
 * `requireStaff.ts`.
 *
 * `src/test/requireStaffLadder.test.ts` imports `satisfies` from here, and the site's
 * `tsc -b` follows that import. Type-checking is per *module*, not per imported symbol:
 * pulling one pure function out of a file still type-checks that file's own imports. So
 * when the ladder lived in `requireStaff.ts` alongside `firebase-functions/v2/https` and
 * `express`, the root build needed those types to resolve — and it failed with TS2307
 * the moment `functions/node_modules` was absent.
 *
 * That is not hypothetical, and it is worth being precise about why CI missed it: the PR
 * workflow runs `npm ci --prefix functions` before building, so the types resolve and the
 * build passes. `deploy.yml` installs functions dependencies *after* the build step, so
 * the same command fails there — a green PR and a failed deploy on main, with nothing
 * released and the previous revision left serving. Exactly the failure mode CLAUDE.md
 * documents, reached by a route the documentation did not spell out.
 *
 * Keep this file import-free. The `firebase-admin` half lives in `requireStaff.ts`,
 * which re-exports these so callers keep one import site.
 */

export type Role = 'admin' | 'curator' | 'editor' | 'read_only' | 'board_member';

/** Highest-privilege first; index order is the ladder. */
export const LADDER: Role[] = ['admin', 'curator', 'editor', 'read_only', 'board_member'];

export const PERMANENT_ADMINS = [
  'catnolan@senoiahistory.com',
  'jeremywarren@senoiahistory.com',
];

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (LADDER as string[]).includes(value);
}

/** True when `role` is at least as privileged as `minimum`. */
export function satisfies(role: Role, minimum: Role): boolean {
  return LADDER.indexOf(role) <= LADDER.indexOf(minimum);
}
