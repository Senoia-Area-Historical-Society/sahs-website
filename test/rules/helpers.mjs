import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';

/**
 * The role matrix these suites test against.
 *
 * Every defect the September 2026 audit found was invisible to an administrator,
 * because an administrator is the only identity anyone ever tests with. So the
 * unit of testing here is the *role*, not the operation: each collection is
 * exercised from every seat that can reach it, including the anonymous public.
 *
 * `permanentAdmin` and `overrideAdmin` are deliberately separate. They are the same
 * privilege level in `AuthContext`, and they were NOT the same in the rules — which
 * is how `/admin/users` came to look functional and do nothing for anyone but the two
 * hardcoded addresses.
 */
export const ROLES = {
  anon: null,
  readOnly: 'readonly@senoiahistory.com',
  boardMember: 'board@senoiahistory.com',
  editor: 'editor@senoiahistory.com',
  curator: 'curator@senoiahistory.com',
  overrideAdmin: 'override-admin@senoiahistory.com',
  permanentAdmin: 'jeremywarren@senoiahistory.com',
};

/** The `user_roles` documents that back ROLES. Permanent admins have no document by design. */
export const ROLE_DOCS = {
  'readonly@senoiahistory.com': 'read_only',
  'board@senoiahistory.com': 'board_member',
  'editor@senoiahistory.com': 'editor',
  'curator@senoiahistory.com': 'curator',
  'override-admin@senoiahistory.com': 'admin',
};

export async function makeEnv(projectId, { firestore = false, storage = false } = {}) {
  return initializeTestEnvironment({
    projectId,
    ...(firestore && {
      firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
    }),
    ...(storage && {
      storage: { rules: readFileSync('storage.rules', 'utf8'), host: '127.0.0.1', port: 9199 },
    }),
  });
}

/** A Firestore handle for one seat in ROLES. `email: null` is the anonymous public. */
export const dbAs = (env, email) =>
  email
    ? env.authenticatedContext(`uid-${email}`, { email, email_verified: true }).firestore()
    : env.unauthenticatedContext().firestore();

/** A Storage handle for one seat in ROLES. */
export const storageAs = (env, email) =>
  email
    ? env.authenticatedContext(`uid-${email}`, { email, email_verified: true }).storage()
    : env.unauthenticatedContext().storage();

/**
 * `assertSucceeds`/`assertFails` from the SDK report "expected to succeed" without
 * saying which seat or which rule, and these suites run the same operation from seven
 * seats. These wrappers put the role in the failure message instead.
 */
export async function allowed(label, fn) {
  try {
    return await fn();
  } catch (err) {
    throw new Error(`Expected ${label} to be ALLOWED, but it was denied: ${err.message}`);
  }
}

export async function denied(label, fn) {
  let ok = false;
  try {
    await fn();
    ok = true;
  } catch {
    return;
  }
  if (ok) throw new Error(`Expected ${label} to be DENIED, but it succeeded.`);
}
