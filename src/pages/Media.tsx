import { useEffect, useState } from 'react';
import { getGalleries } from '../services/api';
import type { Gallery } from '../types';

export default function Media() {
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadGalleries() {
      try {
        const data = await getGalleries();
        setGalleries(data);
      } catch (err) {
        console.error("Failed to load photo galleries", err);
      } finally {
        setLoading(false);
      }
    }
    loadGalleries();
  }, []);

  return (
    <div className="bg-cream min-h-screen pt-24 pb-16 px-4 md:px-6 lg:px-8 font-serif text-charcoal">
      <div className="max-w-7xl mx-auto">
        <header className="mb-12 border-b border-tan pb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Photo Galleries</h1>
          <p className="text-lg text-charcoal/80 max-w-2xl font-sans">
            Browse through our historical archives and event photography to see the Senoia Area Historical Society's ongoing work and community engagement.
          </p>
        </header>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-charcoal"></div>
          </div>
        ) : galleries.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-tan/20">
            <p className="font-sans text-charcoal/70 italic">No galleries available at this time.</p>
          </div>
        ) : (
          <div className="space-y-16">
            {galleries.map(gallery => (
              <section key={gallery.id} className="bg-white p-6 md:p-8 rounded-lg shadow-sm border border-tan/20">
                <div className="flex flex-col md:flex-row md:items-start gap-8 mb-8">
                  {gallery.coverImage && (
                    <div className="w-full md:w-1/3 aspect-video md:aspect-square flex-shrink-0 rounded-lg overflow-hidden border border-tan/10 shadow-sm">
                      <img src={gallery.coverImage} alt={gallery.title} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex-grow">
                    <h2 className="text-3xl font-bold mb-4">{gallery.title}</h2>
                    {gallery.description && (
                      <div 
                        className="prose prose-charcoal max-w-none font-sans mb-6"
                        dangerouslySetInnerHTML={{ __html: gallery.description }}
                      />
                    )}
                  </div>
                </div>

                {gallery.images && gallery.images.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {gallery.images.map((img, idx) => (
                      <div key={idx} className="aspect-w-1 aspect-h-1 rounded-md overflow-hidden bg-tan/5 hover:opacity-90 transition-opacity cursor-pointer border border-tan/10 shadow-sm">
                        <img src={img} alt={`Gallery image ${idx + 1}`} className="w-full h-full object-cover" loading="lazy" />
                      </div>
                    ))}
                  </div>
                )}
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
