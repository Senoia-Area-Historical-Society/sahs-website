/**
 * Change detection for the Google Calendar sync in `onPostWritten`.
 *
 * `onDocumentWritten` fires on *every* write to a post, including writes that have
 * nothing to do with what the calendar shows. The worst offender is ticketing: each
 * sale increments `ticketsSold` on `posts/{eventId}`, so a run of three ticket sales
 * produced four trigger invocations, each one issuing a Calendar API patch that
 * re-sent byte-identical data. Harmless to checkout — a separate trigger, running
 * after the fulfillment transaction commits, with errors caught — but a wasted
 * write, and wasted writes against a shared quota are how a sync starts failing at
 * exactly the wrong moment.
 *
 * So patch only when a field the calendar entry is actually built from changed.
 */

/** Exactly the post fields that feed a Calendar request. Keep in step with `onPostWritten`. */
export const CALENDAR_RELEVANT_FIELDS = [
  // summary
  'title',
  // description — `excerpt` wins, `content` is the fallback
  'excerpt',
  'content',
  // location — `location` wins, `eventLocation` is the fallback
  'location',
  'eventLocation',
  // start/end, via resolveEventWindow
  'eventDate',
  'eventStartDate',
  'eventEndDate',
  // decides which sync case runs at all (insert / patch / delete)
  'status',
] as const;

type PostData = Record<string, unknown>;

/**
 * Reduce a field to something `===` can compare honestly.
 *
 * `eventDate` is a Firestore `Timestamp`, and two Timestamps for the same instant are
 * different object identities — compared raw, every write would look like a change and
 * the guard would do nothing at all. Milliseconds compare correctly. Everything else is
 * a string or nullish, where `null` and `undefined` must not read as a change: a post
 * that never had an `excerpt` and a post whose `excerpt` was cleared to `null` produce
 * the same calendar entry.
 */
function normalize(value: unknown): unknown {
  if (value === undefined || value === null) return null;
  // `value` cannot be null here — the guard above returned for both nullish cases.
  if (typeof value === 'object' && 'toMillis' in value) {
    const toMillis = (value as { toMillis: unknown }).toMillis;
    if (typeof toMillis === 'function') {
      return (value as { toMillis: () => number }).toMillis();
    }
  }
  return value;
}

/**
 * True when a field the calendar entry is built from differs between the two versions.
 *
 * Returns true when `before` is missing: a newly created document has no prior state to
 * compare against, and the sync should run. This is a guard against *redundant* writes,
 * never a reason to skip a real one — when in doubt it answers true.
 */
export function calendarFieldsChanged(before: PostData | undefined, after: PostData | undefined): boolean {
  if (!before || !after) return true;
  return CALENDAR_RELEVANT_FIELDS.some(
    (field) => normalize(before[field]) !== normalize(after[field])
  );
}
