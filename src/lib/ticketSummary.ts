/**
 * Ticket sales aggregation for the box office admin.
 *
 * Extracted from `TicketsAdmin` and kept dependency-free so it can be unit
 * tested directly — the counts here are what volunteers and organizers are
 * pointed at to answer "how many have we sold?", so they need to be pinned.
 *
 * The distinction this module exists to enforce: **a sale is a ticket, not an
 * order**. One Checkout Session can carry several tickets in its `quantity`,
 * so counting documents understates the real gate count. Counting rows instead
 * of quantity reported 32 when 52 tickets had actually been sold.
 */
import type { Ticket } from '../types';

export interface TicketTotals {
  /** Sum of `quantity` over paid tickets — the real number of admissions sold. */
  tickets: number;
  /** Number of paid ticket documents, i.e. distinct purchases. */
  orders: number;
  /** Sum of `totalAmount` over paid tickets, in cents. */
  revenue: number;
}

export interface EventRollup extends TicketTotals {
  /** `eventTitle`, falling back to `eventId`, falling back to a placeholder. */
  event: string;
}

/**
 * Totals over whatever set is passed in — pass the *filtered* list so the
 * headline reflects the active search and tab.
 *
 * Cancelled tickets are always excluded: they are records of a purchase that no
 * longer admits anyone, so including them in "sold" would overstate the gate
 * count. That also keeps the number meaningful while the Cancelled tab is open.
 */
export function summarizeTickets(tickets: Ticket[]): TicketTotals {
  const paid = tickets.filter(t => t.status === 'paid');
  return {
    tickets: paid.reduce((sum, t) => sum + (t.quantity || 0), 0),
    orders: paid.length,
    revenue: paid.reduce((sum, t) => sum + (t.totalAmount || 0), 0),
  };
}

/**
 * Per-event rollup, highest-selling event first. Pass the *unfiltered* list:
 * this is the at-a-glance board that answers the per-event question without
 * anyone having to type an event name into the search box.
 */
export function rollupByEvent(tickets: Ticket[]): EventRollup[] {
  const map = new Map<string, Ticket[]>();
  for (const t of tickets) {
    if (t.status !== 'paid') continue;
    const key = t.eventTitle || t.eventId || 'Unknown event';
    const bucket = map.get(key);
    if (bucket) bucket.push(t);
    else map.set(key, [t]);
  }
  return [...map.entries()]
    .map(([event, group]) => ({ event, ...summarizeTickets(group) }))
    .sort((a, b) => b.tickets - a.tickets);
}
