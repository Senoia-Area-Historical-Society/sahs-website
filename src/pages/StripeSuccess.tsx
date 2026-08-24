import { useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Seo from '../components/Seo';
import { pushToDataLayer } from '../lib/gtm';

export default function StripeSuccess() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const reportedRef = useRef(false);

  // Membership and donation amounts vary ($25 Senior/Student up to $500 Corporate), and
  // this page never fetches the checkout session, so no `value` is reported here — just
  // the conversion itself.
  //
  // Reached from the Stripe Pricing Table's confirmation page, configured in the Dashboard
  // rather than in this repo. If that setting is ever cleared, members land on stripe.com
  // after paying and this event stops firing — leaving no membership conversion signal at
  // all — with nothing in the codebase to indicate why.
  useEffect(() => {
    if (!sessionId || reportedRef.current) return;
    reportedRef.current = true;
    pushToDataLayer({
      event: 'purchase',
      ecommerce: { transaction_id: sessionId, currency: 'USD' },
    });
  }, [sessionId]);

  return (
    <div className="bg-cream min-h-screen pt-32 pb-16 px-4 flex justify-center items-start font-serif">
      <Seo title="Thank You" description="Thank you for supporting the Senoia Area Historical Society." noindex />
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
