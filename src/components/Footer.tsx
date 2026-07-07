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

        </div>
        
        <div>
          <h4 className="text-lg font-bold mb-6 font-sans tracking-wider uppercase text-tan-light">Resources</h4>
          <ul className="space-y-3 text-sm font-sans text-beige">
            <li><Link to="/location-and-hours" className="hover:text-white transition-colors">Location & Hours</Link></li>
            <li><Link to="/meeting-room" className="hover:text-white transition-colors">Meeting Room Booking</Link></li>
            <li><Link to="/past-sahs-events" className="hover:text-white transition-colors">Past Events Archive</Link></li>
            <li><a href="https://archives.senoiahistory.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Digital Archives</a></li>
            <li><Link to="/supporters" className="hover:text-white transition-colors">Our Supporters</Link></li>
          </ul>
        </div>
        
        <div>
          <h4 className="text-lg font-bold mb-6 font-sans tracking-wider uppercase text-tan-light">Stay Connected</h4>
          <ul className="space-y-4 text-sm font-sans text-beige mb-8">
            <li>
              <a href="https://www.facebook.com/people/Senoia-Area-Historical-Society/100064525936225/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 hover:text-white transition-colors group">
                <span className="bg-charcoal-light p-2 rounded-full group-hover:bg-tan transition-colors">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/></svg>
                </span>
                Facebook
              </a>
            </li>
            <li>
              <a href="https://www.instagram.com/senoiahistory/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 hover:text-white transition-colors group">
                <span className="bg-charcoal-light p-2 rounded-full group-hover:bg-tan transition-colors">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5" ry="5" fill="none" stroke="currentColor" strokeWidth="2"/><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" fill="none" stroke="currentColor" strokeWidth="2"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                </span>
                Instagram
              </a>
            </li>
            <li>
              <a href="https://www.youtube.com/@SenoiaAreaHistoricalSociety" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 hover:text-white transition-colors group">
                <span className="bg-charcoal-light p-2 rounded-full group-hover:bg-tan transition-colors">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M22.54 6.42a2.78 2.78 0 00-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 00-1.95 1.96A29 29 0 001 12a29 29 0 00.46 5.58A2.78 2.78 0 003.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 001.95-1.95A29 29 0 0023 12a29 29 0 00-.46-5.58z"/><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="white"/></svg>
                </span>
                YouTube
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
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16 pt-8 border-t border-charcoal-light flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-tan-light font-sans">
        <p>&copy; {new Date().getFullYear()} Senoia Area Historical Society. A 501(c)(3) Organization.</p>
        <Link to="/admin/login" className="hover:text-white transition-colors">Staff Login</Link>
      </div>
    </footer>
  );
}
