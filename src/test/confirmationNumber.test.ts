import { describe, it, expect } from 'vitest';
import {
  confirmationNumberFrom,
  CONFIRMATION_ALPHABET,
  CONFIRMATION_LENGTH,
  REJECTION_THRESHOLD,
} from '../../functions/src/confirmationNumber';

/**
 * Injecting the byte source is what makes this testable — the randomness is real at the
 * call site in index.ts, and deterministic here. `confirmationNumber.ts` has no imports
 * so the site's `tsc -b` can follow this one safely (CLAUDE.md, root build).
 */

/** Feeds a fixed sequence, then throws rather than looping forever on a bug. */
const bytes = (...seq: number[]) => {
  let i = 0;
  return () => {
    if (i >= seq.length) throw new Error('byte source exhausted');
    return seq[i++];
  };
};

describe('alphabet', () => {
  it('excludes the characters that are ambiguous when read aloud or typed', () => {
    for (const ambiguous of ['I', 'L', 'O', '0', '1']) {
      expect(CONFIRMATION_ALPHABET).not.toContain(ambiguous);
    }
  });

  it('has no duplicate characters', () => {
    expect(new Set(CONFIRMATION_ALPHABET).size).toBe(CONFIRMATION_ALPHABET.length);
  });
});

describe('rejection sampling', () => {
  // The regression: `randomBytes(1)[0] % 31` over a uniform 0..255 byte maps 248..255
  // back onto A..H, so those eight letters would appear 9 times in 256 against 8 for
  // the other 23 — `js/biased-cryptographic-random`, and a narrower search space for
  // the one credential verifyTicket admits people on.
  it('threshold is the largest multiple of the alphabet size that fits in a byte', () => {
    expect(REJECTION_THRESHOLD % CONFIRMATION_ALPHABET.length).toBe(0);
    expect(REJECTION_THRESHOLD).toBeLessThanOrEqual(256);
    expect(REJECTION_THRESHOLD + CONFIRMATION_ALPHABET.length).toBeGreaterThan(256);
    expect(REJECTION_THRESHOLD).toBe(248);
  });

  it('discards an out-of-range byte instead of folding it in', () => {
    // 248 would have become 'A' (248 % 31 === 0) under the biased version.
    const code = confirmationNumberFrom(bytes(248, 255, 250, ...Array(8).fill(1)));
    expect(code).toBe(CONFIRMATION_ALPHABET[1].repeat(CONFIRMATION_LENGTH));
  });

  it('maps every accepted byte value exactly evenly across the alphabet', () => {
    // Each of the 248 accepted values, once. A uniform mapping gives each of the 31
    // characters exactly 8 hits; the biased version gave A..H nine.
    const counts = new Map<string, number>();
    for (let b = 0; b < REJECTION_THRESHOLD; b++) {
      const ch = confirmationNumberFrom(bytes(...Array(CONFIRMATION_LENGTH).fill(b)))[0];
      counts.set(ch, (counts.get(ch) ?? 0) + 1);
    }
    expect(counts.size).toBe(CONFIRMATION_ALPHABET.length);
    expect([...new Set(counts.values())]).toEqual([REJECTION_THRESHOLD / CONFIRMATION_ALPHABET.length]);
  });
});

describe('output shape', () => {
  it('is always exactly the expected length', () => {
    const code = confirmationNumberFrom(bytes(...Array(CONFIRMATION_LENGTH).fill(5)));
    expect(code).toHaveLength(CONFIRMATION_LENGTH);
  });

  it('draws only from the alphabet, over a real random source', () => {
    // The old implementation could also emit 7 characters instead of 8 (~1 in 150,000)
    // because `Math.random().toString(36)` is not fixed-width.
    for (let i = 0; i < 2000; i++) {
      const code = confirmationNumberFrom(() => Math.floor(Math.random() * 256));
      expect(code).toHaveLength(CONFIRMATION_LENGTH);
      expect(code).toMatch(new RegExp(`^[${CONFIRMATION_ALPHABET}]+$`));
    }
  });
});
