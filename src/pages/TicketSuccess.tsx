import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { getTicketBySessionId } from '../services/api';
import type { Ticket } from '../types';
import { CheckCircle, Ticket as TicketIcon, Calendar, Users, Printer } from 'lucide-react';

type Status = 'loading' | 'found' | 'timeout';

export default function TicketSuccess() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [status, setStatus] = useState<Status>('loading');

  useEffect(() => {
    if (!sessionId) { setStatus('timeout'); return; }

    let attempts = 0;
    const maxAttempts = 4;

    const poll = async () => {
      const found = await getTicketBySessionId(sessionId);
      if (found) {
        setTicket(found);
        setStatus('found');
        return;
      }
      attempts++;
      if (attempts < maxAttempts) {
        setTimeout(poll, 1500);
      } else {
        setStatus('timeout');
      }
    };

    // Start polling after a brief initial delay to allow webhook to process
    setTimeout(poll, 1000);
  }, [sessionId]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tan mx-auto mb-4" />
          <p className="font-serif text-charcoal/60 text-lg">Confirming your purchase...</p>
          <p className="text-sm text-charcoal/40 mt-2 font-sans">This may take a few seconds.</p>
        </div>
      </div>
    );
  }

  if (status === 'timeout' || !ticket) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full bg-white rounded-xl border border-tan/20 shadow-lg p-10 text-center">
          <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
          <h1 className="text-2xl font-serif font-bold text-charcoal mb-3">Payment Successful!</h1>
          <p className="text-charcoal/70 font-sans mb-6">
            Your ticket purchase was confirmed. Check your email for the Stripe receipt, which includes your confirmation details.
          </p>
          <Link to="/news" className="inline-block bg-tan text-white px-8 py-3 rounded uppercase font-bold tracking-widest hover:bg-tan-dark transition-all shadow-md text-sm">
            Back to Events
          </Link>
        </div>
      </div>
    );
  }

  const purchasedDate = ticket.purchasedAt
    ? new Date(ticket.purchasedAt).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  return (
    <div className="min-h-screen bg-cream py-12 px-4">
      <div className="max-w-lg mx-auto">
        {/* Success header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-green-600" />
          </div>
          <h1 className="text-3xl font-serif font-bold text-charcoal mb-2">You're Confirmed!</h1>
          <p className="text-charcoal/60 font-sans">Thank you for supporting the Senoia Area Historical Society.</p>
        </div>

        {/* Ticket card */}
        <div className="bg-white rounded-2xl shadow-lg border border-tan/20 overflow-hidden print:shadow-none">
          {/* Top bar */}
          <div className="bg-tan px-8 py-5 text-white">
            <div className="flex items-center gap-3 mb-1">
              <TicketIcon size={20} />
              <span className="text-sm font-bold uppercase tracking-widest">Event Ticket</span>
            </div>
            <p className="text-xl font-serif font-bold">{ticket.eventTitle}</p>
          </div>

          {/* Body */}
          <div className="px-8 py-6">
            <div className="flex flex-col sm:flex-row gap-6 items-start">
              {/* QR Code */}
              {ticket.qrCode && (
                <div className="shrink-0 text-center">
                  <img
                    src={ticket.qrCode}
                    alt="Ticket QR Code"
                    className="w-32 h-32 rounded-lg border border-tan/20"
                  />
                  <p className="text-xs text-charcoal/40 mt-1 font-sans">Show at the door</p>
                </div>
              )}

              {/* Details */}
              <div className="flex-1 space-y-3">
                <div>
                  <p className="text-xs font-bold text-charcoal/40 uppercase tracking-wider mb-0.5">Confirmation #</p>
                  <p className="font-mono text-2xl font-bold text-tan">{ticket.confirmationNumber}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {ticket.customerName && (
                    <div>
                      <p className="text-xs font-bold text-charcoal/40 uppercase tracking-wider mb-0.5">Name</p>
                      <p className="font-sans text-sm text-charcoal font-medium">{ticket.customerName}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-bold text-charcoal/40 uppercase tracking-wider mb-0.5 flex items-center gap-1"><Users size={10} />Quantity</p>
                    <p className="font-sans text-sm text-charcoal font-bold">{ticket.quantity} ticket{ticket.quantity !== 1 ? 's' : ''}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-charcoal/40 uppercase tracking-wider mb-0.5">Total Paid</p>
                    <p className="font-sans text-sm text-charcoal font-bold">${(ticket.totalAmount / 100).toFixed(2)}</p>
                  </div>
                  {purchasedDate && (
                    <div>
                      <p className="text-xs font-bold text-charcoal/40 uppercase tracking-wider mb-0.5 flex items-center gap-1"><Calendar size={10} />Purchased</p>
                      <p className="font-sans text-xs text-charcoal/70">{purchasedDate}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Divider with holes */}
          <div className="relative flex items-center px-4 py-0">
            <div className="w-4 h-4 bg-cream rounded-full border border-tan/20 shrink-0" />
            <div className="flex-1 border-t-2 border-dashed border-tan/20 mx-2" />
            <div className="w-4 h-4 bg-cream rounded-full border border-tan/20 shrink-0" />
          </div>

          <div className="px-8 py-4 bg-cream/50 text-xs text-charcoal/50 font-sans text-center">
            Present this confirmation (printed or on your phone) at the door. Questions? <a href="mailto:info@senoiahistory.com" className="underline hover:text-tan">info@senoiahistory.com</a>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4 mt-6 justify-center print:hidden">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 border border-tan text-tan px-5 py-2 rounded-md text-sm font-bold uppercase tracking-wider hover:bg-tan/5 transition-colors"
          >
            <Printer size={16} /> Print
          </button>
          <Link
            to="/news"
            className="bg-tan text-white px-5 py-2 rounded-md text-sm font-bold uppercase tracking-wider hover:bg-tan-dark transition-colors shadow-sm"
          >
            Back to Events
          </Link>
        </div>
      </div>
    </div>
  );
}
