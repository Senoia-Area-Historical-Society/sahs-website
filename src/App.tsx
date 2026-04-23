import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Pages
import Home from './pages/Home';
import About from './pages/About';
import Museum from './pages/Museum';
import LocationAndHours from './pages/LocationAndHours';
import CarmichaelHouse from './pages/CarmichaelHouse';
import Contact from './pages/Contact';
import PrivacyPolicy from './pages/PrivacyPolicy';
import News from './pages/News';
import NewsDetail from './pages/NewsDetail';
import Support from './pages/Support';
import Supporters from './pages/Supporters';
import MeetingRoom from './pages/MeetingRoom';
import StripeSuccess from './pages/StripeSuccess';
import StripeCancel from './pages/StripeCancel';
import BookingSuccess from './pages/BookingSuccess';
import BookingCancel from './pages/BookingCancel';
import VendorApplication from './pages/VendorApplication';
import SponsorApplication from './pages/SponsorApplication';
import HistoricalPlaces from './pages/HistoricalPlaces';
import HistoricalPlaceDetail from './pages/HistoricalPlaceDetail';
import Media from './pages/Media';
import PastEvents from './pages/PastEvents';
import NotFound from './pages/NotFound';
import Unauthorized from './pages/Unauthorized';
import VolunteerSignup from './pages/VolunteerSignup';

// Admin Pages
import Login from './pages/admin/Login';
import BookingsAdmin from './pages/admin/BookingsAdmin';
import MembershipsAdmin from './pages/admin/MembershipsAdmin';
import TicketsAdmin from './pages/admin/TicketsAdmin';
import ContentAdmin from './pages/admin/ContentAdmin';
import WikiAdmin from './pages/admin/WikiAdmin';
import VolunteersAdmin from './pages/admin/VolunteersAdmin';

import UsersAdmin from './pages/admin/UsersAdmin';

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
      <main className="flex-grow">{children}</main>
      <Footer />
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <div className="flex flex-col min-h-screen bg-cream selection:bg-tan selection:text-white">
        <Routes>
          {/* Admin Routes (No Header/Footer, strictly protected) */}
          <Route path="/admin/login" element={<Login />} />
          <Route path="/admin/users" element={
            <ProtectedRoute>
              <UsersAdmin />
            </ProtectedRoute>
          } />
          <Route path="/admin/bookings" element={
            <ProtectedRoute>
              <BookingsAdmin />
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
          <Route path="/admin/volunteers" element={
            <ProtectedRoute>
              <VolunteersAdmin />
            </ProtectedRoute>
          } />

          {/* Public Routes */}
          <Route path="/" element={<PublicLayout><Home /></PublicLayout>} />
          <Route path="/about-sahs" element={<PublicLayout><About /></PublicLayout>} />
          <Route path="/museum" element={<PublicLayout><Museum /></PublicLayout>} />
          <Route path="/location-and-hours" element={<PublicLayout><LocationAndHours /></PublicLayout>} />
          <Route path="/carmichael-house" element={<PublicLayout><CarmichaelHouse /></PublicLayout>} />
          <Route path="/contact-sahs" element={<PublicLayout><Contact /></PublicLayout>} />
          <Route path="/privacy-policy" element={<PublicLayout><PrivacyPolicy /></PublicLayout>} />
          
          {/* Dynamic Content Views */}
          <Route path="/news" element={<PublicLayout><News /></PublicLayout>} />
          <Route path="/news/:slug" element={<PublicLayout><NewsDetail /></PublicLayout>} />
          <Route path="/support-sahs" element={<PublicLayout><Support /></PublicLayout>} />
          <Route path="/supporters" element={<PublicLayout><Supporters /></PublicLayout>} />
          <Route path="/support-sahs/success" element={<PublicLayout><StripeSuccess /></PublicLayout>} />
          <Route path="/support-sahs/cancel" element={<PublicLayout><StripeCancel /></PublicLayout>} />
          <Route path="/meeting-room" element={<PublicLayout><MeetingRoom /></PublicLayout>} />
          <Route path="/meeting-room/success" element={<PublicLayout><BookingSuccess /></PublicLayout>} />
          <Route path="/meeting-room/cancel" element={<PublicLayout><BookingCancel /></PublicLayout>} />
          <Route path="/vendor-application-form" element={<PublicLayout><VendorApplication /></PublicLayout>} />
          <Route path="/sponsor-application-form" element={<PublicLayout><SponsorApplication /></PublicLayout>} />
          <Route path="/historic-structures-and-places" element={<PublicLayout><HistoricalPlaces /></PublicLayout>} />
          <Route path="/historic-structures-and-places/:slug" element={<PublicLayout><HistoricalPlaceDetail /></PublicLayout>} />
          <Route path="/media" element={<PublicLayout><Media /></PublicLayout>} />
          <Route path="/past-sahs-events" element={<PublicLayout><PastEvents /></PublicLayout>} />
          <Route path="/volunteer/:token" element={<PublicLayout><VolunteerSignup /></PublicLayout>} />
          
          {/* Status Pages */}
          <Route path="/401" element={<PublicLayout><Unauthorized /></PublicLayout>} />
          <Route path="*" element={<PublicLayout><NotFound /></PublicLayout>} />
        </Routes>
      </div>
    </AuthProvider>
  );
}

export default App;
