import { describe, it, expect } from 'vitest';
import { calendarFieldsChanged, CALENDAR_RELEVANT_FIELDS } from '../../functions/src/calendarSync';

/**
 * The waste this guards: `onPostWritten` fires on every write to a post, and each
 * ticket sale increments `ticketsSold`. A run of three sales produced four trigger
 * invocations, each issuing a Calendar API patch that re-sent identical data.
 */

/** Stand-in for a Firestore Timestamp — same instant, different object identity. */
const ts = (iso: string) => ({ toMillis: () => new Date(iso).getTime() });

const post = (overrides: Record<string, unknown> = {}) => ({
  title: 'Yacht Rock Party',
  excerpt: 'Smooth classics with DJ Evan.',
  content: '<p>Smooth classics.</p>',
  location: 'Freeman Sasser Bldg',
  eventStartDate: '2026-08-29T19:00',
  eventEndDate: '2026-08-29T22:00',
  status: 'published',
  ticketsSold: 0,
  ...overrides,
});

describe('calendarFieldsChanged', () => {
  it('ignores a ticket sale — the write that fires this trigger most often', () => {
    expect(calendarFieldsChanged(post({ ticketsSold: 4 }), post({ ticketsSold: 5 }))).toBe(false);
  });

  it('ignores any field the calendar entry is not built from', () => {
    expect(calendarFieldsChanged(post(), post({ slug: 'yacht-rock', updatedAt: 'later' }))).toBe(false);
  });

  it('detects a change to every field the calendar entry IS built from', () => {
    // Guards the pairing itself: if a field is added to the list but the entry does
    // not actually use it — or vice versa — this is the test that should be updated
    // deliberately rather than a patch silently going missing in production.
    for (const field of CALENDAR_RELEVANT_FIELDS) {
      expect(
        calendarFieldsChanged(post({ [field]: 'before' }), post({ [field]: 'after' })),
        `expected a change in "${field}" to trigger a patch`
      ).toBe(true);
    }
  });

  it('compares Firestore Timestamps by instant, not object identity', () => {
    const same = calendarFieldsChanged(
      post({ eventDate: ts('2026-08-29T23:00:00Z') }),
      post({ eventDate: ts('2026-08-29T23:00:00Z') })
    );
    expect(same, 'two Timestamps for the same instant must not read as a change').toBe(false);

    expect(
      calendarFieldsChanged(
        post({ eventDate: ts('2026-08-29T23:00:00Z') }),
        post({ eventDate: ts('2026-08-30T23:00:00Z') })
      )
    ).toBe(true);
  });

  it('treats a missing field and an explicitly null one as the same', () => {
    // `buildPostData` normalizes cleared fields to null, so a post that never had an
    // excerpt and one whose excerpt was cleared produce an identical calendar entry.
    const withoutKey = post();
    delete (withoutKey as Record<string, unknown>).excerpt;
    expect(calendarFieldsChanged(withoutKey, post({ excerpt: null }))).toBe(false);
  });

  it('syncs when there is no prior version to compare against', () => {
    expect(calendarFieldsChanged(undefined, post())).toBe(true);
  });
});
