import { useEffect, useState } from 'react';
import { getBoardMembers } from '../services/api';
import type { OrganizationEntity } from '../types';
import museumExteriorImg from '../assets/museum-exterior.jpg';
import { BookOpen, Shield, Search, Home, Users, Briefcase, Calendar, Star, MapPin, Clock } from 'lucide-react';

export default function About() {
  const [board, setBoard] = useState<OrganizationEntity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadBoard() {
      try {
        const data = await getBoardMembers();
        setBoard(data);
      } catch (err) {
        console.error("Failed to load board members", err);
      } finally {
        setLoading(false);
      }
    }
    loadBoard();
  }, []);

  return (
    <div className="bg-cream min-h-screen pt-24 pb-16 px-4 md:px-6 lg:px-8 font-serif text-charcoal">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold mb-8 border-b border-tan pb-4 text-center">About the Society</h1>

        {/* Museum Exterior Image Banner */}
        <div className="mb-12 overflow-hidden rounded-2xl border border-tan/20 shadow-xl relative group">
          <img 
            src={museumExteriorImg} 
            alt="Senoia History Museum" 
            className="w-full h-[300px] md:h-[400px] object-cover group-hover:scale-105 transition-transform duration-700 select-none"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-charcoal/50 via-transparent to-transparent pointer-events-none" />
          <div className="absolute bottom-4 left-6 text-white text-lg font-sans font-semibold tracking-wide drop-shadow-md">
            Senoia Area Historical Society Museum — 6 Couch Street
          </div>
        </div>

        {/* Mission Statement Redesign */}
        <section className="mb-20">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <h3 className="text-3xl font-bold mb-4 text-tan">Our Mission</h3>
            <p className="text-xl italic font-sans text-charcoal/85 leading-relaxed mb-6">
              "To secure, preserve, and promote the social and cultural history of the community."
            </p>
            <p className="text-lg leading-relaxed font-sans text-charcoal/90 max-w-2xl mx-auto mb-8">
              The Senoia Area Historical Society’s mission is to secure, preserve, and promote the social and cultural history of the community. To this end we will: educate and engage a diverse public through a variety of programs, maintain our museum buildings, properties, and collections, acquire and reserve additional items of significant relevance; research and publish historic records; identify and encourage preservation of significant places and structures throughout the community; work collaboratively with public, private and other non-profit organizations to attain this mission; and manage the society openly, ethically and professionally.
            </p>
            <div className="w-16 h-0.5 bg-tan mx-auto" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl border border-tan/10 shadow-sm hover:shadow-md transition-all">
              <div className="w-10 h-10 rounded-lg bg-tan/10 flex items-center justify-center text-tan mb-4">
                <BookOpen size={20} />
              </div>
              <h4 className="font-bold text-lg mb-2">Educate & Engage</h4>
              <p className="text-sm font-sans text-charcoal/70 leading-relaxed">
                Educate and engage a diverse public through a variety of programs and historic records.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-tan/10 shadow-sm hover:shadow-md transition-all">
              <div className="w-10 h-10 rounded-lg bg-tan/10 flex items-center justify-center text-tan mb-4">
                <Shield size={20} />
              </div>
              <h4 className="font-bold text-lg mb-2">Preserve Collections</h4>
              <p className="text-sm font-sans text-charcoal/70 leading-relaxed">
                Maintain our historic museum buildings, properties, and treasured collections.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-tan/10 shadow-sm hover:shadow-md transition-all">
              <div className="w-10 h-10 rounded-lg bg-tan/10 flex items-center justify-center text-tan mb-4">
                <Search size={20} />
              </div>
              <h4 className="font-bold text-lg mb-2">Acquire & Research</h4>
              <p className="text-sm font-sans text-charcoal/70 leading-relaxed">
                Acquire additional items of relevance while researching and publishing historic records.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-tan/10 shadow-sm hover:shadow-md transition-all">
              <div className="w-10 h-10 rounded-lg bg-tan/10 flex items-center justify-center text-tan mb-4">
                <Home size={20} />
              </div>
              <h4 className="font-bold text-lg mb-2">Historic Preservation</h4>
              <p className="text-sm font-sans text-charcoal/70 leading-relaxed">
                Identify and encourage preservation of significant places and structures across Senoia.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-tan/10 shadow-sm hover:shadow-md transition-all">
              <div className="w-10 h-10 rounded-lg bg-tan/10 flex items-center justify-center text-tan mb-4">
                <Users size={20} />
              </div>
              <h4 className="font-bold text-lg mb-2">Community Alliance</h4>
              <p className="text-sm font-sans text-charcoal/70 leading-relaxed">
                Work collaboratively with public, private, and non-profit organizations to achieve our goals.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-tan/10 shadow-sm hover:shadow-md transition-all">
              <div className="w-10 h-10 rounded-lg bg-tan/10 flex items-center justify-center text-tan mb-4">
                <Briefcase size={20} />
              </div>
              <h4 className="font-bold text-lg mb-2">Ethical Stewardship</h4>
              <p className="text-sm font-sans text-charcoal/70 leading-relaxed">
                Manage the society openly, ethically, and professionally as stewards of heritage.
              </p>
            </div>
          </div>
        </section>

        {/* History Timeline */}
        <section className="mb-20">
          <h3 className="text-3xl font-bold mb-10 text-tan text-center md:text-left">Our History</h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            {/* Timeline Column */}
            <div className="lg:col-span-8 space-y-8 relative before:absolute before:inset-y-0 before:left-4 before:w-0.5 before:bg-tan/20">
              
              <div className="relative pl-10 group">
                <div className="absolute left-2.5 top-1.5 w-3.5 h-3.5 rounded-full bg-cream border-2 border-tan group-hover:bg-tan transition-colors" />
                <span className="font-sans font-bold text-tan text-lg">1976</span>
                <p className="text-base font-sans text-charcoal/80 leading-relaxed mt-1">
                  A group of townspeople plans the US Bicentennial celebration. The leftover operating budget of <strong>$55.89</strong> becomes seed money for the future society.
                </p>
              </div>

              <div className="relative pl-10 group">
                <div className="absolute left-2.5 top-1.5 w-3.5 h-3.5 rounded-full bg-cream border-2 border-tan group-hover:bg-tan transition-colors" />
                <span className="font-sans font-bold text-tan text-lg">1977 – 1980</span>
                <p className="text-base font-sans text-charcoal/80 leading-relaxed mt-1">
                  The Senoia Area Historical Society is officially founded in 1977 and incorporates as a non-profit in 1980.
                </p>
              </div>

              <div className="relative pl-10 group">
                <div className="absolute left-2.5 top-1.5 w-3.5 h-3.5 rounded-full bg-cream border-2 border-tan group-hover:bg-tan transition-colors" />
                <span className="font-sans font-bold text-tan text-lg">1989</span>
                <p className="text-base font-sans text-charcoal/80 leading-relaxed mt-1">
                  Charter members complete the extensive paperwork and legwork required to list Senoia's historic district on the <strong>National Register of Historic Places</strong>.
                </p>
              </div>

              <div className="relative pl-10 group">
                <div className="absolute left-2.5 top-1.5 w-3.5 h-3.5 rounded-full bg-cream border-2 border-tan group-hover:bg-tan transition-colors" />
                <span className="font-sans font-bold text-tan text-lg">1990 – 2010</span>
                <p className="text-base font-sans text-charcoal/80 leading-relaxed mt-1">
                  The society purchases the historic <strong>Carmichael Home</strong> at 6 Couch Street in 1990, officially opening it to the public as the Senoia History Museum in July 2010.
                </p>
              </div>

              <div className="relative pl-10 group">
                <div className="absolute left-2.5 top-1.5 w-3.5 h-3.5 rounded-full bg-cream border-2 border-tan group-hover:bg-tan transition-colors" />
                <span className="font-sans font-bold text-tan text-lg">2026</span>
                <p className="text-base font-sans text-charcoal/80 leading-relaxed mt-1">
                  The society officially launches its comprehensive <strong className="font-bold text-charcoal">SAHS Digital Archive</strong>, allowing researchers, members, and local historians to browse historical documents, family records, and photos from anywhere in the world.
                </p>
              </div>

            </div>

            {/* Princess portrait Column */}
            <div className="lg:col-span-4 flex flex-col items-center">
              <div className="bg-white p-4 rounded-xl shadow-md border border-tan/15 max-w-[280px]">
                <img 
                  src="https://uploads-ssl.webflow.com/64b1962bdd56b5834a570290/64b1962bdd56b5834a5702ea_princesssenoia.jpg" 
                  alt="Princess Senoia"
                  className="w-full h-auto rounded-lg shadow-inner select-none"
                />
                <div className="mt-3 text-center">
                  <span className="font-serif font-bold text-charcoal text-base">Princess Senoia</span>
                  <p className="text-xs font-sans text-charcoal/50 mt-0.5">Historical Icon & Namesake</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Get Involved Info Cards */}
        <section className="mb-20">
          <h3 className="text-3xl font-bold mb-8 text-tan text-center">Get Involved</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Card 1: Monthly Meetings */}
            <div className="bg-white p-8 rounded-2xl border border-tan/15 shadow-md flex flex-col justify-between group hover:shadow-lg transition-all duration-300">
              <div>
                <div className="w-12 h-12 rounded-xl bg-tan/10 flex items-center justify-center text-tan mb-6">
                  <Calendar size={24} />
                </div>
                <h4 className="text-2xl font-bold mb-4">Monthly Meetings</h4>
                <p className="text-base font-sans text-charcoal/80 leading-relaxed mb-6">
                  Join us at our headquarters for our monthly meetings, open to the public. We often host guest speakers, share local stories, and enjoy community fellowship.
                </p>
              </div>
              <div className="border-t border-tan/10 pt-4 flex flex-col gap-2 font-sans text-sm text-charcoal/70">
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-tan" /> <span>Second Thursday of every month at 7:00 PM</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin size={16} className="text-tan" /> <span>6 Couch Street, Senoia, GA</span>
                </div>
              </div>
            </div>

            {/* Card 2: Community Events */}
            <div className="bg-white p-8 rounded-2xl border border-tan/15 shadow-md flex flex-col justify-between group hover:shadow-lg transition-all duration-300">
              <div>
                <div className="w-12 h-12 rounded-xl bg-tan/10 flex items-center justify-center text-tan mb-6">
                  <Star size={24} />
                </div>
                <h4 className="text-2xl font-bold mb-4">Community & Fundraising</h4>
                <p className="text-base font-sans text-charcoal/80 leading-relaxed mb-6">
                  Our fundraising events are lively community affairs that capture the society’s unique spirit. From our annual Barn Dance to the Auction, the year is full of fun, connection, and historical preservation.
                </p>
              </div>
              <div className="border-t border-tan/10 pt-4 flex items-center gap-2 font-sans text-sm text-charcoal/70">
                <span className="font-semibold text-tan">Key Highlights:</span> Annual Auction, Bicentennial Fellowship, Barn Dance
              </div>
            </div>
          </div>
        </section>

        {/* Museum Details section */}
        <section className="mb-16 border-t border-tan/20 pt-16">
          <h3 className="text-3xl font-bold mb-8 text-tan text-center">Senoia Area History Museum</h3>
          <div className="prose prose-lg text-charcoal max-w-none font-sans">
            <p className="mb-4 leading-relaxed">
              Founding members first opened the museum’s doors to the community in July 2010. Every Saturday and Sunday between 1:00 pm and 4:00 pm, the public is invited to 6 Couch Street to explore our unique heritage. The museum is staffed by dedicated volunteers who generously share their time and talent to preserve the history and lore of the Senoia area.
            </p>
            <p className="mb-4 leading-relaxed">
              Often, visitors arrive to share their own personal stories, which then become a cherished part of the narrative we tell. It is a wonderful partnership between those who know our history and those who wish to discover it.
            </p>
            <p className="mb-6 leading-relaxed">
              The museum features five display rooms and a research library. Our collection is constantly evolving as we acquire new artifacts. Exhibits span centuries of local history—from the story of Creek Indian Chief William McIntosh in the early 1800s to a contemporary display featuring <em>The Walking Dead</em> television series. There is a wealth of history to discover between these milestones, and we invite you to experience it all firsthand.
            </p>

            {/* Highlight Card for Hours */}
            <div className="bg-beige/40 p-6 rounded-xl border border-tan/10 my-8 flex flex-col sm:flex-row gap-4 items-center animate-pulse-subtle">
              <div className="w-12 h-12 rounded-full bg-tan/10 text-tan flex items-center justify-center flex-shrink-0">
                <Clock size={24} />
              </div>
              <div className="text-center sm:text-left">
                <h4 className="font-bold text-charcoal text-lg mb-0.5">Explore Our Heritage</h4>
                <p className="text-sm text-charcoal/80 leading-relaxed mb-0">
                  Open every <strong>Saturday & Sunday</strong> from <strong>1:00 PM – 4:00 PM</strong> at <strong>6 Couch Street, Senoia, GA</strong>. Admission is free!
                </p>
              </div>
            </div>

            <h4 className="text-2xl font-bold text-charcoal mt-8 mb-4">Museum Staffing</h4>
            <p className="mb-4 leading-relaxed">
              The museum is operated by our Museum Director, <strong>Cat Nolan</strong>, along with friendly, passionate member volunteers. Any member with a love for Senoia’s history and culture will find the role of docent incredibly rewarding. Training is provided, and the time commitment is entirely at your discretion.
            </p>

            <h4 className="text-2xl font-bold text-charcoal mt-8 mb-4">Historical and Cultural Donations</h4>
            <p className="mb-4 leading-relaxed">
              The museum follows a formal Acquisition Policy to curate artifacts specifically from the Senoia area. If you are interested in donating historical or cultural assets, we invite you to stop by the museum on a Saturday or Sunday or contact us directly through our website.
            </p>
            
            <div id="donations-faq" className="bg-white p-8 rounded-xl border border-tan/20 mt-12 shadow-sm">
              <h3 className="text-2xl font-serif text-charcoal mb-6 border-b border-tan/20 pb-4">Frequently Asked Questions About Donations</h3>
              
              <h4 className="text-lg font-bold text-tan mt-6 mb-2">What kind of items does the museum accept?</h4>
              <p className="mb-4 leading-relaxed">
                We primarily collect artifacts, documents, and photographs that have a direct connection to the history, culture, and people of the <strong>Senoia area</strong>. This includes items from domestic life, local businesses, agriculture, and our more recent film history.
              </p>
              
              <h4 className="text-lg font-bold text-tan mt-6 mb-2">Can I just drop off an item at the front desk?</h4>
              <p className="mb-4 leading-relaxed">
                To ensure every item is properly documented and cared for, we ask that you <strong>do not leave items at the museum</strong> without speaking to a staff member. Please visit us during weekend hours or contact us through the website first so we can review the item against our current Acquisition Policy.
              </p>
              
              <h4 className="text-lg font-bold text-tan mt-6 mb-2">Does the museum accept "permanent loans"?</h4>
              <p className="mb-4 leading-relaxed">
                Generally, the museum only accepts <strong>outright gifts</strong>. This allows us to invest in the long-term preservation and display of the artifact. We rarely accept long-term loans due to insurance and storage complexities.
              </p>
              
              <h4 className="text-lg font-bold text-tan mt-6 mb-2">How is the "Historical Significance" determined?</h4>
              <p className="mb-4 leading-relaxed">
                Our acquisitions committee reviews items based on their condition, their connection to Senoia’s timeline, and whether we already have similar items in our collection.
              </p>
              
              <h4 className="text-lg font-bold text-tan mt-6 mb-2">Is my donation tax-deductible?</h4>
              <p className="mb-4 leading-relaxed">
                The Senoia Area Historical Society is a 501(c)(3) non-profit organization, and your donation may be tax-deductible. However, federal law prohibits museum staff from providing formal appraisals or determining the monetary value of a donation. We recommend consulting a professional appraiser for high-value items.
              </p>
            </div>
          </div>
        </section>

        <section className="border-t border-tan pt-12">
          <h2 className="text-3xl font-bold mb-8">Board of Directors</h2>
          
          {loading ? (
             <div className="flex justify-center py-12">
               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tan"></div>
             </div>
          ) : board.length === 0 ? (
            <p className="italic text-charcoal/60 font-sans">Board information currently being updated.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {board.map(member => (
                <div key={member.id} className="bg-white p-6 rounded-lg border border-tan/10 shadow-sm flex flex-col items-center text-center">
                  {member.image && (
                    <div className="w-24 h-24 rounded-full overflow-hidden mb-4 border-2 border-tan/20">
                      <img src={member.image} alt={member.name} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <h4 className="text-xl font-bold mb-1">{member.name}</h4>
                  <p className="text-tan font-sans font-semibold text-sm uppercase tracking-wider">{member.title}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
