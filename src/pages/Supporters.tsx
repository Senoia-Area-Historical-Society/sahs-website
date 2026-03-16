import { useEffect, useState } from 'react';
import { getCorporateSponsors } from '../services/api';
import type { OrganizationEntity } from '../types';

export default function Supporters() {
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

  // Filter sponsors by level
  const corporateSponsors = sponsors.filter(s => s.sponsorshipLevel === 'Corporate');

  const partners = [
    { name: "Newnan Coweta County Historical Society", url: "http://newnancowetahistoricalsociety.com/" },
    { name: "Fayette County Historical Society", url: "http://fayettehistoricalsociety.com/" },
    { name: "Georgia Historical Society", url: "http://georgiahistory.com/" },
    { name: "Daughters of the American Revolution - General Daniel Newnan Chapter", url: "http://danielnewnan.georgiastatedar.org/" },
    { name: "Daughters of the American Revolution – National Chapter", url: "https://www.dar.org/" },
    { name: "National Society Colonial Dames XVII Century", url: "http://www.colonialdames17c.org/" }
  ];

  return (
    <div className="bg-cream min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8 font-serif text-charcoal">
      <div className="max-w-5xl mx-auto">
        <header className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">SAHS Supporters</h1>
          <p className="text-xl text-charcoal/80 max-w-3xl mx-auto font-sans leading-relaxed">
            The Senoia Area Historical Society relies upon the generosity of individuals, businesses, and corporations to provide needed support for our operations and community heritage events.
          </p>
        </header>

        {/* 2026 Sponsors Section */}
        <section className="mb-24">
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

        {/* Partners Section */}
        <section className="mb-24 bg-white p-12 rounded-2xl border border-tan/10 shadow-sm">
          <h2 className="text-3xl font-bold mb-8 text-center">Partners in Historic Preservation</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
            {partners.map((partner, index) => (
              <div key={index} className="flex flex-col space-y-1">
                <h4 className="font-bold text-lg leading-tight">{partner.name}</h4>
                <a href={partner.url} target="_blank" rel="noopener noreferrer" className="text-tan font-sans text-sm hover:underline break-all">
                  {partner.url.replace('http://', '').replace('https://', '')}
                </a>
              </div>
            ))}
          </div>
        </section>

        {/* Other Support Section */}
        <section className="text-center">
          <h2 className="text-3xl font-bold mb-8">Join Our Community</h2>
          <p className="text-lg font-sans text-charcoal/70 mb-10 max-w-2xl mx-auto">
            Whether as a sponsor, member, or donor, your contribution makes a difference in preserving Senoia's unique history for future generations.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-6">
            <a href="/support-sahs" className="bg-tan text-white px-10 py-4 rounded-md font-sans font-bold uppercase tracking-widest hover:bg-tan-dark transition-colors shadow-sm">
              Ways to Give
            </a>
            <a href="/sponsor-application-form" className="border-2 border-tan text-tan px-10 py-4 rounded-md font-sans font-bold uppercase tracking-widest hover:bg-tan/5 transition-colors">
              Become a Sponsor
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
