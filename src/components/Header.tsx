import { Link } from 'react-router-dom';

export default function Header() {
  return (
    <header className="bg-cream border-b border-tan-light sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          <div className="flex-shrink-0 flex items-center">
            <Link to="/" className="text-3xl font-serif font-bold text-charcoal tracking-tight">
              SAHS
            </Link>
          </div>
          <nav className="hidden md:flex space-x-8">
            <Link to="/about-sahs" className="text-charcoal hover:text-tan transition-colors px-3 py-2 text-sm font-medium uppercase tracking-wider">About</Link>
            <Link to="/news" className="text-charcoal hover:text-tan transition-colors px-3 py-2 text-sm font-medium uppercase tracking-wider">News</Link>
            <Link to="/box-office" className="text-charcoal hover:text-tan transition-colors px-3 py-2 text-sm font-bold text-tan uppercase tracking-wider">Box Office</Link>
            <Link to="/past-sahs-events" className="text-charcoal hover:text-tan transition-colors px-3 py-2 text-sm font-medium uppercase tracking-wider">Events</Link>
            <Link to="/support-sahs" className="text-charcoal hover:text-tan transition-colors px-3 py-2 text-sm font-medium uppercase tracking-wider">Support</Link>
            <Link to="/historic-structures-and-places" className="text-charcoal hover:text-tan transition-colors px-3 py-2 text-sm font-medium uppercase tracking-wider">Places</Link>
            <Link to="/media" className="text-charcoal hover:text-tan transition-colors px-3 py-2 text-sm font-medium uppercase tracking-wider">Media</Link>
            <a href="https://archives.senoiahistory.com" target="_blank" rel="noopener noreferrer" className="text-tan-dark hover:text-tan transition-colors px-3 py-2 text-sm font-bold uppercase tracking-wider border border-tan/30 rounded-md">Archives</a>
            <Link to="/contact-sahs" className="text-charcoal hover:text-tan transition-colors px-3 py-2 text-sm font-medium uppercase tracking-wider">Contact</Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
