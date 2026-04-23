import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { submitTicketRequest } from '../services/api';
import type { Post } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { Ticket, Loader2, Calendar, MapPin, User, Mail, Minus, Plus, AlertCircle } from 'lucide-react';

// ── Inline Ticket Purchase Widget ──────────────────────────────────────────
function TicketPurchaseWidget({ post, user }: { post: Post; user: any }) {
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
    <div className="mb-12 bg-white p-8 rounded-xl border-2 border-tan/20 shadow-sm">
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

// ── Main NewsDetail Page ───────────────────────────────────────────────────
export default function NewsDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPost() {
      if (!slug) return;
      try {
        const q = query(collection(db, 'posts'), where('slug', '==', slug), limit(1));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const docSnap = snapshot.docs[0];
          setPost({ id: docSnap.id, ...docSnap.data() } as Post);
        }
      } catch (err) {
        console.error('Failed to load post details', err);
      } finally {
        setLoading(false);
      }
    }
    loadPost();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-cream">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-charcoal"></div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center pt-20 px-4 text-center">
        <h1 className="text-4xl font-serif font-bold text-charcoal mb-4">Post Not Found</h1>
        <p className="text-charcoal/70 mb-8 max-w-md font-sans">The news item or event you are looking for may have been removed or the link is incorrect.</p>
        <Link to="/news" className="bg-tan text-white px-6 py-3 rounded-md uppercase tracking-wider font-semibold text-sm hover:bg-tan-dark transition-colors border border-transparent shadow-sm">Return to News</Link>
      </div>
    );
  }

  const dateToDisplay = post.type === 'event' && post.eventDate ? post.eventDate : post.publishDate;
  const formattedDate = dateToDisplay ? dateToDisplay.toDate().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '';

  return (
    <article className="bg-cream min-h-screen pt-24 pb-16 px-4 md:px-6 lg:px-8 font-serif text-charcoal">
      <div className="max-w-4xl mx-auto">
        <Link to="/news" className="inline-flex items-center text-sm font-sans text-tan uppercase tracking-wide hover:text-charcoal transition-colors mb-8">
          <span className="mr-2">←</span> Back to News &amp; Events
        </Link>

        <header className="mb-12">
          {formattedDate && (
            <div className="text-sm font-sans text-tan font-semibold tracking-wider uppercase mb-4">
              {post.type === 'event' ? `Event Date: ${formattedDate}` : `Published: ${formattedDate}`}
            </div>
          )}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-8">{post.title}</h1>
          <div className="flex flex-wrap gap-6 mb-8 text-charcoal/60 font-sans text-sm">
            {post.type === 'event' && formattedDate && (
              <div className="flex items-center gap-2"><Calendar size={18} className="text-tan" /><span>{formattedDate}</span></div>
            )}
            {post.location && (
              <div className="flex items-center gap-2"><MapPin size={18} className="text-tan" /><span>{post.location}</span></div>
            )}
          </div>
          {post.mainImage && (
            <div className="w-full h-64 md:h-96 rounded-lg overflow-hidden shadow-md border border-tan/20">
              <img src={post.mainImage} alt={post.title} className="w-full h-full object-cover" />
            </div>
          )}
        </header>

        {post.type === 'event' && post.ticketPrice && (
          <TicketPurchaseWidget post={post} user={user} />
        )}

        <div className="prose prose-lg prose-charcoal max-w-none font-sans" dangerouslySetInnerHTML={{ __html: post.content }} />

        {post.galleryImages && post.galleryImages.length > 0 && (
          <div className="mt-16 border-t border-tan-light pt-12">
            <h2 className="text-2xl font-bold mb-8">Image Gallery</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {post.galleryImages.map((img, idx) => (
                <div key={idx} className="aspect-w-4 aspect-h-3 rounded-lg overflow-hidden shadow-sm border border-tan/10">
                  <img src={img} alt={`${post.title} gallery image ${idx + 1}`} className="object-cover w-full h-full" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
