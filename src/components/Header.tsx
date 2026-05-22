import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, Menu, X } from 'lucide-react';

export default function Header() {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  return (
    <header className="glass-nav shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          <div className="flex-shrink-0 flex items-center">
            <Link to="/" className="text-3xl font-serif font-bold text-charcoal tracking-tight hover:text-tan transition-colors">
              SAHS
            </Link>
          </div>

          {/* Desktop Navigation */}
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

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="text-charcoal p-2 hover:bg-tan/10 rounded-md transition-colors"
              aria-label="Open menu"
            >
              <Menu size={28} />
            </button>
          </div>
        </div>
      </div>

      {/* Premium Mobile Drawer */}
      <div className={`md:hidden ${isMobileMenuOpen ? 'drawer-open' : 'drawer-closed'}`}>
        <div 
          className="mobile-drawer-overlay" 
          onClick={() => setIsMobileMenuOpen(false)}
        />
        <div className="mobile-drawer-content">
          <div className="flex justify-between items-center mb-8">
            <span className="text-2xl font-serif font-bold text-charcoal">Menu</span>
            <button 
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2 hover:bg-tan/10 rounded-full transition-colors text-charcoal"
            >
              <X size={24} />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto space-y-6">
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-widest text-tan/60 px-2">Visit</h3>
              <div className="space-y-1">
                <Link to="/about-sahs" className="block px-4 py-3 text-lg text-charcoal hover:bg-tan/5 rounded-lg transition-colors">About the Society</Link>
                <Link to="/location-and-hours" className="block px-4 py-3 text-lg text-charcoal hover:bg-tan/5 rounded-lg transition-colors">Location & Hours</Link>
                <Link to="/meeting-room" className="block px-4 py-3 text-lg font-bold text-tan-dark hover:bg-tan/5 rounded-lg transition-colors">Meeting Room Booking</Link>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-widest text-tan/60 px-2">Events & News</h3>
              <Link to="/news" className="block px-4 py-3 text-lg text-charcoal hover:bg-tan/5 rounded-lg transition-colors">Latest Updates</Link>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-widest text-tan/60 px-2">Support</h3>
              <div className="space-y-1">
                <Link to="/support-sahs" className="block px-4 py-3 text-lg text-charcoal hover:bg-tan/5 rounded-lg transition-colors">Membership & Donations</Link>
                <a href="https://billing.stripe.com/p/login/3cscOSe99bt8bvi000" target="_blank" rel="noopener noreferrer" className="block px-4 py-3 text-lg text-charcoal hover:bg-tan/5 rounded-lg transition-colors">Manage Membership</a>
                <Link to="/supporters" className="block px-4 py-3 text-lg text-charcoal hover:bg-tan/5 rounded-lg transition-colors">Our Supporters</Link>
              </div>
            </div>

            <div className="pt-6 space-y-4">
              <a 
                href="https://archives.senoiahistory.com" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="block w-full text-center py-4 bg-tan text-white rounded-xl font-bold shadow-lg shadow-tan/20 hover:bg-tan-dark transition-all transform active:scale-95"
              >
                Browse Digital Archives
              </a>
              <Link 
                to="/contact-sahs" 
                className="block w-full text-center py-4 border-2 border-tan/20 text-charcoal rounded-xl font-semibold hover:bg-tan/5 transition-colors"
              >
                Contact Us
              </Link>
            </div>
          </nav>
          
          <div className="mt-auto pt-8 border-t border-tan/10 text-center">
            <p className="text-sm text-charcoal/40 font-serif italic">Preserving Senoia's History Since 1977</p>
          </div>
        </div>
      </div>
    </header>
  );
}
