import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { format } from 'date-fns';
import { db } from '../lib/firebase';
import { reserveCheckoutTab, startTicketCheckout } from '../lib/ticketCheckout';
import type { Post } from '../types';
import { Ticket, Loader2, Minus, Plus, AlertCircle, Lock, ExternalLink } from 'lucide-react';

const MAX_QTY = 10;

/**
 * Standalone ticket widget for embedding on partner sites via <iframe>
 * (currently senoiacar.show). Deliberately routed outside PublicLayout — no
 * site header, footer, or page chrome — and painted on a transparent body so
 * it inherits the host page's background.
 */
export default function EmbedTickets() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const accentless = searchParams.get('theme') === 'plain';

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualUrl, setManualUrl] = useState<string | null>(null);
  const [awaitingReturn, setAwaitingReturn] = useState(false);

  // The host page supplies the background; a solid body would paint a hard edge
  // inside the iframe.
  useEffect(() => {
    const { body, documentElement } = document;
    const prev = body.style.backgroundColor;
    body.style.backgroundColor = 'transparent';
    const prevRoot = documentElement.style.backgroundColor;
    documentElement.style.backgroundColor = 'transparent';
    return () => {
      body.style.backgroundColor = prev;
      documentElement.style.backgroundColor = prevRoot;
    };
  }, []);

  // Checkout happens in another tab, so this page stays mounted and would sit
  // on a dead spinner forever if the buyer abandons Stripe. visibilityState is
  // inherited from the top-level tab, so it flips back to 'visible' in here the
  // moment they return — that is our cue to allow another attempt.
  useEffect(() => {
    if (!awaitingReturn) return;
    const reset = () => {
      if (document.visibilityState !== 'visible') return;
      setAwaitingReturn(false);
      setIsProcessing(false);
    };
    document.addEventListener('visibilitychange', reset);
    window.addEventListener('focus', reset);
    return () => {
      document.removeEventListener('visibilitychange', reset);
      window.removeEventListener('focus', reset);
    };
  }, [awaitingReturn]);

  // An iframe cannot size itself to its content and the host cannot measure
  // across origins, so publish our height and let the host snippet apply it.
  // Only a number crosses the boundary; the host validates the origin.
  useEffect(() => {
    if (window.parent === window) return;
    const send = () => {
      window.parent.postMessage(
        { type: 'sahs:embed-height', slug, height: Math.ceil(document.body.scrollHeight) },
        '*'
      );
    };
    const observer = new ResizeObserver(send);
    observer.observe(document.body);
    send();
    return () => observer.disconnect();
    // The observer already reacts to content changes, so this need not re-run.
  }, [slug]);

  useEffect(() => {
    async function loadPost() {
      if (!slug) { setLoading(false); return; }
      try {
        const snap = await getDocs(
          query(collection(db, 'posts'), where('slug', '==', slug), limit(1))
        );
        if (!snap.empty) {
          setPost({ id: snap.docs[0].id, ...snap.docs[0].data() } as Post);
        }
      } catch (err) {
        console.error('Failed to load embedded event', err);
      } finally {
        setLoading(false);
      }
    }
    loadPost();
  }, [slug]);

  const handleBuy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!post || !name.trim() || !email.trim()) return;

    // Must happen synchronously, while the click still grants activation.
    const reservedTab = reserveCheckoutTab();

    setIsProcessing(true);
    setError(null);
    setManualUrl(null);
    try {
      const outcome = await startTicketCheckout({
        post,
        buyer: { name, email, quantity },
        reservedTab,
        embedded: true,
      });
      if (outcome.status === 'manual') {
        setManualUrl(outcome.url);
        setIsProcessing(false);
      } else {
        // Buyer is in the checkout tab. Hold the spinner so we don't invite a
        // duplicate purchase, but re-enable as soon as they come back.
        setAwaitingReturn(true);
      }
    } catch (err) {
      console.error('Ticket error:', err);
      setError('We couldn’t start checkout. Please try again.');
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[320px] flex items-center justify-center font-sans">
        <Loader2 className="animate-spin text-tan" size={32} aria-label="Loading tickets" />
      </div>
    );
  }

  if (!post || !post.ticketPrice || post.status !== 'published') {
    return (
      <div className="font-sans p-6 text-center text-charcoal/70 bg-white/70 border border-tan/30 rounded-xl">
        <Ticket size={28} className="mx-auto text-charcoal/25 mb-3" aria-hidden="true" />
        <p className="font-bold text-charcoal">Tickets aren’t available yet</p>
        <p className="text-sm mt-1">Please check back soon.</p>
      </div>
    );
  }

  const remaining = post.capacity ? post.capacity - (post.ticketsSold || 0) : Infinity;
  const isSoldOut = post.capacity ? remaining <= 0 : false;
  const maxQty = Math.min(MAX_QTY, isFinite(remaining) ? remaining : MAX_QTY);
  const total = ((post.ticketPrice * quantity) / 100).toFixed(2);
  const eventDay = post.eventDate?.toDate();

  return (
    <div className="font-sans text-charcoal">
      <div className="bg-white border border-tan/30 rounded-xl shadow-sm overflow-hidden">
        {!accentless && (
          <div className="bg-charcoal px-5 py-3 flex items-baseline justify-between gap-3 flex-wrap">
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-tan-light">
              Senoia Area Historical Society
            </span>
            <span className="text-[11px] uppercase tracking-widest text-white/50">Secure checkout</span>
          </div>
        )}

        <div className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
            <div>
              <h1 className="font-serif text-xl sm:text-2xl font-bold leading-tight">{post.title}</h1>
              {eventDay && (
                <time
                  dateTime={format(eventDay, 'yyyy-MM-dd')}
                  className="block text-xs text-charcoal/60 mt-1"
                >
                  {format(eventDay, 'EEEE, MMMM d, yyyy')}
                </time>
              )}
            </div>
            <div className="text-right shrink-0">
              <div className="font-serif text-2xl font-bold leading-none">
                ${(post.ticketPrice / 100).toFixed(2)}
              </div>
              <div className="text-[11px] uppercase tracking-wider text-charcoal/50 mt-1">per entry</div>
            </div>
          </div>

          {isSoldOut ? (
            <div className="text-center py-6 border-t border-tan/20">
              <p className="font-bold text-charcoal/70">This event is sold out.</p>
            </div>
          ) : (
            <form onSubmit={handleBuy} className="space-y-3">
              {error && (
                <p role="alert" className="flex items-center gap-2 text-red-700 text-sm bg-red-50 border border-red-200 rounded-md p-2.5">
                  <AlertCircle size={15} className="shrink-0" aria-hidden="true" /> {error}
                </p>
              )}

              {manualUrl && (
                <p className="flex items-center justify-between gap-3 text-sm bg-tan/10 border border-tan/30 rounded-md p-3 flex-wrap">
                  <span>Your pop-up blocker stopped the redirect.</span>
                  <a
                    href={manualUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 font-bold text-tan-dark underline underline-offset-2 whitespace-nowrap"
                  >
                    Continue to checkout <ExternalLink size={13} aria-hidden="true" />
                  </a>
                </p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="embed-name" className="block text-[11px] font-bold uppercase tracking-wider text-charcoal/60 mb-1">
                    Full name
                  </label>
                  <input
                    id="embed-name"
                    type="text"
                    required
                    autoComplete="name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Jane Smith"
                    className="w-full px-3 py-2 border border-tan-light rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-tan/50"
                  />
                </div>
                <div>
                  <label htmlFor="embed-email" className="block text-[11px] font-bold uppercase tracking-wider text-charcoal/60 mb-1">
                    Email
                  </label>
                  <input
                    id="embed-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="jane@example.com"
                    className="w-full px-3 py-2 border border-tan-light rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-tan/50"
                  />
                </div>
              </div>

              <div className="flex items-end gap-3">
                <div>
                  <span id="embed-qty-label" className="block text-[11px] font-bold uppercase tracking-wider text-charcoal/60 mb-1">
                    Entries
                  </span>
                  <div className="flex items-center gap-2 bg-cream border border-tan/20 rounded-md px-2 py-1.5">
                    <button
                      type="button"
                      onClick={() => setQuantity(q => Math.max(1, q - 1))}
                      disabled={quantity <= 1}
                      aria-label="Decrease quantity"
                      className="p-1 rounded-full text-tan hover:bg-tan/10 disabled:opacity-30 transition-colors"
                    >
                      <Minus size={16} aria-hidden="true" />
                    </button>
                    <output aria-labelledby="embed-qty-label" className="font-bold w-5 text-center tabular-nums">
                      {quantity}
                    </output>
                    <button
                      type="button"
                      onClick={() => setQuantity(q => Math.min(maxQty, q + 1))}
                      disabled={quantity >= maxQty}
                      aria-label="Increase quantity"
                      className="p-1 rounded-full text-tan hover:bg-tan/10 disabled:opacity-30 transition-colors"
                    >
                      <Plus size={16} aria-hidden="true" />
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isProcessing}
                  className="flex-1 bg-charcoal text-white px-5 py-2.5 rounded-md uppercase font-bold tracking-widest text-sm hover:bg-black disabled:opacity-70 transition-colors flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <Loader2 className="animate-spin" size={18} aria-label="Starting checkout" />
                  ) : (
                    <><Ticket size={16} className="text-tan-light" aria-hidden="true" /> Buy — ${total}</>
                  )}
                </button>
              </div>

              {post.capacity && (
                <p className="text-[11px] text-tan-dark font-bold uppercase tracking-wider">
                  {remaining} {remaining === 1 ? 'entry' : 'entries'} remaining
                </p>
              )}

              <p className="flex items-center gap-1.5 text-[11px] text-charcoal/50 pt-1">
                <Lock size={11} aria-hidden="true" />
                Checkout opens in a new tab, secured by Stripe. Proceeds benefit the Senoia Area Historical Society.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
