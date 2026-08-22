import { describe, it, expect } from 'vitest';
import {
  classifyCheckoutSession,
  parseTicketOrder,
  parseMembershipOrder,
  type CheckoutSessionLike,
} from '../../functions/src/checkoutFulfillment';

/**
 * The outage these guard: `stripeWebhook` wrapped each fulfillment path in a `catch`
 * that logged and continued, then answered `200` unconditionally. Stripe therefore
 * recorded every delivery as successful and never retried, so any throw on the way to
 * the ticket write — including the Admin SDK refusing an `undefined` field — silently
 * destroyed a paid order. ~25 buyers got no confirmation number.
 *
 * These tests cover the decisions that do not need Firestore: which path a session
 * belongs to, and whether it carries enough to become a record at all. The idempotency
 * of the writes themselves is verified against the emulator by
 * `scripts/replay_stripe_webhook.cjs`.
 */

const session = (over: Partial<CheckoutSessionLike> = {}): CheckoutSessionLike => ({
  id: 'cs_test_123',
  customer_email: 'buyer@example.com',
  amount_total: 5000,
  metadata: {},
  ...over,
});

describe('classifyCheckoutSession', () => {
  it('routes an explicit ticket session', () => {
    expect(classifyCheckoutSession(session({ metadata: { type: 'ticket' } }))).toBe('ticket');
  });

  it('routes an explicit membership session', () => {
    expect(classifyCheckoutSession(session({ metadata: { type: 'membership' } }))).toBe('membership');
  });

  /**
   * The retired room-booking flow classified sessions by a bare `metadata.bookingId`
   * with no `type`. Nothing can mint such a session now, and `unrelated` is the right
   * answer for one: acknowledged with a 200, no record written, nothing 5xx'd.
   */
  it('treats a lone bookingId as unrelated now that room booking is retired', () => {
    expect(classifyCheckoutSession(session({ metadata: { bookingId: 'bk_1' } }))).toBe('unrelated');
  });

  it('still routes on an explicit type when a bookingId rides along', () => {
    expect(
      classifyCheckoutSession(session({ metadata: { type: 'ticket', bookingId: 'bk_1' } }))
    ).toBe('ticket');
  });

  /**
   * `'unrelated'` must stay distinct from a rejection. The handler answers 200 for it,
   * because 5xx-ing on traffic we were never meant to fulfill invites Stripe to disable
   * the endpoint — which would break every future purchase.
   */
  it.each([
    ['no metadata at all', undefined],
    ['empty metadata', {}],
    ['an unknown type', { type: 'donation' }],
    ['a blank bookingId', { bookingId: '   ' }],
  ])('treats %s as unrelated rather than as a failure', (_label, metadata) => {
    expect(classifyCheckoutSession(session({ metadata: metadata as Record<string, string> }))).toBe(
      'unrelated'
    );
  });
});

describe('parseTicketOrder', () => {
  const ticket = (metadata: Record<string, string>, over: Partial<CheckoutSessionLike> = {}) =>
    parseTicketOrder(session({ metadata: { type: 'ticket', ...metadata }, ...over }));

  const complete = {
    eventId: 'evt_1',
    eventTitle: 'Poker Run',
    customerName: 'Cat Nolan',
    quantity: '2',
  };

  it('reads a well-formed session written by createTicketCheckoutSession', () => {
    const result = ticket(complete);
    expect(result).toEqual({
      ok: true,
      value: {
        eventId: 'evt_1',
        eventTitle: 'Poker Run',
        customerName: 'Cat Nolan',
        email: 'buyer@example.com',
        quantity: 2,
        totalAmount: 5000,
      },
    });
  });

  it('accepts a session with no customer name — Stripe does not require one', () => {
    const result = ticket({ ...complete, customerName: '' });
    expect(result.ok && result.value.customerName).toBe('');
  });

  it.each([
    ['eventId', { ...complete, eventId: '' }, 'missing_event_id'],
    ['eventTitle', { ...complete, eventTitle: '  ' }, 'missing_event_title'],
  ])('refuses a session with a blank %s', (_field, metadata, reason) => {
    expect(ticket(metadata)).toEqual({ ok: false, reason });
  });

  /**
   * A ticket is redeemed at the door by confirmation number, so an email is not what
   * makes the record usable. Rejecting the session over a missing one would trade a
   * working ticket for no ticket at all — reintroducing, for that buyer, exactly the
   * failure this whole change removes.
   */
  it('still records a paid ticket when Stripe sent no email at all', () => {
    const result = ticket(complete, { customer_email: null, customer_details: null });
    expect(result.ok && result.value.email).toBe('');
  });

  it('falls back to the address Stripe collected when customer_email is absent', () => {
    const result = ticket(complete, {
      customer_email: null,
      customer_details: { email: 'collected@example.com' },
    });
    expect(result.ok && result.value.email).toBe('collected@example.com');
  });

  /**
   * Quantity flows into `ticketsSold`, so a coerced value corrupts inventory as well as
   * the record. `parseInt` would read '3 tickets' as 3 and '2.5' as 2.
   */
  it.each([['3 tickets'], ['2.5'], ['0'], ['-1'], [''], ['abc']])(
    'refuses quantity %j rather than coercing it',
    (quantity) => {
      expect(ticket({ ...complete, quantity })).toEqual({ ok: false, reason: 'invalid_quantity' });
    }
  );

  /**
   * The purchase path caps an order at MAX_TICKET_QUANTITY. Fulfillment deliberately does
   * not: the money is already taken, and refusing to record a paid ticket because it
   * exceeds a limit we ourselves allowed at checkout would lose the very purchase this
   * handler exists to save.
   */
  it('records a paid quantity above the purchase-time cap instead of rejecting it', () => {
    const result = ticket({ ...complete, quantity: '25' });
    expect(result.ok && result.value.quantity).toBe(25);
  });

  it('defaults a missing amount_total to 0 rather than writing undefined', () => {
    const result = ticket(complete, { amount_total: null });
    expect(result.ok && result.value.totalAmount).toBe(0);
  });
});

describe('parseMembershipOrder', () => {
  const membership = (metadata: Record<string, string>, over: Partial<CheckoutSessionLike> = {}) =>
    parseMembershipOrder(session({ metadata: { type: 'membership', ...metadata }, ...over }));

  it('reads a well-formed membership session', () => {
    const result = membership({ level: 'family', quantity: '1', userId: 'u_1' });
    expect(result).toEqual({
      ok: true,
      value: {
        email: 'buyer@example.com',
        level: 'family',
        quantity: 1,
        userId: 'u_1',
        firstName: '',
      },
    });
  });

  /**
   * The live bug in the old inline code: it wrote `level: session.metadata?.level`, so a
   * session without a level put `undefined` into the write. The Admin SDK rejects
   * `undefined`, that throw landed in the swallowing catch, and the member disappeared.
   * Every field returned here is a string, a number, or an explicit null.
   */
  it('refuses a session with no level instead of writing undefined', () => {
    expect(membership({})).toEqual({ ok: false, reason: 'missing_level' });
  });

  it('returns null — never undefined — for an absent userId', () => {
    const result = membership({ level: 'individual' });
    expect(result.ok && result.value.userId).toBeNull();
  });

  /**
   * Unlike a ticket, a membership is identified, renewed and mailed by email address,
   * so a record without one is not a membership. The `customer_details` fallback makes
   * this effectively unreachable in practice.
   */
  it('refuses a session with no email in either field', () => {
    expect(
      membership({ level: 'family' }, { customer_email: null, customer_details: null })
    ).toEqual({ ok: false, reason: 'missing_email' });
  });

  it('falls back to the address Stripe collected when customer_email is absent', () => {
    const result = membership(
      { level: 'family' },
      { customer_email: null, customer_details: { email: 'collected@example.com', name: 'Cat Nolan' } }
    );
    expect(result.ok && result.value.email).toBe('collected@example.com');
  });

  it('treats an absent quantity as a single membership', () => {
    const result = membership({ level: 'student' });
    expect(result.ok && result.value.quantity).toBe(1);
  });

  it.each([
    ['Mary Anne Nolan', 'Mary Anne'],
    ['Nolan', 'Nolan'],
    ['  Cat  Nolan  ', 'Cat'],
  ])('greets %j as %j', (name, expected) => {
    const result = membership({ level: 'family' }, { customer_details: { name } });
    expect(result.ok && result.value.firstName).toBe(expected);
  });

  it('falls back to an empty greeting when Stripe collected no name', () => {
    const result = membership({ level: 'family' }, { customer_details: null });
    expect(result.ok && result.value.firstName).toBe('');
  });
});
