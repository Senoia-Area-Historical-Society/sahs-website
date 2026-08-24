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
    /** `'subscription'` is how a pricing-table membership identifies itself — see `classifyCheckoutSession`. */
    mode?: string | null;
    /** Set on a subscription-mode session once Stripe has created the subscription. */
    subscription?: string | { id: string } | null;
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
 * Anything without a recognized `type` — and not a subscription — is `unrelated`:
 * acknowledged with a 200 and no record written.
 *
 * **`mode === 'subscription'` is the rule that matters in production.** Every real
 * membership is bought through the Stripe Pricing Table embedded in `Support.tsx`, and
 * Stripe — not our code — creates that Checkout Session, so it carries **no metadata at
 * all**. Keying only on `metadata.type` therefore classified every genuine member as
 * `unrelated` and dropped them: no record, and no welcome email. Confirmed against live
 * data — a real pricing-table session has `metadata: {}` and `mode: 'subscription'` —
 * and against Resend, where every message ever sent from this account was a ticket
 * confirmation and not one was a membership welcome.
 *
 * This is safe *because memberships are the only recurring products on the account*. The
 * donation Payment Link and every ticket are one-time (`mode: 'payment'`), so they still
 * land in `unrelated`. **Adding a recurring donation price would silently classify
 * donors as members** and mail them member benefits; give any such price a
 * `metadata.type` and branch on it here before shipping it.
 *
 * `metadata.type` is still honoured first, so a session minted by our own code keeps
 * routing on its explicit label regardless of mode.
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
    if (session.mode === 'subscription') return 'membership';
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
    | 'missing_email';

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
    /**
     * `null` when the session carries no `metadata.level` — the normal case for a
     * pricing-table membership, where the tier is a property of the Stripe subscription
     * rather than of anything we wrote. `fulfillMembership` resolves it from the
     * subscription; this module stays free of imports and so cannot look it up itself.
     */
    level: string | null;
    quantity: number;
    userId: string | null;
    /** The Stripe subscription this membership belongs to, or `null` for a one-time join. */
    subscriptionId: string | null;
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
 * `email` is the only hard requirement: a membership is renewed, looked up and mailed by
 * address, so a record without one is not a membership.
 *
 * `level` used to be a second hard requirement, rejecting with `'missing_level'`. That
 * was correct while our own (since-deleted) `createMembershipCheckoutSession` was assumed
 * to be the only source — it always wrote the field, so an absent one meant forged
 * metadata. It is
 * wrong now that pricing-table sessions are recognised: those carry no metadata at all,
 * so the rejection would turn *every real membership* into an `UnfulfillableSessionError`,
 * a 500, and an endless Stripe retry of an order that can never succeed. The tier is
 * instead resolved from the subscription by `fulfillMembership`, which falls back to a
 * generic label rather than failing — the same reasoning `parseTicketOrder` applies to a
 * missing name: never lose a paid order over a field that is only a label.
 *
 * Note what the old inline version did with a thin metadata object: it wrote
 * `level: session.metadata?.level`, i.e. `undefined`, which the Admin SDK rejects
 * outright — so the whole membership write threw into the swallowing catch and the
 * member vanished. Every field this returns is a string, a number, or an explicit
 * `null`; see the "never write `undefined` to Firestore" note in CLAUDE.md.
 */
export function parseMembershipOrder(session: CheckoutSessionLike): Parsed<MembershipRecord> {
    const metadata = session.metadata ?? {};

    // The `customer_details` fallback inside `resolveEmail` makes this effectively
    // unreachable — Stripe echoes the address checkout collected — but a membership
    // record with no address is not one we could ever act on.
    const email = resolveEmail(session);
    if (email === null) return { ok: false, reason: 'missing_email' };

    // A missing quantity means one membership — unlike a ticket, where an unparseable
    // quantity implies forged metadata, `quantity` here has always been optional.
    const quantity = parsePositiveInt(metadata.quantity) ?? 1;

    return {
        ok: true,
        value: {
            email,
            level: nonEmpty(metadata.level) ? metadata.level.trim() : null,
            quantity,
            userId: nonEmpty(metadata.userId) ? metadata.userId.trim() : null,
            subscriptionId: resolveId(session.subscription),
            firstName: guessFirstName(session.customer_details?.name),
        },
    };
}

/** Unwraps a Stripe reference that may arrive as a bare id or as an expanded object. */
function resolveId(ref: string | { id: string } | null | undefined): string | null {
    if (typeof ref === 'string') return nonEmpty(ref) ? ref.trim() : null;
    if (ref && nonEmpty(ref.id)) return ref.id.trim();
    return null;
}

/**
 * The first whitespace-separated token. "Hilary De Puy" greets "Hilary".
 *
 * This used to take everything *before* the last token, on the theory that "Mary Anne
 * Nolan" should greet "Mary Anne". That reasoning holds for a two-part given name and
 * fails for everything else, which is more common than it sounds: a dry run over the
 * real member list produced "Dear Hilary De," (Hilary De Puy), "Dear Robert W,"
 * (Robert W Trammell), "Dear Margaret T," and "Dear Cheryl Crook," (Cheryl Crook
 * Thompson) — six awkward greetings in seventy-five letters.
 *
 * First-token-only gets those right and costs only that "Mary Anne" is greeted as
 * "Mary", which still reads as a name. The failure modes are not symmetric: a shortened
 * given name is unremarkable, a surname fragment glued on is visibly wrong.
 */
function guessFirstName(fullName: string | null | undefined): string {
    const parts = (fullName ?? '').trim().split(/\s+/).filter(Boolean);
    return parts[0] ?? '';
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
