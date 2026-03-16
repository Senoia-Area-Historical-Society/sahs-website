import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-4 sm:px-6 lg:px-8 text-center">
      <h1 className="text-6xl font-serif text-charcoal mb-4">404</h1>
      <h2 className="text-3xl font-bold text-charcoal mb-6">Page Not Found</h2>
      <p className="text-lg text-charcoal-light max-w-2xl mb-10">
        We're sorry, the page you're looking for doesn't exist. It might have been moved or deleted.
      </p>
      <Link 
        to="/" 
        className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-cream bg-tan hover:bg-tan-dark transition-colors"
      >
        Return to Homepage
      </Link>
    </div>
  );
}
