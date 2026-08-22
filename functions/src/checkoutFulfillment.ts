/**
 * What a completed Stripe Checkout Session means, decided without touching Firestore.
 *
 * `stripeWebhook` used to read `session.metadata` inline, inside a `try` whose `catch`
 * logged and moved on, and then answered Stripe `200` unconditionally. Any throw on the
 * way to `tickets.add(...)` — QR generation, a Firestore blip, an `undefined` field the
 * Admin SDK refuses — lost a purchase permanently: the customer had paid, no record
 * existed, and Stripe considered the event delivered so it never retried. That is the
 * whole shape of the months-long outage in which ~25 buyers got no confirmation number.
 *
 * Splitting the metadata reading out here buys two things. The dispatch rule and the
 * required-field matrix become testable without mocking Firestore, and the handler is
 * left holding only the part that genuinely needs a database: an idempotent write.
 */

/**
 * A completed Checkout Session, narrowed to the fields fulfillment actually reads.
 *
 * `Stripe.Checkout.Session` is assignable to this, so the handler passes the real
 * object straight through — but a test can build a five-field literal instead of a
 * hundred-field Stripe fixture.
 */
export interface CheckoutSessionLike {
    id: string;
    customer_email?: string | null;
    customer_details?: { name?: string | null; email?: string | null } | null;
    amount_total?: number | null;
    payment_intent?: string | { id: string } | null;
    metadata?: Record<string, string> | null;
}

/**
 * Which fulfillment path a session belongs to.
 *
 * `'unrelated'` is not a failure. The endpoint receives every event type the Stripe
 * dashboard subscribes it to, and a session we did not create is not ours to record.
 * Keeping it distinct from the reject reasons below is what lets the handler answer
 * `200` for it — a `500` on traffic we were never meant to fulfill is how an endpoint
 * gets itself disabled, which would break *all* future purchases.
 */
export type CheckoutKind = 'ticket' | 'membership' | 'unrelated';

/**
 * Anything without a recognized `type` is `unrelated` — acknowledged with a 200 and no
 * record written.
 *
 * There used to be a third kind here. Room bookings carried `metadata: { bookingId }`
 * and no `type` at all, so they were classified by that field's presence. That flow was
 * retired in favour of YouCanBook.me and no code can mint such a session any more, so a
 * lone `bookingId` now lands in `unrelated` — which is the correct answer for a payment
 * this system is no longer the record for.
 */
export function classifyCheckoutSession(session: CheckoutSessionLike): CheckoutKind {
    const metadata = session.metadata ?? {};
    if (metadata.type === 'ticket') return 'ticket';
    if (metadata.type === 'membership') return 'membership';
    return 'unrelated';
}

/**
 * Why a session that *is* ours could not be turned into a record. Every one of these
 * means a paying customer is owed something we cannot produce, so the handler treats
 * them as hard failures rather than writing a partial record — see `parseTicketOrder`.
 */
export type FulfillmentRejection =
    | 'missing_event_id'
    | 'missing_event_title'
    | 'invalid_quantity'
    | 'missing_email'
    | 'missing_level';

export type Parsed<T> = { ok: true; value: T } | { ok: false; reason: FulfillmentRejection };

export interface TicketRecord {
    eventId: string;
    eventTitle: string;
    customerName: string;
    email: string;
    quantity: number;
    totalAmount: number;
}

export interface MembershipRecord {
    email: string;
    level: string;
    quantity: number;
    userId: string | null;
    /** First-name guess for the welcome email; '' when Stripe collected no name. */
    firstName: string;
}

/**
 * Strict on purpose. Everything read here was written by `createTicketCheckoutSession`
 * from an already-validated `resolveTicketOrder`, so in normal operation none of these
 * rejections can fire; if one does, the session was hand-crafted or our own creator
 * regressed, and both deserve to be loud rather than papered over with a fallback.
 * Guessing a value would put a record in the door list that nobody can trust.
 *
 * Quantity is deliberately *not* capped at `MAX_TICKET_QUANTITY` the way the purchase
 * path caps it. That bound decides whether to accept an order; here the money is
 * already taken, and refusing to record a paid ticket because it exceeds a limit we
 * ourselves allowed at checkout would lose the purchase we are trying to save. If the
 * cap is ever lowered, in-flight sessions must still fulfill.
 */
export function parseTicketOrder(session: CheckoutSessionLike): Parsed<TicketRecord> {
    const metadata = session.metadata ?? {};

    if (!nonEmpty(metadata.eventId)) return { ok: false, reason: 'missing_event_id' };
    if (!nonEmpty(metadata.eventTitle)) return { ok: false, reason: 'missing_event_title' };

    const quantity = parsePositiveInt(metadata.quantity);
    if (quantity === null) return { ok: false, reason: 'invalid_quantity' };

    return {
        ok: true,
        value: {
            eventId: metadata.eventId.trim(),
            eventTitle: metadata.eventTitle.trim(),
            // Optional by design: the ticket is identified by its confirmation number,
            // and Stripe does not require a name on the checkout page.
            customerName: (metadata.customerName ?? '').trim(),
            // Never a reason to refuse a paid ticket: the buyer redeems it at the door
            // with the confirmation number, so a record with no email is still a
            // working ticket, whereas rejecting the session leaves them with nothing —
            // the precise failure this handler exists to prevent.
            email: resolveEmail(session) ?? '',
            quantity,
            totalAmount: session.amount_total ?? 0,
        },
    };
}

/**
 * `email` and `level` are hard requirements because a membership record without them
 * cannot be renewed, matched to a Stripe customer, or turned into a welcome email.
 *
 * Note what the old inline version did with a thin metadata object: it wrote
 * `level: session.metadata?.level`, i.e. `undefined`, which the Admin SDK rejects
 * outright — so the whole membership write threw into the swallowing catch and the
 * member vanished. Every field this returns is a string, a number, or an explicit
 * `null`; see the "never write `undefined` to Firestore" note in CLAUDE.md.
 */
export function parseMembershipOrder(session: CheckoutSessionLike): Parsed<MembershipRecord> {
    const metadata = session.metadata ?? {};

    // Unlike a ticket, a membership has no other identifier: it is renewed, looked up
    // and mailed by email address, so a record without one is not a membership. Kept as
    // a rejection for that reason, with the `customer_details` fallback below making it
    // effectively unreachable — Stripe echoes the address checkout was created with.
    const email = resolveEmail(session);
    if (email === null) return { ok: false, reason: 'missing_email' };
    if (!nonEmpty(metadata.level)) return { ok: false, reason: 'missing_level' };

    // A missing quantity means one membership — unlike a ticket, where an unparseable
    // quantity implies forged metadata, `quantity` here has always been optional.
    const quantity = parsePositiveInt(metadata.quantity) ?? 1;

    return {
        ok: true,
        value: {
            email,
            level: metadata.level.trim(),
            quantity,
            userId: nonEmpty(metadata.userId) ? metadata.userId.trim() : null,
            firstName: guessFirstName(session.customer_details?.name),
        },
    };
}

/**
 * Everything before the last whitespace-separated token, matching what the original
 * welcome-email call did: "Mary Anne Nolan" greets "Mary Anne", "Nolan" greets "Nolan".
 */
function guessFirstName(fullName: string | null | undefined): string {
    const parts = (fullName ?? '').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '';
    return parts.length > 1 ? parts.slice(0, -1).join(' ') : parts[0];
}

/**
 * The buyer's address, or null if Stripe sent neither form of it.
 *
 * `customer_email` is the value we passed when creating the session; `customer_details`
 * holds what Stripe actually collected. They normally agree, but only the second is
 * populated when a session was created without a pre-filled email — so checking just
 * the first would discard an address Stripe *did* give us.
 */
function resolveEmail(session: CheckoutSessionLike): string | null {
    if (nonEmpty(session.customer_email)) return session.customer_email.trim();
    const collected = session.customer_details?.email;
    if (nonEmpty(collected)) return collected.trim();
    return null;
}

function nonEmpty(value: string | null | undefined): value is string {
    return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Metadata values are always strings, so this parses rather than type-checks. `parseInt`
 * is not enough: it reads `"3 tickets"` as 3 and `"2.5"` as 2, and this number both
 * multiplies nothing and increments `ticketsSold`, so a silently coerced value corrupts
 * inventory.
 */
function parsePositiveInt(value: string | undefined): number | null {
    if (!nonEmpty(value)) return null;
    const n = Number(value);
    if (!Number.isInteger(n) || n < 1) return null;
    return n;
}
