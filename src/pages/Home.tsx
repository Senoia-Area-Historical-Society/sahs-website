import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getNewsPosts, getEvents, getCorporateSponsors } from '../services/api';
import type { Post, OrganizationEntity } from '../types';
import { format } from 'date-fns'; // Added this import for the format function

export default function Home() {
  const [news, setNews] = useState<Post[]>([]);
  const [events, setEvents] = useState<Post[]>([]);
  const [sponsors, setSponsors] = useState<OrganizationEntity[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const [newsData, eventsData, sponsorsData] = await Promise.all([
          getNewsPosts(3),
          getEvents(3),
          getCorporateSponsors()
        ]);
        setNews(newsData);
        setEvents(eventsData);
        setSponsors(sponsorsData);
      } catch (err) {
        console.error("Failed to load home page data", err);
      }
    }
    loadData();
  }, []);

  return (
    <div className="bg-cream min-h-screen font-serif text-charcoal">
      {/* Hero Section */}
      <section className="relative h-[80vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://uploads-ssl.webflow.com/64b1962bdd56b5834a570290/64b1962bdd56b5834a5702ec_museum-exterior.jpg"
            alt="SAHS Museum"
            className="w-full h-full object-cover scale-105 animate-slow-zoom"
          />
          <div className="absolute inset-0 bg-charcoal/40 backdrop-blur-[2px]"></div>
        </div>
        
        <div className="relative z-10 text-center text-white px-4 max-w-4xl">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight">Preserving Senoia's <span className="text-tan italic">Living</span> History</h1>
          <p className="text-xl md:text-2xl font-sans mb-10 text-cream/90 font-light tracking-wide">
            Securing, preserving, and promoting the social and cultural history of the community since 1976.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/museum" className="bg-tan text-white px-8 py-4 rounded uppercase font-bold tracking-widest hover:bg-tan-dark transition-all shadow-xl">
              Visit the Museum
            </Link>
            <Link to="/support-sahs" className="bg-white/10 backdrop-blur-md border-2 border-white/30 text-white px-8 py-4 rounded uppercase font-bold tracking-widest hover:bg-white/20 transition-all">
              Become a Member
            </Link>
          </div>
        </div>
      </section>

      {/* Dynamic News & Events */}
      <section className="py-24 px-4 md:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
          
          {/* News Feed */}
          <div className="lg:col-span-2">
            <div className="flex justify-between items-end mb-12">
              <h2 className="text-3xl font-bold border-b-2 border-tan pb-2">News & Past Events</h2>
              <Link to="/news" className="text-tan font-sans font-bold uppercase tracking-widest text-sm hover:text-tan-dark transition-colors">View All</Link>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {news.map(post => (
                <Link key={post.id} to={`/news/${post.slug}`} className="group bg-white rounded-lg overflow-hidden border border-tan/10 shadow-sm transition-all hover:shadow-md">
                  <div className="aspect-video overflow-hidden bg-cream flex items-center justify-center">
                    {post.mainImage ? (
                      <img src={post.mainImage} alt={post.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    ) : (
                      <span className="text-tan/30 font-bold uppercase tracking-widest text-sm">No Image</span>
                    )}
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold mb-2 group-hover:text-tan transition-colors">{post.title}</h3>
                    <p className="font-sans text-charcoal/60 text-sm line-clamp-2">
                      {post.excerpt || post.content?.replace(/<[^>]*>?/gm, '').substring(0, 120) + '...'}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Sidebar: Upcoming Events */}
          <div className="bg-white p-8 rounded-lg border border-tan/10 shadow-sm self-start">
            <h2 className="text-2xl font-bold mb-8 border-b border-tan/20 pb-4">Upcoming Events</h2>
            <div className="space-y-8">
              {events.length === 0 ? (
                <p className="italic text-charcoal/40 font-sans">No events scheduled at this time.</p>
              ) : (
                events.map(event => (
                  <div key={event.id} className="flex gap-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-cream border border-tan/20 rounded-md flex flex-col items-center justify-center text-tan">
                      <span className="text-xs font-sans font-bold uppercase">{event.eventDate ? format(event.eventDate.toDate(), 'MMM') : 'N/A'}</span>
                      <span className="text-lg font-bold">{event.eventDate ? format(event.eventDate.toDate(), 'd') : '-'}</span>
                    </div>
                    <div>
                      <h4 className="font-bold leading-tight mb-1 hover:text-tan transition-colors">
                        <Link to={`/news/${event.slug}`}>{event.title}</Link>
                      </h4>
                      <p className="text-xs font-sans text-charcoal/60 uppercase tracking-widest">{event.location}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <Link to="/news" className="mt-10 block text-center bg-tan/5 text-tan py-3 rounded font-sans font-bold uppercase tracking-widest text-xs hover:bg-tan/10 transition-colors">
              Full Calendar
            </Link>
          </div>
        </div>
      </section>

      {/* Sponsors Section */}
      <section className="bg-white border-y border-tan/10 py-16">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-xs font-sans font-bold text-charcoal/40 uppercase tracking-[0.2em] mb-8">Our Distinguished Partners</p>
          <div className="flex flex-wrap justify-center items-center gap-12 md:gap-24 opacity-60 hover:opacity-100 transition-opacity">
            {sponsors.map(sponsor => (
              <div key={sponsor.id} className="h-12 w-auto flex items-center">
                {sponsor.image ? (
                  <img src={sponsor.image} alt={sponsor.name} className="max-h-full w-auto filter grayscale hover:grayscale-0 transition-all pointer-events-none" />
                ) : (
                  <span className="font-bold tracking-tight text-charcoal/60">{sponsor.name}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 bg-charcoal text-white text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-4xl font-bold mb-6">Join the Society</h2>
          <p className="text-lg font-sans text-cream/70 mb-10 leading-relaxed">
            Membership is open to everyone. Support our mission and stay connected with the unique history of the Senoia area.
          </p>
          <Link to="/support-sahs" className="inline-block border-2 border-tan text-tan px-10 py-4 rounded uppercase font-bold tracking-widest hover:bg-tan hover:text-white transition-all shadow-lg">
            Apply for Membership
          </Link>
        </div>
      </section>
    </div>
  );
}
