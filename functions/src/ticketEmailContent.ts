/**
 * The pure decisions behind a ticket confirmation email: what the QR attachment holds,
 * where the buyer's ticket lives, and how an event's date and place read to a human.
 *
 * Split out from `ticketEmail.ts` deliberately, and the split is load-bearing. The site's
 * `npm run build` runs `tsc -b` over `src/`, which follows the imports in
 * `src/test/*.test.ts` into whatever `functions/src/` module they name. The site tsconfig
 * has no `node` types and no functions dependencies, so a test that reaches a module
 * using `process.env` or importing `resend` fails the ROOT build — while
 * `cd functions && npm run build` passes, because that project does have them. That is
 * exactly how a green local functions build shipped a broken deploy once.
 *
 * So: everything the site's tests import stays free of Node globals and external
 * packages, matching `calendarTime.ts`, `ticketPricing.ts` and `checkoutFulfillment.ts`.
 * Anything needing Resend or `process` belongs in `ticketEmail.ts`, which no site test
 * may import.
 */
/**
 * The base64 payload of a PNG data URI, or null if it isn't one.
 *
 * The QR is stored as a data URI, and Gmail strips `data:` image sources — an inlined
 * `<img src={qrCode}>` renders as a broken image for most recipients. So it travels as a
 * real attachment instead, which also survives having no signal at the door.
 */
export function qrPngBase64(qrCode: string): string | null {
    const match = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec((qrCode || '').trim());
    return match ? match[1] : null;
}

/** The buyer's own ticket page, which renders the QR from `stripeSessionId`. */
export function ticketPageUrl(sessionId: string, frontendUrl: string): string {
    return `${frontendUrl.replace(/\/$/, '')}/tickets/success?session_id=${encodeURIComponent(sessionId)}`;
}

/**
 * Formats an event's start for a human, WITHOUT converting time zones.
 *
 * `eventStartDate` is a naive `datetime-local` string typed in Eastern
 * ("2026-08-29T19:00"). Running it through `new Date(...)` on Cloud Run — whose local
 * zone is UTC — and formatting the result shifts it by four or five hours, so a 7 PM
 * event would be announced as 11 PM in the buyer's confirmation. The string is therefore
 * parsed by hand and its parts are used as written. See the naive-datetime gotcha in
 * CLAUDE.md and `calendarTime.ts`, which exists for the same reason.
 *
 * A Firestore `Timestamp` (`eventDate`) is an absolute instant, so it is formatted in
 * Eastern explicitly instead.
 */
export function formatEventWhen(post: Record<string, unknown> | undefined): string | null {
    if (!post) return null;

    const naive = [post.eventStartDate, post.eventDate].find(
        (v): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v)
    );
    if (naive) {
        const [datePart, timePart] = naive.split('T');
        const [y, m, d] = datePart.split('-').map(Number);
        const [hh, mm] = timePart.split(':').map(Number);
        // Constructed as UTC and formatted as UTC: the calendar fields come back exactly
        // as typed, with no zone arithmetic applied to them.
        const asUtc = new Date(Date.UTC(y, m - 1, d, hh, mm));
        const date = asUtc.toLocaleDateString('en-US', {
            weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC',
        });
        const time = asUtc.toLocaleTimeString('en-US', {
            hour: 'numeric', minute: '2-digit', timeZone: 'UTC',
        });
        return `${date} at ${time}`;
    }

    // A Timestamp is absolute, so it must be rendered in the society's zone.
    const ts = post.eventDate as { toDate?: () => Date } | undefined;
    if (ts && typeof ts.toDate === 'function') {
        const when = ts.toDate();
        return `${when.toLocaleDateString('en-US', {
            weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/New_York',
        })} at ${when.toLocaleTimeString('en-US', {
            hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York',
        })}`;
    }

    return null;
}

/** The event's public address, or null. Mirrors the post editor's display/stored split. */
export function resolveEventLocation(post: Record<string, unknown> | undefined): string | null {
    const value = [post?.location, post?.eventLocation].find(
        (v): v is string => typeof v === 'string' && v.trim().length > 0
    );
    return value ? value.trim() : null;
}

