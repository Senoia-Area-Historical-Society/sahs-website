import { useLocation, Link } from 'react-router-dom';
import { RefreshCw, LayoutDashboard, AlertTriangle } from 'lucide-react';
import ErrorBoundary from '../ErrorBoundary';
import AdminHeader from '../../pages/admin/AdminHeader';

/**
 * Contains a render error to one admin page instead of blanking the portal.
 *
 * React unmounts the entire tree when a render throws, and the admin pages render
 * Firestore documents whose field shapes are conventional rather than enforced — so a
 * single malformed document takes down everything, including the nav needed to get
 * somewhere else. That is not hypothetical: `posts/N2B4Aq2bwjytBWPe7bVy` stores
 * `updatedAt` as a string, and `/admin/content` was a blank white page for every user
 * until `src/lib/firestoreDates.ts` made the date cells coerce rather than throw.
 *
 * Coercion is the fix for that specific class. This is the floor under the next one:
 * whatever throws, the operator sees a message and keeps a working header.
 *
 * **The `key` is load-bearing.** Every admin route renders its own `<ProtectedRoute>`,
 * but they sit at the same position in the tree and share a component type, so React
 * reconciles them across navigations and *reuses* the instance — boundary included.
 * Without a key the boundary would stay `failed` after the first throw and every
 * subsequent admin page would render the fallback, turning a one-page bug into a dead
 * portal that only a manual reload clears. Keying on the path remounts the boundary per
 * route, which makes "navigate somewhere else" an actual recovery.
 * Pinned by `src/test/adminErrorBoundary.test.tsx`.
 */
export default function AdminErrorBoundary({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  return (
    <ErrorBoundary key={pathname} label={`admin:${pathname}`} fallback={<AdminPageFailed path={pathname} />}>
      {children}
    </ErrorBoundary>
  );
}

/**
 * Keeps `AdminHeader` so the operator can navigate out of the broken page, which is the
 * primary recovery — the rest of the portal is unaffected by one page's failure.
 */
function AdminPageFailed({ path }: { path: string }) {
  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <AdminHeader />
      <main className="flex-grow flex items-start justify-center p-8">
        <div className="mt-12 max-w-lg w-full bg-white rounded-xl border border-red-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-6 py-4 bg-red-50 border-b border-red-100">
            <AlertTriangle size={16} className="text-red-600 shrink-0" />
            <h1 className="font-sans font-bold text-xs uppercase tracking-wider text-red-800">
              This page failed to load
            </h1>
          </div>
          <div className="px-6 py-5">
            <p className="font-sans text-sm text-charcoal/70 leading-relaxed">
              Something on <span className="font-mono text-xs text-charcoal">{path}</span> could not be
              displayed. The rest of the portal still works — use the menu above to carry on.
            </p>
            <p className="font-sans text-xs text-charcoal/50 leading-relaxed mt-3">
              The details are in the browser console. If it keeps happening, this is worth reporting:
              it usually means one record holds a value the page did not expect.
            </p>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => window.location.reload()}
                className="flex items-center gap-2 bg-tan hover:bg-tan-dark text-white px-4 py-2 rounded-md transition-colors font-sans text-xs font-bold uppercase tracking-wider"
              >
                <RefreshCw size={14} /> Reload
              </button>
              <Link
                to="/admin"
                className="flex items-center gap-2 border border-tan-light hover:bg-cream text-charcoal px-4 py-2 rounded-md transition-colors font-sans text-xs font-bold uppercase tracking-wider"
              >
                <LayoutDashboard size={14} /> Dashboard
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
