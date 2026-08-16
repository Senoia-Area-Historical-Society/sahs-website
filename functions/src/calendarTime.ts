/**
 * Datetime helpers for the Google Calendar sync in `onPostWritten`.
 *
 * Two different shapes reach that code, and they must NOT be handled the same way:
 *
 *   - `eventDate` is a Firestore Timestamp. `.toDate().toISOString()` yields an
 *     absolute instant ending in `Z`. Unambiguous, always correct.
 *   - `eventStartDate` / `eventEndDate` are raw `datetime-local` strings typed by an
 *     admin in Eastern time (`"2026-07-04T22:00"`). They carry NO offset.
 *
 * Passing the naive string through `new Date(...).toISOString()` is the bug this
 * module exists to prevent: Cloud Run's local zone is UTC, so "22:00" is read as
 * 22:00 UTC — 6:00 PM Eastern — instead of 10:00 PM Eastern. For an evening event
 * that puts the end BEFORE the start, and `calendar.events.insert` rejects end < start
 * with a 400, so the calendar entry silently never appears.
 *
 * The fix is to leave naive values naive and let the `timeZone: 'America/New_York'`
 * field already present on every Calendar request interpret them — which is exactly
 * what that field is for. Calendar requires full RFC3339, so a 16-character
 * `YYYY-MM-DDTHH:mm` needs `:00` seconds appended.
 */

const HAS_OFFSET = /(?:Z|[+-]\d{2}:?\d{2})$/;

/** True when the string carries no UTC offset, i.e. it needs a `timeZone` to be meaningful. */
export function isNaiveLocal(value: string): boolean {
  return !HAS_OFFSET.test(value);
}

/**
 * Normalize an editor datetime string to RFC3339 without inventing an offset.
 * Returns null for anything unusable so callers can skip the sync rather than
 * fall back to a fabricated time.
 */
export function toRfc3339(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  // Already an absolute instant — leave it exactly as-is.
  if (HAS_OFFSET.test(trimmed)) return trimmed;

  // `YYYY-MM-DDTHH:mm` — Calendar needs seconds.
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmed)) return `${trimmed}:00`;

  // `YYYY-MM-DDTHH:mm:ss` (optionally with fractional seconds) — already fine.
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(trimmed)) return trimmed;

  return null;
}

/**
 * Add hours to an RFC3339 string, preserving whether it was naive or absolute.
 *
 * A naive value is shifted in "wall clock" space: we parse it as if it were UTC purely
 * to do the arithmetic, then re-emit it naive. Reading it back in America/New_York
 * therefore gives the intended wall-clock time. (A DST boundary inside the window would
 * shift the real duration by an hour — acceptable for a default end time.)
 */
export function addHours(rfc3339: string, hours: number): string {
  const ms = hours * 60 * 60 * 1000;
  if (isNaiveLocal(rfc3339)) {
    const shifted = new Date(new Date(`${rfc3339}Z`).getTime() + ms);
    return shifted.toISOString().slice(0, 19);
  }
  return new Date(new Date(rfc3339).getTime() + ms).toISOString();
}

/**
 * Resolve the {start, end} window for a post's Calendar entry.
 *
 * Returns null when there is no date we can trust. Callers must skip the sync in that
 * case rather than defaulting to "now" — a calendar entry at an arbitrary current
 * timestamp is worse than no entry.
 */
export function resolveEventWindow(data: {
  eventDate?: { toDate: () => Date } | null;
  eventStartDate?: unknown;
  eventEndDate?: unknown;
}): { startDateTime: string; endDateTime: string } | null {
  const startDateTime = data.eventDate
    ? data.eventDate.toDate().toISOString()
    : toRfc3339(data.eventStartDate);

  if (!startDateTime) return null;

  const endDateTime = toRfc3339(data.eventEndDate) ?? addHours(startDateTime, 2);

  return { startDateTime, endDateTime };
}

/**
 * How long after an event starts it stops being calendar-worthy.
 *
 * Deliberately generous. A naive Eastern string is parsed as UTC below, which
 * can be off by up to five hours, and an event that ran earlier today should
 * still be allowed onto the calendar. Two days sits comfortably between "just
 * happened" and the years-old documents this guard exists to keep out.
 */
const PAST_EVENT_GRACE_HOURS = 48;

/**
 * True when an event started long enough ago that adding it to the calendar
 * would only create clutter.
 *
 * This exists because `onPostWritten` fires on *any* write, and its insert path
 * is gated only on the post having no `googleCalendarEventId` yet. Re-saving an
 * old post — or a migration that touches one — therefore looks identical to
 * publishing a brand-new event. Without this check, editing a 2023 write-up
 * would drop a 2023 entry onto the public SAHS calendar.
 *
 * Unparseable input returns false: this is a suppression guard, so when in
 * doubt let the caller proceed rather than silently swallowing a real event.
 */
export function isLongPast(startDateTime: string, now: Date = new Date()): boolean {
  const absolute = isNaiveLocal(startDateTime) ? `${startDateTime}Z` : startDateTime;
  const parsed = new Date(absolute);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed.getTime() < now.getTime() - PAST_EVENT_GRACE_HOURS * 60 * 60 * 1000;
}
