import { useEffect, useState } from 'react';
import { getCorporateSponsors, submitMembershipRequest } from '../services/api';
import type { OrganizationEntity } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { CreditCard, Users, Plus, Minus, Loader2 } from 'lucide-react';

const MEMBERSHIP_LEVELS = [
  { id: 'senior', name: 'Senior (65+)', price: 25, description: 'Individual membership for those 65 and older.' },
  { id: 'individual', name: 'Individual', price: 35, description: 'Standard annual membership for one person.' },
  { id: 'family', name: 'Family', price: 50, description: 'Annual membership for a household.' },
  { id: 'patron', name: 'Patron', price: 100, description: 'Enhanced support for society programs.' },
];

export default function Support() {
  const { user } = useAuth();
  const [sponsors, setSponsors] = useState<OrganizationEntity[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedLevel, setSelectedLevel] = useState(MEMBERSHIP_LEVELS[1]);
  const [quantity, setQuantity] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    async function loadSponsors() {
      try {
        const data = await getCorporateSponsors();
        setSponsors(data);
      } catch (err) {
        console.error("Failed to load sponsors", err);
      } finally {
        setLoading(false);
      }
    }
    loadSponsors();
  }, []);

  const handleJoin = async () => {
    setIsProcessing(true);
    try {
      const email = user?.email || prompt("Please enter your email address for the membership record:");
      if (!email) {
        setIsProcessing(false);
        return;
      }

      const { url } = await submitMembershipRequest({
        email,
        level: selectedLevel.id,
        quantity,
        userId: user?.uid
      });

      window.location.href = url;
    } catch (err) {
      console.error("Join error:", err);
      alert("There was an error starting the checkout process. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-cream min-h-screen pt-24 pb-16 px-4 md:px-6 lg:px-8 font-serif text-charcoal">
      <div className="max-w-7xl mx-auto">
        <header className="mb-16 border-b border-tan pb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Support SAHS</h1>
          <p className="text-xl text-charcoal/80 max-w-2xl font-sans">
            Help us preserve the history and heritage of Senoia. There are many ways to get involved and support our mission.
          </p>
        </header>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-20">
          <div className="bg-white p-8 rounded-lg border border-tan/20 shadow-sm flex flex-col">
            <h2 className="text-3xl font-bold mb-6 text-tan">Become a Member</h2>
            <p className="text-lg font-sans text-charcoal/90 mb-8">
              Join a community of history enthusiasts. Members receive our newsletter, early access to events, and the satisfaction of supporting local preservation.
            </p>
            
            <div className="flex-grow space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {MEMBERSHIP_LEVELS.map((level) => (
                  <button
                    key={level.id}
                    onClick={() => setSelectedLevel(level)}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      selectedLevel.id === level.id 
                        ? 'border-tan bg-tan/5' 
                        : 'border-tan/10 hover:border-tan/30'
                    }`}
                  >
                    <div className="font-bold text-lg">${level.price}</div>
                    <div className="text-sm font-sans font-bold uppercase tracking-wider text-tan">{level.name}</div>
                  </button>
                ))}
              </div>

              <div className="bg-cream/30 p-4 rounded-lg border border-tan/10">
                <p className="text-sm font-sans text-charcoal/70 mb-4 italic">{selectedLevel.description}</p>
                
                <div className="flex items-center justify-between">
                  <div className="text-sm font-sans font-bold uppercase tracking-widest text-charcoal/60">Quantity</div>
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="p-1 rounded-full hover:bg-tan/10 text-tan transition-colors"
                    >
                      <Minus size={20} />
                    </button>
                    <span className="font-bold text-xl w-8 text-center">{quantity}</span>
                    <button 
                      onClick={() => setQuantity(quantity + 1)}
                      className="p-1 rounded-full hover:bg-tan/10 text-tan transition-colors"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <button 
                onClick={handleJoin}
                disabled={isProcessing}
                className="w-full bg-tan text-white px-6 py-4 rounded-md uppercase tracking-widest font-bold hover:bg-tan-dark transition-all shadow-sm flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <>
                    <Users size={20} />
                    Join Now — ${selectedLevel.price * quantity}
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="bg-white p-8 rounded-lg border border-tan/20 shadow-sm flex flex-col">
            <h2 className="text-3xl font-bold mb-6 text-tan">Make a Donation</h2>
            <p className="text-lg font-sans text-charcoal/90 mb-8">
              Your financial contributions directly support our museum operations, preservation projects, and community programs. Every gift helps us keep Senoia's history alive.
            </p>
            <div className="mt-auto space-y-4">
              <button 
                className="w-full border-2 border-tan text-tan px-6 py-4 rounded-md uppercase tracking-widest font-bold hover:bg-tan/5 transition-colors flex items-center justify-center gap-2"
                onClick={() => alert("General donation flow coming soon. Please use membership levels for now.")}
              >
                <CreditCard size={20} />
                Donate via Stripe
              </button>
              <p className="text-sm text-charcoal/60 font-sans text-center mt-4">
                The Senoia Area Historical Society is a 501(c)(3) non-profit organization.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-3xl font-bold mb-12 text-center">Our Corporate Sponsors</h2>
          
          {loading ? (
             <div className="flex justify-center py-12">
               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tan"></div>
             </div>
          ) : sponsors.length === 0 ? (
            <p className="text-center italic text-charcoal/60 font-sans">Our current sponsors will be listed here soon.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
              {sponsors.map(sponsor => (
                <div key={sponsor.id} className="bg-white p-6 rounded-lg border border-tan/10 shadow-sm flex flex-col items-center justify-center transition-transform hover:scale-105">
                  {sponsor.image ? (
                    <img src={sponsor.image} alt={sponsor.name} className="max-h-24 w-auto object-contain mb-4 filter grayscale hover:grayscale-0 transition-all" />
                  ) : (
                    <h4 className="text-lg font-bold text-center">{sponsor.name}</h4>
                  )}
                </div>
              ))}
            </div>
          )}
          
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
