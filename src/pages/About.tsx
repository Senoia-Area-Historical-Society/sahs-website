import { useEffect, useState } from 'react';
import { getBoardMembers } from '../services/api';
import type { OrganizationEntity } from '../types';

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
        <h1 className="text-4xl md:text-5xl font-bold mb-12 border-b border-tan pb-4">About the Society</h1>

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
          <div>
            <h3 className="text-2xl font-bold mb-6 text-tan">History Museum</h3>
            <p className="text-lg leading-relaxed font-sans text-charcoal/90">
              The history museum is located inside the house at 6 Couch Street. The house, located in the Historic District of Senoia, is a mixture of architectural styles, most closely resembling Gothic Revival style built by the McKnight family in the 1870's. Fulfilling the dream of the charter members back in the 1970s, the History Museum opened its doors on July 18, 2010.
            </p>
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
