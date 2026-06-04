import { useState } from 'react';
import { Search, CheckCircle, XCircle, Clock, AlertCircle, Loader2 } from 'lucide-react';

const FUNCTION_URL = 'https://us-central1-sahs-archives.cloudfunctions.net/getMembershipByEmail';

interface MembershipResult {
  level: string;
  status: string;
  expirationDate: string;
  cancelAtPeriodEnd: boolean;
}

interface LookupResponse {
  found: boolean;
  memberships: MembershipResult[];
  error?: string;
}

function statusConfig(status: string, cancelAtPeriodEnd: boolean) {
  if (status === 'active' && cancelAtPeriodEnd) {
    return {
      icon: <Clock size={20} className="text-orange-500" />,
      label: 'Active — Cancels at Period End',
      color: 'bg-orange-50 border-orange-200 text-orange-800',
    };
  }
  switch (status) {
    case 'active':
      return {
        icon: <CheckCircle size={20} className="text-green-600" />,
        label: 'Active',
        color: 'bg-green-50 border-green-200 text-green-800',
      };
    case 'past_due':
      return {
        icon: <AlertCircle size={20} className="text-orange-500" />,
        label: 'Past Due',
        color: 'bg-orange-50 border-orange-200 text-orange-800',
      };
    case 'canceled':
      return {
        icon: <XCircle size={20} className="text-red-500" />,
        label: 'Canceled',
        color: 'bg-red-50 border-red-200 text-red-700',
      };
    case 'unpaid':
      return {
        icon: <XCircle size={20} className="text-red-500" />,
        label: 'Unpaid',
        color: 'bg-red-50 border-red-200 text-red-700',
      };
    default:
      return {
        icon: <AlertCircle size={20} className="text-gray-400" />,
        label: status,
        color: 'bg-gray-50 border-gray-200 text-gray-700',
      };
  }
}

export default function MemberPortal() {
  const [email, setEmail] = useState('');
  const [result, setResult] = useState<LookupResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) return;

    setLoading(true);
    setResult(null);
    setSubmitted(false);

    try {
      const res = await fetch(`${FUNCTION_URL}?email=${encodeURIComponent(trimmed)}`);
      const data: LookupResponse = await res.json();
      setResult(data);
    } catch {
      setResult({ found: false, memberships: [], error: 'Could not reach the membership server. Please try again.' });
    } finally {
      setLoading(false);
      setSubmitted(true);
    }
  };

  return (
    <div className="min-h-screen bg-cream pt-24 pb-20 px-4 font-serif text-charcoal">
      <div className="max-w-xl mx-auto">
        <header className="text-center mb-10">
          <p className="text-xs font-sans font-bold uppercase tracking-widest text-tan mb-3">Member Self-Service</p>
          <h1 className="text-4xl font-bold mb-3">Check Your Membership</h1>
          <p className="text-charcoal/60 font-sans text-base leading-relaxed">
            Enter the email address you used when joining SAHS to view your current membership status.
          </p>
        </header>

        <form onSubmit={handleLookup} className="bg-white rounded-xl border border-tan-light shadow-sm p-6 mb-6">
          <label className="block text-sm font-bold text-charcoal mb-2 font-sans">Email Address</label>
          <div className="flex gap-3">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal/30" size={18} />
              <input
                type="email"
                required
                value={email}
                onChange={e => { setEmail(e.target.value); setSubmitted(false); }}
                placeholder="yourname@example.com"
                className="w-full pl-10 pr-4 py-3 border border-tan-light rounded-lg focus:outline-none focus:ring-2 focus:ring-tan/40 font-sans text-sm bg-cream/50"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-tan hover:bg-tan-dark text-white font-sans font-bold text-sm uppercase tracking-wider rounded-lg transition-colors disabled:opacity-60 shrink-0"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : 'Look Up'}
            </button>
          </div>
        </form>

        {submitted && result && (
          <div>
            {result.error ? (
              <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-center">
                <AlertCircle size={24} className="text-red-400 mx-auto mb-2" />
                <p className="text-sm font-sans text-red-700">{result.error}</p>
              </div>
            ) : !result.found || result.memberships.length === 0 ? (
              <div className="bg-white border border-tan-light rounded-xl p-8 text-center">
                <XCircle size={36} className="text-charcoal/20 mx-auto mb-3" />
                <h2 className="text-xl font-bold mb-2">No Membership Found</h2>
                <p className="text-charcoal/60 font-sans text-sm leading-relaxed mb-4">
                  We couldn't find a membership associated with <strong>{email}</strong>.
                </p>
                <p className="text-charcoal/50 font-sans text-xs">
                  Try the email you used during checkout, or{' '}
                  <a href="/support-sahs" className="text-tan hover:underline font-bold">become a member</a>.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm font-sans text-charcoal/50 text-center">
                  Showing {result.memberships.length} membership{result.memberships.length > 1 ? 's' : ''} for <strong className="text-charcoal">{email}</strong>
                </p>
                {result.memberships.map((m, idx) => {
                  const cfg = statusConfig(m.status, m.cancelAtPeriodEnd);
                  const expiry = new Date(m.expirationDate);
                  const isExpired = expiry < new Date();
                  return (
                    <div key={idx} className="bg-white rounded-xl border border-tan-light shadow-sm p-6">
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div>
                          <p className="text-xs font-sans font-bold uppercase tracking-widest text-charcoal/40 mb-1">Membership Level</p>
                          <p className="text-lg font-bold text-charcoal">{m.level}</p>
                        </div>
                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-sans font-bold uppercase tracking-wider ${cfg.color}`}>
                          {cfg.icon}
                          <span>{cfg.label}</span>
                        </div>
                      </div>
                      <div className="border-t border-tan-light/50 pt-4">
                        <p className="text-xs font-sans font-bold uppercase tracking-widest text-charcoal/40 mb-1">
                          {m.status === 'canceled' ? 'Expired' : isExpired ? 'Expired' : 'Renews'}
                        </p>
                        <p className={`text-sm font-sans font-bold ${isExpired || m.status === 'canceled' ? 'text-red-600' : 'text-charcoal'}`}>
                          {expiry.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                      </div>
                      {m.status === 'active' && !m.cancelAtPeriodEnd && (
                        <p className="text-xs text-green-700 font-sans mt-3">
                          Auto-renews annually. Thank you for your continued support!
                        </p>
                      )}
                      {m.cancelAtPeriodEnd && (
                        <p className="text-xs text-orange-600 font-sans mt-3">
                          Your membership will not renew. Access continues through the expiry date above.
                        </p>
                      )}
                    </div>
                  );
                })}
                <div className="text-center pt-2">
                  <p className="text-xs text-charcoal/40 font-sans">
                    Questions?{' '}
                    <a href="/contact-sahs" className="text-tan hover:underline">Contact us</a>
                    {' '}or{' '}
                    <a href="/support-sahs" className="text-tan hover:underline">renew your membership</a>.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
