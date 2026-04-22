import { useEffect, useState } from 'react';
import { getPastEvents } from '../services/api';
import type { Post } from '../types';

export default function PastEvents() {
  const [events, setEvents] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadEvents() {
      try {
        const data = await getPastEvents(50); // Fetch more for the archive
        setEvents(data);
      } catch (err) {
        console.error("Failed to load past events", err);
      } finally {
        setLoading(false);
      }
    }
    loadEvents();
  }, []);

  const formatDate = (ts: any) => {
    if (!ts) return '';
    const d = ts.toDate();
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  return (
    <div className="bg-cream min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8 font-serif text-charcoal">
      <div className="max-w-7xl mx-auto">
        <header className="mb-12 border-b border-tan pb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Past SAHS Events</h1>
          <p className="text-lg text-charcoal/80 max-w-2xl font-sans">
            Explore a history of programs and events hosted by the Senoia Area Historical Society, celebrating our community's heritage.
          </p>
        </header>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-charcoal"></div>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-lg border border-tan/20">
            <p className="text-lg font-sans italic text-charcoal/60">No past events found in the archives.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {events.map(event => (
              <article key={event.id} className="flex flex-col bg-white rounded-lg shadow-sm border border-tan/20 overflow-hidden hover:shadow-md transition-shadow">
                {event.mainImage ? (
                  <div className="h-56 w-full overflow-hidden">
                    <img src={event.mainImage} alt={event.title} className="w-full h-full object-cover transition-transform hover:scale-105 duration-500" />
                  </div>
                ) : (
                  <div className="h-56 w-full bg-tan/10 flex items-center justify-center">
                    <img src="/sahs-logo.png" alt="SAHS Logo" className="h-28 opacity-20" />
                  </div>
                )}
                <div className="p-8 flex flex-col flex-grow">
                  <div className="text-xs font-sans text-tan font-bold uppercase tracking-widest mb-3">
                    {formatDate(event.eventDate || event.publishDate)}
                  </div>
                  <h3 className="text-2xl font-bold mb-4 leading-tight">{event.title}</h3>
                  <p className="text-charcoal/70 font-sans text-sm mb-6 line-clamp-4 flex-grow italic leading-relaxed">
                    {event.excerpt || (event.content ? event.content.replace(/<[^>]*>?/gm, '').substring(0, 160) + '...' : 'Heritage event preservation and community program.')}
                  </p>
                  <div className="mt-auto">
                    <a href={`/news/${event.slug}`} className="text-charcoal font-bold font-sans text-sm gap-2 inline-flex items-center group">
                      READ RECAP <span className="group-hover:translate-x-1 transition-transform">→</span>
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="mt-16 p-8 bg-tan/5 rounded-lg border border-tan/10 text-center">
          <h3 className="text-xl font-bold mb-4">Have photos from a past event?</h3>
          <p className="font-sans text-charcoal/70 mb-6">We're always looking to expand our digital archives. Contact us to share your memories.</p>
          <a href="/contact-sahs" className="inline-block bg-charcoal text-white px-8 py-3 rounded-md font-sans font-bold uppercase tracking-widest hover:bg-black transition-colors">
            Get In Touch
          </a>
        </div>
      </div>
    </div>
  );
}
