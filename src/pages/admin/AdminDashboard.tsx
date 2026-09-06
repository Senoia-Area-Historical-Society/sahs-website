import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Link } from 'react-router-dom';
import AdminHeader from './AdminHeader';
import ErrorBanner from '../../components/admin/ErrorBanner';
import { FileText, Calendar, Ticket, CalendarDays, Users, Plus, TrendingUp, Clock, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
// Aliased: the component's state variable is also called `upcomingEvents`, and an
// unaliased import would be shadowed by it inside the component.
import { upcomingEvents as selectUpcomingEvents } from '../../lib/eventSchedule';
import { formatDate as formatDateValue } from '../../lib/firestoreDates';

interface PostCounts { published: number; draft: number; archived: number; }
interface UpcomingEvent { id: string; title: string; slug: string; eventDate: Timestamp | null; location?: string; }
interface RecentTicket { id: string; eventTitle: string; email: string; quantity: number; totalAmount: number; purchasedAt: string; }

export default function AdminDashboard() {
  const { isEditor, isCurator } = useAuth();
  const [postCounts, setPostCounts] = useState<PostCounts | null>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [recentTickets, setRecentTickets] = useState<RecentTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadErrors, setLoadErrors] = useState<string[]>([]);

  useEffect(() => {
    async function loadDashboard() {
      const now = new Date();

      // Each query is labeled and settled independently so one failure (e.g. a
      // permission or missing-index error) doesn't blank out the entire dashboard,
      // and so an error can never be attributed to the wrong query.
      const specs = [
        { label: 'published posts', promise: getDocs(query(collection(db, 'posts'), where('status', '==', 'published'))) },
        { label: 'draft posts', promise: getDocs(query(collection(db, 'posts'), where('status', '==', 'draft'))) },
        { label: 'archived posts', promise: getDocs(query(collection(db, 'posts'), where('status', '==', 'archived'))) },
        { label: 'recent tickets', promise: getDocs(query(collection(db, 'tickets'), orderBy('purchasedAt', 'desc'), limit(5))) },
      ];
      // `settled` is derived from `specs` by a single map(), so it's always the same
      // length and order as `specs` — positionally destructuring it here is safe
      // because label and query live together in one array, not two synced-by-hand ones.
      const settled = await Promise.allSettled(specs.map(s => s.promise));
      const [publishedRes, draftRes, archivedRes, ticketsRes] = settled;

      const errors: string[] = [];
      specs.forEach((s, i) => {
        if (settled[i].status === 'rejected') {
          console.error(`Dashboard: failed to load ${s.label}:`, (settled[i] as PromiseRejectedResult).reason);
          errors.push(s.label);
        }
      });
      setLoadErrors(errors);

      setPostCounts({
        published: publishedRes.status === 'fulfilled' ? publishedRes.value.size : 0,
        draft: draftRes.status === 'fulfilled' ? draftRes.value.size : 0,
        archived: archivedRes.status === 'fulfilled' ? archivedRes.value.size : 0,
      });

      // Derived from the published snapshot above rather than queried separately.
      //
      // The old query was `where('status','==','published')` with `limit(50)` and no
      // `orderBy`, which inherits Firestore's implicit `__name__ ASC` — the 50
      // alphabetically-first document *ids*, a window with no relationship to dates.
      // Once the archive passed 50 published posts every future event fell outside it,
      // and the dashboard read "0 upcoming events" while /news listed eight. Nothing
      // errored, so there was no banner: the query succeeded on the wrong 50 documents.
      //
      // The published snapshot is already a complete, unlimited read (the "Published"
      // count needs it), so selecting in memory is both exact and strictly cheaper —
      // it removes ~50 document reads per dashboard load. `upcomingEvents` is the same
      // helper `getEventsSplit` uses, so this can no longer disagree with the public
      // site, and it treats an event earlier today as still upcoming.
      // Held in full, not pre-truncated: the stat card reports the real number of
      // upcoming events, and only the panel beneath it shows the next few.
      const events: UpcomingEvent[] = publishedRes.status === 'fulfilled'
        ? selectUpcomingEvents(
            publishedRes.value.docs.map(d => ({ id: d.id, ...d.data() } as UpcomingEvent)),
            now
          )
        : [];
      setUpcomingEvents(events);

      setRecentTickets(ticketsRes.status === 'fulfilled' ? ticketsRes.value.docs.map(d => ({ id: d.id, ...d.data() } as RecentTicket)) : []);
      setLoading(false);
    }

    loadDashboard().catch(err => {
      console.error('Dashboard load error:', err);
      setLoadErrors(['dashboard data']);
      setLoading(false);
    });
  }, []);

  // Coercion lives in one place now — a ticket or post whose date field is a string
  // formats rather than throwing. See src/lib/firestoreDates.ts.
  const formatDate = (val: unknown): string =>
    formatDateValue(val, 'N/A', { month: 'short', day: 'numeric', year: 'numeric' });

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
          {/* A write CTA, so editors and above only — it was a dead end for
              read_only and board_member accounts. */}
          {isEditor && (
            <Link
              to="/admin/content"
              className="flex items-center gap-2 bg-tan hover:bg-tan-dark text-white px-5 py-2 rounded-md transition-colors font-sans text-sm font-bold uppercase tracking-wider shadow-sm"
            >
              <Plus size={16} /> New Post
            </Link>
          )}
        </div>

        {loadErrors.length > 0 && <ErrorBanner message={`Failed to load: ${loadErrors.join(', ')}.`} />}

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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Upcoming Events */}
              <div className="lg:col-span-1 bg-white rounded-xl border border-tan-light shadow-sm overflow-hidden">
                <SectionHeader icon={<CalendarDays size={15} className="text-tan" />} title="Upcoming Events" link="/admin/content" />
                <div className="divide-y divide-tan-light/50">
                  {upcomingEvents.length === 0 ? (
                    <EmptyState message="No upcoming events" />
                  ) : (
                    upcomingEvents.slice(0, 3).map(event => (
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

            </div>

            {/* Quick Links — role-filtered, exactly like AdminHeader's nav.
                A read_only or board_member account previously saw all four and got a
                permission error on three of them. `visible` mirrors firestore.rules
                for the data behind each page; keep the two lists in step. */}
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Manage Content', to: '/admin/content', icon: <FileText size={16} />, visible: isEditor },
                { label: 'Memberships', to: '/admin/memberships', icon: <Users size={16} />, visible: isCurator },
                { label: 'Volunteers', to: '/admin/volunteers', icon: <CalendarDays size={16} />, visible: isEditor },
                { label: 'Ticket Sales', to: '/admin/tickets', icon: <TrendingUp size={16} />, visible: true },
              ].filter(l => l.visible).map(({ label, to, icon }) => (
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
