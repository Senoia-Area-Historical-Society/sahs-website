/**
 * Sending a buyer their ticket, and the pure decisions that go into it.
 *
 * Ticket buyers have never received an email. Their confirmation number existed only on
 * the success page, so a buyer who closed the tab had nothing, and a fulfillment gap was
 * invisible to staff and total for the customer — which is how 27 paid orders went
 * unnoticed for seven weeks. This closes that: every sale now mails the buyer, and the
 * recovery script mails the backlog.
 *
 * The send lives here rather than in index.ts because two callers need it: `stripeWebhook`
 * for live sales, and `scripts/reconcile_ticket_orders.cjs` (via the compiled
 * `functions/lib/ticketEmail.js`) for the orders that were never fulfilled.
 */
import { Resend } from 'resend';
import { render } from 'react-email';
import * as React from 'react';
import { TicketConfirmationEmail } from './emails/TicketConfirmationEmail';

export interface TicketEmailInput {
    email: string;
    customerName: string;
    eventTitle: string;
    quantity: number;
    confirmationNumber: string;
    /** The stored `qrCode`, a `data:image/png;base64,…` URI. */
    qrCode: string;
    /** Checkout Session id — the buyer's ticket page is keyed by it. */
    sessionId: string;
    /** Pre-formatted for display, or null when the event has no usable date. */
    eventWhen: string | null;
    eventLocation: string | null;
}

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

/**
 * Mails the buyer their confirmation number and QR code.
 *
 * Returns 'skipped' when Resend is not configured — the emulator and any local run have
 * no key, and a ticket must still be recorded there. Throws on a send failure so the
 * caller can record it: Resend reports failures in the response body rather than
 * rejecting, so a silent `error` field would otherwise look exactly like success.
 */
export async function sendTicketConfirmation(
    input: TicketEmailInput,
    frontendUrl: string
): Promise<'sent' | 'skipped'> {
    if (!process.env.RESEND_API_KEY) {
        console.warn('RESEND_API_KEY not configured — skipping ticket confirmation email');
        return 'skipped';
    }
    if (!input.email) {
        // A ticket with no address is still valid at the door; there is just nobody to
        // mail. Reported as skipped rather than thrown so it cannot fail fulfillment.
        console.warn(`No email on ticket ${input.confirmationNumber} — nothing to send`);
        return 'skipped';
    }

    const ticketUrl = ticketPageUrl(input.sessionId, frontendUrl);
    const html = await render(React.createElement(TicketConfirmationEmail, {
        customerName: input.customerName,
        eventTitle: input.eventTitle,
        eventWhen: input.eventWhen,
        eventLocation: input.eventLocation,
        quantity: input.quantity,
        confirmationNumber: input.confirmationNumber,
        ticketUrl,
    }));

    const png = qrPngBase64(input.qrCode);
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
        from: 'Senoia Area Historical Society <tickets@updates.senoiahistory.com>',
        to: input.email,
        subject: `Your tickets — ${input.eventTitle} (${input.confirmationNumber})`,
        html,
        // Attached rather than inlined, per qrPngBase64's note. Omitted entirely if the
        // stored value isn't a PNG data URI: the confirmation number in the body is what
        // actually admits the buyer, so a missing QR must not block the email.
        ...(png ? { attachments: [{ filename: `sahs-ticket-${input.confirmationNumber}.png`, content: png }] } : {}),
    });
    if (error) {
        throw new Error(`Resend rejected the ticket confirmation: ${error.message}`);
    }
    return 'sent';
}
