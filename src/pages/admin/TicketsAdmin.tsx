import { useEffect, useState } from 'react';
import { getTickets } from '../../services/api';
import type { Ticket } from '../../types';
import { Ticket as TicketIcon, Mail, Hash, Calendar, Loader2, User, CreditCard } from 'lucide-react';
import AdminHeader from './AdminHeader';
import { format } from 'date-fns';

export default function TicketsAdmin() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTickets() {
      try {
        const data = await getTickets();
        // Sort by purchased date descending
        const sorted = data.sort((a, b) => new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime());
        setTickets(sorted);
      } catch (err) {
        console.error("Failed to load tickets", err);
      } finally {
        setLoading(false);
      }
    }
    loadTickets();
  }, []);

  const formatPurchasedAt = (val: any) => {
    if (!val) return 'N/A';
    const date = val.toDate ? val.toDate() : new Date(val);
    return format(date, 'PP p');
  };

  return (
    <div className="bg-cream min-h-screen font-serif text-charcoal flex flex-col">
      <AdminHeader />

      <main className="flex-grow p-8 max-w-7xl mx-auto w-full">
        <header className="mb-12 border-b border-tan pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl font-bold mb-2">Event Ticketing</h1>
            <p className="text-lg text-charcoal/60 font-sans">
              Monitor ticket sales and verify confirmation numbers.
            </p>
          </div>
          <div className="bg-white px-6 py-3 rounded-lg border border-tan/20 shadow-sm">
            <span className="text-sm font-sans text-charcoal/50 uppercase tracking-widest font-bold block mb-1">Total Sales</span>
            <span className="text-2xl font-bold">{tickets.length} Tickets</span>
          </div>
        </header>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="animate-spin h-12 w-12 text-tan" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-lg border border-tan/20">
            <TicketIcon className="mx-auto h-12 w-12 text-charcoal/20 mb-4" />
            <p className="text-lg font-sans italic text-charcoal/60">No ticket sales recorded.</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {tickets.map((ticket) => (
              <div key={ticket.id} className="bg-white rounded-lg border border-tan-light shadow-sm overflow-hidden flex flex-col md:flex-row">
                {/* Status Indicator Bar */}
                <div className="w-full md:w-2 h-2 md:h-auto shrink-0 bg-tan" />
                
                <div className="p-6 md:p-8 flex-grow grid grid-cols-1 md:grid-cols-3 gap-8">
                  {/* Column 1: Confirmation & Date */}
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-xs font-bold font-sans uppercase tracking-widest text-charcoal/50 mb-1">Confirmation #</h4>
                      <div className="flex items-center gap-2 text-xl font-mono font-bold text-tan uppercase">
                        <TicketIcon size={20} />
                        {ticket.confirmationNumber}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold font-sans uppercase tracking-widest text-charcoal/50 mb-1">Purchased On</h4>
                      <div className="flex items-center gap-2 text-charcoal/80 font-sans mt-1">
                        <Calendar size={16} className="text-charcoal/40" />
                        {formatPurchasedAt(ticket.purchasedAt)}
                      </div>
                    </div>
                  </div>

                  {/* Column 2: Buyer Info */}
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-xs font-bold font-sans uppercase tracking-widest text-charcoal/50 mb-1">Buyer Details</h4>
                      <div className="flex items-center gap-2 font-sans text-charcoal/80">
                        <User size={16} className="text-charcoal/40 shrink-0" />
                        <span className="font-bold">{ticket.email}</span>
                      </div>
                      <div className="flex items-center gap-2 font-sans text-charcoal/80 mt-2">
                        <Hash size={16} className="text-charcoal/40 shrink-0" />
                        <span>Quantity: <span className="font-bold">{ticket.quantity}</span></span>
                      </div>
                    </div>
                  </div>

                  {/* Column 3: Event & Financials */}
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-xs font-bold font-sans uppercase tracking-widest text-charcoal/50 mb-1">Event Reference</h4>
                      <div className="flex items-center gap-2 text-charcoal/80 font-mono text-sm truncate">
                        <Hash size={14} className="text-charcoal/40" />
                        {ticket.eventId}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold font-sans uppercase tracking-widest text-charcoal/50 mb-1">Status</h4>
                      <div className="flex items-center gap-2">
                        <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">
                          {ticket.status}
                        </span>
                        <div className="text-xs text-charcoal/40 flex items-center gap-1 font-sans">
                          <CreditCard size={12} />
                          Paid
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
