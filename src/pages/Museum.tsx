import { Link } from 'react-router-dom';

export default function Museum() {
  return (
    <div className="max-w-4xl mx-auto py-16 px-8 text-left">
      <h1 className="text-4xl font-serif text-charcoal mb-8">Senoia Area Historical Society History Museum</h1>
      
      <div className="prose prose-lg text-charcoal max-w-none">
        <h2 className="text-2xl font-bold text-charcoal mt-8 mb-4">Origin and Description</h2>
        <p className="mb-4 leading-relaxed">
          Founding members first opened the museum’s doors to the community in July 2010. Every Saturday and Sunday between 1:00 pm and 4:00 pm, the public is invited to 6 Couch Street to explore our unique heritage. The museum is staffed by dedicated volunteers who generously share their time and talent to preserve the history and lore of the Senoia area.
        </p>
        <p className="mb-4 leading-relaxed">
          Often, visitors arrive to share their own personal stories, which then become a cherished part of the narrative we tell. It is a wonderful partnership between those who know our history and those who wish to discover it.
        </p>
        <p className="mb-8 leading-relaxed">
          The museum features five display rooms and a research library. Our collection is constantly evolving as we acquire new artifacts. Exhibits span centuries of local history—from the story of Creek Indian Chief William McIntosh in the early 1800s to a contemporary display featuring <em>The Walking Dead</em> television series. There is a wealth of history to discover between these milestones, and we invite you to experience it all firsthand.
        </p>

        <h2 className="text-2xl font-bold text-charcoal mt-8 mb-4">Museum Staffing</h2>
        <p className="mb-4 leading-relaxed">
          The museum is operated by our Museum Director, <strong>Cat Nolan</strong>, along with friendly, passionate member volunteers. Any member with a love for Senoia’s history and culture will find the role of docent incredibly rewarding. Training is provided, and the time commitment is entirely at your discretion.
        </p>
        <p className="mb-8 leading-relaxed">
          Beyond weekend staffing, volunteers may also serve as historical researchers or oral history interviewers. If you would like to be a part of this exciting endeavor, please <Link to="/contact-sahs" className="text-tan hover:underline font-bold">contact us</Link> through our website.
        </p>

        <h2 className="text-2xl font-bold text-charcoal mt-8 mb-4">Historical and Cultural Donations</h2>
        <p className="mb-4 leading-relaxed">
          The museum follows a formal Acquisition Policy to curate artifacts specifically from the Senoia area. If you are interested in donating historical or cultural assets, we invite you to stop by the museum on a Saturday or Sunday or contact us directly through our website.
        </p>
        <p className="mb-8 leading-relaxed">
          Once a donation is approved, it becomes a preserved and treasured part of our permanent collection. Please read the Acquisitions Policy FAQ below or visit our <Link to="/contact-sahs" className="text-tan hover:underline font-bold">Contact Us</Link> page to request more information.
        </p>

        <div id="donations-faq" className="bg-cream p-8 rounded-xl border border-tan-light mt-12">
          <h3 className="text-2xl font-serif text-charcoal mb-6">Frequently Asked Questions About Donations</h3>
          
          <h4 className="text-lg font-bold text-charcoal mt-6 mb-2">What kind of items does the museum accept?</h4>
          <p className="mb-4 leading-relaxed">
            We primarily collect artifacts, documents, and photographs that have a direct connection to the history, culture, and people of the <strong>Senoia area</strong>. This includes items from domestic life, local businesses, agriculture, and our more recent film history.
          </p>
          
          <h4 className="text-lg font-bold text-charcoal mt-6 mb-2">Can I just drop off an item at the front desk?</h4>
          <p className="mb-4 leading-relaxed">
            To ensure every item is properly documented and cared for, we ask that you <strong>do not leave items at the museum</strong> without speaking to a staff member. Please visit us during weekend hours or contact us through the website first so we can review the item against our current Acquisition Policy.
          </p>
          
          <h4 className="text-lg font-bold text-charcoal mt-6 mb-2">Does the museum accept "permanent loans"?</h4>
          <p className="mb-4 leading-relaxed">
            Generally, the museum only accepts <strong>outright gifts</strong>. This allows us to invest in the long-term preservation and display of the artifact. We rarely accept long-term loans due to insurance and storage complexities.
          </p>
          
          <h4 className="text-lg font-bold text-charcoal mt-6 mb-2">How is the "Historical Significance" determined?</h4>
          <p className="mb-4 leading-relaxed">
            Our acquisitions committee reviews items based on their condition, their connection to Senoia’s timeline, and whether we already have similar items in our collection.
          </p>
          
          <h4 className="text-lg font-bold text-charcoal mt-6 mb-2">Is my donation tax-deductible?</h4>
          <p className="mb-4 leading-relaxed">
            The Senoia Area Historical Society is a 501(c)(3) non-profit organization, and your donation may be tax-deductible. However, federal law prohibits museum staff from providing formal appraisals or determining the monetary value of a donation. We recommend consulting a professional appraiser for high-value items.
          </p>
        </div>
      </div>
    </div>
  );
}
