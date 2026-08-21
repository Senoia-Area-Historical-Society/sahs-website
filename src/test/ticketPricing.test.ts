import { describe, it, expect } from 'vitest';
import {
  resolveTicketOrder,
  rejectionStatus,
  MAX_TICKET_QUANTITY,
} from '../../functions/src/ticketPricing';

/**
 * The bug these guard: `createTicketCheckoutSession` passed the request body's
 * `price` straight to Stripe as `unit_amount`. A crafted POST to the public function
 * URL could therefore buy a $50 ticket for a penny. Every assertion below is about
 * one thing — the amount and the product name come from Firestore, and nothing the
 * caller sends can influence them.
 */

const published = (over: Record<string, unknown> = {}) => ({
  title: 'Fourth of July Celebration',
  slug: 'fourth-of-july',
  status: 'published',
  ticketPrice: 5000,
  ...over,
});

describe('resolveTicketOrder — pricing authority', () => {
  it('prices the order from the stored ticketPrice', () => {
    const order = resolveTicketOrder(published(), 2);
    expect(order).toMatchObject({ ok: true, unitAmount: 5000, quantity: 2 });
  });

  it('takes the product name from the stored title', () => {
    const order = resolveTicketOrder(published({ title: '  Ghost Tour  ' }), 1);
    expect(order).toMatchObject({ ok: true, title: 'Ghost Tour' });
  });

  it('takes the cancel-URL slug from the stored document', () => {
    const order = resolveTicketOrder(published({ slug: 'ghost-tour' }), 1);
    expect(order).toMatchObject({ ok: true, slug: 'ghost-tour' });
  });

  it('ignores a price the caller tries to smuggle in alongside the real one', () => {
    // The attack: POST {price: 1}. `resolveTicketOrder` has no parameter for it.
    const order = resolveTicketOrder(published({ price: 1 }), 1);
    expect(order).toMatchObject({ ok: true, unitAmount: 5000 });
  });
});

describe('resolveTicketOrder — unsellable events', () => {
  it('refuses an event that does not exist', () => {
    expect(resolveTicketOrder(undefined, 1)).toEqual({ ok: false, reason: 'event_not_found' });
  });

  it.each(['draft', 'archived', undefined])('refuses status %s', (status) => {
    expect(resolveTicketOrder(published({ status }), 1)).toEqual({
      ok: false,
      reason: 'event_not_published',
    });
  });

  it('refuses an event with no ticketPrice', () => {
    expect(resolveTicketOrder(published({ ticketPrice: undefined }), 1)).toEqual({
      ok: false,
      reason: 'event_not_ticketed',
    });
  });

  it('refuses a zero price rather than creating a free ticket', () => {
    expect(resolveTicketOrder(published({ ticketPrice: 0 }), 1)).toEqual({
      ok: false,
      reason: 'event_not_ticketed',
    });
  });

  it('refuses a non-integer or string price — unit_amount must be whole cents', () => {
    // A legacy document can hold either; neither is a valid `unit_amount`.
    expect(resolveTicketOrder(published({ ticketPrice: '5000' }), 1)).toEqual({
      ok: false,
      reason: 'event_not_ticketed',
    });
    expect(resolveTicketOrder(published({ ticketPrice: 49.5 }), 1)).toEqual({
      ok: false,
      reason: 'event_not_ticketed',
    });
  });

  it('refuses an event with a blank title', () => {
    expect(resolveTicketOrder(published({ title: '   ' }), 1)).toEqual({
      ok: false,
      reason: 'event_missing_title',
    });
  });
});

describe('resolveTicketOrder — quantity', () => {
  it.each([0, -1, 1.5, MAX_TICKET_QUANTITY + 1, 'abc', null, undefined])(
    'refuses quantity %s',
    (quantity) => {
      expect(resolveTicketOrder(published(), quantity)).toEqual({
        ok: false,
        reason: 'invalid_quantity',
      });
    }
  );

  it('accepts the UI maximum', () => {
    expect(resolveTicketOrder(published(), MAX_TICKET_QUANTITY)).toMatchObject({
      ok: true,
      quantity: MAX_TICKET_QUANTITY,
    });
  });

  it('accepts a numeric string, since it also feeds the ticketsSold increment', () => {
    expect(resolveTicketOrder(published(), '3')).toMatchObject({ ok: true, quantity: 3 });
  });
});

describe('rejectionStatus', () => {
  it('hides drafts and missing events behind a 404', () => {
    expect(rejectionStatus('event_not_found')).toBe(404);
    expect(rejectionStatus('event_not_published')).toBe(404);
  });

  it('reports unsellable or malformed requests as 400', () => {
    expect(rejectionStatus('event_not_ticketed')).toBe(400);
    expect(rejectionStatus('event_missing_title')).toBe(400);
    expect(rejectionStatus('invalid_quantity')).toBe(400);
  });
});
