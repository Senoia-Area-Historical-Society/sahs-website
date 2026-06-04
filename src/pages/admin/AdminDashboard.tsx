import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Link } from 'react-router-dom';
import AdminHeader from './AdminHeader';
import { FileText, Calendar, Ticket, CalendarDays, Users, Plus, TrendingUp, BookOpen, Clock, Loader2 } from 'lucide-react';

interface PostCounts { published: number; draft: number; archived: number; }
interface UpcomingEvent { id: string; title: string; slug: string; eventDate: Timestamp | null; location?: string; }
interface RecentTicket { id: string; eventTitle: string; email: string; quantity: number; totalAmount: number; purchasedAt: string; }
interface RecentBooking { id: string; organizationName?: string; contactName?: string; date: string; status: string; submittedAt?: any; }

export default function AdminDashboard() {
  const [postCounts, setPostCounts] = useState<PostCounts | null>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [recentTickets, setRecentTickets] = useState<RecentTicket[]>([]);
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      const now = new Date();

      const [publishedSnap, draftSnap, archivedSnap, eventsSnap, ticketsSnap, bookingsSnap] = await Promise.all([
        getDocs(query(collection(db, 'posts'), where('status', '==', 'published'))),
        getDocs(query(collection(db, 'posts'), where('status', '==', 'draft'))),
        getDocs(query(collection(db, 'posts'), where('status', '==', 'archived'))),
        getDocs(query(
          collection(db, 'posts'),
          where('type', '==', 'event'),
          where('status', '==', 'published'),
          orderBy('eventDate', 'asc'),
          limit(4)
        )),
        getDocs(query(collection(db, 'tickets'), orderBy('purchasedAt', 'desc'), limit(5))),
        getDocs(query(collection(db, 'bookings'), orderBy('submittedAt', 'desc'), limit(5))),
      ]);

      setPostCounts({
        published: publishedSnap.size,
        draft: draftSnap.size,
        archived: archivedSnap.size,
      });

      const events: UpcomingEvent[] = eventsSnap.docs
        .map(d => ({ id: d.id, ...d.data() } as UpcomingEvent))
        .filter(e => {
          if (!e.eventDate) return true;
          const eventDate = e.eventDate.toDate ? e.eventDate.toDate() : new Date(e.eventDate as any);
          return eventDate >= now;
        })
        .slice(0, 3);
      setUpcomingEvents(events);

      setRecentTickets(ticketsSnap.docs.map(d => ({ id: d.id, ...d.data() } as RecentTicket)));
      setRecentBookings(bookingsSnap.docs.map(d => ({ id: d.id, ...d.data() } as RecentBooking)));
      setLoading(false);
    }

    loadDashboard().catch(err => {
      console.error('Dashboard load error:', err);
      setLoading(false);
    });
  }, []);

  const formatDate = (val: any): string => {
    if (!val) return 'N/A';
    const d = val.toDate ? val.toDate() : new Date(val);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatCurrency = (cents: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <AdminHeader />
      <main className="flex-grow p-8 max-w-7xl mx-auto w-full">
        <div className="flex items-end justify-between mb-8 border-b border-tan-light pb-6">
          <div>
            <h1 className="text-3xl font-serif font-bold text-charcoal">Dashboard</h1>
            <p className="text-sm font-sans text-charcoal/50 mt-1">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <Link
            to="/admin/content"
            className="flex items-center gap-2 bg-tan hover:bg-tan-dark text-white px-5 py-2 rounded-md transition-colors font-sans text-sm font-bold uppercase tracking-wider shadow-sm"
          >
            <Plus size={16} /> New Post
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-48">
            <Loader2 className="animate-spin h-10 w-10 text-tan" />
          </div>
        ) : (
          <>
            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <StatCard
                icon={<FileText size={20} className="text-green-600" />}
                label="Published"
                value={postCounts?.published ?? 0}
                bg="bg-green-50 border-green-100"
                link="/admin/content"
              />
              <StatCard
                icon={<Clock size={20} className="text-yellow-600" />}
                label="Drafts"
                value={postCounts?.draft ?? 0}
                bg="bg-yellow-50 border-yellow-100"
                link="/admin/content"
              />
              <StatCard
                icon={<Calendar size={20} className="text-blue-600" />}
                label="Upcoming Events"
                value={upcomingEvents.length}
                bg="bg-blue-50 border-blue-100"
                link="/admin/content"
              />
              <StatCard
                icon={<Users size={20} className="text-tan" />}
                label="Memberships"
                value="—"
                subtext="View in Stripe"
                bg="bg-tan/5 border-tan/20"
                link="/admin/memberships"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Upcoming Events */}
              <div className="lg:col-span-1 bg-white rounded-xl border border-tan-light shadow-sm overflow-hidden">
                <SectionHeader icon={<CalendarDays size={15} className="text-tan" />} title="Upcoming Events" link="/admin/content" />
                <div className="divide-y divide-tan-light/50">
                  {upcomingEvents.length === 0 ? (
                    <EmptyState message="No upcoming events" />
                  ) : (
                    upcomingEvents.map(event => (
                      <div key={event.id} className="px-5 py-4">
                        <p className="font-serif text-sm font-bold text-charcoal leading-tight mb-1">{event.title}</p>
                        <p className="text-xs text-charcoal/50 font-sans">{formatDate(event.eventDate)}</p>
                        {event.location && (
                          <p className="text-xs text-charcoal/40 font-sans mt-0.5 truncate">{event.location}</p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Recent Tickets */}
              <div className="lg:col-span-1 bg-white rounded-xl border border-tan-light shadow-sm overflow-hidden">
                <SectionHeader icon={<Ticket size={15} className="text-tan" />} title="Recent Ticket Sales" link="/admin/tickets" />
                <div className="divide-y divide-tan-light/50">
                  {recentTickets.length === 0 ? (
                    <EmptyState message="No ticket sales yet" />
                  ) : (
                    recentTickets.map(t => (
                      <div key={t.id} className="px-5 py-4">
                        <p className="text-xs font-bold font-sans text-charcoal leading-tight truncate">{t.eventTitle}</p>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-xs text-charcoal/50 font-sans truncate">{t.email}</p>
                          <span className="text-xs font-bold text-green-700 font-sans ml-2 shrink-0">
                            {formatCurrency(t.totalAmount)}
                          </span>
                        </div>
                        <p className="text-[10px] text-charcoal/30 font-sans mt-0.5">{formatDate(t.purchasedAt)}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Recent Bookings */}
              <div className="lg:col-span-1 bg-white rounded-xl border border-tan-light shadow-sm overflow-hidden">
                <SectionHeader icon={<BookOpen size={15} className="text-tan" />} title="Recent Bookings" link="/admin/bookings" />
                <div className="divide-y divide-tan-light/50">
                  {recentBookings.length === 0 ? (
                    <EmptyState message="No bookings yet" />
                  ) : (
                    recentBookings.map(b => (
                      <div key={b.id} className="px-5 py-4">
                        <p className="text-xs font-bold font-sans text-charcoal leading-tight truncate">
                          {b.organizationName || b.contactName || 'Unknown'}
                        </p>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-xs text-charcoal/50 font-sans">{b.date}</p>
                          <span className={`text-[10px] font-bold uppercase tracking-wider font-sans px-2 py-0.5 rounded-full ${
                            b.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                            b.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>{b.status}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Manage Content', to: '/admin/content', icon: <FileText size={16} /> },
                { label: 'Memberships', to: '/admin/memberships', icon: <Users size={16} /> },
                { label: 'Bookings', to: '/admin/bookings', icon: <CalendarDays size={16} /> },
                { label: 'Ticket Sales', to: '/admin/tickets', icon: <TrendingUp size={16} /> },
              ].map(({ label, to, icon }) => (
                <Link
                  key={to}
                  to={to}
                  className="flex items-center gap-2 px-4 py-3 bg-white border border-tan-light rounded-lg hover:bg-cream hover:border-tan transition-colors font-sans text-sm font-bold text-charcoal/70 hover:text-charcoal"
                >
                  <span className="text-tan">{icon}</span>
                  {label}
                </Link>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function StatCard({ icon, label, value, subtext, bg, link }: {
  icon: React.ReactNode; label: string; value: number | string;
  subtext?: string; bg: string; link: string;
}) {
  return (
    <Link to={link} className={`flex flex-col p-5 rounded-xl border ${bg} hover:shadow-sm transition-shadow`}>
      <div className="flex items-center justify-between mb-3">
        {icon}
      </div>
      <p className="text-2xl font-bold font-serif text-charcoal">{value}</p>
      <p className="text-xs font-sans font-bold uppercase tracking-widest text-charcoal/50 mt-1">{label}</p>
      {subtext && <p className="text-[10px] font-sans text-charcoal/30 mt-0.5">{subtext}</p>}
    </Link>
  );
}

function SectionHeader({ icon, title, link }: { icon: React.ReactNode; title: string; link: string }) {
  return (
    <div className="flex items-center justify-between px-5 py-3 bg-cream/60 border-b border-tan-light/50">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs font-bold font-sans uppercase tracking-widest text-charcoal/60">{title}</span>
      </div>
      <Link to={link} className="text-[10px] font-sans font-bold uppercase tracking-wider text-tan hover:text-tan-dark">
        View All
      </Link>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="px-5 py-8 text-center text-xs font-sans text-charcoal/30 italic">{message}</div>
  );
}
