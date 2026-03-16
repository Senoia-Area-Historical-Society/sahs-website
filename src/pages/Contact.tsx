export default function Contact() {
  return (
    <div className="max-w-3xl mx-auto py-16 px-8 text-left">
      <h1 className="text-4xl font-serif text-charcoal mb-8">Contact Us</h1>
      <p className="text-lg text-charcoal mb-8">
        Contact us via email or use the form below.
      </p>

      <div className="bg-cream rounded-xl p-8 border border-tan-light shadow-sm mb-8">
        <h2 className="text-2xl font-bold text-charcoal mb-4">Carmichael House</h2>
        <p className="text-charcoal leading-relaxed mb-6">
          6 Couch St.<br/>
          Senoia, GA 30276
        </p>
        
        <h2 className="text-2xl font-bold text-charcoal mb-4">Email</h2>
        <p className="text-charcoal leading-relaxed">
          <a href="mailto:info@senoiahistory.com" className="text-tan hover:text-tan-dark transition-colors font-medium">info@senoiahistory.com</a>
        </p>
      </div>

      <div className="mt-12 bg-white rounded-xl shadow-sm border border-tan-light p-8">
        <h2 className="text-2xl font-bold text-charcoal mb-6">Send a Message</h2>
        <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
          <div>
            <label htmlFor="Contact-Name" className="block text-sm font-medium text-charcoal mb-1">Name</label>
            <input 
              type="text" 
              id="Contact-Name" 
              name="Contact-Name"
              placeholder="Enter your first name" 
              className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-tan focus:border-tan sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="Contact-Email" className="block text-sm font-medium text-charcoal mb-1">Email Address</label>
            <input 
              type="email" 
              id="Contact-Email" 
              name="Contact-Email"
              placeholder="Email address" 
              className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-tan focus:border-tan sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="Contact-Message" className="block text-sm font-medium text-charcoal mb-1">Message</label>
            <textarea 
              id="Contact-Message" 
              name="Contact-Message"
              rows={4}
              placeholder="Type your message..." 
              className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-tan focus:border-tan sm:text-sm"
            ></textarea>
          </div>
          <div>
            <button 
              type="submit" 
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-cream bg-tan hover:bg-tan-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-tan transition-colors"
            >
              Submit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
