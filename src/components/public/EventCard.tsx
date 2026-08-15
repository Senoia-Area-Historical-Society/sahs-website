import { Link } from 'react-router-dom';
import { Calendar, MapPin, HandHelping } from 'lucide-react';
import { format } from 'date-fns';
import type { Post } from '../../types';

export type EventCardVariant = 'hero' | 'standard' | 'past';

interface EventCardProps {
  post: Post;
  variant?: EventCardVariant;
}

const CARD_SHELL = 'bg-white rounded-lg shadow-sm border border-tan/20 hover:shadow-md transition-shadow overflow-hidden';

function DateBadge({ date }: { date: Date }) {
  return (
    <div className="absolute top-3 left-3 bg-cream/95 text-tan rounded-md shadow px-2.5 py-1.5 text-center leading-none">
      <div className="text-[10px] font-sans font-bold uppercase tracking-widest">{format(date, 'MMM')}</div>
      <div className="text-xl font-bold font-serif">{format(date, 'd')}</div>
    </div>
  );
}

function CardImage({ post, className, muted = false }: { post: Post; className: string; muted?: boolean }) {
  const eventDay = post.eventDate?.toDate();
  return (
    <div className={`relative overflow-hidden ${className}`}>
      {post.mainImage ? (
        <img
          src={post.mainImage}
          alt=""
          className={`w-full h-full object-cover transition-transform hover:scale-105 duration-500 ${muted ? 'grayscale-[35%] opacity-90' : ''}`}
        />
      ) : (
        <div className="w-full h-full bg-tan/10 flex items-center justify-center">
          <img src="/favicon.png" alt="" className="h-16 opacity-20" />
        </div>
      )}
      {!muted && eventDay && <DateBadge date={eventDay} />}
    </div>
  );
}

function MetadataRow({ post, compact = false }: { post: Post; compact?: boolean }) {
  const eventDay = post.eventDate?.toDate() ?? post.publishDate?.toDate();
  const textSize = compact ? 'text-xs' : 'text-sm';
  return (
    <div className={`flex flex-col gap-1.5 font-sans text-charcoal/60 ${textSize}`}>
      {eventDay && (
        <div className="flex items-center gap-2">
          <Calendar size={compact ? 13 : 15} className="text-tan flex-shrink-0" aria-hidden="true" />
          <time dateTime={format(eventDay, 'yyyy-MM-dd')}>{format(eventDay, 'EEEE, MMMM d, yyyy')}</time>
        </div>
      )}
      {post.location && (
        <div className="flex items-center gap-2">
          <MapPin size={compact ? 13 : 15} className="text-tan flex-shrink-0" aria-hidden="true" />
          <span>{post.location}</span>
        </div>
      )}
    </div>
  );
}

function VolunteerPill() {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-sans font-bold text-tan bg-tan/10 rounded-full px-2.5 py-1">
      <HandHelping size={13} aria-hidden="true" />
      Volunteers Needed
    </span>
  );
}

function ticketState(post: Post) {
  const ticketed = (post.ticketPrice ?? 0) > 0;
  const soldOut = ticketed && post.capacity != null && post.capacity - (post.ticketsSold ?? 0) <= 0;
  const price = ticketed ? `$${(post.ticketPrice! / 100).toFixed(2)}` : null;
  return { ticketed, soldOut, price };
}

function EventJsonLd({ post }: { post: Post }) {
  if (!post.eventDate) return null;
  const { ticketed, soldOut } = ticketState(post);
  const url = `${window.location.origin}/news/${post.slug}`;
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: post.title,
    startDate: format(post.eventDate.toDate(), 'yyyy-MM-dd'),
    eventStatus: 'https://schema.org/EventScheduled',
    url,
  };
  if (post.excerpt) schema.description = post.excerpt;
  if (post.mainImage) schema.image = post.mainImage;
  if (post.location) {
    schema.location = { '@type': 'Place', name: post.location, address: post.location };
  }
  if (ticketed) {
    schema.offers = {
      '@type': 'Offer',
      price: (post.ticketPrice! / 100).toFixed(2),
      priceCurrency: 'USD',
      url,
      availability: soldOut ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock',
    };
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c') }}
    />
  );
}

export default function EventCard({ post, variant = 'standard' }: EventCardProps) {
  const detailPath = `/news/${post.slug}`;

  if (variant === 'past') {
    return (
      <article className={CARD_SHELL}>
        <Link to={detailPath} aria-label={`View recap of ${post.title}`} className="block h-full">
          <CardImage post={post} className="h-36 w-full" muted />
          <div className="p-4">
            {post.eventDate && (
              <time
                dateTime={format(post.eventDate.toDate(), 'yyyy-MM-dd')}
                className="block text-[11px] font-sans text-charcoal/40 uppercase tracking-widest mb-1"
              >
                {format(post.eventDate.toDate(), 'MMMM d, yyyy')}
              </time>
            )}
            <h3 className="text-base font-bold">{post.title}</h3>
          </div>
        </Link>
      </article>
    );
  }

  const { ticketed, soldOut, price } = ticketState(post);

  const primaryCta = ticketed && !soldOut ? (
    <Link
      to={detailPath}
      aria-label={`Get tickets for ${post.title}`}
      className={
        variant === 'hero'
          ? 'inline-block bg-tan text-white px-8 py-3.5 rounded uppercase font-bold font-sans tracking-widest text-sm hover:bg-tan-dark transition-colors'
          : 'text-tan font-bold font-sans text-sm uppercase tracking-wide hover:text-tan-dark transition-colors'
      }
    >
      Get Tickets — {price}
    </Link>
  ) : soldOut ? (
    <span className="flex items-center gap-3 flex-wrap">
      <span className="inline-block bg-charcoal/10 text-charcoal/50 px-4 py-2 rounded uppercase font-bold font-sans tracking-widest text-xs">
        Sold Out
      </span>
      <Link
        to={detailPath}
        aria-label={`View details for ${post.title}`}
        className="text-charcoal font-bold font-sans text-sm uppercase tracking-wide hover:text-tan transition-colors"
      >
        View Details
      </Link>
    </span>
  ) : (
    <Link
      to={detailPath}
      aria-label={`View details for ${post.title}`}
      className={
        variant === 'hero'
          ? 'inline-block bg-tan text-white px-8 py-3.5 rounded uppercase font-bold font-sans tracking-widest text-sm hover:bg-tan-dark transition-colors'
          : 'text-tan font-bold font-sans text-sm uppercase tracking-wide hover:text-tan-dark transition-colors'
      }
    >
      View Details
    </Link>
  );

  if (variant === 'hero') {
    return (
      <article className={`${CARD_SHELL} md:flex`}>
        <EventJsonLd post={post} />
        <CardImage post={post} className="aspect-[16/10] md:aspect-auto md:w-1/2" />
        <div className="p-8 md:p-10 md:w-1/2 flex flex-col justify-center">
          <div className="text-xs font-sans text-tan font-bold uppercase tracking-widest mb-3">Next Event</div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            <Link to={detailPath} className="hover:text-tan transition-colors">{post.title}</Link>
          </h2>
          <div className="mb-4">
            <MetadataRow post={post} />
          </div>
          {post.excerpt && (
            <p className="font-sans text-charcoal/70 line-clamp-3 mb-6">{post.excerpt}</p>
          )}
          <div className="flex items-center gap-4 flex-wrap mt-auto">
            {primaryCta}
            {post.volunteerSheetId && <VolunteerPill />}
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className={`${CARD_SHELL} flex flex-col`}>
      <EventJsonLd post={post} />
      <CardImage post={post} className="aspect-video w-full" />
      <div className="p-6 flex flex-col flex-grow">
        <h3 className="text-xl font-bold mb-3">
          <Link to={detailPath} className="hover:text-tan transition-colors">{post.title}</Link>
        </h3>
        <div className="mb-3">
          <MetadataRow post={post} compact />
        </div>
        {post.excerpt && (
          <p className="text-gray-600 font-sans text-sm line-clamp-3 mb-4">{post.excerpt}</p>
        )}
        <div className="mt-auto flex items-center justify-between gap-3 flex-wrap">
          {primaryCta}
          {post.volunteerSheetId && <VolunteerPill />}
        </div>
      </div>
    </article>
  );
}
