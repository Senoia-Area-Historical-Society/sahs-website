/**
 * Server-side authority for what a ticket order actually costs.
 *
 * `createTicketCheckoutSession` used to take `price` and `title` straight from the
 * request body and hand `price` to Stripe as `line_items[0].price_data.unit_amount`.
 * That amount is *dynamic* — Stripe charges whatever the caller sends — so a crafted
 * POST to the public function URL could buy a $50 ticket for a penny. Nothing about
 * the checkout page would look wrong to the buyer.
 *
 * The fix is to ignore the client's price and title entirely and derive both from the
 * `posts/{eventId}` document. Reading that document raises a second question the old
 * code never asked: is this post something we are willing to sell at all? A draft, an
 * archived write-up, or an event with no `ticketPrice` must be refused, or the hole
 * simply moves from "wrong price" to "sold a ticket to a non-event".
 *
 * This module is the whole decision, kept pure so the rejection matrix is testable
 * without mocking Firestore. The caller does the read and maps `reason` to a status.
 */

/** Matches `maxQty` in `TicketPurchaseWidget` — the UI never offers more than this. */
export const MAX_TICKET_QUANTITY = 10;

export type TicketOrderRejection =
    | 'event_not_found'
    | 'event_not_published'
    | 'event_not_ticketed'
    | 'event_missing_title'
    | 'invalid_quantity';

export type TicketOrder =
    | { ok: true; title: string; unitAmount: number; quantity: number; slug: string }
    | { ok: false; reason: TicketOrderRejection };

/**
 * True for a value usable as a Stripe `unit_amount`: a whole number of cents above
 * zero. Legacy Firestore documents can hold a string here, and `unit_amount` must be
 * an integer, so a truthiness check is not enough — `"50"` would reach Stripe and be
 * rejected there (or worse, coerced), and `0` would silently create a free ticket.
 */
function isSellablePrice(value: unknown): value is number {
    return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

/**
 * Quantity is still client-supplied and still multiplies the charge, so it gets the
 * same treatment as the price. It also flows into the `ticketsSold` increment in
 * `stripeWebhook`, which means a junk value corrupts inventory as well as the total.
 */
function normalizeQuantity(value: unknown): number | null {
    const n = typeof value === 'string' ? Number(value) : value;
    if (typeof n !== 'number' || !Number.isInteger(n)) return null;
    if (n < 1 || n > MAX_TICKET_QUANTITY) return null;
    return n;
}

/**
 * Decides whether an order may proceed and, if so, on what terms.
 *
 * @param post   `snapshot.data()` for `posts/{eventId}`, or undefined when the
 *               document does not exist.
 * @param requestedQuantity  The client's `quantity`. Every other client-supplied
 *               pricing input is deliberately not a parameter — it is not consulted.
 */
export function resolveTicketOrder(
    post: Record<string, unknown> | undefined,
    requestedQuantity: unknown
): TicketOrder {
    if (!post) return { ok: false, reason: 'event_not_found' };
    if (post.status !== 'published') return { ok: false, reason: 'event_not_published' };
    if (!isSellablePrice(post.ticketPrice)) return { ok: false, reason: 'event_not_ticketed' };

    const title = typeof post.title === 'string' ? post.title.trim() : '';
    if (!title) return { ok: false, reason: 'event_missing_title' };

    const quantity = normalizeQuantity(requestedQuantity);
    if (quantity === null) return { ok: false, reason: 'invalid_quantity' };

    return {
        ok: true,
        title,
        unitAmount: post.ticketPrice,
        quantity,
        slug: typeof post.slug === 'string' ? post.slug : '',
    };
}

/** 404 hides drafts from probing; everything else is a bad or unsellable request. */
export function rejectionStatus(reason: TicketOrderRejection): number {
    return reason === 'event_not_found' || reason === 'event_not_published' ? 404 : 400;
}
