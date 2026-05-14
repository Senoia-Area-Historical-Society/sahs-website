import React, { useEffect } from 'react';
import { CreditCard } from 'lucide-react';
import SponsorsList from '../components/SponsorsList';

export default function Support() {
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://js.stripe.com/v3/pricing-table.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  return (
    <div className="bg-cream min-h-screen pt-24 pb-16 px-4 md:px-6 lg:px-8 font-serif text-charcoal">
      <div className="max-w-7xl mx-auto">
        <header className="mb-16 border-b border-tan pb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Support SAHS</h1>
          <p className="text-xl text-charcoal/80 max-w-2xl font-sans">
            Help us preserve the history and heritage of Senoia. There are many ways to get involved and support our mission.
          </p>
        </header>

        <section className="mb-20">
          <h2 className="text-3xl font-bold mb-6 text-tan text-center">Become a Member</h2>
          <p className="text-lg font-sans text-charcoal/90 mb-12 text-center max-w-3xl mx-auto">
            Join a community of history enthusiasts. Members receive our newsletter, early access to events, and the satisfaction of supporting local preservation.
          </p>

          <div className="mb-16">
            <h3 className="text-2xl font-bold mb-6 text-tan-dark text-center">Regular Memberships</h3>
            <div className="bg-white p-4 rounded-lg shadow-sm border border-tan/20">
              {React.createElement('stripe-pricing-table', {
                'pricing-table-id': 'prctbl_1TX1hCKzm1KE54P0XjSt12YW',
                'publishable-key': 'pk_live_51OgxLhKzm1KE54P08gXtFXRj2v2NPSiCcwYwHNuw1Pt2gHgQJZDQmdHQ8U5Lsg07N512qfWVphIasHbDWkzPTlFq000JHkvmnv'
              })}
            </div>
          </div>

          <div className="mb-16">
            <h3 className="text-2xl font-bold mb-6 text-tan-dark text-center">Patron & Corporate Memberships</h3>
            <div className="bg-white p-4 rounded-lg shadow-sm border border-tan/20">
              {React.createElement('stripe-pricing-table', {
                'pricing-table-id': 'prctbl_1R3OEzKzm1KE54P0n8airNok',
                'publishable-key': 'pk_live_51OgxLhKzm1KE54P08gXtFXRj2v2NPSiCcwYwHNuw1Pt2gHgQJZDQmdHQ8U5Lsg07N512qfWVphIasHbDWkzPTlFq000JHkvmnv'
              })}
            </div>
          </div>
        </section>

        <section className="max-w-3xl mx-auto mb-20">
          <div className="bg-white p-8 rounded-lg border border-tan/20 shadow-sm flex flex-col items-center text-center">
            <h2 className="text-3xl font-bold mb-6 text-tan">Make a Donation</h2>
            <p className="text-lg font-sans text-charcoal/90 mb-8">
              Your financial contributions directly support our museum operations, preservation projects, and community programs. Every gift helps us keep Senoia's history alive.
            </p>
            <div className="w-full max-w-md mt-auto space-y-4">
              <a 
                href="https://donate.stripe.com/aEU1602kYegp3UQfZ0"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full border-2 border-tan text-tan px-6 py-4 rounded-md uppercase tracking-widest font-bold hover:bg-tan/5 transition-colors flex items-center justify-center gap-2"
              >
                <CreditCard size={20} />
                Donate via Stripe
              </a>
              <p className="text-sm text-charcoal/60 font-sans text-center mt-4">
                The Senoia Area Historical Society is a 501(c)(3) non-profit organization.
              </p>
            </div>
          </div>
        </section>

        <section>
          <SponsorsList />
          <div className="mt-16 text-center">
             <p className="text-lg font-sans text-charcoal/70 mb-6">Interested in becoming a corporate sponsor?</p>
             <a 
               href="/sponsor-application-form" 
               className="inline-block border-b-2 border-tan pb-1 text-tan font-sans font-bold uppercase tracking-widest hover:text-tan-dark hover:border-tan-dark transition-colors"
             >
               Apply to Sponsor
             </a>
          </div>
        </section>
      </div>
    </div>
  );
}
