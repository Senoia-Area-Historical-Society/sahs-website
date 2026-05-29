import { useEffect, useState } from 'react';
import { getBoardMembers } from '../services/api';
import type { OrganizationEntity } from '../types';
import museumExteriorImg from '../assets/museum-exterior.jpg';

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
        <h1 className="text-4xl md:text-5xl font-bold mb-8 border-b border-tan pb-4">About the Society</h1>

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

        <section className="mb-16">
          <h3 className="text-2xl font-bold mb-6 text-tan">Mission Statement</h3>
          <p className="text-lg leading-relaxed font-sans text-charcoal/90">
            The Senoia Area Historical Society’s mission is to secure, preserve, and promote the social and cultural history of the community. To this end we will: educate and engage a diverse public through a variety of programs, maintain our museum buildings, properties, and collections, acquire and reserve additional items of significant relevance; research and publish historic records; identify and encourage preservation of significant places and structures throughout the community; work collaboratively with public, private and other non-profit organizations to attain this mission; and manage the society openly, ethically and professionally.
          </p>
        </section>

        <section className="mb-16">
          <h3 className="text-2xl font-bold mb-6 text-tan">History</h3>
          <div className="flex flex-col md:flex-row gap-8 items-start">
             <div className="flex-grow order-2 md:order-1">
                <p className="text-lg leading-relaxed font-sans text-charcoal/90 mb-6">
                  In 1976, a group of townspeople joined together to plan festivities to celebrate our country's Bicentennial. After the event there remained $55.89 in the operating budget. In 1977, the group decided to use that amount as seed money to form the Senoia Area Historical Society. 
                </p>
                <p className="text-lg leading-relaxed font-sans text-charcoal/90">
                  The society officially incorporated in 1980, purchased the historic Carmichael home at 6 Couch Street in 1990, and opened the doors as a history museum in 2010. The society takes great pride in acknowledging that its charter members were responsible for the lengthy legwork, paperwork, and financial cost necessary to designate Senoia’s historic district on the roster of the National Register of Historic Places in 1989.
                </p>
             </div>
             <figure className="w-full md:w-1/3 order-1 md:order-2 flex-shrink-0">
                <img 
                  src="https://uploads-ssl.webflow.com/64b1962bdd56b5834a570290/64b1962bdd56b5834a5702ea_princesssenoia.jpg" 
                  alt="Princess Senoia"
                  className="w-full h-auto rounded-lg shadow-md border border-tan/20"
                />
                <figcaption className="mt-2 text-sm italic font-sans text-charcoal/60 text-center">Princess Senoia</figcaption>
             </figure>
          </div>
        </section>

        <section className="mb-16 grid grid-cols-1 md:grid-cols-2 gap-12">
          <div>
            <h3 className="text-2xl font-bold mb-6 text-tan">Society</h3>
            <p className="text-lg leading-relaxed font-sans text-charcoal/90 mb-6">
              Today, the society has monthly meetings open to the public on the second Thursday of the month at 7 pm in our headquarters/museum. We often host guest speakers at these meetings and we always enjoy the evenings. 
            </p>
            <p className="text-lg leading-relaxed font-sans text-charcoal/90">
              Our fundraising events are community affairs that capture the society’s unique character. From Barn Dance to the Annual Auction, the year is full of fun and activity.
            </p>
          </div>
          <div className="md:col-span-2 mt-8 border-t border-tan pt-12">
            <h3 className="text-3xl font-bold mb-6 text-tan text-center">Senoia Area History Museum</h3>
            <div className="prose prose-lg text-charcoal max-w-none font-sans">
              <p className="mb-4 leading-relaxed">
                Founding members first opened the museum’s doors to the community in July 2010. Every Saturday and Sunday between 1:00 pm and 4:00 pm, the public is invited to 6 Couch Street to explore our unique heritage. The museum is staffed by dedicated volunteers who generously share their time and talent to preserve the history and lore of the Senoia area.
              </p>
              <p className="mb-4 leading-relaxed">
                Often, visitors arrive to share their own personal stories, which then become a cherished part of the narrative we tell. It is a wonderful partnership between those who know our history and those who wish to discover it.
              </p>
              <p className="mb-8 leading-relaxed">
                The museum features five display rooms and a research library. Our collection is constantly evolving as we acquire new artifacts. Exhibits span centuries of local history—from the story of Creek Indian Chief William McIntosh in the early 1800s to a contemporary display featuring <em>The Walking Dead</em> television series. There is a wealth of history to discover between these milestones, and we invite you to experience it all firsthand.
              </p>

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
