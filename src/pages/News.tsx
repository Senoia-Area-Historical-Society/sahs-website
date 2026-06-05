import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Camera } from 'lucide-react';
import { getNewsPosts, getEvents } from '../services/api';
import type { Post } from '../types';

export default function News() {
  const [news, setNews] = useState<Post[]>([]);
  const [events, setEvents] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 6;

  useEffect(() => {
    async function loadContent() {
      try {
        const [newsData, eventsData] = await Promise.all([
          getNewsPosts(200),
          getEvents()
        ]);
        setNews(newsData);
        setEvents(eventsData);
      } catch (err) {
        console.error("Failed to load news & events", err);
      } finally {
        setLoading(false);
      }
    }
    loadContent();
  }, []);

  const formatDate = (ts: any) => {
    if (!ts) return '';
    const d = ts.toDate();
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const currentNews = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return news.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [news, currentPage]);

  const totalPages = Math.ceil(news.length / ITEMS_PER_PAGE);

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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            
            {/* Upcoming Events Column */}
            <div className="lg:col-span-1 space-y-8">
              <h2 className="text-2xl font-bold border-b border-tan pb-2">Upcoming Events</h2>
              {events.length === 0 ? (
                <p className="text-sm font-sans italic text-charcoal/70">No upcoming events scheduled right now.</p>
              ) : (
                <div className="space-y-6">
                  {events.map(event => (
                    <article key={event.id} className="bg-white p-6 rounded-lg shadow-sm border border-tan/20 transition-all hover:shadow-md">
                      <div className="text-sm font-sans text-tan font-semibold tracking-wider uppercase mb-2">
                        {formatDate(event.eventDate || event.publishDate)}
                      </div>
                      <h3 className="text-xl font-bold mb-3">{event.title}</h3>
                      {event.excerpt && <p className="text-gray-600 font-sans text-sm mb-4 line-clamp-3">{event.excerpt}</p>}
                      <Link to={`/news/${event.slug}`} className="text-charcoal font-bold font-sans text-sm uppercase tracking-wide hover:text-tan transition-colors border-b border-charcoal hover:border-tan pb-1">
                        View Details
                      </Link>
                    </article>
                  ))}
                </div>
              )}

              <div className="mt-2 pt-6 border-t border-tan/20">
                <p className="text-xs font-sans font-bold uppercase tracking-wider text-charcoal/40 mb-3">Subscribe to Our Calendar</p>
                <div className="flex flex-col gap-2">
                  <a
                    href="https://calendar.google.com/calendar/r?cid=c_8091ac457763e6b17b3b132fca317eb1f412e7a32b4dfc4803aab93b6049cbd3@group.calendar.google.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 rounded bg-tan/5 text-tan border border-tan/20 hover:bg-tan hover:text-white hover:border-tan transition-all font-sans text-xs font-bold uppercase tracking-wide"
                  >
                    <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    Add to Google Calendar
                  </a>
                  <a
                    href="webcal://calendar.google.com/calendar/ical/c_8091ac457763e6b17b3b132fca317eb1f412e7a32b4dfc4803aab93b6049cbd3@group.calendar.google.com/public/basic.ics"
                    className="flex items-center gap-2 px-3 py-2 rounded bg-tan/5 text-tan border border-tan/20 hover:bg-tan hover:text-white hover:border-tan transition-all font-sans text-xs font-bold uppercase tracking-wide"
                  >
                    <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Subscribe via iCal
                  </a>
                </div>
              </div>
            </div>

            {/* Latest News Column */}
            <div className="lg:col-span-2 space-y-8">
              <h2 className="text-2xl font-bold border-b border-tan pb-2">News & Past Events</h2>
              {news.length === 0 ? (
                <p className="text-sm font-sans italic text-charcoal/70">Check back soon for latest news.</p>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
                            <img src="/sahs-logo.png" alt="SAHS Logo" className="h-24 opacity-20" />
                          </div>
                        )}
                        <div className="p-6 flex flex-col flex-grow">
                           <div className="text-xs font-sans text-charcoal/60 mb-2">
                            {formatDate(item.publishDate)}
                          </div>
                          <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                          <p className="text-gray-600 font-sans text-sm mb-4 line-clamp-3 flex-grow">
                            {item.excerpt || item.content?.replace(/<[^>]*>?/gm, '').substring(0, 150) + '...'}
                          </p>
                          <div className="mt-auto">
                             <Link to={`/news/${item.slug}`} className="text-charcoal font-bold font-sans text-sm uppercase tracking-wide hover:text-tan transition-colors">
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
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
