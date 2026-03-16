export default function LocationAndHours() {
  return (
    <div className="max-w-4xl mx-auto py-16 px-8 text-left">
      <h1 className="text-4xl font-serif text-charcoal mb-8">SAHS Museum Hours and Location</h1>
      <div className="bg-white rounded-xl shadow-sm border border-tan-light p-8 mb-8">
        <h2 className="text-2xl font-bold text-charcoal mb-4">Hours of Operation</h2>
        <p className="text-lg text-charcoal leading-relaxed mb-8">
          Saturday and Sunday from 1:00 PM to 4:00 PM
        </p>
        
        <h2 className="text-2xl font-bold text-charcoal mb-4">Location</h2>
        <p className="text-lg text-charcoal leading-relaxed mb-6">
          The SAHS Museum is located at <a href="https://maps.app.goo.gl/CzqmC4zic3UULtt5A" target="_blank" rel="noreferrer" className="text-tan hover:underline">6 Couch St. Senoia, GA 30276</a>.
        </p>
        
        <a 
          href="https://goo.gl/maps/VDNX3wEnussYa8JK7" 
          target="_blank" 
          rel="noreferrer"
          className="inline-block mt-4 px-6 py-3 border border-tan text-tan font-medium rounded-md hover:bg-tan hover:text-cream transition-colors"
        >
          Get Directions
        </a>
      </div>
    </div>
  );
}
