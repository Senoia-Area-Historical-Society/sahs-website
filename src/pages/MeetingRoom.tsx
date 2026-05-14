import meetingRoomImg from '../assets/images/meeting-room-interior.jpg';

export default function MeetingRoom() {
  return (
    <div className="bg-cream min-h-screen pt-24 pb-16 px-4 md:px-6 lg:px-8 font-serif text-charcoal">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 mb-12 items-center">
          <div className="lg:col-span-3">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">Meeting Room Booking</h1>
            <p className="text-xl font-sans text-charcoal/80 mb-8 leading-relaxed">
              Our historical society offers a quiet, unique space for community meetings and small gatherings. The Carmichael House meeting room is equipped with modern amenities in a beautiful historic setting.
            </p>
            <div className="bg-tan/5 border-l-4 border-tan p-6 rounded-r-lg">
              <h3 className="font-bold mb-2">Facility Details:</h3>
              <ul className="text-sm font-sans text-charcoal/70 space-y-1">
                <li>• Capacity: Up to 40 people</li>
                <li>• Amenities: Wi-Fi, Climate Control, Display Screen</li>
                <li>• Location: 6 Couch St, Senoia, GA</li>
              </ul>
            </div>
          </div>
          <div className="lg:col-span-2">
            <div className="relative group">
              <img 
                src={meetingRoomImg} 
                alt="SAHS Meeting Room Interior" 
                className="rounded-lg shadow-xl w-full h-[300px] object-cover"
              />
              <div className="absolute inset-0 border-2 border-tan/20 rounded-lg -m-2 z-0"></div>
            </div>
          </div>
        </div>

        <div className="bg-white p-2 md:p-4 rounded-lg shadow-sm border border-tan/20 overflow-hidden">
          {/* The YouCanBook.me widget embedded via iframe for stability in React */}
          <iframe 
            src="https://sahs.youcanbook.me/?embed=true" 
            id="ycbm-iframe"
            style={{ width: '100%', height: '800px', border: 'none' }}
            title="Meeting Room Booking Calendar"
            className="w-full"
          />
        </div>
        <p className="mt-6 text-center text-sm text-charcoal/50 font-sans italic">
          If you have trouble with the calendar, please <a href="/contact-sahs" className="text-tan underline">contact us</a> directly.
        </p>
      </div>
    </div>
  );
}
