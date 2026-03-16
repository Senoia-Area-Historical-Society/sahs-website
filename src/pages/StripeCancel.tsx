import { Link } from 'react-router-dom';

export default function StripeCancel() {
  return (
    <div className="bg-cream min-h-screen pt-32 pb-16 px-4 flex justify-center items-start font-serif">
      <div className="max-w-xl w-full bg-white p-12 rounded-lg border border-tan/20 shadow-lg text-center">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold mb-4">Payment Cancelled</h1>
        <p className="text-lg font-sans text-charcoal/80 mb-8">
          The payment process was cancelled and no charges were made. If you encountered an issue, please feel free to contact us.
        </p>
        <Link 
          to="/support-sahs"
          className="inline-block border-2 border-tan text-tan px-8 py-3 rounded uppercase font-bold tracking-widest hover:bg-tan/5 transition-all"
        >
          Back to Support
        </Link>
      </div>
    </div>
  );
}
