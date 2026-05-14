

export default function MeetingRoom() {
  return (
    <div className="bg-cream min-h-screen pt-24 pb-16 px-4 md:px-6 lg:px-8 font-serif text-charcoal">
      <div className="max-w-6xl mx-auto">
        <header className="mb-12">
          <h1 className="text-4xl font-bold mb-4">Meeting Room Booking</h1>
          <p className="text-lg font-sans text-charcoal/70 max-w-2xl">
            Our historical society offers a quiet, unique space for community meetings and small gatherings. Use the calendar below to book your time slot.
          </p>
        </header>

        <div className="bg-white p-2 md:p-4 rounded-lg shadow-sm border border-tan/20 overflow-hidden">
          {/* The YouCanBook.me widget embedded via iframe for stability in React */}
          <iframe 
            src="https://sahs.youcanbook.me/?embed=true" 
            id="ycbm-iframe"
            style={{ width: '100%', height: '1000px', border: 'none' }}
            title="Meeting Room Booking Calendar"
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
}
