import { describe, it, expect } from 'vitest';
import { buildEditorState, buildPostData, type Post } from '../lib/postEditorMapping';

/**
 * These tests guard one specific class of bug in the ContentAdmin post editor:
 *
 *   `buildPostData` writes a stored field FROM a display-only field under a
 *   different name. If `buildEditorState` forgets to seed that display field from
 *   its stored counterpart, opening a post and saving it silently blanks the
 *   stored value. `eventLocation` -> `location` had exactly this defect.
 *
 * The headline test is the generic round-trip invariant below — it catches the
 * *next* rename someone adds, not just the ones we already know about.
 */

/** Minimal stand-in for a Firestore Timestamp (only `toDate` is consumed). */
const ts = (d: Date) => ({ toDate: () => d });

/** Collapse Timestamp / Date to epoch ms so the two representations compare equal. */
const normalize = (v: unknown): unknown => {
  if (v instanceof Date) return v.getTime();
  const maybeTimestamp = v as { toDate?: () => Date } | null;
  if (typeof maybeTimestamp?.toDate === 'function') return maybeTimestamp.toDate().getTime();
  return v;
};

// Whole-minute local times: `timestampToLocalISO` truncates to `YYYY-MM-DDTHH:mm`,
// so seconds/ms would not survive the round-trip by design.
const EVENT_DATE = new Date(2026, 6, 4, 19, 0, 0, 0);
const PUBLISH_DATE = new Date(2026, 5, 1, 9, 30, 0, 0);

const SAVE_OPTS = {
  fallbackAuthor: 'fallback@senoiahistory.com',
  now: { __serverTimestamp: true },
  isNew: false,
};

/**
 * Shape written by `scripts/seed_july4_event.cjs` and by the Webflow migration:
 * canonical `location`, and NO `eventLocation`. This is the fixture that
 * reproduced the wipe.
 */
const seedScriptEvent = (): Post => ({
  id: 'evt-seed',
  type: 'event',
  category: 'Event',
  status: 'published',
  title: 'July 4th Extravaganza',
  slug: 'july-4th-extravaganza-2026',
  author: 'Admin',
  content: '<p>Fireworks and history.</p>',
  excerpt: 'Join us for a spectacular July 4th celebration.',
  mainImage: 'https://example.test/fireworks.jpg',
  galleryImages: [],
  documentUrl: 'https://example.test/flyer.pdf',
  location: 'SAHS Museum',
  ticketPrice: 2500,
  capacity: 150,
  ticketsSold: 12,
  eventDate: ts(EVENT_DATE),
  publishDate: ts(PUBLISH_DATE),
  createdAt: ts(PUBLISH_DATE),
  updatedAt: ts(PUBLISH_DATE),
});

/** Shape written by ContentAdmin itself: both `location` and `eventLocation`. */
const adminCreatedEvent = (): Post => ({
  ...seedScriptEvent(),
  id: 'evt-admin',
  eventLocation: 'SAHS Museum',
  eventStartDate: '2026-07-04T19:00',
  eventEndDate: '2026-07-04T22:00',
  volunteerSheetId: 'sheet-123',
});

/**
 * Fields legitimately absent from / rewritten in the save payload.
 * Anything else present on the stored doc MUST survive the round-trip untouched.
 */
const EXEMPT = new Set([
  'createdAt', // server sentinel
  'updatedAt', // server sentinel
  'ticketsSold', // deliberately omitted so the server-side counter wins
]);

describe('buildEditorState -> buildPostData round-trip', () => {
  // The headline invariant. A new display-field rename that forgets its seed in
  // buildEditorState fails here without anyone having to write a new assertion.
  it.each([
    ['seed-script event (location, no eventLocation)', seedScriptEvent()],
    ['admin-created event (both location and eventLocation)', adminCreatedEvent()],
  ])('preserves every stored field of a %s', (_label, stored) => {
    const saved = buildPostData(buildEditorState(stored), { ...SAVE_OPTS, slug: stored.slug });

    for (const key of Object.keys(stored)) {
      if (EXEMPT.has(key)) continue;
      expect(
        normalize(saved[key]),
        `field "${key}" was not preserved across open-then-save`
      ).toEqual(normalize(stored[key]));
    }
  });

  // Regression guard for the original defect, stated explicitly so a failure
  // names the bug rather than just "some field changed".
  it('does not wipe location on a post that has no eventLocation', () => {
    const stored = seedScriptEvent();
    expect(stored.eventLocation).toBeUndefined();

    const editorState = buildEditorState(stored);
    expect(editorState.eventLocation).toBe('SAHS Museum');

    const saved = buildPostData(editorState, { ...SAVE_OPTS, slug: stored.slug });
    expect(saved.location).toBe('SAHS Museum');
  });

  // Firestore rejects undefined field values unless `ignoreUndefinedProperties` is
  // set, and src/lib/firebase.ts does not set it. An undefined in the payload makes
  // the whole save throw, so the mapper must never introduce one.
  it.each([
    ['seed-script event', seedScriptEvent()],
    ['admin-created event', adminCreatedEvent()],
  ])('emits no undefined values for a %s', (_label, stored) => {
    const saved = buildPostData(buildEditorState(stored), { ...SAVE_OPTS, slug: stored.slug });
    const undefinedKeys = Object.keys(saved).filter(k => saved[k] === undefined);
    expect(undefinedKeys).toEqual([]);
  });
});

describe('buildEditorState seeds every display-only field', () => {
  it('seeds the display fields from their stored counterparts', () => {
    const state = buildEditorState(seedScriptEvent());

    expect(state.eventLocation).toBe('SAHS Museum'); // <- from `location`
    expect(state.eventStartDate).toMatch(/^2026-07-04T19:00$/); // <- from `eventDate`
    expect(state.publishDateDisplay).toMatch(/^2026-06-01T09:30$/); // <- from `publishDate`
    expect(state._ticketPriceDisplay).toBe('25.00'); // <- from `ticketPrice` (cents)
    expect(state._enableTicketing).toBe(true);
  });

  it('prefers an explicit eventLocation over the canonical location', () => {
    const stored = { ...seedScriptEvent(), location: 'Stale Venue', eventLocation: 'New Venue' };
    expect(buildEditorState(stored).eventLocation).toBe('New Venue');
  });

  it('does not resurrect a location the editor intentionally cleared', () => {
    const stored = { ...seedScriptEvent(), location: 'SAHS Museum', eventLocation: '' };
    expect(buildEditorState(stored).eventLocation).toBe('');
  });

  it('enables the volunteer toggle only when a sheet is linked', () => {
    expect(buildEditorState(seedScriptEvent())._enableVolunteer).toBe(false);
    expect(buildEditorState(adminCreatedEvent())._enableVolunteer).toBe(true);
  });
});

describe('buildPostData', () => {
  it('keeps a linked volunteer sheet and drops it when the toggle is off', () => {
    const stored = adminCreatedEvent();
    const on = buildPostData(buildEditorState(stored), { ...SAVE_OPTS, slug: stored.slug });
    expect(on.volunteerSheetId).toBe('sheet-123');

    const off = buildPostData(
      { ...buildEditorState(stored), _enableVolunteer: false },
      { ...SAVE_OPTS, slug: stored.slug }
    );
    expect(off.volunteerSheetId).toBeNull();
  });

  it('clears ticketing fields when ticketing is turned off', () => {
    const stored = seedScriptEvent();
    const saved = buildPostData(
      { ...buildEditorState(stored), _enableTicketing: false },
      { ...SAVE_OPTS, slug: stored.slug }
    );
    expect(saved.ticketPrice).toBeNull();
    expect(saved.capacity).toBeNull();
  });

  it('strips display-only fields from the saved payload', () => {
    const stored = adminCreatedEvent();
    const saved = buildPostData(buildEditorState(stored), { ...SAVE_OPTS, slug: stored.slug });

    expect(saved).not.toHaveProperty('publishDateDisplay');
    expect(saved).not.toHaveProperty('_enableTicketing');
    expect(saved).not.toHaveProperty('_ticketPriceDisplay');
    expect(saved).not.toHaveProperty('_enableVolunteer');
    expect(saved).not.toHaveProperty('ticketsSold');
  });

  it('converts the display price in dollars to integer cents', () => {
    const stored = seedScriptEvent();
    const saved = buildPostData(
      { ...buildEditorState(stored), _ticketPriceDisplay: '12.34' },
      { ...SAVE_OPTS, slug: stored.slug }
    );
    expect(saved.ticketPrice).toBe(1234);
  });

  it('stamps createdAt and publishDate with the server sentinel for a new post', () => {
    const saved = buildPostData(
      { title: 'Fresh', category: 'News' },
      { ...SAVE_OPTS, slug: 'fresh', isNew: true }
    );
    expect(saved.createdAt).toBe(SAVE_OPTS.now);
    expect(saved.publishDate).toBe(SAVE_OPTS.now);
    expect(saved.type).toBe('news');
    expect(saved.status).toBe('draft');
    expect(saved.author).toBe('fallback@senoiahistory.com');
  });
});
