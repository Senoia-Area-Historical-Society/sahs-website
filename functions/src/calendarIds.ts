/**
 * Google Calendar ids used by this codebase, named for what they actually are.
 *
 * These were one constant called `CALENDAR_ID`, and that name is what made a real
 * bug invisible for months. The id belongs to a Workspace *room resource* — it
 * arrived with the room-booking system, where marking the room busy was the entire
 * point. When the public event sync (`onPostWritten`) was added later it reused the
 * same constant, so every published website event silently booked the meeting room:
 * a Yacht Rock Party at the Freeman-Sasser Building and a poker run at Marimac Lakes
 * both showed the Carmichael House conference room as occupied.
 *
 * Nothing about `CALENDAR_ID` said "this is a room". Two explicit names are the fix;
 * the separation only holds as long as the names stay honest.
 */

/**
 * SAHS Membership Calendar — the calendar the website actually advertises.
 *
 * This is the id `src/components/public/CalendarSubscribe.tsx` offers to visitors on
 * Home and News ("Add to Google Calendar" / "Subscribe via iCal"), so it is the only
 * calendar where a published event is visible to the public. `onPostWritten` writes
 * here.
 *
 * Writes require `sahs-calendar-sync@sahs-archives.iam.gserviceaccount.com` to hold
 * "Make changes to events" (ACL role `writer`) on this calendar. Without that grant
 * every insert 403s into a catch that only logs, so the sync fails silently.
 */
export const PUBLIC_EVENTS_CALENDAR_ID =
  'c_8091ac457763e6b17b3b132fca317eb1f412e7a32b4dfc4803aab93b6049cbd3@group.calendar.google.com';

/**
 * "Carmichael House-1-Meeting Room (50)" — a Workspace room resource, NOT a calendar
 * anyone subscribes to. Booking it means the physical conference room at 6 Couch St.
 * is unavailable to everyone else.
 *
 * No code path writes here any more: the custom room-booking flow this served was
 * retired in favour of YouCanBook.me (`src/pages/MeetingRoom.tsx`). The id is kept
 * here, named, precisely so it is never again mistaken for a publication calendar.
 * If you find yourself reaching for it, the question to answer first is "does this
 * event physically occupy that room?" — for a website event the answer is usually no.
 */
export const ROOM_RESOURCE_CALENDAR_ID =
  'c_188962a8uva3ijbpl6cdtc9621g6m@resource.calendar.google.com';
