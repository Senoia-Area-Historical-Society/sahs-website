import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MemberPortal from '../pages/MemberPortal';

// Helper to render within a router context
const renderPortal = () => render(<MemoryRouter><MemberPortal /></MemoryRouter>);

describe('MemberPortal', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders the email form', () => {
    renderPortal();
    expect(screen.getByRole('heading', { name: /check your membership/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/yourname@example.com/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /look up/i })).toBeInTheDocument();
  });

  it('shows "no membership found" when API returns found: false', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ found: false, memberships: [] }),
    } as any);

    renderPortal();
    fireEvent.change(screen.getByPlaceholderText(/yourname@example.com/i), {
      target: { value: 'notamember@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /look up/i }));

    await waitFor(() => {
      expect(screen.getByText(/no membership found/i)).toBeInTheDocument();
    });
  });

  it('shows active membership card when API returns an active subscription', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({
        found: true,
        memberships: [{
          level: 'SAHS Annual Membership',
          status: 'active',
          expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          cancelAtPeriodEnd: false,
        }],
      }),
    } as any);

    renderPortal();
    fireEvent.change(screen.getByPlaceholderText(/yourname@example.com/i), {
      target: { value: 'member@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /look up/i }));

    await waitFor(() => {
      expect(screen.getByText('SAHS Annual Membership')).toBeInTheDocument();
      expect(screen.getByText(/active/i)).toBeInTheDocument();
    });
  });

  it('shows canceled badge for canceled subscriptions', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({
        found: true,
        memberships: [{
          level: 'Family Membership',
          status: 'canceled',
          expirationDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          cancelAtPeriodEnd: false,
        }],
      }),
    } as any);

    renderPortal();
    fireEvent.change(screen.getByPlaceholderText(/yourname@example.com/i), {
      target: { value: 'lapsed@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /look up/i }));

    await waitFor(() => {
      expect(screen.getByText(/canceled/i)).toBeInTheDocument();
    });
  });

  it('shows error message on network failure', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    renderPortal();
    fireEvent.change(screen.getByPlaceholderText(/yourname@example.com/i), {
      target: { value: 'user@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /look up/i }));

    await waitFor(() => {
      expect(screen.getByText(/could not reach the membership server/i)).toBeInTheDocument();
    });
  });

  it('shows cancel-at-period-end warning for active subs that will cancel', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({
        found: true,
        memberships: [{
          level: 'Senior Membership',
          status: 'active',
          expirationDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
          cancelAtPeriodEnd: true,
        }],
      }),
    } as any);

    renderPortal();
    fireEvent.change(screen.getByPlaceholderText(/yourname@example.com/i), {
      target: { value: 'nonrenew@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /look up/i }));

    await waitFor(() => {
      expect(screen.getByText(/will not renew/i)).toBeInTheDocument();
    });
  });
});
