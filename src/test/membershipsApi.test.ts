import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// `api.ts` pulls in the Firestore SDK at module scope purely for its other exports.
// `getMemberships` touches none of it — it is a plain fetch against the
// `listStripeSubscriptions` Cloud Function — so both are stubbed to keep this test
// about the one behaviour that matters here.
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(), getDocs: vi.fn(), query: vi.fn(), orderBy: vi.fn(), limit: vi.fn(),
  where: vi.fn(), addDoc: vi.fn(), doc: vi.fn(), updateDoc: vi.fn(), getDoc: vi.fn(),
  runTransaction: vi.fn(), Timestamp: { now: vi.fn(), fromDate: vi.fn() }, deleteDoc: vi.fn(),
  serverTimestamp: vi.fn(),
}));
vi.mock('../lib/firebase', () => ({ db: {} }));

import { getMemberships } from '../services/api';

describe('getMemberships', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns the roster the function sends back', async () => {
    const roster = [{ id: 'sub_1', email: 'member@example.com', level: 'Family Membership', status: 'active' }];
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: () => Promise.resolve(roster) } as unknown as Response);

    await expect(getMemberships()).resolves.toEqual(roster);
  });

  // The regression this guards: the old implementation caught everything and returned
  // `[]`, so a failing Stripe call rendered in MembershipsAdmin as the empty-state copy
  // "No membership records found" instead of an error. A board member reading that page
  // during an outage would conclude the society has no members.
  it('throws rather than reporting an empty roster when the function fails', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false, status: 500, json: () => Promise.resolve({}) } as unknown as Response);

    await expect(getMemberships()).rejects.toThrow('500');
  });

  it('throws rather than reporting an empty roster when the network fails', async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(getMemberships()).rejects.toThrow('Failed to fetch');
  });
});
