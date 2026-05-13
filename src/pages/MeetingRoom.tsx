import { useEffect } from 'react';

export default function MeetingRoom() {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = "https://embed.ycb.me";
    script.async = true;
    script.dataset.domain = "sahs";
    script.dataset.displaymode = "auto";
    document.body.appendChild(script);

    return () => {
      // Find and remove the script when component unmounts
      const existingScript = document.querySelector('script[src="https://embed.ycb.me"]');
      if (existingScript) {
        document.body.removeChild(existingScript);
      }
      // Also clean up any frames or elements created by the widget
      const ycbElements = document.querySelectorAll('[id^="YCBM"], .ycbm');
      ycbElements.forEach(el => el.remove());
    };
  }, []);

  return (
    <div className="bg-cream min-h-screen pt-24 pb-16 px-4 md:px-6 lg:px-8 font-serif text-charcoal">
      <div className="max-w-6xl mx-auto">
        <header className="mb-12">
          <h1 className="text-4xl font-bold mb-4">Meeting Room Booking</h1>
          <p className="text-lg font-sans text-charcoal/70 max-w-2xl">
            Our historical society offers a quiet, unique space for community meetings and small gatherings. Use the calendar below to book your time slot.
          </p>
        </header>

        <div className="bg-white p-4 md:p-8 rounded-lg shadow-sm border border-tan/20 min-h-[800px]">
          {/* The YouCanBook.me widget will embed here */}
          <div className="w-full h-full flex items-center justify-center text-charcoal/40 font-sans">
            <div className="text-center">
              <div className="animate-pulse mb-4 text-tan">Loading Booking Calendar...</div>
              <p className="text-sm">If the calendar doesn't appear, please ensure your browser allows scripts.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
