import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// `api.ts` imports `../lib/firebase`, which calls `getAuth(app)` at module scope.
// That throws `auth/invalid-api-key` wherever VITE_FIREBASE_API_KEY is unset —
// which is every CI runner, since `.env` is gitignored. Without these mocks the
// suite fails to load at import time and takes all of its tests with it, while
// passing locally for anyone who happens to have a `.env`.
//
// `getTicketBySessionId` is a plain fetch against the `getTicketBySession` Cloud
// Function and touches no Firestore, so stubbing both is free. Same approach as
// membershipsApi.test.ts.
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(), getDocs: vi.fn(), query: vi.fn(), orderBy: vi.fn(), limit: vi.fn(),
  where: vi.fn(), addDoc: vi.fn(), doc: vi.fn(), updateDoc: vi.fn(), getDoc: vi.fn(),
  runTransaction: vi.fn(), Timestamp: { now: vi.fn(), fromDate: vi.fn() }, deleteDoc: vi.fn(),
  serverTimestamp: vi.fn(),
}));
vi.mock('../lib/firebase', () => ({ db: {} }));

import { getTicketBySessionId } from '../services/api';

/**
 * The buyer's post-checkout confirmation lookup. This goes through the
 * `getTicketBySession` Cloud Function rather than Firestore, because the
 * `tickets` collection is no longer publicly readable — see the rule comment in
 * firestore.rules.
 *
 * The contract that matters: an unresolved lookup must return null rather than
 * throwing or returning a partial object. TicketSuccess renders null as
 * "Payment Received / confirmation not ready", which is the honest state. A
 * throw would surface as a blank page, and a truthy partial would let the page
 * claim a confirmation was issued when it wasn't — the exact failure that hid a
 * months-long stripeWebhook outage from ~25 paying customers.
 */
describe('getTicketBySessionId', () => {
  const ticket = {
    id: 'cs_live_abc', eventId: 'e1', eventTitle: 'Yacht Rock Party',
    customerName: 'Ada Lovelace', email: 'ada@example.com', quantity: 3,
    totalAmount: 15000, status: 'paid', confirmationNumber: 'SAHS-ABC123',
    purchasedAt: '2026-08-20T13:23:40Z', qrCode: 'data:image/png;base64,X',
  };

  const mockFetch = (body: unknown, ok = true, status = 200) =>
    vi.fn().mockResolvedValue({ ok, status, json: async () => body });

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the ticket from a found response', async () => {
    vi.stubGlobal('fetch', mockFetch({ found: true, ticket }));
    await expect(getTicketBySessionId('cs_live_abc')).resolves.toEqual(ticket);
  });

  it('passes the session id as a url-encoded query parameter', async () => {
    const fetchMock = mockFetch({ found: true, ticket });
    vi.stubGlobal('fetch', fetchMock);
    await getTicketBySessionId('cs_live_a/b+c');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('/getTicketBySession?session_id=');
    expect(url).toContain(encodeURIComponent('cs_live_a/b+c'));
  });

  it('returns null when the session resolves to no ticket', async () => {
    vi.stubGlobal('fetch', mockFetch({ found: false, reason: 'not_found' }));
    await expect(getTicketBySessionId('cs_live_missing')).resolves.toBeNull();
  });

  it('returns null rather than throwing on a non-ok response', async () => {
    vi.stubGlobal('fetch', mockFetch({ found: false, reason: 'server_error' }, false, 500));
    await expect(getTicketBySessionId('cs_live_boom')).resolves.toBeNull();
  });

  it('returns null rather than throwing when the network fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
    await expect(getTicketBySessionId('cs_live_offline')).resolves.toBeNull();
  });

  it('returns null when the response claims found but carries no ticket', async () => {
    vi.stubGlobal('fetch', mockFetch({ found: true }));
    await expect(getTicketBySessionId('cs_live_weird')).resolves.toBeNull();
  });
});
