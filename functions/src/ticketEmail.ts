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
 *
 * This module uses `process.env` and pulls in Resend, so **no test under `src/test/` may
 * import it** — the site's `tsc -b` would follow that import and fail on the Node globals
 * it has no types for. The pure, testable half lives in `./ticketEmailContent`, which is
 * re-exported below so both callers keep a single import site.
 */
import { Resend } from 'resend';
import { render } from 'react-email';
import * as React from 'react';
import { TicketConfirmationEmail } from './emails/TicketConfirmationEmail';
import { qrPngBase64, ticketPageUrl } from './ticketEmailContent';

export { qrPngBase64, ticketPageUrl, formatEventWhen, resolveEventLocation } from './ticketEmailContent';

/**
 * Content-ID linking the QR attachment to the `cid:` reference in the template. Any
 * stable token under 128 characters works; it never reaches the reader.
 */
const QR_CONTENT_ID = 'sahs-ticket-qr';

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
    const png = qrPngBase64(input.qrCode);

    // Rendered and attached as one unit: the template references `cid:QR_CONTENT_ID` and
    // the attachment below carries that id, so the QR displays in the body. Both are
    // driven off `png` being non-null — if the stored QR is unusable, the template omits
    // the image and no attachment is sent, rather than shipping a broken <img>.
    const html = await render(React.createElement(TicketConfirmationEmail, {
        customerName: input.customerName,
        eventTitle: input.eventTitle,
        eventWhen: input.eventWhen,
        eventLocation: input.eventLocation,
        quantity: input.quantity,
        confirmationNumber: input.confirmationNumber,
        ticketUrl,
        qrCid: png ? QR_CONTENT_ID : null,
    }));

    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
        from: 'Senoia Area Historical Society <tickets@updates.senoiahistory.com>',
        to: input.email,
        subject: `Your tickets — ${input.eventTitle} (${input.confirmationNumber})`,
        html,
        // `contentId` makes Resend send this as an *inline* attachment, so this single
        // part both renders in the body and remains saveable — there is no second copy.
        // A `data:` URI in the HTML would not work: Gmail and Outlook strip them.
        ...(png ? {
            attachments: [{
                filename: `sahs-ticket-${input.confirmationNumber}.png`,
                content: png,
                contentId: QR_CONTENT_ID,
            }],
        } : {}),
    });
    if (error) {
        throw new Error(`Resend rejected the ticket confirmation: ${error.message}`);
    }
    return 'sent';
}
