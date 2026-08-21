import { useEffect, useRef, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { getTicketBySessionId } from '../services/api';
import type { Ticket } from '../types';
import { CheckCircle, Ticket as TicketIcon, Calendar, Users, Printer, Mail, HelpCircle } from 'lucide-react';
import Seo from '../components/Seo';
import { pushToDataLayer } from '../lib/gtm';

// 'pending' means: Stripe redirected the buyer here, so the payment succeeded, but no
// `tickets` document exists yet for this Checkout Session. That is either a webhook still
// in flight or a webhook that never ran at all — indistinguishable from the browser. Never
// tell the buyer the ticket was issued from this state; a silent claim of success is exactly
// what hid a months-long stripeWebhook outage from ~25 paying customers.
type Status = 'loading' | 'found' | 'pending' | 'no-session';

export default function TicketSuccess() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const reportedRef = useRef(false);
  const unresolvedRef = useRef(false);

  // Fires once, when the ticket first resolves — polling can otherwise re-render
  // this component several times before `status` settles.
  useEffect(() => {
    if (!ticket || reportedRef.current) return;
    reportedRef.current = true;
    pushToDataLayer({
      event: 'purchase',
      ecommerce: {
        transaction_id: ticket.confirmationNumber,
        value: ticket.totalAmount / 100,
        currency: 'USD',
        items: [
          {
            item_id: ticket.eventId,
            item_name: ticket.eventTitle,
            item_category: 'event_ticket',
            quantity: ticket.quantity,
            price: ticket.totalAmount / 100 / ticket.quantity,
          },
        ],
      },
    });
  }, [ticket]);

  useEffect(() => {
    if (!sessionId) { setStatus('no-session'); return; }

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 4;

    const poll = async () => {
      if (cancelled) return;
      const found = await getTicketBySessionId(sessionId);
      if (cancelled) return;
      if (found) {
        setTicket(found);
        setStatus('found');
        return;
      }
      attempts++;
      if (attempts < maxAttempts) {
        setTimeout(poll, 1500);
      } else {
        // getTicketBySessionId swallows its own errors and returns null, so this covers a
        // genuine miss, a rules rejection and a network failure alike — hence "unresolved".
        // The console line is a breadcrumb for whoever reproduces the report; the data layer
        // event is the part SAHS can actually see, in GA4, without a buyer having to complain
        // first. That asymmetry is the whole point: the last outage stayed invisible for
        // months because nothing but the buyer's own browser knew about it.
        //
        // This is also the counterpart to the `purchase` event above, which only fires once a
        // ticket resolves: during the outage GA4 recorded neither a purchase nor a reason for
        // its absence, so the funnel simply ended with no explanation.
        if (!unresolvedRef.current) {
          unresolvedRef.current = true;
          console.error(
            `[TicketSuccess] No ticket document resolved for Checkout Session after ${maxAttempts} attempts. ` +
            `The buyer paid but has no confirmation number. session_id=${sessionId}`
          );
          pushToDataLayer({
            event: 'ticket_confirmation_unresolved',
            session_id: sessionId,
            attempts: maxAttempts,
          });
        }
        setStatus('pending');
      }
    };

    // Start polling after a brief initial delay to allow webhook to process
    const initial = setTimeout(poll, 1000);
    return () => { cancelled = true; clearTimeout(initial); };
  }, [sessionId]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-4">
        <Seo title="Confirming Your Purchase" description="Confirming your event ticket purchase." noindex />
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tan mx-auto mb-4" />
          <p className="font-serif text-charcoal/60 text-lg">Confirming your purchase...</p>
          <p className="text-sm text-charcoal/40 mt-2 font-sans">This may take a few seconds.</p>
        </div>
      </div>
    );
  }

  // No session id at all: this visitor did not arrive from a Stripe checkout, so we have no
  // basis whatsoever for claiming a payment succeeded. Kept separate from 'pending' for that
  // reason — the reassuring copy below would be flatly false here.
  if (status === 'no-session') {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-4 py-12">
        <Seo title="Ticket Confirmation" description="Look up an event ticket purchase." noindex />
        <div className="max-w-md w-full bg-white rounded-xl border border-tan/20 shadow-lg p-10 text-center">
          <div className="w-14 h-14 bg-tan/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <HelpCircle size={28} className="text-tan" />
          </div>
          <h1 className="text-2xl font-serif font-bold text-charcoal mb-3">No Purchase to Show</h1>
          <p className="text-charcoal/70 font-sans mb-6">
            This page shows your ticket details right after a purchase, and there's no purchase
            reference in this link. If you've already bought tickets and need your confirmation
            number, email us at{' '}
            <a href="mailto:info@senoiahistory.com" className="underline hover:text-tan">info@senoiahistory.com</a>{' '}
            and we'll look it up.
          </p>
          <Link to="/news" className="inline-block bg-tan text-white px-8 py-3 rounded uppercase font-bold tracking-widest hover:bg-tan-dark transition-all shadow-md text-sm">
            Browse Events
          </Link>
        </div>
      </div>
    );
  }

  // 'pending', or the defensive case of a 'found' status with no ticket object. Both mean the
  // same thing to the buyer, so they get the same honest copy: the payment landed, the
  // confirmation has not been issued yet, here is the reference and how to reach us.
  if (status === 'pending' || !ticket) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-4 py-12">
        <Seo title="Payment Received" description="Your ticket payment was received." noindex />
        <div className="max-w-md w-full bg-white rounded-xl border border-tan/20 shadow-lg p-10 text-center">
          <div className="w-14 h-14 bg-tan/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail size={28} className="text-tan" />
          </div>
          <h1 className="text-2xl font-serif font-bold text-charcoal mb-3">Payment Received</h1>
          <p className="text-charcoal/70 font-sans mb-4">
            Your payment went through and Stripe has emailed you a receipt. Your ticket
            confirmation number and QR code aren't ready on this page yet.
          </p>
          <p className="text-charcoal/70 font-sans mb-6">
            Please email{' '}
            <a href="mailto:info@senoiahistory.com" className="underline hover:text-tan font-medium">info@senoiahistory.com</a>{' '}
            with the reference below and we'll issue your confirmation. If the event arrives
            first, bring your Stripe receipt — it's proof of purchase and we'll check you in
            at the door.
          </p>

          {sessionId && (
            <div className="text-left bg-cream/60 border border-tan/20 rounded-lg px-4 py-3 mb-6">
              <p className="text-xs font-bold text-charcoal/40 uppercase tracking-wider mb-1">Your Reference</p>
              <p className="font-mono text-xs text-charcoal break-all select-all">{sessionId}</p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href={`mailto:info@senoiahistory.com?subject=${encodeURIComponent('Missing ticket confirmation')}&body=${encodeURIComponent(`Hello,\n\nI purchased tickets but did not receive a confirmation number.\n\nMy reference: ${sessionId ?? '(none)'}\n\nThank you.`)}`}
              className="inline-block bg-tan text-white px-6 py-3 rounded uppercase font-bold tracking-widest hover:bg-tan-dark transition-all shadow-md text-sm"
            >
              Email Us
            </a>
            <Link to="/news" className="inline-block border border-tan text-tan px-6 py-3 rounded uppercase font-bold tracking-widest hover:bg-tan/5 transition-all text-sm">
              Back to Events
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const purchasedDate = ticket.purchasedAt
    ? new Date(ticket.purchasedAt).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  return (
    <div className="min-h-screen bg-cream py-12 px-4">
      <Seo title="Tickets Confirmed" description="Your event tickets are confirmed." noindex />
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
