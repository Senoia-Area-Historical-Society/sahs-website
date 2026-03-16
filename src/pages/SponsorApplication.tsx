import { useForm } from 'react-hook-form';
import { useState } from 'react';
import { submitApplication } from '../services/api';

type SponsorFormData = {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  sponsorshipLevel: string;
  message?: string;
};

export default function SponsorApplication() {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<SponsorFormData>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const onSubmit = async (data: SponsorFormData) => {
    setIsSubmitting(true);
    try {
      await submitApplication('sponsor', data);
      setIsSuccess(true);
      reset();
    } catch (err) {
      alert("There was an error submitting your application. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="bg-cream min-h-screen pt-32 pb-16 px-4 flex justify-center items-start font-serif">
        <div className="max-w-xl w-full bg-white p-12 rounded-lg border border-tan/20 shadow-lg text-center">
          <div className="w-16 h-16 bg-tan/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-tan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold mb-4">Interest Received!</h1>
          <p className="text-lg font-sans text-charcoal/80 mb-8">
            Thank you for your interest in supporting the Senoia Area Historical Society. Our board will reach out to discuss sponsorship opportunities and recognition levels with you soon.
          </p>
          <button 
            onClick={() => setIsSuccess(false)}
            className="text-tan font-sans font-bold uppercase tracking-widest border-b-2 border-tan pb-1 hover:text-tan-dark hover:border-tan-dark transition-colors"
          >
            Submit Another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-cream min-h-screen pt-24 pb-16 px-4 md:px-6 lg:px-8 font-serif text-charcoal">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">Sponsor Application</h1>
        <p className="text-lg font-sans text-charcoal/70 mb-12">
          Partner with us to preserve our community's heritage. Your sponsorship helps us fund exhibits, programs, and outreach.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-8 md:p-12 rounded-lg border border-tan/20 shadow-sm font-sans">
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-sm font-bold uppercase tracking-wider text-charcoal/60 mb-2">Company / Organization Name</label>
              <input 
                {...register('companyName', { required: true })}
                className={`w-full p-3 bg-cream/30 border ${errors.companyName ? 'border-red-500' : 'border-tan/20'} rounded focus:outline-none focus:ring-2 focus:ring-tan/20`}
              />
            </div>

            <div>
              <label className="block text-sm font-bold uppercase tracking-wider text-charcoal/60 mb-2">Contact Name</label>
              <input 
                {...register('contactName', { required: true })}
                className={`w-full p-3 bg-cream/30 border ${errors.contactName ? 'border-red-500' : 'border-tan/20'} rounded focus:outline-none focus:ring-2 focus:ring-tan/20`}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold uppercase tracking-wider text-charcoal/60 mb-2">Email Address</label>
                <input 
                  type="email"
                  {...register('email', { required: true, pattern: /^\S+@\S+$/i })}
                  className={`w-full p-3 bg-cream/30 border ${errors.email ? 'border-red-500' : 'border-tan/20'} rounded focus:outline-none focus:ring-2 focus:ring-tan/20`}
                />
              </div>
              <div>
                <label className="block text-sm font-bold uppercase tracking-wider text-charcoal/60 mb-2">Phone Number</label>
                <input 
                  type="tel"
                  {...register('phone', { required: true })}
                  className={`w-full p-3 bg-cream/30 border ${errors.phone ? 'border-red-500' : 'border-tan/20'} rounded focus:outline-none focus:ring-2 focus:ring-tan/20`}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold uppercase tracking-wider text-charcoal/60 mb-2">Sponsorship Level Interest</label>
              <select 
                {...register('sponsorshipLevel', { required: true })}
                className={`w-full p-3 bg-cream/30 border ${errors.sponsorshipLevel ? 'border-red-500' : 'border-tan/20'} rounded focus:outline-none focus:ring-2 focus:ring-tan/20`}
              >
                <option value="">Select a level...</option>
                <option value="platinum">Platinum Sponsor</option>
                <option value="gold">Gold Sponsor</option>
                <option value="silver">Silver Sponsor</option>
                <option value="bronze">Bronze Sponsor</option>
                <option value="other">Other / Custom</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold uppercase tracking-wider text-charcoal/60 mb-2">Message (Optional)</label>
              <textarea 
                {...register('message')}
                rows={4}
                className="w-full p-3 bg-cream/30 border border-tan/20 rounded focus:outline-none focus:ring-2 focus:ring-tan/20"
                placeholder="Tell us about your organization or any specific interests..."
              ></textarea>
            </div>

            <button 
              type="submit"
              disabled={isSubmitting}
              className="mt-4 w-full bg-tan text-white p-4 rounded uppercase font-bold tracking-widest hover:bg-tan-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            >
              {isSubmitting ? 'Submitting...' : 'Send Interest'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
