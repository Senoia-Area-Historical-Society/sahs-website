import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-charcoal text-cream mt-auto py-16 border-t-8 border-tan">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-12">
        <div className="md:col-span-2">
          <h3 className="text-2xl font-serif mb-4 flex items-center gap-2">
            Senoia Area Historical Society
          </h3>
          <p className="text-beige text-base leading-relaxed max-w-md mb-8">
            Dedicated to securing, preserving, and promoting the social and cultural history of Senoia, Georgia, and the surrounding community.
          </p>
          <div className="space-y-4">
             <h4 className="text-sm font-bold uppercase tracking-widest text-tan-light">Join Our Newsletter</h4>
             <form className="flex max-w-md" onSubmit={(e) => e.preventDefault()}>
               <input 
                 type="email" 
                 placeholder="Email Address" 
                 className="flex-grow bg-charcoal-light border border-tan/20 rounded-l-md px-4 py-2 text-sm text-cream placeholder:text-beige/40 focus:outline-none focus:border-tan transition-colors"
                />
               <button className="bg-tan text-white px-6 py-2 rounded-r-md text-sm font-bold uppercase tracking-widest hover:bg-tan-dark transition-colors">
                 Join
               </button>
             </form>
          </div>
        </div>
        
        <div>
          <h4 className="text-lg font-bold mb-6 font-sans tracking-wider uppercase text-tan-light">Resources</h4>
          <ul className="space-y-3 text-sm font-sans text-beige">
            <li><Link to="/location-and-hours" className="hover:text-white transition-colors">Location & Hours</Link></li>
            <li><Link to="/carmichael-house" className="hover:text-white transition-colors">The Carmichael House</Link></li>
            <li><Link to="/museum" className="hover:text-white transition-colors">SAHS Museum</Link></li>
            <li><Link to="/meeting-room" className="hover:text-white transition-colors">Meeting Room Booking</Link></li>
            <li><Link to="/past-sahs-events" className="hover:text-white transition-colors">Past Events Archive</Link></li>
            <li><Link to="/supporters" className="hover:text-white transition-colors">Our Supporters</Link></li>
          </ul>
        </div>
        
        <div>
          <h4 className="text-lg font-bold mb-6 font-sans tracking-wider uppercase text-tan-light">Stay Connected</h4>
          <ul className="space-y-4 text-sm font-sans text-beige mb-8">
            <li>
              <a href="https://www.facebook.com/SenoiaAreaHistoricalSociety" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 hover:text-white transition-colors group">
                <span className="bg-charcoal-light p-2 rounded-full group-hover:bg-tan transition-colors">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/></svg>
                </span>
                Facebook
              </a>
            </li>
            <li>
              <Link to="/contact-sahs" className="flex items-center gap-3 hover:text-white transition-colors group">
                <span className="bg-charcoal-light p-2 rounded-full group-hover:bg-tan transition-colors">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><path d="M22 6l-10 7L2 6"/></svg>
                </span>
                Email Us
              </Link>
            </li>
          </ul>
          <h4 className="text-xs font-bold mb-4 font-sans tracking-wider uppercase text-tan-light">Legal</h4>
          <ul className="space-y-2 text-sm font-sans text-beige">
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
