import { describe, it, expect } from 'vitest';
import { toRfc3339, addHours, isNaiveLocal, resolveEventWindow } from '../../functions/src/calendarTime';

/**
 * The bug these guard: `eventEndDate` is a naive `datetime-local` string typed in
 * Eastern time. Running it through `new Date(...).toISOString()` on Cloud Run (whose
 * local zone is UTC) reinterprets "22:00" as 22:00 UTC — 6 PM Eastern — which for an
 * evening event lands the end BEFORE the start. `events.insert` rejects end < start
 * with a 400, so the calendar entry silently never appears.
 */

const ts = (iso: string) => ({ toDate: () => new Date(iso) });

describe('toRfc3339', () => {
  it('appends seconds to a datetime-local value without inventing an offset', () => {
    expect(toRfc3339('2026-07-04T22:00')).toBe('2026-07-04T22:00:00');
  });

  it('leaves an absolute instant untouched', () => {
    expect(toRfc3339('2026-07-04T23:00:00.000Z')).toBe('2026-07-04T23:00:00.000Z');
    expect(toRfc3339('2026-07-04T19:00:00-04:00')).toBe('2026-07-04T19:00:00-04:00');
  });

  it('passes through a value that already has seconds', () => {
    expect(toRfc3339('2026-07-04T22:00:00')).toBe('2026-07-04T22:00:00');
  });

  it('returns null for empty or unusable input rather than a fabricated date', () => {
    expect(toRfc3339('')).toBeNull();
    expect(toRfc3339('   ')).toBeNull();
    expect(toRfc3339(undefined)).toBeNull();
    expect(toRfc3339(null)).toBeNull();
    expect(toRfc3339('next Tuesday')).toBeNull();
  });

  it('never converts a naive value into a UTC instant', () => {
    // The regression itself: the old code produced '2026-07-04T22:00:00.000Z'.
    expect(toRfc3339('2026-07-04T22:00')).not.toMatch(/Z$/);
  });
});

describe('isNaiveLocal', () => {
  it('distinguishes offset-bearing values from wall-clock ones', () => {
    expect(isNaiveLocal('2026-07-04T22:00:00')).toBe(true);
    expect(isNaiveLocal('2026-07-04T22:00:00Z')).toBe(false);
    expect(isNaiveLocal('2026-07-04T22:00:00-04:00')).toBe(false);
  });
});

describe('addHours', () => {
  it('shifts a naive value in wall-clock space and keeps it naive', () => {
    expect(addHours('2026-07-04T19:00:00', 2)).toBe('2026-07-04T21:00:00');
  });

  it('rolls a naive value over midnight correctly', () => {
    expect(addHours('2026-07-04T23:30:00', 2)).toBe('2026-07-05T01:30:00');
  });

  it('shifts an absolute instant and keeps it absolute', () => {
    expect(addHours('2026-07-04T23:00:00.000Z', 2)).toBe('2026-07-05T01:00:00.000Z');
  });
});

describe('resolveEventWindow', () => {
  it('keeps the end after the start for an evening event (the 400-rejection case)', () => {
    const w = resolveEventWindow({
      eventDate: ts('2026-07-04T23:00:00.000Z'), // 7:00 PM EDT
      eventEndDate: '2026-07-04T22:00', // 10:00 PM EDT, as typed
    })!;

    expect(w.startDateTime).toBe('2026-07-04T23:00:00.000Z');
    expect(w.endDateTime).toBe('2026-07-04T22:00:00');
    // Both are read against timeZone America/New_York by the Calendar request, so the
    // end resolves to 02:00Z the next day — after the start. Under the old code the end
    // became 22:00Z, i.e. four hours BEFORE the start.
    expect(new Date(`${w.endDateTime}-04:00`).getTime()).toBeGreaterThan(
      new Date(w.startDateTime).getTime()
    );
  });

  it('defaults to a two-hour window when no end date is set', () => {
    const w = resolveEventWindow({ eventDate: ts('2026-07-04T23:00:00.000Z') })!;
    expect(w.startDateTime).toBe('2026-07-04T23:00:00.000Z');
    expect(w.endDateTime).toBe('2026-07-05T01:00:00.000Z');
  });

  it('falls back to the naive eventStartDate when there is no eventDate', () => {
    const w = resolveEventWindow({ eventStartDate: '2026-07-04T19:00' })!;
    expect(w.startDateTime).toBe('2026-07-04T19:00:00');
    expect(w.endDateTime).toBe('2026-07-04T21:00:00'); // naive default stays naive
  });

  it('returns null when there is no usable date, so callers skip rather than invent one', () => {
    expect(resolveEventWindow({})).toBeNull();
    expect(resolveEventWindow({ eventDate: null, eventStartDate: '' })).toBeNull();
  });
});
