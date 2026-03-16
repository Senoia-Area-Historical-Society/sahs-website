import { Link } from 'react-router-dom';

export default function StripeSuccess() {
  return (
    <div className="bg-cream min-h-screen pt-32 pb-16 px-4 flex justify-center items-start font-serif">
      <div className="max-w-xl w-full bg-white p-12 rounded-lg border border-tan/20 shadow-lg text-center">
        <div className="w-16 h-16 bg-tan/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-tan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold mb-4">Payment Successful!</h1>
        <p className="text-lg font-sans text-charcoal/80 mb-8">
          Thank you for your generous support of the Senoia Area Historical Society. Your contribution helps us preserve our community's heritage for future generations.
        </p>
        <Link 
          to="/"
          className="inline-block bg-tan text-white px-8 py-3 rounded uppercase font-bold tracking-widest hover:bg-tan-dark transition-all shadow-md"
        >
          Return Home
        </Link>
      </div>
    </div>
  );
}
