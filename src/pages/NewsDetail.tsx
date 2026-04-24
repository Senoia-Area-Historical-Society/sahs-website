import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Post } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { Calendar, MapPin } from 'lucide-react';
import TicketPurchaseWidget from '../components/public/TicketPurchaseWidget';

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
          <div className="mb-12">
            <TicketPurchaseWidget post={post} user={user} />
          </div>
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
