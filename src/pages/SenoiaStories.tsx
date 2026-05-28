import { Heart, Mic, HelpCircle, ArrowRight, Share2, Award, Mail } from 'lucide-react';
import logoImg from '../assets/senoia-stories-logo.png';

export default function SenoiaStories() {
  return (
    <div className="bg-cream min-h-screen pt-24 pb-20 px-4 md:px-6 lg:px-8 font-serif text-charcoal">
      <div className="max-w-6xl mx-auto">
        
        {/* Banner Heritage Hero */}
        <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-tan-light/40 via-beige to-cream border border-tan/20 p-8 md:p-12 lg:p-16 mb-16 shadow-xl">
          <div className="absolute inset-0 bg-[radial-gradient(#8b7355_1px,transparent_1px)] [background-size:16px_16px] opacity-10" />
          
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12 items-center">
            {/* Logo Column */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="relative group bg-white p-4 md:p-6 rounded-2xl shadow-md border border-tan/15 hover:shadow-xl transition-all duration-300 transform hover:-rotate-1">
                {/* Vintage photo corners decoration */}
                <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-tan/30" />
                <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-tan/30" />
                <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-tan/30" />
                <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-tan/30" />
                
                <img 
                  src={logoImg} 
                  alt="Senoia Stories Logo" 
                  className="w-64 h-64 md:w-80 md:h-80 object-contain rounded-xl select-none"
                />
              </div>
            </div>
            
            {/* Content Column */}
            <div className="lg:col-span-7 text-center lg:text-left">
              <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-tan/10 text-tan font-sans text-xs font-bold uppercase tracking-widest mb-6">
                <Mic size={12} className="animate-pulse" /> Oral History Initiative
              </span>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-3 text-charcoal">
                Senoia Stories
              </h1>
              
              <p className="text-2xl md:text-3xl italic text-tan font-sans font-light tracking-wide mb-6">
                Preserving Senoia's Voice
              </p>
              
              <div className="w-20 h-1 bg-tan mx-auto lg:mx-0 mb-6 rounded-full" />
              
              <p className="text-lg md:text-xl leading-relaxed font-sans text-charcoal/80">
                Every town has a voice, and every resident has a story. <strong className="font-bold text-charcoal">Senoia Stories</strong> is a new oral history project by the Senoia Area Historical Society dedicated to capturing, preserving, and sharing the voices, memories, and lived experiences of the Senoia community.
              </p>
            </div>
          </div>
        </header>

        {/* Dynamic Badge Showcase */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
          
          {/* Card 1: Tell Your Story */}
          <div className="bg-white p-8 md:p-10 rounded-2xl border border-tan/10 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 flex flex-col justify-between group">
            <div>
              <div className="w-12 h-12 rounded-xl bg-tan/10 flex items-center justify-center text-tan mb-6 group-hover:scale-110 transition-transform">
                <Mic size={24} />
              </div>
              <h2 className="text-3xl font-bold mb-4 group-hover:text-tan transition-colors">
                Tell your Senoia story!
              </h2>
              <p className="text-base md:text-lg leading-relaxed font-sans text-charcoal/80 mb-6">
                Are you a lifelong resident, or did you make Senoia your home later in life? Do you have memories of the historic district, local schools, generations of family life, farming, or the town's growth? We invite you to sit down with us, record your story, and become an official part of our archives.
              </p>
            </div>
            <a 
              href="https://forms.gle/vLX73FBXiSPJqutK8"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-tan font-sans font-bold uppercase tracking-widest hover:text-tan-dark transition-colors self-start mt-4"
            >
              Fill Out an Interview Application <ArrowRight size={16} />
            </a>
          </div>

          {/* Card 2: Preserve History */}
          <div className="bg-white p-8 md:p-10 rounded-2xl border border-tan/10 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 flex flex-col justify-between group">
            <div>
              <div className="w-12 h-12 rounded-xl bg-tan/10 flex items-center justify-center text-tan mb-6 group-hover:scale-110 transition-transform">
                <Award size={24} />
              </div>
              <h2 className="text-3xl font-bold mb-4 group-hover:text-tan transition-colors">
                Preserve our town's history!
              </h2>
              <p className="text-base md:text-lg leading-relaxed font-sans text-charcoal/80 mb-6">
                History is more than just dates in a textbook—it's the laughter, the struggles, the wisdom, and the daily lives of the people who built our town. By recording these voices now, we preserve our community's living legacy for children, grandchildren, and future historians.
              </p>
            </div>
            <a 
              href="/about-sahs"
              className="inline-flex items-center gap-2 text-tan font-sans font-bold uppercase tracking-widest hover:text-tan-dark transition-colors self-start mt-4"
            >
              About the Society <ArrowRight size={16} />
            </a>
          </div>

        </section>

        {/* Pillars / Call to Action Details */}
        <section className="bg-beige/50 border border-tan/20 rounded-3xl p-8 md:p-12 mb-20">
          <h2 className="text-3xl md:text-4xl font-bold mb-12 text-center text-charcoal">
            How Your Support Makes a Difference
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Pillar 1 */}
            <div className="bg-white p-8 rounded-xl border border-tan/10 shadow-sm flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-tan/5 text-tan flex items-center justify-center mb-6">
                <Heart size={28} />
              </div>
              <h3 className="text-xl font-bold mb-3">Fund Recordings & Archives</h3>
              <p className="text-sm font-sans text-charcoal/70 leading-relaxed">
                Your donations help us buy professional-grade audio gear, digitizing software, and secure server storage to ensure files remain safe for generations.
              </p>
            </div>

            {/* Pillar 2 */}
            <div className="bg-white p-8 rounded-xl border border-tan/10 shadow-sm flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-tan/5 text-tan flex items-center justify-center mb-6">
                <HelpCircle size={28} />
              </div>
              <h3 className="text-xl font-bold mb-3">Sponsor Gear & Events</h3>
              <p className="text-sm font-sans text-charcoal/70 leading-relaxed">
                Become a sponsor to fund mobile recording boots, community listening workshops, and historical preservation forums across Coweta County.
              </p>
            </div>

            {/* Pillar 3 */}
            <div className="bg-white p-8 rounded-xl border border-tan/10 shadow-sm flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-tan/5 text-tan flex items-center justify-center mb-6">
                <Share2 size={28} />
              </div>
              <h3 className="text-xl font-bold mb-3">Share Stories & Photos</h3>
              <p className="text-sm font-sans text-charcoal/70 leading-relaxed">
                Lend us historical photographs, letters, or diaries related to Coweta County so we can scan and incorporate them into our living audio timeline.
              </p>
            </div>

          </div>
        </section>

        {/* Premium Call to Action Banner (Donate Now) */}
        <section className="bg-charcoal text-white rounded-3xl overflow-hidden relative shadow-2xl mb-16">
          <div className="absolute inset-0 bg-[radial-gradient(#8b7355_1.5px,transparent_1.5px)] [background-size:24px_24px] opacity-10" />
          
          <div className="relative z-10 px-8 py-16 md:p-20 text-center max-w-4xl mx-auto flex flex-col items-center">
            
            {/* Stamp styling */}
            <span className="inline-block px-6 py-2 border-2 border-dashed border-red-500 text-red-500 rounded-lg text-lg uppercase tracking-widest font-sans font-bold transform -rotate-3 mb-8 shadow-sm">
              Donate Now
            </span>
            
            <h2 className="text-3xl md:text-5xl font-bold mb-6 font-serif">
              We are calling on your support!
            </h2>
            
            <p className="text-lg md:text-xl font-sans text-white/80 leading-relaxed mb-10 max-w-2xl">
              This oral history project is entirely community-driven and relies on your generous funding to pay for essential recording setups, hosting platforms, and archiving tools. Help us capture our heritage before it fades.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center w-full max-w-md">
              <a 
                href="https://donate.stripe.com/aEU1602kYegp3UQfZ0"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 bg-tan text-white font-sans font-bold uppercase tracking-widest px-8 py-4 rounded-lg hover:bg-tan-dark active:scale-95 transition-all shadow-lg shadow-tan/20 text-base"
              >
                <Heart size={18} fill="currentColor" /> Donate to Project
              </a>
              
              <a 
                href="mailto:catnolan@senoiahistory.com?subject=Sponsoring%20Senoia%20Stories"
                className="inline-flex items-center justify-center gap-2 border-2 border-white/20 text-white font-sans font-bold uppercase tracking-widest px-8 py-4 rounded-lg hover:bg-white/10 active:scale-95 transition-all text-base"
              >
                <Mail size={18} /> Contact Sponsorship
              </a>
            </div>
            
            <p className="text-xs text-white/50 font-sans mt-6">
              The Senoia Area Historical Society is a 501(c)(3) non-profit organization. Your contributions are fully tax-deductible.
            </p>

          </div>
        </section>

        {/* Footer Details / Address */}
        <footer className="text-center text-charcoal/50 text-sm font-sans pt-8 border-t border-tan/20">
          <p className="font-bold mb-1">Senoia Area Historical Society</p>
          <p className="mb-2">6 Couch Street, Senoia, GA 30276</p>
          <p>© {new Date().getFullYear()} Senoia Area Historical Society. All rights reserved.</p>
        </footer>

      </div>
    </div>
  );
}
