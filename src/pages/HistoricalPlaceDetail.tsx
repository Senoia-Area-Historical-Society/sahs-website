import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { HistoricalPlace } from '../types';

export default function HistoricalPlaceDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [place, setPlace] = useState<HistoricalPlace | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPlace() {
      if (!slug) return;
      try {
        const q = query(
          collection(db, 'historical_places'),
          where('slug', '==', slug),
          limit(1)
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const doc = snapshot.docs[0];
          setPlace({ id: doc.id, ...doc.data() } as HistoricalPlace);
        }
      } catch (err) {
        console.error("Failed to load historical place", err);
      } finally {
        setLoading(false);
      }
    }
    loadPlace();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-cream">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-charcoal"></div>
      </div>
    );
  }

  if (!place) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center pt-20 px-4 text-center">
        <h1 className="text-4xl font-serif font-bold text-charcoal mb-4">Location Not Found</h1>
        <p className="text-charcoal/70 mb-8 max-w-md font-sans">
          The historical structure or place you are looking for may have been removed or the link is incorrect.
        </p>
        <Link to="/historic-structures-and-places" className="bg-tan text-white px-6 py-3 rounded-md uppercase tracking-wider font-semibold text-sm hover:bg-tan-dark transition-colors border border-transparent shadow-sm">
          Return to Directory
        </Link>
      </div>
    );
  }

  return (
    <article className="bg-cream min-h-screen pt-24 pb-16 px-4 md:px-6 lg:px-8 font-serif text-charcoal">
      <div className="max-w-4xl mx-auto">
        
        <Link to="/historic-structures-and-places" className="inline-flex items-center text-sm font-sans text-tan uppercase tracking-wide hover:text-charcoal transition-colors mb-8">
          <span className="mr-2">←</span> Back to Historical Places
        </Link>
        
        <header className="mb-12">
          <div className="text-sm font-sans text-tan font-semibold tracking-wider uppercase mb-4">
            {place.type}
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-4">
            {place.title}
          </h1>
          {place.historical_address && (
              <div className="text-charcoal/80 font-sans italic text-lg mb-8">
                  📍 {place.historical_address}
              </div>
          )}

          {place.mainImage && (
            <div className="w-full h-64 md:h-96 rounded-lg overflow-hidden shadow-md border border-tan/20">
              <img src={place.mainImage} alt={place.title} className="w-full h-full object-cover" />
            </div>
          )}
        </header>

        <div 
          className="prose prose-lg prose-charcoal max-w-none font-sans"
          dangerouslySetInnerHTML={{ __html: place.description }}
        />

        {place.galleryImages && place.galleryImages.length > 0 && (
          <div className="mt-16 border-t border-tan-light pt-12">
            <h2 className="text-2xl font-bold mb-8">Architectural Details & Grounds</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {place.galleryImages.map((img, idx) => (
                <div key={idx} className="aspect-w-4 aspect-h-3 rounded-lg overflow-hidden shadow-sm border border-tan/10">
                  <img src={img} alt={`${place.title} detail ${idx+1}`} className="object-cover w-full h-full hover:scale-105 transition-transform duration-500" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
