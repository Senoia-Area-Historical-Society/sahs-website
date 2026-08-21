import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TicketSuccess from '../pages/TicketSuccess';
import type { Ticket } from '../types';
import { getTicketBySessionId } from '../services/api';
import { logEvent } from 'firebase/analytics';

vi.mock('../services/api', () => ({
  getTicketBySessionId: vi.fn(),
}));

// `analytics` is null under jsdom (lib/firebase gates it on hostname !== 'localhost'), so the
// reporting path would never run unmocked. Stand in a truthy instance to exercise it.
vi.mock('../lib/firebase', () => ({ analytics: { __stub: true } }));
vi.mock('firebase/analytics', () => ({ logEvent: vi.fn() }));

const renderAt = (search: string) =>
  render(
    <MemoryRouter initialEntries={[`/tickets/success${search}`]}>
      <TicketSuccess />
    </MemoryRouter>
  );

// The page polls on a 1s initial delay then 1.5s intervals, so every state after 'loading'
// is behind fake timers. Advancing past the whole 4-attempt budget lands on the final state.
const settle = () => act(async () => { await vi.advanceTimersByTimeAsync(8000); });

// The strings that must never appear when no ticket document was found. A green check plus
// "Payment Successful!" is what let a months-long stripeWebhook outage go unreported: ~25
// buyers were told their purchase was confirmed while no `tickets` doc was ever written.
const CLAIMS_TICKET_ISSUED = [
  /payment successful/i,
  /purchase was confirmed/i,
  /you're confirmed/i,
  /includes your confirmation details/i,
];

describe('TicketSuccess', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(getTicketBySessionId).mockReset();
    vi.mocked(logEvent).mockReset();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('shows the ticket card once the webhook has written the document', async () => {
    const paidTicket: Ticket = {
      id: 't1',
      eventId: 'e1',
      eventTitle: 'Yacht Rock Night',
      customerName: 'Ada Lovelace',
      email: 'ada@example.com',
      quantity: 2,
      totalAmount: 5000,
      status: 'paid',
      confirmationNumber: 'SAHS-ABC123',
      purchasedAt: new Date('2026-07-04T18:00:00Z').toISOString(),
    };
    vi.mocked(getTicketBySessionId).mockResolvedValue(paidTicket);

    renderAt('?session_id=cs_test_found');
    await settle();

    expect(screen.getByText('SAHS-ABC123')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /you're confirmed/i })).toBeInTheDocument();
  });

  it('does NOT claim the ticket was issued when no ticket document is found', async () => {
    vi.mocked(getTicketBySessionId).mockResolvedValue(null);

    renderAt('?session_id=cs_test_missing');
    await settle();

    expect(screen.getByRole('heading', { name: /payment received/i })).toBeInTheDocument();
    for (const claim of CLAIMS_TICKET_ISSUED) {
      expect(screen.queryByText(claim)).not.toBeInTheDocument();
    }
  });

  it('shows the session id as a quotable reference and a contact route on timeout', async () => {
    vi.mocked(getTicketBySessionId).mockResolvedValue(null);

    renderAt('?session_id=cs_test_reference');
    await settle();

    expect(screen.getByText('cs_test_reference')).toBeInTheDocument();
    const mailto = screen
      .getAllByRole('link')
      .filter(a => a.getAttribute('href')?.startsWith('mailto:info@senoiahistory.com'));
    expect(mailto.length).toBeGreaterThan(0);
  });

  it('reports the unresolved ticket so an outage is detectable, not just reproducible', async () => {
    vi.mocked(getTicketBySessionId).mockResolvedValue(null);

    renderAt('?session_id=cs_test_logged');
    await settle();

    // Breadcrumb for whoever reproduces a buyer's report...
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('cs_test_logged'));
    // ...and the signal SAHS can actually see without waiting for a complaint.
    expect(logEvent).toHaveBeenCalledWith(
      expect.anything(),
      'ticket_confirmation_unresolved',
      expect.objectContaining({ session_id: 'cs_test_logged' })
    );
  });

  it('does not report anything when the ticket is found', async () => {
    vi.mocked(getTicketBySessionId).mockResolvedValue({
      id: 't2', eventId: 'e1', eventTitle: 'Yacht Rock Night', email: 'ada@example.com',
      quantity: 1, totalAmount: 2500, status: 'paid', confirmationNumber: 'SAHS-OK',
      purchasedAt: new Date('2026-07-04T18:00:00Z').toISOString(),
    });

    renderAt('?session_id=cs_test_ok');
    await settle();

    expect(logEvent).not.toHaveBeenCalled();
    expect(console.error).not.toHaveBeenCalled();
  });

  it('does not claim a payment succeeded when there is no session id at all', async () => {
    renderAt('');
    await settle();

    expect(screen.getByRole('heading', { name: /no purchase to show/i })).toBeInTheDocument();
    expect(screen.queryByText(/payment received/i)).not.toBeInTheDocument();
    for (const claim of CLAIMS_TICKET_ISSUED) {
      expect(screen.queryByText(claim)).not.toBeInTheDocument();
    }
    expect(getTicketBySessionId).not.toHaveBeenCalled();
  });
});
