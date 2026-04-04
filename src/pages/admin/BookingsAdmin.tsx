import { useState, useEffect } from 'react';
import { getAllBookings, updateBookingStatus } from '../../services/api';
import type { Booking } from '../../types';
import { format, parseISO } from 'date-fns';
import { Calendar, Clock, User, Building, Mail, FileText, CheckCircle, XCircle } from 'lucide-react';
import AdminHeader from './AdminHeader';

export default function BookingsAdmin() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'confirmed' | 'cancelled'>('pending');

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    setLoading(true);
    try {
      const data = await getAllBookings();
      // Sort by date descending (newest bookings first)
      const sortedData = data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setBookings(sortedData);
    } catch (error) {
      console.error("Failed to load bookings", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id: string, newStatus: 'pending' | 'confirmed' | 'cancelled') => {
    try {
      await updateBookingStatus(id, newStatus);
      // Refresh list locally
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: newStatus } : b));
    } catch (error) {
       alert("Failed to update status. Please try again.");
    }
  };

  const filteredBookings = bookings.filter(b => b.status === activeTab);

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tan"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream font-serif text-charcoal flex flex-col">
      <AdminHeader />

      {/* Main Content */}
      <main className="flex-grow p-8 max-w-7xl mx-auto w-full">
        
        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-tan-light">
          {(['pending', 'confirmed', 'cancelled'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 font-sans font-bold uppercase tracking-widest text-sm transition-colors border-b-2 ${
                activeTab === tab 
                  ? 'border-tan text-tan' 
                  : 'border-transparent text-charcoal/50 hover:text-charcoal'
              }`}
            >
              {tab} ({bookings.filter(b => b.status === tab).length})
            </button>
          ))}
        </div>

        {/* Bookings List */}
        <div className="space-y-6">
          {filteredBookings.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-lg border border-tan-light shadow-sm">
              <Calendar className="mx-auto h-12 w-12 text-charcoal/20 mb-4" />
              <h3 className="text-lg font-bold text-charcoal mb-2">No {activeTab} bookings found</h3>
              <p className="text-sm font-sans text-charcoal/60">
                New booking requests will appear here when submitted.
              </p>
            </div>
          ) : (
            filteredBookings.map(booking => (
              <div key={booking.id} className="bg-white rounded-lg border border-tan-light shadow-sm overflow-hidden flex flex-col md:flex-row">
                {/* Status Indicator Bar */}
                <div className={`w-full md:w-2 h-2 md:h-auto shrink-0 ${
                  booking.status === 'confirmed' ? 'bg-green-500' : 
                  booking.status === 'pending' ? 'bg-yellow-400' : 'bg-red-500'
                }`} />
                
                <div className="p-6 md:p-8 flex-grow grid grid-cols-1 md:grid-cols-3 gap-8">
                  {/* Column 1: Date & Time */}
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-xs font-bold font-sans uppercase tracking-widest text-charcoal/50 mb-1">Date & Time</h4>
                      <div className="flex items-center gap-2 text-lg font-bold">
                        <Calendar size={18} className="text-tan" />
                        {format(parseISO(booking.date), 'MMM do, yyyy')}
                      </div>
                      <div className="flex items-center gap-2 text-charcoal/80 font-sans mt-1">
                        <Clock size={16} className="text-charcoal/40" />
                        {booking.startTime} - {booking.endTime}
                      </div>
                    </div>
                    {booking.submittedAt && (
                      <div>
                        <h4 className="text-xs font-bold font-sans uppercase tracking-widest text-charcoal/50 mb-1">Requested On</h4>
                        <p className="text-sm font-sans text-charcoal/70">
                          {format(new Date(booking.submittedAt), 'PP p')}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Column 2: Contact Info */}
                  <div className="space-y-4">
                     <div>
                      <h4 className="text-xs font-bold font-sans uppercase tracking-widest text-charcoal/50 mb-1">Organization</h4>
                      <div className="flex items-center gap-2 font-bold">
                        <Building size={16} className="text-tan shrink-0" />
                        <span className="truncate">{booking.organization}</span>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold font-sans uppercase tracking-widest text-charcoal/50 mb-1">Contact</h4>
                      <div className="flex items-center gap-2 font-sans text-charcoal/80">
                        <User size={16} className="text-charcoal/40 shrink-0" />
                        {booking.contactName}
                      </div>
                      <div className="flex items-center gap-2 font-sans text-charcoal/80 mt-1">
                        <Mail size={16} className="text-charcoal/40 shrink-0" />
                        <a href={`mailto:${booking.email}`} className="hover:text-tan transition-colors truncate">
                          {booking.email}
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Column 3: Purpose & Actions */}
                  <div className="flex flex-col h-full space-y-4">
                    <div className="flex-grow">
                      <h4 className="text-xs font-bold font-sans uppercase tracking-widest text-charcoal/50 mb-1">Purpose</h4>
                      <div className="flex items-start gap-2 font-sans text-sm text-charcoal/80">
                        <FileText size={16} className="text-charcoal/40 shrink-0 mt-0.5" />
                        <p className="line-clamp-3 leading-relaxed">{booking.purpose}</p>
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="pt-4 border-t border-tan/10 flex gap-3 justify-end mt-auto">
                      {activeTab === 'pending' && (
                        <>
                          <button
                            onClick={() => handleStatusUpdate(booking.id, 'confirmed')}
                            className="flex items-center gap-2 bg-green-50 text-green-700 border border-green-200 px-4 py-2 rounded text-sm font-sans font-medium hover:bg-green-100 transition-colors"
                          >
                            <CheckCircle size={16} /> Confirm
                          </button>
                          <button
                            onClick={() => handleStatusUpdate(booking.id, 'cancelled')}
                            className="flex items-center gap-2 bg-red-50 text-red-700 border border-red-200 px-4 py-2 rounded text-sm font-sans font-medium hover:bg-red-100 transition-colors"
                          >
                            <XCircle size={16} /> Reject
                          </button>
                        </>
                      )}
                      
                      {activeTab === 'confirmed' && (
                        <button
                          onClick={() => handleStatusUpdate(booking.id, 'cancelled')}
                          className="flex items-center gap-2 bg-red-50 text-red-700 border border-red-200 px-4 py-2 rounded text-sm font-sans font-medium hover:bg-red-100 transition-colors"
                        >
                          <XCircle size={16} /> Cancel Booking
                        </button>
                      )}
                      
                      {activeTab === 'cancelled' && (
                        <button
                          onClick={() => handleStatusUpdate(booking.id, 'pending')}
                          className="flex items-center gap-2 bg-yellow-50 text-yellow-700 border border-yellow-200 px-4 py-2 rounded text-sm font-sans font-medium hover:bg-yellow-100 transition-colors"
                        >
                          Restore to Pending
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
