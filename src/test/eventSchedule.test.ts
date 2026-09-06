import { describe, it, expect } from 'vitest';
import { isUpcoming, occurredAtMillis, pastEvents, upcomingEvents, type DatedPost } from '../lib/eventSchedule';

/** Stands in for a Firestore `Timestamp` without importing the SDK. */
const ts = (iso: string) => ({ toDate: () => new Date(iso) });

/** The moment the dashboard reported "0 upcoming events" while /news listed eight. */
const NOW = new Date('2026-09-05T20:17:00.000Z');

// Annotated rather than inferred: every field on `DatedPost` is optional, so a fixture
// carrying only a title trips TypeScript's weak-type check at the call site.
const post = (title: string, fields: DatedPost = {}): DatedPost & { title: string } => ({ title, ...fields });

describe('upcomingEvents', () => {
  it('finds every future event, soonest first', () => {
    const posts = [
      post('Christmas Party', { eventDate: ts('2026-12-10T23:30:00.000Z') }),
      post('Poker Run', { eventDate: ts('2026-09-25T19:00:00.000Z') }),
      post('McIntosh', { eventDate: ts('2026-09-12T17:00:00.000Z') }),
    ];
    expect(upcomingEvents(posts, NOW).map(p => p.title)).toEqual(['McIntosh', 'Poker Run', 'Christmas Party']);
  });

  /**
   * The regression the user reported. The dashboard queried the first 50 published
   * posts by document id (`limit(50)` with no `orderBy` inherits `__name__ ASC`), and
   * every one of the eight real upcoming events sorted outside that window — so it
   * reported zero, with no error, while the public site listed all eight.
   *
   * The selection is now total: it takes every candidate and is never handed a page.
   */
  it('is not affected by how many past posts precede it, or by document order', () => {
    const past = Array.from({ length: 96 }, (_, i) =>
      post(`archive ${i}`, { eventDate: ts('2019-04-01T12:00:00.000Z') })
    );
    const future = [
      post('Car Show', { eventDate: ts('2026-09-26T13:00:00.000Z') }),
      post('Charity Auction', { eventDate: ts('2026-11-14T23:00:00.000Z') }),
    ];
    // Future events last, exactly as an id-ordered window would have buried them.
    expect(upcomingEvents([...past, ...future], NOW).map(p => p.title)).toEqual([
      'Car Show',
      'Charity Auction',
    ]);
  });

  it('keeps an event that started earlier today', () => {
    const morning = post('Coffee', { eventDate: ts('2026-09-05T13:00:00.000Z') }); // 9am ET
    expect(upcomingEvents([morning], NOW).map(p => p.title)).toEqual(['Coffee']);
  });

  it('drops yesterday', () => {
    expect(upcomingEvents([post('Yacht Rock', { eventDate: ts('2026-08-29T23:00:00.000Z') })], NOW)).toEqual([]);
  });

  it('excludes an undated post — an undated post is a write-up, not a plan', () => {
    expect(upcomingEvents([post('1998 news article', { publishDate: ts('1998-01-01T00:00:00.000Z') })], NOW)).toEqual([]);
    expect(upcomingEvents([post('no dates at all')], NOW)).toEqual([]);
  });

  it('handles a string eventDate rather than throwing on it', () => {
    const posts = [post('String-dated', { eventDate: '2026-09-12T17:00:00.000Z' })];
    expect(() => upcomingEvents(posts, NOW)).not.toThrow();
    expect(upcomingEvents(posts, NOW).map(p => p.title)).toEqual(['String-dated']);
  });
});

describe('pastEvents', () => {
  it('is the exact complement of upcomingEvents — no post is in both or neither', () => {
    const posts = [
      post('future', { eventDate: ts('2026-12-10T23:30:00.000Z') }),
      post('finished', { eventDate: ts('2026-08-29T23:00:00.000Z') }),
      post('undated write-up', { publishDate: ts('2023-05-01T00:00:00.000Z') }),
      post('bare', {}),
    ];
    const up = upcomingEvents(posts, NOW);
    const back = pastEvents(posts, NOW);
    expect(up.length + back.length).toBe(posts.length);
    expect(up.filter(p => back.includes(p))).toEqual([]);
  });

  it('is most-recent-first, falling back to publishDate then createdAt', () => {
    const posts = [
      post('oldest', { createdAt: ts('2019-01-01T00:00:00.000Z') }),
      post('newest', { eventDate: ts('2026-08-29T23:00:00.000Z') }),
      post('middle', { publishDate: ts('2023-05-01T00:00:00.000Z') }),
    ];
    expect(pastEvents(posts, NOW).map(p => p.title)).toEqual(['newest', 'middle', 'oldest']);
  });

  it('keeps an undated post rather than dropping it', () => {
    expect(pastEvents([post('bare')], NOW).map(p => p.title)).toEqual(['bare']);
  });
});

describe('occurredAtMillis', () => {
  it('prefers eventDate, then publishDate, then createdAt', () => {
    expect(
      occurredAtMillis({
        eventDate: ts('2026-01-01T00:00:00.000Z'),
        publishDate: ts('2025-01-01T00:00:00.000Z'),
        createdAt: ts('2024-01-01T00:00:00.000Z'),
      })
    ).toBe(Date.parse('2026-01-01T00:00:00.000Z'));

    expect(
      occurredAtMillis({ publishDate: ts('2025-01-01T00:00:00.000Z'), createdAt: ts('2024-01-01T00:00:00.000Z') })
    ).toBe(Date.parse('2025-01-01T00:00:00.000Z'));

    expect(occurredAtMillis({ createdAt: ts('2024-01-01T00:00:00.000Z') })).toBe(
      Date.parse('2024-01-01T00:00:00.000Z')
    );
  });

  it('is 0 when the post carries no usable date at all', () => {
    expect(occurredAtMillis({})).toBe(0);
    expect(occurredAtMillis({ eventDate: 'not a date' })).toBe(0);
  });
});

describe('isUpcoming', () => {
  it('agrees with upcomingEvents', () => {
    expect(isUpcoming({ eventDate: ts('2026-09-12T17:00:00.000Z') }, NOW)).toBe(true);
    expect(isUpcoming({ eventDate: ts('2026-08-29T23:00:00.000Z') }, NOW)).toBe(false);
    expect(isUpcoming({}, NOW)).toBe(false);
  });
});
