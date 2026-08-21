import { describe, it, expect } from 'vitest';
import {
  qrPngBase64,
  ticketPageUrl,
  formatEventWhen,
  resolveEventLocation,
} from '../../functions/src/ticketEmail';

/**
 * Ticket buyers never received an email at all: the confirmation number lived only on the
 * success page, so a buyer who closed the tab had nothing, and a fulfillment gap was
 * invisible to staff. These cover the decisions that go into the email and can be checked
 * without Resend.
 */

describe('formatEventWhen', () => {
  /**
   * The bug this guards is the one `calendarTime.ts` exists for, in a new place.
   * `eventStartDate` is a naive `datetime-local` string typed in Eastern. Formatting it
   * through `new Date(str)` on Cloud Run — local zone UTC — and rendering in Eastern
   * shifts it back four or five hours, so a 7 PM event would tell the buyer 3 PM.
   */
  it('renders a naive Eastern datetime exactly as typed, with no zone shift', () => {
    expect(formatEventWhen({ eventStartDate: '2026-08-29T19:00' }))
      .toBe('Saturday, August 29, 2026 at 7:00 PM');
  });

  it('does not shift a late-evening event into the next day', () => {
    expect(formatEventWhen({ eventStartDate: '2026-07-04T22:30' }))
      .toBe('Saturday, July 4, 2026 at 10:30 PM');
  });

  it('handles a midnight start without rolling the date backwards', () => {
    expect(formatEventWhen({ eventStartDate: '2026-01-01T00:00' }))
      .toBe('Thursday, January 1, 2026 at 12:00 AM');
  });

  it('accepts a naive string that carries seconds', () => {
    expect(formatEventWhen({ eventStartDate: '2026-08-29T19:00:00' }))
      .toBe('Saturday, August 29, 2026 at 7:00 PM');
  });

  /** A Firestore Timestamp is an absolute instant, so it IS converted — to Eastern. */
  it('renders a Timestamp in Eastern rather than UTC', () => {
    // 2026-08-30T00:30:00Z is 8:30 PM Eastern on Aug 29 (EDT, UTC-4).
    const eventDate = { toDate: () => new Date('2026-08-30T00:30:00.000Z') };
    expect(formatEventWhen({ eventDate })).toBe('Saturday, August 29, 2026 at 8:30 PM');
  });

  it('prefers the naive start over a Timestamp when both are present', () => {
    const eventDate = { toDate: () => new Date('2030-01-01T00:00:00.000Z') };
    expect(formatEventWhen({ eventStartDate: '2026-08-29T19:00', eventDate }))
      .toBe('Saturday, August 29, 2026 at 7:00 PM');
  });

  it('returns null when there is no usable date, so the email omits the row', () => {
    expect(formatEventWhen({})).toBeNull();
    expect(formatEventWhen(undefined)).toBeNull();
    expect(formatEventWhen({ eventStartDate: 'sometime in the fall' })).toBeNull();
  });
});

describe('qrPngBase64', () => {
  /**
   * Gmail strips `data:` image sources, so the QR cannot be inlined in the body — it
   * travels as an attachment, which needs the bare base64 payload.
   */
  it('extracts the payload from a PNG data URI', () => {
    expect(qrPngBase64('data:image/png;base64,iVBORw0KGgo=')).toBe('iVBORw0KGgo=');
  });

  it('tolerates surrounding whitespace', () => {
    expect(qrPngBase64('  data:image/png;base64,AAAA  ')).toBe('AAAA');
  });

  /**
   * Returning null makes the attachment optional rather than throwing: the confirmation
   * number in the body is what admits the buyer, so a malformed QR must not block the
   * email entirely.
   */
  it.each([
    ['a JPEG data URI', 'data:image/jpeg;base64,AAAA'],
    ['an http URL', 'https://example.com/qr.png'],
    ['an empty string', ''],
    ['junk', 'not-a-data-uri'],
  ])('returns null for %s', (_label, value) => {
    expect(qrPngBase64(value)).toBeNull();
  });
});

describe('ticketPageUrl', () => {
  it('builds the buyer-facing ticket link from the session id', () => {
    expect(ticketPageUrl('cs_live_abc123', 'https://senoiahistory.com'))
      .toBe('https://senoiahistory.com/tickets/success?session_id=cs_live_abc123');
  });

  it('does not double the slash when the base url has a trailing one', () => {
    expect(ticketPageUrl('cs_1', 'https://senoiahistory.com/'))
      .toBe('https://senoiahistory.com/tickets/success?session_id=cs_1');
  });

  it('encodes the session id', () => {
    expect(ticketPageUrl('cs a/b', 'https://senoiahistory.com'))
      .toContain('session_id=cs%20a%2Fb');
  });
});

describe('resolveEventLocation', () => {
  /**
   * `location` is the stored field and `eventLocation` the editor's display field — see
   * the post-editor round-trip note in CLAUDE.md. Either may be the populated one.
   */
  it('prefers the stored location', () => {
    expect(resolveEventLocation({ location: 'Freeman Sasser Bldg', eventLocation: 'stale' }))
      .toBe('Freeman Sasser Bldg');
  });

  it('falls back to the editor field', () => {
    expect(resolveEventLocation({ eventLocation: '6 Couch Street' })).toBe('6 Couch Street');
  });

  it('trims, and treats blank as absent', () => {
    expect(resolveEventLocation({ location: '  Stone Lodge  ' })).toBe('Stone Lodge');
    expect(resolveEventLocation({ location: '   ' })).toBeNull();
    expect(resolveEventLocation(undefined)).toBeNull();
  });
});
