import { startOfDay, toDate, toMillis } from './firestoreDates';

/**
 * The single definition of "upcoming", shared by the public site and the admin dashboard.
 *
 * **The split is by date, not by `type`.** There is no news/event distinction any more:
 * a post is upcoming only while it carries an `eventDate` that has not passed, and
 * everything else — finished events and the pre-2025 news articles alike — is past.
 * An undated post is therefore always past, which is the intent: it is a write-up of
 * something that already happened.
 *
 * This lives in its own pure module because the dashboard had drifted from it. The
 * dashboard ran its own query — `where('status','==','published')` with `limit(50)` and
 * no `orderBy` — which inherits Firestore's implicit `__name__ ASC` ordering. That takes
 * the 50 alphabetically-first *document ids*, an arbitrary window with no relationship
 * to dates, so once the archive passed 50 published posts every future event fell
 * outside it and the dashboard reported "0 upcoming events" while `/news` listed eight.
 * Nothing errored: the query succeeded, it just described the wrong 50 documents.
 *
 * Selecting in memory from a snapshot the caller already holds is what removes that
 * failure mode, so keep these functions total — they take every candidate post, never a
 * pre-truncated page of them.
 */

/** The fields the partition reads. Structural so both `Post` and a raw doc shape fit. */
export interface DatedPost {
  eventDate?: unknown;
  publishDate?: unknown;
  createdAt?: unknown;
}

/**
 * When a post happened. `eventDate` is the real date for anything scheduled; legacy
 * news articles carry only a `publishDate`, and a handful of imported documents carry
 * neither, so `createdAt` is the last resort.
 */
export function occurredAtMillis(post: DatedPost): number {
  return toMillis(post.eventDate) || toMillis(post.publishDate) || toMillis(post.createdAt);
}

/** True when the post is scheduled and its day has not passed. */
export function isUpcoming(post: DatedPost, now: Date = new Date()): boolean {
  const eventDay = toDate(post.eventDate);
  return eventDay !== null && eventDay >= startOfDay(now);
}

/** Scheduled posts whose day has not passed, soonest first. */
export function upcomingEvents<T extends DatedPost>(posts: T[], now: Date = new Date()): T[] {
  const cutoff = startOfDay(now);
  return posts
    .filter(p => {
      const eventDay = toDate(p.eventDate);
      return eventDay !== null && eventDay >= cutoff;
    })
    .sort((a, b) => toMillis(a.eventDate) - toMillis(b.eventDate));
}

/** Everything else — finished events and undated write-ups — most recent first. */
export function pastEvents<T extends DatedPost>(posts: T[], now: Date = new Date()): T[] {
  const cutoff = startOfDay(now);
  return posts
    .filter(p => {
      const eventDay = toDate(p.eventDate);
      return eventDay === null || eventDay < cutoff;
    })
    .sort((a, b) => occurredAtMillis(b) - occurredAtMillis(a));
}
