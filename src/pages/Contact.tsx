import { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function Contact() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !message) return;
    
    setStatus('submitting');
    try {
      await addDoc(collection(db, 'mail'), {
        to: 'info@senoiahistory.com',
        from: 'Senoia Area Historical Society <noreply@senoiahistory.com>',
        replyTo: email,
        message: {
          subject: `New Contact Form Submission from ${name}`,
          html: `
            <h3>New Contact Form Submission</h3>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Message:</strong></p>
            <p>${message.replace(/\n/g, '<br>')}</p>
          `
        }
      });
      setStatus('success');
      setName('');
      setEmail('');
      setMessage('');
    } catch (err) {
      console.error('Failed to submit contact form', err);
      setStatus('error');
    }
  };

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
        
        {status === 'success' && (
          <div className="mb-6 p-4 bg-green-50 text-green-800 rounded-md border border-green-200">
            Thank you for your message! We will get back to you soon.
          </div>
        )}
        
        {status === 'error' && (
          <div className="mb-6 p-4 bg-red-50 text-red-800 rounded-md border border-red-200">
            There was an error sending your message. Please try emailing us directly.
          </div>
        )}

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="Contact-Name" className="block text-sm font-medium text-charcoal mb-1">Name</label>
            <input 
              type="text" 
              id="Contact-Name" 
              name="Contact-Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Enter your name" 
              className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-tan focus:border-tan sm:text-sm"
              disabled={status === 'submitting'}
            />
          </div>
          <div>
            <label htmlFor="Contact-Email" className="block text-sm font-medium text-charcoal mb-1">Email Address</label>
            <input 
              type="email" 
              id="Contact-Email" 
              name="Contact-Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Email address" 
              className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-tan focus:border-tan sm:text-sm"
              disabled={status === 'submitting'}
            />
          </div>
          <div>
            <label htmlFor="Contact-Message" className="block text-sm font-medium text-charcoal mb-1">Message</label>
            <textarea 
              id="Contact-Message" 
              name="Contact-Message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              rows={4}
              placeholder="Type your message..." 
              className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-tan focus:border-tan sm:text-sm"
              disabled={status === 'submitting'}
            ></textarea>
          </div>
          <div>
            <button 
              type="submit" 
              disabled={status === 'submitting'}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-cream bg-tan hover:bg-tan-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-tan transition-colors disabled:opacity-50"
            >
              {status === 'submitting' ? 'Sending...' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
