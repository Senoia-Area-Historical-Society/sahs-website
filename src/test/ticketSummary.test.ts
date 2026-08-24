import { describe, it, expect } from 'vitest';
import { summarizeTickets, rollupByEvent } from '../lib/ticketSummary';
import type { Ticket } from '../types';

/**
 * Shaped like the documents `stripeWebhook` writes to `tickets/{session.id}`.
 * The quantities deliberately mirror the production distribution that exposed
 * the original bug: more tickets than orders.
 */
const ticket = (over: Partial<Ticket>): Ticket => ({
  id: 'cs_test_1',
  eventId: 'evt1',
  eventTitle: 'Yacht Rock Party',
  confirmationNumber: 'SAHS-ABC123',
  customerName: 'Pat Smith',
  email: 'pat@example.com',
  quantity: 1,
  totalAmount: 5000,
  status: 'paid',
  purchasedAt: '2026-08-20T13:23:40Z',
  ...over,
} as Ticket);

describe('summarizeTickets', () => {
  it('counts tickets by quantity, not by number of orders', () => {
    // The regression this module exists to prevent: 3 orders, 7 tickets.
    const totals = summarizeTickets([
      ticket({ id: 'a', quantity: 4, totalAmount: 20000 }),
      ticket({ id: 'b', quantity: 2, totalAmount: 10000 }),
      ticket({ id: 'c', quantity: 1, totalAmount: 5000 }),
    ]);
    expect(totals.tickets).toBe(7);
    expect(totals.orders).toBe(3);
    expect(totals.revenue).toBe(35000);
  });

  it('excludes cancelled tickets from every total', () => {
    const totals = summarizeTickets([
      ticket({ id: 'a', quantity: 2, totalAmount: 10000 }),
      ticket({ id: 'b', quantity: 5, totalAmount: 25000, status: 'cancelled' }),
    ]);
    expect(totals.tickets).toBe(2);
    expect(totals.orders).toBe(1);
    expect(totals.revenue).toBe(10000);
  });

  it('treats a missing quantity or amount as zero rather than NaN', () => {
    const totals = summarizeTickets([
      ticket({ id: 'a', quantity: undefined as unknown as number, totalAmount: undefined as unknown as number }),
      ticket({ id: 'b', quantity: 3, totalAmount: 15000 }),
    ]);
    expect(totals.tickets).toBe(3);
    expect(totals.revenue).toBe(15000);
  });

  it('returns zeroes for an empty list', () => {
    expect(summarizeTickets([])).toEqual({ tickets: 0, orders: 0, revenue: 0 });
  });
});

describe('rollupByEvent', () => {
  it('groups by event title and sorts by tickets sold descending', () => {
    const rows = rollupByEvent([
      ticket({ id: 'a', eventTitle: 'Poker Run', eventId: 'evt2', quantity: 2, totalAmount: 10000 }),
      ticket({ id: 'b', eventTitle: 'Yacht Rock Party', quantity: 4, totalAmount: 20000 }),
      ticket({ id: 'c', eventTitle: 'Yacht Rock Party', quantity: 3, totalAmount: 15000 }),
    ]);
    expect(rows).toEqual([
      { event: 'Yacht Rock Party', tickets: 7, orders: 2, revenue: 35000 },
      { event: 'Poker Run', tickets: 2, orders: 1, revenue: 10000 },
    ]);
  });

  it('falls back to eventId when a legacy ticket has no eventTitle', () => {
    const rows = rollupByEvent([
      ticket({ id: 'a', eventTitle: undefined as unknown as string, eventId: 'evt-legacy', quantity: 1 }),
    ]);
    expect(rows[0].event).toBe('evt-legacy');
  });

  it('omits events whose only tickets are cancelled', () => {
    const rows = rollupByEvent([
      ticket({ id: 'a', eventTitle: 'Cancelled Gala', quantity: 3, status: 'cancelled' }),
      ticket({ id: 'b', eventTitle: 'Yacht Rock Party', quantity: 1 }),
    ]);
    expect(rows.map(r => r.event)).toEqual(['Yacht Rock Party']);
  });
});
