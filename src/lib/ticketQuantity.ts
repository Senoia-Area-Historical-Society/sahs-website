/**
 * Largest single ticket order either buying surface offers.
 *
 * Must equal `MAX_TICKET_QUANTITY` in `functions/src/ticketPricing.ts`, which refuses
 * anything above it — `src/test/ticketQuantity.test.ts` fails if the two drift. It is
 * a sanity ceiling, not a sales policy: buyers should be able to order for a whole
 * table, and it was raised from 10 after a caller could not buy for their group.
 */
export const MAX_TICKETS_PER_ORDER = 50;

/**
 * The most this order may contain: the per-order ceiling, further limited by what is
 * left when the event has a capacity. Falsy capacity (0 or undefined) means unlimited.
 */
export function maxOrderQuantity(capacity: number | null | undefined, ticketsSold: number | null | undefined): number {
  if (!capacity) return MAX_TICKETS_PER_ORDER;
  return Math.max(0, Math.min(MAX_TICKETS_PER_ORDER, capacity - (ticketsSold || 0)));
}

/** Coerces typed input into a whole number in [1, max]; junk falls back to 1. */
export function clampQuantity(value: unknown, max: number): number {
  const n = typeof value === 'string' ? parseInt(value, 10) : Number(value);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(Math.floor(n), Math.max(1, max));
}
