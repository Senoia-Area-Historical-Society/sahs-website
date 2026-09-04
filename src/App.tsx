import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
import AnalyticsTracker from './components/AnalyticsTracker';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Pages
import Home from './pages/Home';
import About from './pages/About';
import SenoiaStories from './pages/SenoiaStories';
import LocationAndHours from './pages/LocationAndHours';
import CarmichaelHouse from './pages/CarmichaelHouse';
import FilmingInSenoia from './pages/FilmingInSenoia';
import Contact from './pages/Contact';
import PrivacyPolicy from './pages/PrivacyPolicy';
import News from './pages/News';
import NewsDetail from './pages/NewsDetail';
import Support from './pages/Support';
import Supporters from './pages/Supporters';
import MeetingRoom from './pages/MeetingRoom';
import StripeSuccess from './pages/StripeSuccess';
import StripeCancel from './pages/StripeCancel';
import VendorApplication from './pages/VendorApplication';
import HistoricalPlaces from './pages/HistoricalPlaces';
import HistoricalPlaceDetail from './pages/HistoricalPlaceDetail';
import Media from './pages/Media';
import PastEvents from './pages/PastEvents';
import NotFound from './pages/NotFound';
import Unauthorized from './pages/Unauthorized';
import VolunteerSignup from './pages/VolunteerSignup';
import TicketSuccess from './pages/TicketSuccess';
import BoxOffice from './pages/BoxOffice';
import EmbedTickets from './pages/EmbedTickets';

// Admin Pages
import Login from './pages/admin/Login';
import MembershipsAdmin from './pages/admin/MembershipsAdmin';
import TicketsAdmin from './pages/admin/TicketsAdmin';
import ContentAdmin from './pages/admin/ContentAdmin';
import WikiAdmin from './pages/admin/WikiAdmin';
import PlacesAdmin from './pages/admin/PlacesAdmin';
import VolunteersAdmin from './pages/admin/VolunteersAdmin';
import TicketScanner from './pages/admin/TicketScanner';

import UsersAdmin from './pages/admin/UsersAdmin';
import SubmissionsAdmin from './pages/admin/SubmissionsAdmin';
import ShortLinksAdmin from './pages/admin/ShortLinksAdmin';
import AdminDashboard from './pages/admin/AdminDashboard';
import NewsletterComposer from './pages/admin/NewsletterComposer';
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isSAHSUser, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="min-h-screen bg-cream flex justify-center items-center font-serif text-charcoal/60">Verifying access...</div>;
  }

  if (!user || !isSAHSUser) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

// Layout wrapper for public pages to ensure Header/Footer are rendered
function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main id="content" tabIndex={-1} className="flex-grow focus:outline-none">{children}</main>
      <Footer />
    </>
  );
}

// Redirect logic for admin subdomain
function HostnameRedirect() {
  const { pathname } = useLocation();
  const hostname = window.location.hostname;

  // Stray traffic (old bookmarks, indexed links) sometimes lands on the raw
  // Firebase-assigned domain instead of the real site — that domain serves a
  // stale pre-hosting-target deploy, so bounce it to the real domain instead
  // of letting staff hit broken/blank pages there (e.g. via the footer's
  // relative "Staff Login" link, which stays on whatever origin it's clicked from).
  if (hostname.endsWith('.firebaseapp.com') || hostname.endsWith('.web.app')) {
    window.location.replace(`https://senoiahistory.com${pathname}${window.location.search}`);
    return null;
  }

  // If we're on the admin subdomain and at the root path, redirect to admin content
  if (hostname.startsWith('admin.') && pathname === '/') {
    return <Navigate to="/admin/content" replace />;
  }

  return null;
}

function App() {
  // Embedded widgets are framed on partner sites, so they must not inherit the
  // app shell's opaque background, full-height stretch, or skip link.
  const isEmbed = useLocation().pathname.startsWith('/embed/');

  return (
    <AuthProvider>
      <div className={isEmbed ? '' : 'flex flex-col min-h-screen bg-cream selection:bg-tan selection:text-white'}>
        {!isEmbed && (
          <a href="#content" className="skip-link visually-hidden fixed top-4 left-4 z-[100]">Skip to main content</a>
        )}
        <HostnameRedirect />
        <ScrollToTop />
        <AnalyticsTracker />
        <Routes>
          {/* Admin Routes (No Header/Footer, strictly protected) */}
          <Route path="/admin/login" element={<Login />} />
          <Route path="/admin" element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          } />
          <Route path="/admin/submissions" element={
            <ProtectedRoute>
              <SubmissionsAdmin />
            </ProtectedRoute>
          } />
          <Route path="/admin/users" element={
            <ProtectedRoute>
              <UsersAdmin />
            </ProtectedRoute>
          } />
          <Route path="/admin/memberships" element={
            <ProtectedRoute>
              <MembershipsAdmin />
            </ProtectedRoute>
          } />
          <Route path="/admin/tickets" element={
            <ProtectedRoute>
              <TicketsAdmin />
            </ProtectedRoute>
          } />
          <Route path="/admin/content" element={
            <ProtectedRoute>
              <ContentAdmin />
            </ProtectedRoute>
          } />
          <Route path="/admin/wiki" element={
            <ProtectedRoute>
              <WikiAdmin />
            </ProtectedRoute>
          } />
          <Route path="/admin/places" element={
            <ProtectedRoute>
              <PlacesAdmin />
            </ProtectedRoute>
          } />
          <Route path="/admin/volunteers" element={
            <ProtectedRoute>
              <VolunteersAdmin />
            </ProtectedRoute>
          } />
          <Route path="/admin/tickets/scan" element={
            <ProtectedRoute>
              <TicketScanner />
            </ProtectedRoute>
          } />
          <Route path="/admin/shortlinks" element={
            <ProtectedRoute>
              <ShortLinksAdmin />
            </ProtectedRoute>
          } />
          <Route path="/admin/newsletter" element={
            <ProtectedRoute>
              <NewsletterComposer />
            </ProtectedRoute>
          } />

          {/* Public Routes */}
          <Route path="/" element={<PublicLayout><Home /></PublicLayout>} />
          <Route path="/about-sahs" element={<PublicLayout><About /></PublicLayout>} />
          <Route path="/senoia-stories" element={<PublicLayout><SenoiaStories /></PublicLayout>} />
          <Route path="/location-and-hours" element={<PublicLayout><LocationAndHours /></PublicLayout>} />
          <Route path="/carmichael-house" element={<PublicLayout><CarmichaelHouse /></PublicLayout>} />
          <Route path="/filming-in-senoia" element={<PublicLayout><FilmingInSenoia /></PublicLayout>} />
          <Route path="/contact-sahs" element={<PublicLayout><Contact /></PublicLayout>} />
          <Route path="/privacy-policy" element={<PublicLayout><PrivacyPolicy /></PublicLayout>} />
          
          {/* Dynamic Content Views */}
          <Route path="/news" element={<PublicLayout><News /></PublicLayout>} />
          <Route path="/news/:slug" element={<PublicLayout><NewsDetail /></PublicLayout>} />
          <Route path="/box-office" element={<PublicLayout><BoxOffice /></PublicLayout>} />
          <Route path="/support-sahs" element={<PublicLayout><Support /></PublicLayout>} />
          <Route path="/supporters" element={<PublicLayout><Supporters /></PublicLayout>} />
          <Route path="/support-sahs/success" element={<PublicLayout><StripeSuccess /></PublicLayout>} />
          <Route path="/support-sahs/cancel" element={<PublicLayout><StripeCancel /></PublicLayout>} />
          <Route path="/meeting-room" element={<PublicLayout><MeetingRoom /></PublicLayout>} />
          <Route path="/vendor-application-form" element={<PublicLayout><VendorApplication /></PublicLayout>} />
          <Route path="/sponsor-application-form" element={<Navigate to="/support-sahs#memberships" replace />} />
          <Route path="/historic-structures-and-places" element={<PublicLayout><HistoricalPlaces /></PublicLayout>} />
          <Route path="/historic-structures-and-places/:slug" element={<PublicLayout><HistoricalPlaceDetail /></PublicLayout>} />
          <Route path="/media" element={<PublicLayout><Media /></PublicLayout>} />
          <Route path="/past-sahs-events" element={<PublicLayout><PastEvents /></PublicLayout>} />
          <Route path="/volunteer/:token" element={<PublicLayout><VolunteerSignup /></PublicLayout>} />
          <Route path="/tickets/success" element={<PublicLayout><TicketSuccess /></PublicLayout>} />

          {/* Embeddable widgets for partner sites — intentionally no PublicLayout */}
          <Route path="/embed/tickets/:slug" element={<EmbedTickets />} />
          {/* /membership-status is retired. It was an unauthenticated membership oracle:
              anyone could POST an email address and learn whether that person was a member,
              at what tier, and when they renewed — with no throttle, and CORS reflecting any
              origin, so it could be driven from third-party pages via visitors' browsers.
              Tier is effectively donation amount, which is the sensitive part.

              Stripe's billing portal does the same job and verifiably does not enumerate:
              it answers "if that address is active with us, you'll receive a link" whether
              or not the address exists. `firebase.json` 301s this path there, so the link in
              already-delivered welcome emails still works. Do not reintroduce this route
              without an email-verification step. */}
          
          {/* Status Pages */}
          <Route path="/401" element={<PublicLayout><Unauthorized /></PublicLayout>} />
          <Route path="*" element={<PublicLayout><NotFound /></PublicLayout>} />
        </Routes>
      </div>
    </AuthProvider>
  );
}

export default App;
