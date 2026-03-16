export default function Unauthorized() {
  return (
    <div className="max-w-4xl mx-auto py-20 px-8 text-center">
      <h1 className="text-5xl font-serif text-charcoal mb-6">401: Unauthorized</h1>
      <p className="text-xl text-charcoal-light leading-relaxed">
        You do not have permission to access this page. Please ensure you are logged in with the correct credentials.
      </p>
    </div>
  );
}
