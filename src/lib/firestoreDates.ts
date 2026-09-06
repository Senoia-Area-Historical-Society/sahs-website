/**
 * Coercion for the date-shaped fields on Firestore documents.
 *
 * **`value?.toDate()` is not a safe call.** Optional chaining guards `null` and
 * `undefined`; it says nothing about the *type*. On a value that is a plain string it
 * still resolves `.toDate` and invokes it, throwing `TypeError: value?.toDate is not a
 * function`. Thrown during render, React unmounts the whole tree — so a single
 * malformed field blanks the entire page rather than one cell.
 *
 * That is not hypothetical. `posts/N2B4Aq2bwjytBWPe7bVy` ("Yacht Rock Party") carries
 * `updatedAt` as the ISO string `"2026-08-25T04:13:41.139Z"` rather than a `Timestamp`,
 * and `ContentAdmin`'s `post.updatedAt?.toDate().toLocaleDateString()` made
 * `/admin/content` a blank white page for every user, for every post, on every visit.
 *
 * These documents are written by four different producers — the admin editor
 * (`buildPostData`), the seed scripts, the Cloud Functions, and a one-time Webflow
 * migration — so their field shapes are conventional, not guaranteed. Render *through*
 * these helpers rather than calling `.toDate()` on a document value directly.
 *
 * Kept free of imports so `src/test/` can pull it into the root build safely.
 */

/** A Firestore `Timestamp` as seen at runtime, without importing the SDK type. */
interface TimestampLike {
  toDate: () => Date;
}

/** The `{ seconds, nanoseconds }` shape a Timestamp takes once JSON round-tripped. */
interface SecondsLike {
  seconds: number;
}

const isTimestampLike = (v: unknown): v is TimestampLike =>
  typeof v === 'object' && v !== null && typeof (v as TimestampLike).toDate === 'function';

const isSecondsLike = (v: unknown): v is SecondsLike =>
  typeof v === 'object' && v !== null && typeof (v as SecondsLike).seconds === 'number';

const orNull = (d: Date): Date | null => (Number.isNaN(d.getTime()) ? null : d);

/**
 * Any date-ish Firestore value → `Date`, or `null` when there isn't a usable date.
 *
 * Accepts a `Timestamp`, a `Date`, an ISO string, epoch milliseconds, and the
 * `{ seconds }` shape. Never throws: an unusable value is `null`, which every caller
 * already has to handle for the genuinely-absent case.
 */
export function toDate(value: unknown): Date | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return orNull(value);
  if (isTimestampLike(value)) {
    const d = value.toDate();
    return d instanceof Date ? orNull(d) : null;
  }
  if (typeof value === 'string' || typeof value === 'number') return orNull(new Date(value));
  if (isSecondsLike(value)) return orNull(new Date(value.seconds * 1000));
  return null;
}

/**
 * Any date-ish Firestore value → epoch milliseconds, or `0` when absent.
 *
 * `0` sorts an undated document to the end of a descending sort, which is the
 * behaviour every existing call site already relies on.
 */
export function toMillis(value: unknown): number {
  return toDate(value)?.getTime() ?? 0;
}

/**
 * Any date-ish Firestore value → a short local date string for display.
 *
 * Returns `fallback` when there is no usable date, so a bad field degrades to one
 * placeholder cell instead of taking the page down.
 */
export function formatDate(
  value: unknown,
  fallback = 'N/A',
  options: Intl.DateTimeFormatOptions = {}
): string {
  const d = toDate(value);
  if (!d) return fallback;
  return Object.keys(options).length > 0
    ? d.toLocaleDateString('en-US', options)
    : d.toLocaleDateString();
}

/**
 * Midnight at the start of `now`'s local day.
 *
 * The cutoff for "upcoming": an event that started at 10am is still today's event at
 * 2pm, and must not vanish from a listing while it is happening.
 */
export function startOfDay(now: Date = new Date()): Date {
  const d = new Date(now.getTime());
  d.setHours(0, 0, 0, 0);
  return d;
}
