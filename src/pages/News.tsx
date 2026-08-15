import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Camera, CalendarX } from 'lucide-react';
import { format } from 'date-fns';
import { getNewsPosts, getEvents, getPastEvents } from '../services/api';
import EventCard from '../components/public/EventCard';
import CalendarSubscribe from '../components/public/CalendarSubscribe';
import type { Post } from '../types';

export default function News() {
  const [news, setNews] = useState<Post[]>([]);
  const [events, setEvents] = useState<Post[]>([]);
  const [pastEvents, setPastEvents] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 6;

  useEffect(() => {
    async function loadContent() {
      try {
        const [newsData, eventsData, pastEventsData] = await Promise.all([
          getNewsPosts(200, { includePastEvents: false }),
          getEvents(),
          getPastEvents(4)
        ]);
        setNews(newsData);
        setEvents(eventsData);
        setPastEvents(pastEventsData);
      } catch (err) {
        console.error("Failed to load news & events", err);
      } finally {
        setLoading(false);
      }
    }
    loadContent();
  }, []);

  const currentNews = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return news.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [news, currentPage]);

  const totalPages = Math.ceil(news.length / ITEMS_PER_PAGE);
  const [nextEvent, ...moreEvents] = events;

  return (
    <div className="bg-cream min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8 font-serif text-charcoal">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">News & Events</h1>
        <p className="text-lg text-charcoal/80 mb-12 max-w-2xl font-sans">
          Stay up to date with the latest announcements, upcoming programs, and newsletters from the Senoia Area Historical Society.
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
                    In the meantime, catch up on the latest news below or browse our{' '}
                    <Link to="/past-sahs-events" className="text-tan font-bold hover:text-tan-dark transition-colors">past events archive</Link>.
                  </p>
                </div>
              ) : (
                <div className="space-y-10">
                  <EventCard post={nextEvent} variant="hero" />

                  {moreEvents.length > 0 && (
                    <div>
                      <h3 className="text-xl font-bold mb-6">More Upcoming Events</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                        {moreEvents.map(event => (
                          <EventCard key={event.id} post={event} variant="standard" />
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

            {/* Latest News */}
            <section aria-labelledby="latest-news-heading">
              <h2 id="latest-news-heading" className="text-2xl font-bold border-b border-tan pb-2 mb-8">Latest News</h2>
              {news.length === 0 ? (
                <p className="text-sm font-sans italic text-charcoal/70">Check back soon for latest news.</p>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {currentNews.map(item => (
                      <article key={item.id} className="flex flex-col bg-white rounded-lg shadow-sm border border-tan/20 overflow-hidden hover:shadow-md transition-shadow">
                        {item.mainImage ? (
                          <div className="relative h-48 w-full overflow-hidden">
                            <img src={item.mainImage} alt={item.title} className="w-full h-full object-cover transition-transform hover:scale-105 duration-500" />
                            {(item.galleryImages?.length ?? 0) > 0 && (
                              <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/60 text-white text-xs font-sans font-bold px-2 py-1 rounded-full backdrop-blur-sm">
                                <Camera size={11} />
                                <span>{item.galleryImages!.length} photos</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="h-48 w-full bg-tan/10 flex items-center justify-center">
                            <img src="/favicon.png" alt="SAHS Logo" className="h-24 opacity-20" />
                          </div>
                        )}
                        <div className="p-6 flex flex-col flex-grow">
                          <div className="text-xs font-sans text-charcoal/60 mb-2">
                            {item.publishDate && (
                              <time dateTime={format(item.publishDate.toDate(), 'yyyy-MM-dd')}>
                                {format(item.publishDate.toDate(), 'MMMM d, yyyy')}
                              </time>
                            )}
                          </div>
                          <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                          <p className="text-gray-600 font-sans text-sm mb-4 line-clamp-3 flex-grow">
                            {item.excerpt || item.content?.replace(/<[^>]*>?/gm, '').substring(0, 150) + '...'}
                          </p>
                          <div className="mt-auto">
                            <Link
                              to={`/news/${item.slug}`}
                              aria-label={`Read more about ${item.title}`}
                              className="text-charcoal font-bold font-sans text-sm uppercase tracking-wide hover:text-tan transition-colors"
                            >
                              Read More →
                            </Link>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>

                  {totalPages > 1 && (
                    <div className="flex justify-between items-center mt-12 pt-8 border-t border-tan/20">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-6 py-2 border border-charcoal/20 rounded font-sans text-sm font-bold uppercase tracking-widest hover:border-tan hover:text-tan disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        ← Previous
                      </button>
                      <span className="font-sans text-sm text-charcoal/60">
                        Page {currentPage} of {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-6 py-2 border border-charcoal/20 rounded font-sans text-sm font-bold uppercase tracking-widest hover:border-tan hover:text-tan disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Next →
                      </button>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* Past Events (muted) */}
            {pastEvents.length > 0 && (
              <section aria-labelledby="past-events-heading" className="border-t border-tan/20 pt-12">
                <div className="flex justify-between items-end border-b border-tan/20 pb-2 mb-8">
                  <h2 id="past-events-heading" className="text-2xl font-bold text-charcoal/60">Past Events</h2>
                  <Link
                    to="/past-sahs-events"
                    className="text-tan font-sans font-bold uppercase tracking-widest text-sm hover:text-tan-dark transition-colors"
                  >
                    Browse the full archive →
                  </Link>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                  {pastEvents.map(event => (
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
