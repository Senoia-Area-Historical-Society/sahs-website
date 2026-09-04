import { describe, it, expect } from 'vitest';
import { satisfies, type Role } from '../../functions/src/requireStaff';

/**
 * The role ladder used by the admin-facing Cloud Functions.
 *
 * Only the pure comparison is exercised here. `requireStaff` itself needs
 * firebase-admin and is covered by the rules suite and by manual verification —
 * importing it from a site test would drag `firebase-admin` into the ROOT build,
 * which has neither its types nor `@types/node`. That is the TS2591 trap in
 * CLAUDE.md, and it is why only `satisfies` and the `Role` type are imported here.
 * Keep it that way: this file must not import the module's side-effecting half.
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
