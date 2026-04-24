import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Post } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { Ticket, Calendar, MapPin, Loader2 } from 'lucide-react';
import TicketPurchaseWidget from '../components/public/TicketPurchaseWidget';

export default function BoxOffice() {
  const { user } = useAuth();
  const [events, setEvents] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadEvents() {
      try {
        // Fetch posts that are events and have a ticket price
        const q = query(
          collection(db, 'posts'),
          where('type', '==', 'event'),
          where('status', '==', 'published'),
          orderBy('eventDate', 'asc')
        );
        const snapshot = await getDocs(q);
        const fetchedEvents = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as Post))
          .filter(event => event.ticketPrice && event.ticketPrice > 0);
        
        setEvents(fetchedEvents);
      } catch (err) {
        console.error("Failed to load box office events", err);
      } finally {
        setLoading(false);
      }
    }
    loadEvents();
  }, []);

  return (
    <div className="bg-cream min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8 font-serif text-charcoal">
      <div className="max-w-5xl mx-auto">
        <header className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-tan/10 rounded-full mb-4">
            <Ticket size={32} className="text-tan" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">SAHS Box Office</h1>
          <p className="text-lg text-charcoal/60 max-w-2xl mx-auto font-sans">
            Purchase tickets for upcoming programs, tours, and special events at the Senoia Area Historical Society.
          </p>
        </header>

        {loading ? (
          <div className="flex justify-center items-center py-24">
            <Loader2 className="animate-spin text-tan" size={48} />
          </div>
        ) : events.length === 0 ? (
          <div className="bg-white rounded-xl border border-tan/20 p-12 text-center shadow-sm">
            <p className="text-charcoal/50 font-sans italic text-lg">There are currently no events with tickets available for purchase.</p>
            <p className="mt-2 text-charcoal/40 text-sm font-sans">Please check back soon or visit our News page for updates.</p>
          </div>
        ) : (
          <div className="space-y-12">
            {events.map(event => {
              const dateStr = event.eventDate 
                ? (event.eventDate as any).toDate().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })
                : '';

              return (
                <div key={event.id} className="flex flex-col space-y-6">
                  <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
                    {event.mainImage && (
                      <div className="w-full md:w-64 h-48 shrink-0 rounded-lg overflow-hidden shadow-md border border-tan/10">
                        <img src={event.mainImage} alt={event.title} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="flex-1 text-center md:text-left">
                      <h2 className="text-3xl font-bold mb-3">{event.title}</h2>
                      <div className="flex flex-wrap justify-center md:justify-start gap-4 text-charcoal/60 font-sans text-sm mb-4">
                        {dateStr && (
                          <div className="flex items-center gap-1.5"><Calendar size={16} className="text-tan" />{dateStr}</div>
                        )}
                        {event.location && (
                          <div className="flex items-center gap-1.5"><MapPin size={16} className="text-tan" />{event.location}</div>
                        )}
                      </div>
                      {event.excerpt && <p className="text-charcoal/70 font-sans leading-relaxed line-clamp-3">{event.excerpt}</p>}
                    </div>
                  </div>
                  
                  <TicketPurchaseWidget post={event} user={user} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
