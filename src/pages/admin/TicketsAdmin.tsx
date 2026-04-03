import { useEffect, useState } from 'react';
import { getTickets } from '../../services/api';
import type { Ticket } from '../../types';
import { Shield, Ticket as TicketIcon, Mail, Hash, Calendar, Loader2 } from 'lucide-react';

export default function TicketsAdmin() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTickets() {
      try {
        const data = await getTickets();
        setTickets(data);
      } catch (err) {
        console.error("Failed to load tickets", err);
      } finally {
        setLoading(false);
      }
    }
    loadTickets();
  }, []);

  return (
    <div className="bg-cream min-h-screen pt-24 pb-16 px-4 md:px-6 lg:px-8 font-serif text-charcoal">
      <div className="max-w-7xl mx-auto">
        <header className="mb-12 border-b border-tan pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
              <Shield className="text-tan" />
              Event Ticketing
            </h1>
            <p className="text-lg text-charcoal/60 font-sans">
              Monitor ticket sales and verify confirmation numbers.
            </p>
          </div>
        </header>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="animate-spin h-12 w-12 text-tan" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-lg border border-tan/20">
            <p className="text-lg font-sans italic text-charcoal/60">No ticket sales recorded.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-tan/20 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left font-sans text-sm">
                <thead className="bg-cream/50 border-b border-tan/20 text-charcoal/60 uppercase tracking-widest font-bold">
                  <tr>
                    <th className="px-6 py-4">Confirmation #</th>
                    <th className="px-6 py-4">Buyer Email</th>
                    <th className="px-6 py-4 text-center">Qty</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Purchased</th>
                    <th className="px-6 py-4">Event ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-tan/10">
                  {tickets.map((t) => (
                    <tr key={t.id} className="hover:bg-cream/20 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-tan flex items-center gap-3">
                        <TicketIcon size={16} />
                        {t.confirmationNumber}
                      </td>
                      <td className="px-6 py-4 flex items-center gap-2">
                        <Mail size={14} className="text-charcoal/40" />
                        {t.email}
                      </td>
                      <td className="px-6 py-4 text-center font-bold">
                        {t.quantity}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                          t.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-charcoal/60 flex items-center gap-2">
                        <Calendar size={14} />
                        {new Date(t.purchasedAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-charcoal/40 flex items-center gap-2">
                        <Hash size={12} />
                        {t.eventId}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
