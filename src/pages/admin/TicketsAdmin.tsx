import { useEffect, useState, useMemo } from 'react';
import { getTickets } from '../../services/api';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { Ticket } from '../../types';
import { Ticket as TicketIcon, Loader2, Search, X, QrCode, ScanLine } from 'lucide-react';
import AdminHeader from './AdminHeader';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

type FilterTab = 'all' | 'paid' | 'cancelled';

export default function TicketsAdmin() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await getTickets();
        setTickets(data.sort((a, b) => new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime()));
      } catch (err) {
        console.error('Failed to load tickets', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return tickets.filter(t => {
      const matchesTab = filterTab === 'all' || t.status === filterTab;
      const matchesSearch = !q ||
        t.confirmationNumber.toLowerCase().includes(q) ||
        t.email.toLowerCase().includes(q) ||
        (t.eventTitle || '').toLowerCase().includes(q) ||
        (t.customerName || '').toLowerCase().includes(q);
      return matchesTab && matchesSearch;
    });
  }, [tickets, search, filterTab]);

  const totals = useMemo(() => {
    const paid = tickets.filter(t => t.status === 'paid');
    return {
      count: paid.length,
      revenue: paid.reduce((sum, t) => sum + (t.totalAmount || 0), 0),
    };
  }, [tickets]);

  const handleCancel = async (ticket: Ticket) => {
    if (!confirm(`Cancel ticket ${ticket.confirmationNumber} for ${ticket.customerName || ticket.email}? This does not issue a refund in Stripe.`)) return;
    setCancelling(ticket.id);
    try {
      await updateDoc(doc(db, 'tickets', ticket.id), { status: 'cancelled' });
      setTickets(prev => prev.map(t => t.id === ticket.id ? { ...t, status: 'cancelled' } : t));
      if (selectedTicket?.id === ticket.id) setSelectedTicket(t => t ? { ...t, status: 'cancelled' } : null);
    } catch (err) {
      console.error('Failed to cancel ticket:', err);
      alert('Failed to cancel ticket. Please try again.');
    } finally {
      setCancelling(null);
    }
  };

  const formatDate = (val: any) => {
    if (!val) return '—';
    const d = typeof val === 'string' ? new Date(val) : val.toDate?.() ?? new Date(val);
    return format(d, 'PP');
  };

  const statusBadge = (status: string) => (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
      status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'
    }`}>{status}</span>
  );

  const TABS: { id: FilterTab; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'paid', label: 'Paid' },
    { id: 'cancelled', label: 'Cancelled' },
  ];

  return (
    <div className="bg-cream min-h-screen font-serif text-charcoal flex flex-col">
      <AdminHeader />
      <main className="flex-grow p-8 max-w-7xl mx-auto w-full">

        {/* Header */}
        <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-tan pb-6">
          <div>
            <h1 className="text-4xl font-bold mb-1">Event Ticketing</h1>
            <p className="text-charcoal/60 font-sans text-sm">Manage ticket sales and verify confirmations.</p>
          </div>
          <div className="flex items-center gap-4">
            {/* Revenue summary */}
            <div className="bg-white px-5 py-3 rounded-lg border border-tan/20 shadow-sm text-right">
              <span className="block text-xs font-sans text-charcoal/50 uppercase tracking-widest font-bold mb-0.5">Revenue</span>
              <span className="text-xl font-bold">${(totals.revenue / 100).toFixed(2)}</span>
              <span className="text-xs text-charcoal/50 font-sans ml-2">({totals.count} sold)</span>
            </div>
            {/* Scanner link */}
            <Link
              to="/admin/tickets/scan"
              className="flex items-center gap-2 bg-charcoal text-white px-5 py-3 rounded-lg text-sm font-bold uppercase tracking-wider hover:bg-black transition-colors shadow-sm"
            >
              <ScanLine size={18} /> Scanner
            </Link>
          </div>
        </header>

        {/* Search + Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal/40" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, email, confirmation #, or event..."
              className="w-full pl-9 pr-4 py-2 border border-tan-light rounded-lg font-sans text-sm focus:outline-none focus:ring-2 focus:ring-tan/50"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal/40 hover:text-charcoal"><X size={14} /></button>
            )}
          </div>
          <div className="flex rounded-lg border border-tan-light overflow-hidden bg-white shrink-0">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterTab(tab.id)}
                className={`px-4 py-2 text-sm font-bold uppercase tracking-wider transition-colors ${
                  filterTab === tab.id ? 'bg-tan text-white' : 'text-charcoal/60 hover:bg-cream'
                }`}
              >{tab.label}</button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-48"><Loader2 className="animate-spin h-10 w-10 text-tan" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-lg border border-tan/20">
            <TicketIcon className="mx-auto h-12 w-12 text-charcoal/20 mb-4" />
            <p className="text-lg font-sans italic text-charcoal/60">{search ? 'No tickets match your search.' : 'No ticket sales recorded.'}</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-tan-light overflow-hidden">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-cream border-b border-tan-light">
                  {['Event', 'Buyer', 'Qty / Total', 'Confirmation #', 'Date', 'Status', ''].map(h => (
                    <th key={h} className="px-4 py-3 font-sans font-bold text-xs uppercase tracking-wider text-charcoal/50">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(ticket => (
                  <tr key={ticket.id} className={`border-b border-tan-light/50 last:border-0 hover:bg-cream/40 transition-colors ${ticket.status === 'cancelled' ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-3 font-medium text-charcoal max-w-[180px] truncate">{ticket.eventTitle || <span className="text-charcoal/40 text-xs font-mono">{ticket.eventId}</span>}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-charcoal">{ticket.customerName || '—'}</p>
                      <p className="text-xs text-charcoal/50">{ticket.email}</p>
                    </td>
                    <td className="px-4 py-3 text-charcoal/80">
                      <span className="font-bold">{ticket.quantity}</span>
                      {ticket.totalAmount ? <span className="text-charcoal/50 ml-1">· ${(ticket.totalAmount / 100).toFixed(2)}</span> : ''}
                    </td>
                    <td className="px-4 py-3 font-mono text-tan font-bold text-sm">{ticket.confirmationNumber}</td>
                    <td className="px-4 py-3 text-charcoal/60 text-xs">{formatDate(ticket.purchasedAt)}</td>
                    <td className="px-4 py-3">{statusBadge(ticket.status)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        {ticket.qrCode && (
                          <button onClick={() => setSelectedTicket(ticket)} title="View QR Code" className="text-charcoal/40 hover:text-tan transition-colors">
                            <QrCode size={17} />
                          </button>
                        )}
                        {ticket.status === 'paid' && (
                          <button
                            onClick={() => handleCancel(ticket)}
                            disabled={cancelling === ticket.id}
                            title="Cancel ticket"
                            className="text-charcoal/40 hover:text-red-600 transition-colors disabled:opacity-40"
                          >
                            {cancelling === ticket.id ? <Loader2 size={17} className="animate-spin" /> : <X size={17} />}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* QR Code Detail Panel */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedTicket(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-8 text-center" onClick={e => e.stopPropagation()}>
            <button onClick={() => setSelectedTicket(null)} className="absolute top-4 right-4 text-charcoal/40 hover:text-charcoal"><X size={20} /></button>
            <p className="text-xs font-bold text-charcoal/40 uppercase tracking-wider mb-1">Ticket QR Code</p>
            <p className="font-serif font-bold text-charcoal text-lg mb-1">{selectedTicket.eventTitle}</p>
            <p className="text-sm text-charcoal/60 mb-4">{selectedTicket.customerName || selectedTicket.email}</p>
            {selectedTicket.qrCode ? (
              <img src={selectedTicket.qrCode} alt="QR Code" className="mx-auto w-48 h-48 rounded-lg border border-tan/20 mb-4" />
            ) : (
              <div className="w-48 h-48 mx-auto bg-cream rounded-lg flex items-center justify-center mb-4 text-charcoal/30">
                <QrCode size={48} />
              </div>
            )}
            <p className="font-mono text-2xl font-bold text-tan mb-1">{selectedTicket.confirmationNumber}</p>
            <p className="text-sm text-charcoal/60 font-sans">{selectedTicket.quantity} ticket{selectedTicket.quantity !== 1 ? 's' : ''} · {selectedTicket.totalAmount ? `$${(selectedTicket.totalAmount / 100).toFixed(2)}` : ''}</p>
            {selectedTicket.status === 'paid' && (
              <button
                onClick={() => handleCancel(selectedTicket)}
                disabled={cancelling === selectedTicket.id}
                className="mt-5 w-full py-2 border border-red-300 text-red-600 rounded-lg text-sm font-bold uppercase tracking-wider hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                Cancel This Ticket
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
