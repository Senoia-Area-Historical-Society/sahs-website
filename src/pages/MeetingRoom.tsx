import { useState, useEffect } from 'react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  eachDayOfInterval,
  isBefore,
  startOfToday
} from 'date-fns';
import { useForm } from 'react-hook-form';
import { getBookings, submitBookingRequest } from '../services/api';
import type { Booking } from '../types';

type BookingFormData = {
  organization: string;
  contactName: string;
  email: string;
  startTime: string;
  endTime: string;
  purpose: string;
};

export default function MeetingRoom() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const { register, handleSubmit, reset } = useForm<BookingFormData>();

  useEffect(() => {
    async function loadBookings() {
      setLoading(true);
      const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
      const end = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
      const data = await getBookings(start, end);
      setBookings(data);
      setLoading(false);
    }
    loadBookings();
  }, [currentMonth]);

  const onDateClick = (day: Date) => {
    if (isBefore(day, startOfToday())) return;
    setSelectedDate(day);
    setIsSuccess(false);
  };

  const onSubmit = async (data: BookingFormData) => {
    setIsSubmitting(true);
    try {
      await submitBookingRequest({
        ...data,
        date: format(selectedDate, 'yyyy-MM-dd'),
      });
      setIsSuccess(true);
      reset();
    } catch (err) {
      alert("Failed to submit booking request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderHeader = () => (
    <div className="flex items-center justify-between mb-8">
      <h2 className="text-2xl font-bold">{format(currentMonth, 'MMMM yyyy')}</h2>
      <div className="flex gap-2">
        <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 hover:bg-tan/10 rounded-full transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 hover:bg-tan/10 rounded-full transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>
    </div>
  );

  const renderDays = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return (
      <div className="grid grid-cols-7 mb-2 border-b border-tan/10 pb-2">
        {days.map(d => (
          <div key={d} className="text-center text-sm font-bold secondary-font text-charcoal/40 uppercase tracking-widest">{d}</div>
        ))}
      </div>
    );
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const rows = eachDayOfInterval({ start: startDate, end: endDate });

    return (
      <div className="grid grid-cols-7 border-l border-t border-tan/10">
        {rows.map(day => {
          const isSelected = isSameDay(day, selectedDate);
          const isCurrentMonth = isSameMonth(day, monthStart);
          const isDisabled = isBefore(day, startOfToday());
          const hasBookings = bookings.some(b => b.date === format(day, 'yyyy-MM-dd'));

          return (
            <div
              key={day.toString()}
              onClick={() => onDateClick(day)}
              className={`
                h-24 p-2 border-r border-b border-tan/10 cursor-pointer transition-colors relative
                ${!isCurrentMonth ? 'bg-cream/20 text-charcoal/20' : 'text-charcoal'}
                ${isSelected ? 'bg-tan/10' : ''}
                ${isDisabled ? 'cursor-not-allowed opacity-50' : 'hover:bg-tan/5'}
              `}
            >
              <span className={`text-sm font-sans ${isSelected ? 'font-bold text-tan' : ''}`}>
                {format(day, 'd')}
              </span>
              {hasBookings && (
                <div className="mt-1">
                  <div className="w-full h-1.5 bg-tan rounded-full"></div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="bg-cream min-h-screen pt-24 pb-16 px-4 md:px-6 lg:px-8 font-serif text-charcoal">
      <div className="max-w-6xl mx-auto">
        <header className="mb-12">
          <h1 className="text-4xl font-bold mb-4">Meeting Room Booking</h1>
          <p className="text-lg font-sans text-charcoal/70 max-w-2xl">
            Our historical society offers a quiet, unique space for community meetings and small gatherings. Check availability below and request a slot.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-tan/20">
              {loading ? (
                 <div className="h-[400px] flex items-center justify-center">
                   <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tan"></div>
                 </div>
              ) : (
                <>
                  {renderHeader()}
                  {renderDays()}
                  {renderCells()}
                </>
              )}
            </div>
            <div className="mt-4 flex gap-6 text-sm font-sans text-charcoal/60">
               <div className="flex items-center gap-2">
                 <div className="w-3 h-3 bg-tan rounded-full"></div> <span>Confirmed Event</span>
               </div>
               <div className="flex items-center gap-2">
                 <div className="w-3 h-3 bg-tan/10 border border-tan/20"></div> <span>Selected Date</span>
               </div>
            </div>
          </div>

          <div>
            <div className="bg-white p-8 rounded-lg border border-tan/20 shadow-sm sticky top-32">
              <h3 className="text-2xl font-bold mb-6">
                Request for {format(selectedDate, 'MMM do, yyyy')}
              </h3>

              {isSuccess ? (
                <div className="py-8 text-center">
                  <div className="w-12 h-12 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-100">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <p className="font-sans font-bold text-charcoal mb-2">Request Sent!</p>
                  <p className="text-sm font-sans text-charcoal/60 mb-6">Our coordinator will review your request and confirm via email.</p>
                  <button onClick={() => setIsSuccess(false)} className="text-tan font-sans text-sm font-bold uppercase tracking-widest border-b border-tan">Request Another Date</button>
                </div>
              ) : (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 font-sans">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-charcoal/60 mb-1">Organization</label>
                    <input {...register('organization', { required: true })} className="w-full p-2 border border-tan/20 rounded text-sm focus:outline-none focus:ring-1 focus:ring-tan" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-charcoal/60 mb-1">Contact Name</label>
                    <input {...register('contactName', { required: true })} className="w-full p-2 border border-tan/20 rounded text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-charcoal/60 mb-1">Email</label>
                    <input type="email" {...register('email', { required: true })} className="w-full p-2 border border-tan/20 rounded text-sm" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-charcoal/60 mb-1">Start Time</label>
                      <input type="time" {...register('startTime', { required: true })} className="w-full p-2 border border-tan/20 rounded text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-charcoal/60 mb-1">End Time</label>
                      <input type="time" {...register('endTime', { required: true })} className="w-full p-2 border border-tan/20 rounded text-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-charcoal/60 mb-1">Purpose of Booking</label>
                    <textarea {...register('purpose', { required: true })} rows={3} className="w-full p-2 border border-tan/20 rounded text-sm"></textarea>
                  </div>
                  <button 
                    disabled={isSubmitting}
                    className="w-full bg-charcoal text-white py-3 rounded uppercase font-bold tracking-widest text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {isSubmitting ? 'Sending Request...' : 'Send Booking Request'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
