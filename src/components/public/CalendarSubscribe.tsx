const GOOGLE_CALENDAR_URL = 'https://calendar.google.com/calendar/r?cid=c_8091ac457763e6b17b3b132fca317eb1f412e7a32b4dfc4803aab93b6049cbd3@group.calendar.google.com';
const ICAL_URL = 'webcal://calendar.google.com/calendar/ical/c_8091ac457763e6b17b3b132fca317eb1f412e7a32b4dfc4803aab93b6049cbd3@group.calendar.google.com/public/basic.ics';

export default function CalendarSubscribe() {
  return (
    <div>
      <p className="text-xs font-sans font-bold uppercase tracking-wider text-charcoal/40 mb-3">Subscribe to Our Calendar</p>
      <div className="flex flex-col gap-2">
        <a
          href={GOOGLE_CALENDAR_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-3 py-2 rounded bg-tan/5 text-tan border border-tan/20 hover:bg-tan hover:text-white hover:border-tan transition-all font-sans text-xs font-bold uppercase tracking-wide"
        >
          <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          Add to Google Calendar
        </a>
        <a
          href={ICAL_URL}
          className="flex items-center gap-2 px-3 py-2 rounded bg-tan/5 text-tan border border-tan/20 hover:bg-tan hover:text-white hover:border-tan transition-all font-sans text-xs font-bold uppercase tracking-wide"
        >
          <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Subscribe via iCal
        </a>
      </div>
    </div>
  );
}
