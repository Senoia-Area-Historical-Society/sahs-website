/**
 * Ticket confirmation numbers.
 *
 * This is the sole credential `verifyTicket` admits people on at the door, so it needs
 * a cryptographically secure source AND an unbiased mapping onto the alphabet. It began
 * as `Math.random().toString(36).substring(2, 10)`, which fails the first requirement:
 * V8's PRNG state is recoverable from observed outputs.
 *
 * The obvious replacement — `randomBytes(8)[i] % ALPHABET.length` — fails the second.
 * A byte is uniform over 0..255 and the alphabet has 31 characters; 256 = 8×31 + 8, so
 * the first eight letters would come up 9 times in 256 against 8 for the rest. Small,
 * but it is exactly the kind of bias that narrows a search space, and CodeQL flags it
 * (`js/biased-cryptographic-random`). Hence rejection sampling: discard any byte at or
 * above the largest multiple of the alphabet size that fits, and the modulo is uniform.
 *
 * This module has NO imports on purpose — `src/test/confirmationNumber.test.ts` imports
 * it, and the site's `tsc -b` follows that import. `randomBytes` lives at the call site
 * in index.ts, injected through `nextByte`, which is also what makes the mapping
 * testable with a deterministic byte source. See CLAUDE.md on the root build.
 */

/**
 * Deliberately excludes I, L, O, 0 and 1: confirmation numbers get read aloud over the
 * phone and typed in by hand at a check-in desk. 31 characters.
 */
export const CONFIRMATION_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export const CONFIRMATION_LENGTH = 8;

/**
 * Bytes at or above this are discarded rather than folded in.
 *
 * 248 = the largest multiple of 31 that fits in a byte. Values 248..255 would map onto
 * A..H a second time and make those eight letters more likely than the other 23.
 */
export const REJECTION_THRESHOLD =
  256 - (256 % CONFIRMATION_ALPHABET.length);

/**
 * Draws `CONFIRMATION_LENGTH` characters, one accepted byte at a time.
 *
 * `nextByte` must return a uniformly random integer in 0..255. It is called more than
 * `CONFIRMATION_LENGTH` times whenever a draw is rejected — about 3% of the time.
 */
export function confirmationNumberFrom(nextByte: () => number): string {
  let out = '';
  while (out.length < CONFIRMATION_LENGTH) {
    const byte = nextByte();
    if (byte >= REJECTION_THRESHOLD) continue;
    out += CONFIRMATION_ALPHABET[byte % CONFIRMATION_ALPHABET.length];
  }
  return out;
}
