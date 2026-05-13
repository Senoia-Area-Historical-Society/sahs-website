import SponsorsList from '../components/SponsorsList';

export default function Supporters() {
  const partners = [
    { name: "Newnan Coweta County Historical Society", url: "http://newnancowetahistoricalsociety.com/" },
    { name: "Fayette County Historical Society", url: "http://fayettehistoricalsociety.com/" },
    { name: "Georgia Historical Society", url: "http://georgiahistory.com/" },
    { name: "Daughters of the American Revolution - General Daniel Newnan Chapter", url: "http://danielnewnan.georgiastatedar.org/" },
    { name: "Daughters of the American Revolution – National Chapter", url: "https://www.dar.org/" },
    { name: "National Society Colonial Dames XVII Century", url: "http://www.colonialdames17c.org/" }
  ];

  return (
    <div className="bg-cream min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8 font-serif text-charcoal">
      <div className="max-w-5xl mx-auto">
        <header className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">SAHS Supporters</h1>
          <p className="text-xl text-charcoal/80 max-w-3xl mx-auto font-sans leading-relaxed">
            The Senoia Area Historical Society relies upon the generosity of individuals, businesses, and corporations to provide needed support for our operations and community heritage events.
          </p>
        </header>

        <SponsorsList />

        {/* Partners Section */}
        <section className="mb-24 bg-white p-12 rounded-2xl border border-tan/10 shadow-sm">
          <h2 className="text-3xl font-bold mb-8 text-center">Partners in Historic Preservation</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
            {partners.map((partner, index) => (
              <div key={index} className="flex flex-col space-y-1">
                <h4 className="font-bold text-lg leading-tight">{partner.name}</h4>
                <a href={partner.url} target="_blank" rel="noopener noreferrer" className="text-tan font-sans text-sm hover:underline break-all">
                  {partner.url.replace('http://', '').replace('https://', '')}
                </a>
              </div>
            ))}
          </div>
        </section>

        {/* Other Support Section */}
        <section className="text-center">
          <h2 className="text-3xl font-bold mb-8">Join Our Community</h2>
          <p className="text-lg font-sans text-charcoal/70 mb-10 max-w-2xl mx-auto">
            Whether as a sponsor, member, or donor, your contribution makes a difference in preserving Senoia's unique history for future generations.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-6">
            <a href="/support-sahs" className="bg-tan text-white px-10 py-4 rounded-md font-sans font-bold uppercase tracking-widest hover:bg-tan-dark transition-colors shadow-sm">
              Ways to Give
            </a>
            <a href="/sponsor-application-form" className="border-2 border-tan text-tan px-10 py-4 rounded-md font-sans font-bold uppercase tracking-widest hover:bg-tan/5 transition-colors">
              Become a Sponsor
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
