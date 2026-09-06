import { describe, it, expect } from 'vitest';
import { formatDate, startOfDay, toDate, toMillis } from '../lib/firestoreDates';

/** Stands in for a Firestore `Timestamp` without importing the SDK. */
const ts = (iso: string) => ({ toDate: () => new Date(iso) });

describe('toDate', () => {
  it('reads a Firestore Timestamp', () => {
    expect(toDate(ts('2026-09-12T17:00:00.000Z'))?.toISOString()).toBe('2026-09-12T17:00:00.000Z');
  });

  it('reads a Date unchanged', () => {
    const d = new Date('2026-09-12T17:00:00.000Z');
    expect(toDate(d)?.toISOString()).toBe(d.toISOString());
  });

  /**
   * The regression. `posts/N2B4Aq2bwjytBWPe7bVy` ("Yacht Rock Party") stores exactly
   * this string in `updatedAt`, and `post.updatedAt?.toDate()` threw on it —
   * optional chaining guards null, not the wrong type — which blanked /admin/content
   * for every user, on every post, because React unmounts the tree on a render throw.
   */
  it('reads an ISO string, the shape that took the admin page down', () => {
    expect(toDate('2026-08-25T04:13:41.139Z')?.toISOString()).toBe('2026-08-25T04:13:41.139Z');
  });

  it('reads epoch milliseconds', () => {
    expect(toDate(1789000000000)?.getTime()).toBe(1789000000000);
  });

  it('reads the { seconds } shape a Timestamp takes once JSON round-tripped', () => {
    expect(toDate({ seconds: 1789000000, nanoseconds: 0 })?.getTime()).toBe(1789000000000);
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['an empty string', ''],
    ['unparseable text', 'not a date'],
    ['a plain object', { foo: 'bar' }],
    ['an Invalid Date', new Date('nonsense')],
    ['a Timestamp that returns garbage', { toDate: () => 'nope' }],
  ])('returns null for %s rather than throwing', (_label, value) => {
    expect(() => toDate(value)).not.toThrow();
    expect(toDate(value)).toBeNull();
  });
});

describe('toMillis', () => {
  it('converts a Timestamp', () => {
    expect(toMillis(ts('2026-09-12T17:00:00.000Z'))).toBe(Date.parse('2026-09-12T17:00:00.000Z'));
  });

  it('converts a string, so a mixed-shape collection still sorts', () => {
    expect(toMillis('2026-08-25T04:13:41.139Z')).toBe(Date.parse('2026-08-25T04:13:41.139Z'));
  });

  it('is 0 when absent, sorting undated documents last in a descending sort', () => {
    expect(toMillis(undefined)).toBe(0);
    expect(toMillis(null)).toBe(0);
  });
});

describe('formatDate', () => {
  it('formats a Timestamp', () => {
    expect(formatDate(ts('2026-09-12T17:00:00.000Z'))).not.toBe('N/A');
  });

  it('formats a string instead of throwing', () => {
    expect(() => formatDate('2026-08-25T04:13:41.139Z')).not.toThrow();
    expect(formatDate('2026-08-25T04:13:41.139Z')).not.toBe('N/A');
  });

  it('falls back for an unusable value', () => {
    expect(formatDate(null)).toBe('N/A');
    expect(formatDate({ nope: true })).toBe('N/A');
    expect(formatDate(undefined, '—')).toBe('—');
  });
});

describe('startOfDay', () => {
  it('is local midnight of the given day', () => {
    const d = startOfDay(new Date(2026, 8, 5, 14, 30, 15, 250));
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 8, 5]);
    expect([d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds()]).toEqual([0, 0, 0, 0]);
  });

  it('does not mutate its argument', () => {
    const now = new Date(2026, 8, 5, 14, 30);
    startOfDay(now);
    expect(now.getHours()).toBe(14);
  });
});
