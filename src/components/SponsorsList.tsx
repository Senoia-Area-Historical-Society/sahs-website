import { useEffect, useState } from 'react';
import { getCorporateSponsors } from '../services/api';
import type { OrganizationEntity } from '../types';

export default function SponsorsList() {
  const [sponsors, setSponsors] = useState<OrganizationEntity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await getCorporateSponsors();
        setSponsors(data);
      } catch (err) {
        console.error("Failed to load supporters", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const corporateSponsors = sponsors.filter(s => s.sponsorshipLevel === 'Corporate');
  const patronSponsors = sponsors.filter(s => s.sponsorshipLevel === 'Patron');

  return (
    <div className="w-full">
      {/* 2026 Corporate Sponsors Section */}
      <section className="mb-20">
        <h2 className="text-3xl font-bold mb-10 pb-4 border-b border-tan text-center">2026 Corporate Sponsors</h2>
        {loading ? (
           <div className="flex justify-center py-12">
             <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tan"></div>
           </div>
        ) : corporateSponsors.length === 0 ? (
          <p className="text-center italic text-charcoal/60 font-sans">Our 2026 corporate partners will be listed here soon.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {corporateSponsors.map(sponsor => (
              <a 
                key={sponsor.id} 
                href={sponsor.websiteUrl || '#'} 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-white p-6 rounded-lg border border-tan/10 shadow-sm flex flex-col items-center justify-center aspect-square transition-all hover:shadow-md hover:-translate-y-1 group"
              >
                {sponsor.logoUrl ? (
                  <img src={sponsor.logoUrl} alt={sponsor.name} className="max-h-24 w-auto object-contain mb-4 transition-all group-hover:scale-105" />
                ) : (
                  <span className="text-lg font-bold text-center leading-tight group-hover:text-tan">{sponsor.name}</span>
                )}
              </a>
            ))}
          </div>
        )}
      </section>

      {/* 2026 Patron Sponsors Section */}
      <section className="mb-20">
        <h2 className="text-3xl font-bold mb-10 pb-4 border-b border-tan text-center">2026 SAHS Patron Sponsors</h2>
        {loading ? (
           <div className="flex justify-center py-12">
             <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tan"></div>
           </div>
        ) : patronSponsors.length === 0 ? (
          <p className="text-center italic text-charcoal/60 font-sans">Our 2026 patron partners will be listed here soon.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {patronSponsors.map(sponsor => (
              <a 
                key={sponsor.id} 
                href={sponsor.websiteUrl || '#'} 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-white p-6 rounded-lg border border-tan/10 shadow-sm flex flex-col items-center justify-center aspect-square transition-all hover:shadow-md hover:-translate-y-1 group"
              >
                {sponsor.logoUrl ? (
                  <img src={sponsor.logoUrl} alt={sponsor.name} className="max-h-24 w-auto object-contain mb-4 transition-all group-hover:scale-105" />
                ) : (
                  <span className="text-lg font-bold text-center leading-tight group-hover:text-tan">{sponsor.name}</span>
                )}
              </a>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
