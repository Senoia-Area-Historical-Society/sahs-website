import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AdminErrorBoundary from '../components/admin/AdminErrorBoundary';

/**
 * The portal-wide floor under a render throw.
 *
 * `/admin/content` was a blank white page because one `posts` document stored
 * `updatedAt` as a string and React unmounts the whole tree when a render throws.
 * Coercion (src/lib/firestoreDates.ts) fixes that specific document; this boundary is
 * what keeps the *next* unexpected value from taking the portal with it.
 */

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { email: 'jeremywarren@senoiahistory.com' },
    isAdmin: true,
    isCurator: true,
    isEditor: true,
    isReadOnly: true,
    isSAHSUser: true,
    logout: vi.fn(),
  }),
}));

function Boom(): React.ReactElement {
  throw new Error('one record held a value the page did not expect');
}

/**
 * Mirrors the real route shape: each path renders its own `AdminErrorBoundary` at the
 * same position and of the same type, which is exactly the arrangement React reconciles
 * by reusing the existing instance.
 */
const renderPortal = (initialPath: string) =>
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/admin/content" element={<AdminErrorBoundary><Boom /></AdminErrorBoundary>} />
        <Route path="/admin" element={<AdminErrorBoundary><h1>Dashboard loaded</h1></AdminErrorBoundary>} />
      </Routes>
    </MemoryRouter>
  );

describe('AdminErrorBoundary', () => {
  beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => {}));
  afterEach(() => vi.restoreAllMocks());

  it('shows a message instead of a blank page when an admin page throws', () => {
    renderPortal('/admin/content');
    expect(screen.getByText(/this page failed to load/i)).toBeInTheDocument();
    expect(screen.getByText('/admin/content')).toBeInTheDocument();
  });

  it('keeps the admin nav, so the operator can leave the broken page', () => {
    renderPortal('/admin/content');
    // AdminHeader is rendered by the fallback, so the portal nav survives the crash —
    // that is the real recovery path, not the buttons.
    expect(screen.getByText('SAHS Portal')).toBeInTheDocument();
    expect(screen.getByText(/sign out/i)).toBeInTheDocument();
    // Both the header's nav entry and the fallback's own button point at the dashboard.
    expect(screen.getAllByRole('link', { name: /dashboard/i }).length).toBeGreaterThan(1);
    expect(screen.getByRole('button', { name: /reload/i })).toBeInTheDocument();
  });

  it('renders children untouched when nothing throws', () => {
    renderPortal('/admin');
    expect(screen.getByText('Dashboard loaded')).toBeInTheDocument();
    expect(screen.queryByText(/this page failed to load/i)).not.toBeInTheDocument();
  });

  /**
   * The `key={pathname}` is what this pins. Without it React reuses the reconciled
   * boundary instance across routes, `failed` stays true, and every admin page after
   * the first throw renders the fallback — a one-page bug becomes a dead portal that
   * only a manual reload clears.
   */
  it('recovers when the operator navigates to another admin page', async () => {
    const user = userEvent.setup();
    renderPortal('/admin/content');
    expect(screen.getByText(/this page failed to load/i)).toBeInTheDocument();

    await user.click(screen.getAllByRole('link', { name: /dashboard/i })[0]);

    expect(screen.getByText('Dashboard loaded')).toBeInTheDocument();
    expect(screen.queryByText(/this page failed to load/i)).not.toBeInTheDocument();
  });
});
