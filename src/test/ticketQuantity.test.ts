import { describe, it, expect } from 'vitest';
import { MAX_TICKETS_PER_ORDER, maxOrderQuantity, clampQuantity } from '../lib/ticketQuantity';
import { MAX_TICKET_QUANTITY } from '../../functions/src/ticketPricing';

/**
 * The buying surfaces and `createTicketCheckoutSession` each hold a cap, and nothing
 * but this test ties them together. If the UI offers more than the server accepts,
 * a buyer picks a quantity, presses Buy, and gets a generic checkout error.
 */
describe('ticket order cap', () => {
  it('offers exactly what the checkout function accepts', () => {
    expect(MAX_TICKETS_PER_ORDER).toBe(MAX_TICKET_QUANTITY);
  });

  it('lets a buyer order for a group, not just a handful', () => {
    expect(MAX_TICKETS_PER_ORDER).toBeGreaterThanOrEqual(20);
  });
});

describe('maxOrderQuantity', () => {
  it.each([undefined, null, 0])('treats capacity %j as unlimited', (capacity) => {
    expect(maxOrderQuantity(capacity, 7)).toBe(MAX_TICKETS_PER_ORDER);
  });

  it('limits an order to the seats left', () => {
    expect(maxOrderQuantity(100, 97)).toBe(3);
  });

  it('never goes below zero when oversold', () => {
    expect(maxOrderQuantity(10, 12)).toBe(0);
  });

  it('still applies the per-order ceiling to a large event', () => {
    expect(maxOrderQuantity(1000, 0)).toBe(MAX_TICKETS_PER_ORDER);
  });
});

describe('clampQuantity', () => {
  it.each([
    ['12', 50, 12],
    ['99', 50, 50],
    ['0', 50, 1],
    ['-3', 50, 1],
    ['abc', 50, 1],
    ['2.7', 50, 2],
    [5, 3, 3],
  ])('clamps %j with max %i to %i', (value, max, expected) => {
    expect(clampQuantity(value, max)).toBe(expected);
  });
});
