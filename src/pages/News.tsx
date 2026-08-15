import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarX } from 'lucide-react';
import { getEventsSplit, getVolunteerSheetById } from '../services/api';
import EventCard from '../components/public/EventCard';
import CalendarSubscribe from '../components/public/CalendarSubscribe';
import type { Post } from '../types';

const PREVIOUS_EVENTS_SHOWN = 8;

export default function News() {
  const [events, setEvents] = useState<Post[]>([]);
  const [previousEvents, setPreviousEvents] = useState<Post[]>([]);
  const [activeVolunteerSheets, setActiveVolunteerSheets] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadContent() {
      try {
        const { upcoming, past } = await getEventsSplit();
        setEvents(upcoming);
        setPreviousEvents(past.slice(0, PREVIOUS_EVENTS_SHOWN));

        // Only advertise volunteering when the linked sheet is still active
        // (getVolunteerSheetById returns null for draft/closed sheets).
        const sheetChecks = await Promise.all(
          upcoming
            .filter(e => e.volunteerSheetId)
            .map(async e => [e.id, !!(await getVolunteerSheetById(e.volunteerSheetId!))] as const)
        );
        setActiveVolunteerSheets(Object.fromEntries(sheetChecks));
      } catch (err) {
        console.error("Failed to load events", err);
      } finally {
        setLoading(false);
      }
    }
    loadContent();
  }, []);

  return (
    <div className="bg-cream min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8 font-serif text-charcoal">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">Events</h1>
        <p className="text-lg text-charcoal/80 mb-12 max-w-2xl font-sans">
          Programs, tours, and celebrations hosted by the Senoia Area Historical Society — what's coming up next, and what we've hosted before.
        </p>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-charcoal"></div>
          </div>
        ) : (
          <div className="space-y-16">

            {/* Upcoming Events */}
            <section aria-labelledby="upcoming-events-heading">
              <h2 id="upcoming-events-heading" className="text-2xl font-bold border-b border-tan pb-2 mb-8">Upcoming Events</h2>

              {events.length === 0 ? (
                <div className="bg-white rounded-lg border border-tan/20 p-10 md:p-14 text-center max-w-2xl mx-auto">
                  <CalendarX size={48} className="mx-auto text-tan/40 mb-4" aria-hidden="true" />
                  <h3 className="text-2xl font-bold mb-2">No upcoming events right now</h3>
                  <p className="font-sans text-charcoal/70 mb-8">
                    New programs are announced throughout the year — subscribe to our calendar and you won't miss one.
                  </p>
                  <div className="max-w-xs mx-auto text-left">
                    <CalendarSubscribe />
                  </div>
                  <p className="font-sans text-sm text-charcoal/60 mt-8">
                    In the meantime, browse our{' '}
                    <Link to="/past-sahs-events" className="text-tan font-bold hover:text-tan-dark transition-colors">previous events archive</Link>.
                  </p>
                </div>
              ) : (
                <div className="space-y-10">
                  <EventCard
                    post={events[0]}
                    variant="hero"
                    showVolunteerPill={activeVolunteerSheets[events[0].id]}
                  />

                  {events.length > 1 && (
                    <div>
                      <h3 className="text-xl font-bold mb-6">More Upcoming Events</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                        {events.slice(1).map(event => (
                          <EventCard
                            key={event.id}
                            post={event}
                            variant="standard"
                            showVolunteerPill={activeVolunteerSheets[event.id]}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="max-w-xs">
                    <CalendarSubscribe />
                  </div>
                </div>
              )}
            </section>

            {/* Previous Events (muted) */}
            {previousEvents.length > 0 && (
              <section aria-labelledby="previous-events-heading" className="border-t border-tan/20 pt-12">
                <div className="flex justify-between items-end border-b border-tan/20 pb-2 mb-8">
                  <h2 id="previous-events-heading" className="text-2xl font-bold text-charcoal/60">Previous Events</h2>
                  <Link
                    to="/past-sahs-events"
                    className="text-tan font-sans font-bold uppercase tracking-widest text-sm hover:text-tan-dark transition-colors"
                  >
                    Browse the full archive →
                  </Link>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                  {previousEvents.map(event => (
                    <EventCard key={event.id} post={event} variant="past" />
                  ))}
                </div>
              </section>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
