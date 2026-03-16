import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-charcoal text-cream mt-auto py-16 border-t-8 border-tan">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-12">
        <div className="md:col-span-2">
          <h3 className="text-2xl font-serif mb-4 flex items-center gap-2">
            Senoia Area Historical Society
          </h3>
          <p className="text-beige text-base leading-relaxed max-w-md">
            Dedicated to securing, preserving, and promoting the social and cultural history of Senoia, Georgia, and the surrounding community.
          </p>
        </div>
        
        <div>
          <h4 className="text-lg font-bold mb-6 font-sans tracking-wider uppercase text-tan-light">Visit Us</h4>
          <ul className="space-y-3 text-sm font-sans text-beige">
            <li><Link to="/location-and-hours" className="hover:text-white transition-colors">Location & Hours</Link></li>
            <li><Link to="/carmichael-house" className="hover:text-white transition-colors">The Carmichael House</Link></li>
            <li><Link to="/contact-sahs" className="hover:text-white transition-colors">Contact Us</Link></li>
          </ul>
        </div>
        
        <div>
          <h4 className="text-lg font-bold mb-6 font-sans tracking-wider uppercase text-tan-light">Legal</h4>
          <ul className="space-y-3 text-sm font-sans text-beige">
            <li><Link to="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
          </ul>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16 pt-8 border-t border-charcoal-light flex flex-col md:flex-row justify-between items-center text-sm text-tan-light font-sans">
        <p>&copy; {new Date().getFullYear()} Senoia Area Historical Society. A 501(c)(3) Organization.</p>
      </div>
    </footer>
  );
}
