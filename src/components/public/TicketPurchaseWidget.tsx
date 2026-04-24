import { useState } from 'react';
import { submitTicketRequest } from '../../services/api';
import type { Post } from '../../types';
import { Ticket, Loader2, User, Mail, Minus, Plus, AlertCircle } from 'lucide-react';

interface TicketPurchaseWidgetProps {
  post: Post;
  user?: any;
}

export default function TicketPurchaseWidget({ post, user }: TicketPurchaseWidgetProps) {
  const remaining = post.capacity ? post.capacity - (post.ticketsSold || 0) : Infinity;
  const isSoldOut = post.capacity ? remaining <= 0 : false;

  const [name, setName] = useState(user?.displayName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [quantity, setQuantity] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const maxQty = Math.min(10, isFinite(remaining) ? remaining : 10);

  const handleBuy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setIsProcessing(true);
    setError(null);
    try {
      const { url } = await submitTicketRequest({
        eventId: post.id,
        title: post.title,
        price: post.ticketPrice!,
        quantity,
        email,
        customerName: name,
        slug: post.slug,
      });
      window.location.href = url;
    } catch (err) {
      console.error('Ticket error:', err);
      setError('There was an error starting the checkout. Please try again.');
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-xl border-2 border-tan/20 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-start gap-8">
        {/* Left: price + capacity info */}
        <div className="md:w-1/3 shrink-0">
          <h3 className="text-2xl font-bold mb-2">Purchase Tickets</h3>
          <p className="text-charcoal/60 font-sans text-lg font-bold">${(post.ticketPrice! / 100).toFixed(2)}<span className="text-sm font-normal"> / person</span></p>
          {post.capacity && (
            <p className={`text-xs font-sans font-bold uppercase mt-2 ${isSoldOut ? 'text-red-600' : 'text-tan'}`}>
              {isSoldOut ? '🚫 Sold Out' : `${remaining} ticket${remaining !== 1 ? 's' : ''} remaining`}
            </p>
          )}
        </div>

        {/* Right: form */}
        {isSoldOut ? (
          <div className="flex-1 flex items-center justify-center py-6">
            <div className="text-center">
              <Ticket size={36} className="mx-auto text-charcoal/20 mb-3" />
              <p className="font-bold text-charcoal/60 font-sans">This event is sold out.</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleBuy} className="flex-1 space-y-4">
            {error && (
              <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-md p-3">
                <AlertCircle size={16} /> {error}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-charcoal/60 uppercase tracking-wider mb-1">
                  <User size={12} className="inline mr-1" />Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Jane Smith"
                  className="w-full px-3 py-2 border border-tan-light rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-tan/50"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-charcoal/60 uppercase tracking-wider mb-1">
                  <Mail size={12} className="inline mr-1" />Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="jane@example.com"
                  className="w-full px-3 py-2 border border-tan-light rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-tan/50"
                />
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div>
                <label className="block text-xs font-bold text-charcoal/60 uppercase tracking-wider mb-1">Quantity</label>
                <div className="flex items-center gap-3 bg-cream/50 p-2 rounded-lg border border-tan/10">
                  <button type="button" onClick={() => setQuantity(q => Math.max(1, q - 1))} className="p-1 rounded-full hover:bg-tan/10 text-tan transition-colors"><Minus size={18} /></button>
                  <span className="font-bold text-lg w-6 text-center">{quantity}</span>
                  <button type="button" onClick={() => setQuantity(q => Math.min(maxQty, q + 1))} className="p-1 rounded-full hover:bg-tan/10 text-tan transition-colors"><Plus size={18} /></button>
                </div>
              </div>
              <button
                type="submit"
                disabled={isProcessing}
                className="mt-5 flex-1 bg-charcoal text-white px-6 py-3 rounded uppercase font-bold tracking-widest hover:bg-black transition-all flex items-center justify-center gap-2 shadow-md"
              >
                {isProcessing ? <Loader2 className="animate-spin" size={20} /> : (
                  <><Ticket size={18} className="text-tan" /> Buy — ${((post.ticketPrice! * quantity) / 100).toFixed(2)}</>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
