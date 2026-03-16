import { Link } from 'react-router-dom';

export default function CarmichaelHouse() {
  return (
    <div className="max-w-4xl mx-auto py-16 px-8 text-left">
      <h1 className="text-4xl font-serif text-charcoal mb-8">Keeping Senoia’s History Alive: The Carmichael House</h1>
      <div className="mb-8">
        <img 
          src="https://uploads-ssl.webflow.com/64b1962bdd56b5834a570290/64b1962bdd56b5834a5702cc_ch.png" 
          alt="The Carmichael House" 
          className="w-full max-w-md float-right ml-8 mb-4 rounded-xl shadow-md border border-tan-light"
        />
        <div className="prose prose-lg text-charcoal max-w-none">
          <p className="mb-6 leading-relaxed">
            Senoia Area Historical Society’s (SAHS) offices and museum are housed in the 1870 Carmichael house located at 6 Couch Street in the Historic District of Senoia, Georgia. The SAHS continues to work to preserve one of the oldest and most historic homes in Senoia.
          </p>
          <p className="mb-6 leading-relaxed">
            In 2016, the Society held a Capital Campaign in which proceeds were used to replace the roof as well as shore up the foundation and repair the floor. In 2018, SAHS repaired the porch, porch ceiling, as well as return the railings and posts to their original design and beauty, thanks to a matching $10,000 grant from the General Daniel Newnan Chapter of the Daughters of the American Revolution.
          </p>
        </div>
      </div>
      <div className="clear-both"></div>
      
      <div className="my-10">
        <img 
          src="https://uploads-ssl.webflow.com/64b1962bdd56b5834a570290/64b1962bdd56b5834a570301_1b22a0fa7f538ef7b6f300a332375623.jpeg" 
          alt="The Carmichael House Today" 
          className="mx-auto rounded-xl shadow-md border border-tan-light"
        />
        <p className="text-center text-charcoal-light mt-4 font-bold">The Carmichael House Today</p>
      </div>

      <div className="mt-12 text-center">
        <Link 
          to="/support-sahs" 
          className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-cream bg-tan hover:bg-tan-dark transition-colors"
        >
          Support the Carmichael Initiative
        </Link>
      </div>
    </div>
  );
}
