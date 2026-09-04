import type { Request } from 'firebase-functions/v2/https';
import type { Response } from 'express';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { LADDER, PERMANENT_ADMINS, isRole, satisfies, type Role } from './roleLadder';

// Re-exported so callers have one import site. The definitions live in roleLadder.ts,
// which is import-free — a site test can pull `satisfies` into the ROOT build from there
// without the build also having to resolve this file's `firebase-functions` and `express`
// types. Importing them from *here* is what broke a production deploy; see the note at
// the top of roleLadder.ts.
export { LADDER, PERMANENT_ADMINS, isRole, satisfies, type Role };

/**
 * ID-token authorization for the admin-facing HTTP functions.
 *
 * `onRequest` has no implicit auth: every one of these is a public HTTPS URL on
 * cloudfunctions.net, invokable by anyone who knows it — and the URLs are in the
 * production JS bundle every visitor downloads. Before this module, a grep for
 * `verifyIdToken` across functions/src returned zero hits, which meant:
 *
 *   • `sendNewsletter` would broadcast attacker-authored HTML to the entire member
 *     audience, or send it from the society's domain to any address, on one POST.
 *   • `listStripeSubscriptions` returned every member's name, email, level, status
 *     and subscription id to a plain unauthenticated GET.
 *
 * Both were verified reachable in production: an anonymous request reaches the
 * handler's own method guard (405), not a 403 from Cloud Run IAM.
 *
 * The role is re-read from `user_roles` server-side rather than trusted from the
 * token, so the same document that grants portal access grants API access — one
 * source of truth, and revoking a role takes effect immediately instead of when the
 * token expires.
 */

export interface StaffIdentity {
  email: string;
  role: Role;
}

/**
 * Verifies the caller's Firebase ID token and resolves their role.
 *
 * Returns `null` and writes the response when the caller is not authorized, so the
 * handler can simply `if (!staff) return;`.
 */
export async function requireStaff(
  req: Request,
  res: Response,
  minimum: Role = 'curator'
): Promise<StaffIdentity | null> {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : '';
  if (!token) {
    res.status(401).json({ error: 'Sign-in required.' });
    return null;
  }

  let email: string;
  try {
    const decoded = await getAuth().verifyIdToken(token);
    if (!decoded.email) {
      res.status(403).json({ error: 'This account has no email address.' });
      return null;
    }
    email = decoded.email.toLowerCase();
  } catch (err) {
    console.warn('requireStaff: token verification failed', err);
    res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
    return null;
  }

  if (PERMANENT_ADMINS.includes(email)) return { email, role: 'admin' };

  // Access is granted by a user_roles document, never by the email domain — a
  // brand-new @senoiahistory.com account has no access until someone grants it.
  const snap = await getFirestore().doc(`user_roles/${email}`).get();
  const role = snap.get('role');
  if (!isRole(role)) {
    res.status(403).json({ error: 'Your account does not have access to this feature.' });
    return null;
  }
  if (!satisfies(role, minimum)) {
    res.status(403).json({ error: 'Your role does not have access to this feature.' });
    return null;
  }
  return { email, role };
}
