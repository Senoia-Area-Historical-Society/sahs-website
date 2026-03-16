import { useEffect, useState } from 'react';
import { getHistoricalPlaces } from '../services/api';
import type { HistoricalPlace } from '../types';

export default function HistoricalPlaces() {
  const [places, setPlaces] = useState<HistoricalPlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'All' | 'Home' | 'Business' | 'Place or Thing'>('All');

  useEffect(() => {
    async function loadPlaces() {
      try {
        const data = await getHistoricalPlaces();
        setPlaces(data);
      } catch (err) {
        console.error("Failed to load historical places", err);
      } finally {
        setLoading(false);
      }
    }
    loadPlaces();
  }, []);

  const filteredPlaces = filter === 'All' ? places : places.filter(p => p.type === filter);

  return (
    <div className="bg-cream min-h-screen pt-24 pb-16 px-4 md:px-6 lg:px-8 font-serif text-charcoal">
      <div className="max-w-7xl mx-auto">
        <header className="mb-12 border-b border-tan pb-8 text-center md:text-left">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Historical Structures & Places</h1>
          <p className="text-lg text-charcoal/80 max-w-3xl font-sans">
            Explore the rich architectural history of Senoia. Browse through historically significant homes, businesses, and notable places that have shaped our community over the past centuries.
          </p>
        </header>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-charcoal"></div>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-4 mb-8 justify-center md:justify-start">
              {['All', 'Home', 'Business', 'Place or Thing'].map((type) => (
                <button
                  key={type}
                  onClick={() => setFilter(type as any)}
                  className={`px-6 py-2 rounded-full font-sans text-sm font-semibold tracking-wider uppercase transition-colors border ${
                    filter === type 
                      ? 'bg-tan text-white border-tan shadow-sm' 
                      : 'bg-white text-charcoal border-tan-light hover:border-tan hover:bg-tan/5'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>

            {filteredPlaces.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border border-tan/20">
                <p className="font-sans text-charcoal/70 italic">No historical places found in this category.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredPlaces.map(place => (
                  <article key={place.id} className="group bg-white rounded-lg shadow-sm border border-tan/20 flex flex-col overflow-hidden hover:shadow-md transition-all">
                    {place.mainImage ? (
                      <div className="h-64 overflow-hidden">
                        <img 
                          src={place.mainImage} 
                          alt={place.title} 
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                        />
                      </div>
                    ) : (
                      <div className="h-64 bg-cream flex flex-col items-center justify-center p-6 border-b border-tan/10">
                         <img src="/sahs-logo.png" alt="SAHS Logo" className="h-24 opacity-20" />
                      </div>
                    )}
                    
                    <div className="p-6 flex flex-col flex-grow">
                      <div className="text-xs font-sans text-tan font-bold tracking-wider uppercase mb-2">
                        {place.type}
                      </div>
                      <h3 className="text-2xl font-bold mb-3">{place.title}</h3>
                      <p className="text-gray-600 font-sans text-sm mb-6 flex-grow line-clamp-3">
                        {place.excerpt || place.description.replace(/<[^>]*>?/gm, '').substring(0, 150) + '...'}
                      </p>
                      
                      <a 
                        href={`/historic-structures-and-places/${place.slug}`} 
                        className="inline-block border-b border-charcoal pb-1 text-sm font-sans font-bold uppercase tracking-widest text-charcoal hover:text-tan hover:border-tan transition-colors"
                      >
                        Explore Details
                      </a>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
