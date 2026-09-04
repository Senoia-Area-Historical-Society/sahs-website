import { useEffect, useState } from 'react';
import AdminHeader from './AdminHeader';
import ErrorBanner from '../../components/admin/ErrorBanner';
import { useAuth } from '../../contexts/AuthContext';
import { getSubmissions } from '../../services/api';
import type { Submission } from '../../types';
import { Inbox, Mail, Store, Handshake, Loader2 } from 'lucide-react';

/**
 * Read-only inbox for public form submissions.
 *
 * This page exists because the submissions had nowhere to be read. Vendor
 * applications had been landing in Firestore unseen, and the contact form used to
 * write straight to the `mail` collection — where all sixteen queued messages failed
 * with a 550 and were never delivered or noticed, including two real enquiries.
 *
 * The notification email is still the delivery mechanism (`onSubmissionCreated`).
 * This is the durable copy behind it, so a future delivery failure costs a delay
 * rather than the message.
 */

const TYPE_META: Record<Submission['type'], { label: string; icon: typeof Mail }> = {
  contact: { label: 'Contact message', icon: Mail },
  vendor: { label: 'Vendor application', icon: Store },
  sponsor: { label: 'Sponsor application', icon: Handshake },
};

type Filter = 'all' | Submission['type'];

export default function SubmissionsAdmin() {
  const { isCurator } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');

  useEffect(() => {
    if (!isCurator) { setLoading(false); return; }
    (async () => {
      try {
        setSubmissions(await getSubmissions());
      } catch (err) {
        console.error('Failed to load submissions', err);
        setLoadError(err instanceof Error ? err.message : 'Failed to load submissions.');
      } finally {
        setLoading(false);
      }
    })();
  }, [isCurator]);

  // Mirrors the `isCurator()` read rule on the collection. Without this the page
  // would render its empty state for an editor, which reads as "no enquiries".
  if (!isCurator) {
    return (
      <div className="min-h-screen bg-cream">
        <AdminHeader />
        <div className="max-w-3xl mx-auto px-8 py-16 text-center font-sans">
          <h1 className="text-2xl font-serif text-charcoal mb-2">Submissions</h1>
          <p className="text-charcoal/60">
            Form submissions are visible to curators and administrators. Ask an
            administrator if you need access.
          </p>
        </div>
      </div>
    );
  }

  const shown = filter === 'all' ? submissions : submissions.filter(s => s.type === filter);
  const countOf = (t: Filter) =>
    t === 'all' ? submissions.length : submissions.filter(s => s.type === t).length;

  const formatWhen = (iso: string) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
      ? iso
      : d.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
  };

  return (
    <div className="min-h-screen bg-cream">
      <AdminHeader />
      <div className="max-w-5xl mx-auto px-8 py-10 font-sans">
        <header className="mb-8">
          <h1 className="text-3xl font-serif text-charcoal flex items-center gap-3">
            <Inbox size={26} className="text-tan" /> Submissions
          </h1>
          <p className="text-charcoal/60 mt-1 text-sm">
            Contact messages and vendor/sponsor applications from the public website.
            Each one also sends an email to info@senoiahistory.com when it arrives.
          </p>
        </header>

        {loadError && <ErrorBanner message={loadError} />}

        <div className="flex flex-wrap gap-2 mb-6">
          {(['all', 'contact', 'vendor', 'sponsor'] as Filter[]).map(t => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-colors ${
                filter === t ? 'bg-tan text-white' : 'bg-white text-charcoal/60 border border-tan-light hover:border-tan'
              }`}
            >
              {t === 'all' ? 'All' : TYPE_META[t].label} ({countOf(t)})
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-tan" size={36} /></div>
        ) : shown.length === 0 ? (
          <div className="bg-white rounded-xl border border-tan-light p-12 text-center text-charcoal/50">
            {loadError ? 'Could not load submissions.' : 'No submissions yet.'}
          </div>
        ) : (
          <div className="space-y-4">
            {shown.map(s => {
              const meta = TYPE_META[s.type] ?? TYPE_META.contact;
              const Icon = meta.icon;
              return (
                <article key={s.id} className="bg-white rounded-xl border border-tan-light p-6 shadow-sm">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 rounded-md bg-tan/10 text-tan"><Icon size={14} /></span>
                      <span className="text-xs font-bold uppercase tracking-wider text-charcoal/60">{meta.label}</span>
                    </div>
                    <time className="text-xs text-charcoal/40 shrink-0">{formatWhen(s.submittedAt)}</time>
                  </div>

                  <div className="font-bold text-charcoal">
                    {s.name || s.contactName || s.businessName || 'Unnamed'}
                    {s.businessName && (s.name || s.contactName) && (
                      <span className="font-normal text-charcoal/50"> — {s.businessName}</span>
                    )}
                  </div>

                  <div className="text-sm text-charcoal/70 mt-1 flex flex-wrap gap-x-4">
                    {s.email && <a href={`mailto:${s.email}`} className="text-tan hover:underline">{s.email}</a>}
                    {s.phone && <span>{s.phone}</span>}
                    {s.website && (
                      <a href={s.website} target="_blank" rel="noopener noreferrer" className="text-tan hover:underline">
                        {s.website}
                      </a>
                    )}
                  </div>

                  {(s.message || s.productDescription) && (
                    // whitespace-pre-line: these are plain-text form fields, never HTML.
                    // Rendering them as markup would let a public form inject into this page.
                    <p className="mt-3 text-charcoal whitespace-pre-line border-t border-tan-light/60 pt-3">
                      {s.message || s.productDescription}
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
