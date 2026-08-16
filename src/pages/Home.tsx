import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarX } from 'lucide-react';
import { getPastEvents, getEvents } from '../services/api';
import { excerptFromHtml } from '../lib/text';
import CalendarSubscribe from '../components/public/CalendarSubscribe';
import EventCard from '../components/public/EventCard';
import type { Post } from '../types';
import carmichaelImg from '../assets/images/carmichael-house-drawing.jpg';
import meetingRoomImg from '../assets/images/meeting-room-interior.jpg';
import Seo from '../components/Seo';

export default function Home() {
  const [past, setPast] = useState<Post[]>([]);
  const [events, setEvents] = useState<Post[]>([]);


  useEffect(() => {
    async function loadData() {
      try {
        const [pastData, eventsData] = await Promise.all([
          // The past list is a compact sidebar, so it can carry more rows
          // without out-running the taller Upcoming Events column beside it.
          getPastEvents(5),
          getEvents(3)
        ]);
        setPast(pastData);
        setEvents(eventsData);
      } catch (err) {
        console.error("Failed to load home page data", err);
      }
    }
    loadData();
  }, []);

  // Events after the lead one, which gets the hero card.
  const rest = events.slice(1);

  return (
    <div className="bg-cream min-h-screen font-serif text-charcoal">
      <Seo
        title="Senoia Area Historical Society"
        description="Securing, preserving, and promoting the social and cultural history of the Senoia, Georgia area since 1976. Visit our free museum at 6 Couch St."
      />
      {/* Hero Section */}
      <section className="relative h-[80vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src={carmichaelImg}
            alt="SAHS Museum - Carmichael House Drawing"
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
            <Link to="/location-and-hours" className="bg-tan text-white px-8 py-4 rounded uppercase font-bold tracking-widest hover:bg-tan-dark transition-all shadow-xl">
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

          {/* Upcoming Events — the lead column. Kept first in the DOM so it also
              leads on mobile, where the grid collapses to a single column. */}
          <div className="lg:col-span-2">
            <div className="mb-12">
              <h2 className="text-3xl font-bold border-b-2 border-tan pb-2 inline-block">Upcoming Events</h2>
            </div>

            {events.length === 0 ? (
              <div className="bg-white p-12 rounded-xl border border-tan/10 shadow-sm text-center max-w-lg mx-auto md:max-w-none">
                <CalendarX size={40} className="mx-auto text-tan/40 mb-4" aria-hidden="true" />
                <p className="italic text-charcoal/50 font-sans text-lg">No events scheduled at this time.</p>
              </div>
            ) : (
              <div className="space-y-10">
                {/* Same hero + standard treatment as the Events page, so a
                    visitor sees the identical card for the next event. */}
                <EventCard post={events[0]} variant="hero" />
                {rest.length > 0 && (
                  // A single card after the hero is centred at one grid track's
                  // width (50% minus half the gap). Left in the 2-col grid it
                  // leaves an empty track that reads as a layout bug; stretched
                  // full width its image out-sizes the hero it sits under.
                  <div className={rest.length === 1
                    ? 'md:max-w-[calc(50%-1rem)] md:mx-auto'
                    : 'grid grid-cols-1 md:grid-cols-2 gap-8'}>
                    {rest.map(event => (
                      <EventCard key={event.id} post={event} />
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="mt-12 pt-8 border-t border-tan/20 flex flex-col sm:flex-row sm:justify-between gap-8">
              <Link to="/news" className="self-start bg-tan/5 text-tan px-8 py-3 rounded font-sans font-bold uppercase tracking-widest text-xs hover:bg-tan/10 transition-colors">
                Full Calendar
              </Link>
              <div className="w-full sm:max-w-xs">
                <CalendarSubscribe />
              </div>
            </div>
          </div>

          {/* Sidebar: Past Events — finished events and legacy news articles,
              one bucket, most recent first. */}
          <div className="bg-white p-8 rounded-lg border border-tan/10 shadow-sm self-start">
            <div className="flex justify-between items-end mb-8 border-b border-tan/20 pb-4">
              <h2 className="text-2xl font-bold">Past Events</h2>
              <Link to="/past-sahs-events" className="font-sans font-bold uppercase tracking-widest text-tan text-[11px] hover:text-tan-dark transition-colors">
                View All
              </Link>
            </div>
            <div className="space-y-6">
              {past.length === 0 ? (
                <p className="italic text-charcoal/40 font-sans">Nothing in the archive yet.</p>
              ) : (
                past.map(post => (
                  <Link key={post.id} to={`/news/${post.slug}`} className="group flex gap-4">
                    <div className="flex-shrink-0 w-16 h-16 rounded-md overflow-hidden bg-cream border border-tan/20 flex items-center justify-center">
                      {post.mainImage ? (
                        <img src={post.mainImage} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <img src="/favicon.png" alt="" className="h-7 opacity-20" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold leading-tight mb-1 group-hover:text-tan transition-colors">{post.title}</h3>
                      <p className="font-sans text-charcoal/60 text-xs line-clamp-2">
                        {post.excerpt || excerptFromHtml(post.content, 100)}
                      </p>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Host Your Event Section */}
      <section className="bg-white py-24 border-y border-tan/10">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1">
              <h2 className="text-4xl font-bold mb-6">Host Your Next Event at the Museum</h2>
              <p className="text-lg font-sans text-charcoal/80 mb-8 leading-relaxed">
                Looking for a unique, historic venue for your next meeting, workshop, or gathering? Our Carmichael House meeting room offers a beautiful atmosphere combined with modern amenities.
              </p>
              <ul className="space-y-4 mb-10 text-charcoal/70 font-sans">
                <li className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-tan"></div>
                  Capacity for up to 40 guests
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-tan"></div>
                  Climate-controlled indoor space
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-tan"></div>
                  High-speed Wi-Fi and presentation facilities
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-tan"></div>
                  Beautiful historic surroundings
                </li>
              </ul>
              <Link to="/meeting-room" className="inline-block bg-tan text-white px-8 py-4 rounded uppercase font-bold tracking-widest hover:bg-tan-dark transition-all">
                Check Availability
              </Link>
            </div>
            <div className="order-1 lg:order-2">
              <div className="relative">
                <img 
                  src={meetingRoomImg} 
                  alt="SAHS Meeting Room Interior" 
                  className="rounded-lg shadow-2xl relative z-10 w-full h-[400px] object-cover"
                />
                <div className="absolute -top-4 -right-4 w-full h-full border-2 border-tan/20 rounded-lg z-0"></div>
              </div>
            </div>
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
