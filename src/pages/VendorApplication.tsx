import { useForm } from 'react-hook-form';
import { useState } from 'react';
import { submitApplication } from '../services/api';

type VendorFormData = {
  businessName: string;
  contactName: string;
  email: string;
  phone: string;
  productDescription: string;
  website?: string;
};

export default function VendorApplication() {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<VendorFormData>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const onSubmit = async (data: VendorFormData) => {
    setIsSubmitting(true);
    try {
      await submitApplication('vendor', data);
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
          <h1 className="text-3xl font-bold mb-4">Application Received!</h1>
          <p className="text-lg font-sans text-charcoal/80 mb-8">
            Thank you for your interest in becoming a vendor. Our events committee will review your application and get back to you soon.
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
        <h1 className="text-4xl font-bold mb-4">Vendor Application</h1>
        <p className="text-lg font-sans text-charcoal/70 mb-12">
          Interested in selling at one of our seasonal events? Please fill out the form below to apply for a space.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-8 md:p-12 rounded-lg border border-tan/20 shadow-sm font-sans">
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-sm font-bold uppercase tracking-wider text-charcoal/60 mb-2">Business Name</label>
              <input 
                {...register('businessName', { required: true })}
                className={`w-full p-3 bg-cream/30 border ${errors.businessName ? 'border-red-500' : 'border-tan/20'} rounded focus:outline-none focus:ring-2 focus:ring-tan/20`}
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
              <label className="block text-sm font-bold uppercase tracking-wider text-charcoal/60 mb-2">Website / Social Media</label>
              <input 
                {...register('website')}
                placeholder="https://"
                className="w-full p-3 bg-cream/30 border border-tan/20 rounded focus:outline-none focus:ring-2 focus:ring-tan/20"
              />
            </div>

            <div>
              <label className="block text-sm font-bold uppercase tracking-wider text-charcoal/60 mb-2">What do you sell?</label>
              <textarea 
                {...register('productDescription', { required: true })}
                rows={4}
                className={`w-full p-3 bg-cream/30 border ${errors.productDescription ? 'border-red-500' : 'border-tan/20'} rounded focus:outline-none focus:ring-2 focus:ring-tan/20`}
                placeholder="Please describe your products or services..."
              ></textarea>
            </div>

            <button 
              type="submit"
              disabled={isSubmitting}
              className="mt-4 w-full bg-tan text-white p-4 rounded uppercase font-bold tracking-widest hover:bg-tan-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Application'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
