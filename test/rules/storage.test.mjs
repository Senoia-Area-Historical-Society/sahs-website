import { beforeAll, afterAll, describe, it } from 'vitest';
import { ref, uploadBytes, getBytes } from 'firebase/storage';
import { ROLES, ROLE_DOCS, makeEnv, storageAs, allowed, denied } from './helpers.mjs';
import { doc, setDoc } from 'firebase/firestore';

/**
 * Authorization tests for `storage.rules`.
 *
 * These rules had drifted into a different auth model from `firestore.rules` under the
 * same helper name: `isSAHSUser()` compared against two hardcoded addresses and never
 * read `user_roles`, so an editor could write a post but not attach its artwork.
 *
 * `isEditor()` there now accepts a role from EITHER source, and only one of them is
 * testable here:
 *
 *   - an Auth custom claim (`request.auth.token.role`) — covered below.
 *   - a `user_roles` document read via `firestore.get()` — NOT covered. The Storage
 *     emulator's rules runtime (cloud-storage-rules-runtime v1.1.3, current as of
 *     firebase-tools 15.27) does not implement cross-service calls: `firestore.exists`
 *     evaluates to null and the rule denies. It works in production. Those cases are
 *     `it.skip` below rather than deleted, so they run the day the emulator gains
 *     support, and the PR carries a manual post-deploy check instead.
 */

let env;
const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);

/** A Storage handle carrying a `role` custom claim, as archive-app's syncUserRoleClaims sets. */
const withClaim = (email, role) =>
  env.authenticatedContext(`uid-${email}`, { email, email_verified: true, role }).storage();

beforeAll(async () => {
  env = await makeEnv('sahs-storage-rules', { firestore: true, storage: true });
  await env.withSecurityRulesDisabled(async (ctx) => {
    for (const [email, role] of Object.entries(ROLE_DOCS)) {
      await setDoc(doc(ctx.firestore(), 'user_roles', email), { role });
    }
    await uploadBytes(ref(ctx.storage(), 'content_images/existing.png'), bytes);
  });
});

afterAll(async () => {
  await env?.cleanup();
});

describe('regression S1-6: role holders can upload (via Auth custom claim)', () => {
  // The three admin surfaces that upload — ContentAdmin (post artwork and documents),
  // PlacesAdmin (place photos) and RichTextEditor (inline article images) — all call
  // the same `uploadFile` helper, at these prefixes.
  const PREFIXES = ['content_images', 'content_documents', 'historical_places'];

  for (const role of ['editor', 'curator', 'admin']) {
    it(`a ${role} claim can upload to every prefix the admin UI writes to`, async () => {
      const s = withClaim(`${role}@senoiahistory.com`, role);
      for (const prefix of PREFIXES) {
        await allowed(`${role} uploads to ${prefix}/`, () =>
          uploadBytes(ref(s, `${prefix}/${role}.png`), bytes));
      }
    });
  }

  it('a permanent admin can upload with no claim and no role document at all', async () => {
    await allowed('permanent admin uploads', () =>
      uploadBytes(ref(storageAs(env, ROLES.permanentAdmin), 'content_images/pa.png'), bytes));
  });
});

describe('storage stays closed to everyone else', () => {
  it('the anonymous public cannot upload', async () => {
    await denied('anon uploads', () =>
      uploadBytes(ref(storageAs(env, null), 'content_images/evil.png'), bytes));
  });

  it('view-only staff cannot upload', async () => {
    for (const role of ['read_only', 'board_member']) {
      await denied(`${role} uploads`, () =>
        uploadBytes(ref(withClaim(`${role}@senoiahistory.com`, role), 'content_images/evil.png'), bytes));
    }
  });

  it('an authenticated account with no role at all cannot upload', async () => {
    const stranger = env.authenticatedContext('uid-stranger', {
      email: 'brand-new@senoiahistory.com', email_verified: true,
    }).storage();
    await denied('roleless account uploads', () =>
      uploadBytes(ref(stranger, 'content_images/evil.png'), bytes));
  });

  it('a forged role value is not accepted', async () => {
    await denied('bogus role claim uploads', () =>
      uploadBytes(ref(withClaim('x@senoiahistory.com', 'superuser'), 'content_images/evil.png'), bytes));
  });

  it('public read is preserved — the site serves these images to visitors', async () => {
    await allowed('anon reads an image', () =>
      getBytes(ref(storageAs(env, null), 'content_images/existing.png')));
  });
});

describe.skip('role documents via firestore.get() — unsupported by the Storage emulator', () => {
  // Delete the `.skip` once cloud-storage-rules-runtime implements cross-service calls.
  // Until then these fail for a reason that has nothing to do with the rules being wrong.
  for (const seat of ['editor', 'curator', 'overrideAdmin']) {
    it(`${seat} can upload on the strength of their user_roles document alone`, async () => {
      await allowed(`${seat} uploads`, () =>
        uploadBytes(ref(storageAs(env, ROLES[seat]), `content_images/${seat}.png`), bytes));
    });
  }
});
