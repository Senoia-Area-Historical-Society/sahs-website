import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';

export default function Header() {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  return (
    <header className="bg-cream border-b border-tan-light sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          <div className="flex-shrink-0 flex items-center">
            <Link to="/" className="text-3xl font-serif font-bold text-charcoal tracking-tight">
              SAHS
            </Link>
          </div>
          <nav className="hidden md:flex space-x-4 lg:space-x-8 h-full items-center">
            {/* Visit Dropdown */}
            <div 
              className="relative h-full flex items-center"
              onMouseEnter={() => setActiveDropdown('visit')}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <button className="flex items-center gap-1 text-charcoal hover:text-tan transition-colors px-3 py-2 text-sm font-medium uppercase tracking-wider">
                Visit <ChevronDown size={14} className={`transition-transform duration-200 ${activeDropdown === 'visit' ? 'rotate-180' : ''}`} />
              </button>
              {activeDropdown === 'visit' && (
                <div className="absolute top-full left-0 w-56 bg-white border border-tan/20 shadow-xl rounded-b-md py-2 z-50 animate-in fade-in slide-in-from-top-1 duration-200">
                  <Link to="/about-sahs" className="block px-6 py-3 text-sm text-charcoal hover:bg-cream hover:text-tan transition-all">About the Society</Link>
                  <Link to="/location-and-hours" className="block px-6 py-3 text-sm text-charcoal hover:bg-cream hover:text-tan transition-all">Location & Hours</Link>
                  <Link to="/meeting-room" className="block px-6 py-3 text-sm text-charcoal hover:bg-cream hover:text-tan font-bold">Meeting Room Booking</Link>
                </div>
              )}
            </div>

            <Link to="/news" className="text-charcoal hover:text-tan transition-colors px-3 py-2 text-sm font-medium uppercase tracking-wider">Events</Link>

            {/* Support Dropdown */}
            <div 
              className="relative h-full flex items-center"
              onMouseEnter={() => setActiveDropdown('support')}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <button className="flex items-center gap-1 text-charcoal hover:text-tan transition-colors px-3 py-2 text-sm font-medium uppercase tracking-wider">
                Support <ChevronDown size={14} className={`transition-transform duration-200 ${activeDropdown === 'support' ? 'rotate-180' : ''}`} />
              </button>
              {activeDropdown === 'support' && (
                <div className="absolute top-full left-0 w-64 bg-white border border-tan/20 shadow-xl rounded-b-md py-2 z-50 animate-in fade-in slide-in-from-top-1 duration-200">
                  <Link to="/support-sahs" className="block px-6 py-3 text-sm text-charcoal hover:bg-cream hover:text-tan transition-all">Become a Member / Donate</Link>
                  <a href="https://billing.stripe.com/p/login/3cscOSe99bt8bvi000" target="_blank" rel="noopener noreferrer" className="block px-6 py-3 text-sm text-charcoal hover:bg-cream hover:text-tan transition-all">Manage Membership</a>
                  <Link to="/supporters" className="block px-6 py-3 text-sm text-charcoal hover:bg-cream hover:text-tan transition-all">Our Supporters</Link>
                </div>
              )}
            </div>

            <a href="https://archives.senoiahistory.com" target="_blank" rel="noopener noreferrer" className="text-tan-dark hover:text-tan transition-colors px-3 py-2 text-sm font-bold uppercase tracking-wider border border-tan/30 rounded-md bg-tan/5">Archives</a>
            
            <Link to="/contact-sahs" className="text-charcoal hover:text-tan transition-colors px-3 py-2 text-sm font-medium uppercase tracking-wider">Contact</Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
