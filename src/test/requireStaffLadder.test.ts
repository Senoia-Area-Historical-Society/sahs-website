import { describe, it, expect } from 'vitest';
import { satisfies, type Role } from '../../functions/src/roleLadder';

/**
 * The role ladder used by the admin-facing Cloud Functions.
 *
 * Imported from `roleLadder.ts`, NOT from `requireStaff.ts`, and that distinction
 * broke a production deploy once. TypeScript type-checks per *module*, not per imported
 * symbol: importing only `satisfies` from requireStaff.ts still made the root build
 * resolve that file's own `firebase-functions` and `express` types. The PR workflow
 * installs functions dependencies before building so it passed; deploy.yml installs them
 * *after* the build, so main failed with TS2307 and shipped nothing.
 *
 * So: a site test may only import a functions module that is itself import-free.
 */

const ALL: Role[] = ['admin', 'curator', 'editor', 'read_only', 'board_member'];

describe('role ladder', () => {
  it('an admin satisfies every requirement', () => {
    for (const minimum of ALL) expect(satisfies('admin', minimum)).toBe(true);
  });

  it('a curator satisfies everything except admin', () => {
    expect(satisfies('curator', 'admin')).toBe(false);
    for (const minimum of ['curator', 'editor', 'read_only', 'board_member'] as Role[]) {
      expect(satisfies('curator', minimum)).toBe(true);
    }
  });

  it('an editor cannot reach the member roster or the newsletter', () => {
    // listStripeSubscriptions and sendNewsletter both require 'curator'.
    expect(satisfies('editor', 'curator')).toBe(false);
    expect(satisfies('editor', 'admin')).toBe(false);
    expect(satisfies('editor', 'editor')).toBe(true);
  });

  it('view-only roles reach only the door-level endpoints', () => {
    for (const role of ['read_only', 'board_member'] as Role[]) {
      // verifyTicket — check-in is the job a volunteer gets handed at the door.
      expect(satisfies(role, 'board_member')).toBe(true);
      expect(satisfies(role, 'editor')).toBe(false);
      expect(satisfies(role, 'curator')).toBe(false);
    }
  });

  it('every role satisfies itself', () => {
    for (const role of ALL) expect(satisfies(role, role)).toBe(true);
  });
});
