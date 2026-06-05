import { useState, useEffect, useRef, useCallback } from 'react';
import { Mail, Plus, Trash2, Send, Eye, Loader2, CheckCircle, AlertCircle, ChevronUp, ChevronDown } from 'lucide-react';
import AdminHeader from './AdminHeader';
import { useAuth } from '../../contexts/AuthContext';

interface NewsletterSection {
  title: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
}

interface NewsletterProps {
  subject: string;
  previewText: string;
  intro: string;
  issueLabel: string;
  sections: NewsletterSection[];
}

const EMPTY_SECTION: NewsletterSection = { title: '', body: '', ctaLabel: '', ctaUrl: '' };

const DEFAULT_PROPS: NewsletterProps = {
  subject: '',
  previewText: '',
  intro: '',
  issueLabel: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
  sections: [{ ...EMPTY_SECTION }],
};

const getFunctionsBaseUrl = () =>
  !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1')
    ? 'https://us-central1-sahs-archives.cloudfunctions.net'
    : 'http://127.0.0.1:5001/sahs-archives/us-central1';

export default function NewsletterComposer() {
  const { user } = useAuth();
  const [props, setProps] = useState<NewsletterProps>(DEFAULT_PROPS);
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [sendingTest, setSendingTest] = useState(false);
  const [sendingBroadcast, setSendingBroadcast] = useState(false);
  const [testEmail, setTestEmail] = useState(user?.email || '');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchPreview = useCallback(async (currentProps: NewsletterProps) => {
    setPreviewLoading(true);
    try {
      const res = await fetch(`${getFunctionsBaseUrl()}/renderEmailPreview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template: 'newsletter', props: currentProps }),
      });
      const html = await res.text();
      setPreviewHtml(html);
    } catch (err) {
      console.error('Preview failed:', err);
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchPreview(props), 600);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [props, fetchPreview]);

  const updateField = <K extends keyof NewsletterProps>(key: K, value: NewsletterProps[K]) =>
    setProps(p => ({ ...p, [key]: value }));

  const updateSection = (index: number, key: keyof NewsletterSection, value: string) =>
    setProps(p => {
      const sections = [...p.sections];
      sections[index] = { ...sections[index], [key]: value };
      return { ...p, sections };
    });

  const addSection = () => setProps(p => ({ ...p, sections: [...p.sections, { ...EMPTY_SECTION }] }));
  const removeSection = (i: number) => setProps(p => ({ ...p, sections: p.sections.filter((_, idx) => idx !== i) }));
  const moveSection = (i: number, dir: -1 | 1) => setProps(p => {
    const sections = [...p.sections];
    const target = i + dir;
    if (target < 0 || target >= sections.length) return p;
    [sections[i], sections[target]] = [sections[target], sections[i]];
    return { ...p, sections };
  });

  const validate = () => {
    if (!props.subject.trim()) return 'Subject is required.';
    if (!props.previewText.trim()) return 'Preview text is required.';
    if (!props.intro.trim()) return 'Intro paragraph is required.';
    if (props.sections.some(s => !s.title.trim() || !s.body.trim())) return 'Each section needs a title and body.';
    return null;
  };

  const sendTest = async () => {
    const err = validate();
    if (err) { setStatus({ type: 'error', message: err }); return; }
    if (!testEmail) { setStatus({ type: 'error', message: 'Enter a test email address.' }); return; }
    setSendingTest(true);
    setStatus(null);
    try {
      const res = await fetch(`${getFunctionsBaseUrl()}/sendNewsletter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newsletterProps: props, testEmail }),
      });
      const data = await res.json() as { mode?: string; error?: string };
      if (!res.ok) throw new Error(data.error || 'Send failed');
      setStatus({ type: 'success', message: `Test email sent to ${testEmail}.` });
    } catch (e: any) {
      setStatus({ type: 'error', message: e.message || 'Send failed.' });
    } finally {
      setSendingTest(false);
    }
  };

  const sendBroadcast = async () => {
    const err = validate();
    if (err) { setStatus({ type: 'error', message: err }); return; }
    if (!window.confirm(`Send "${props.subject}" to all active SAHS members?\n\nThis cannot be undone.`)) return;
    setSendingBroadcast(true);
    setStatus(null);
    try {
      const res = await fetch(`${getFunctionsBaseUrl()}/sendNewsletter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newsletterProps: props }),
      });
      const data = await res.json() as { broadcast?: { id?: string; name?: string }; error?: string };
      if (!res.ok) throw new Error(data.error || 'Broadcast failed');
      setStatus({ type: 'success', message: `Broadcast created: "${data.broadcast?.name || data.broadcast?.id}". Check Resend dashboard to send.` });
    } catch (e: any) {
      setStatus({ type: 'error', message: e.message || 'Broadcast failed.' });
    } finally {
      setSendingBroadcast(false);
    }
  };

  return (
    <div className="bg-cream min-h-screen font-serif text-charcoal flex flex-col">
      <AdminHeader />

      <main className="flex-grow p-8 max-w-screen-2xl mx-auto w-full">
        <header className="mb-8 border-b border-tan pb-6">
          <div className="flex items-center gap-3 mb-1">
            <Mail size={22} className="text-tan" />
            <h1 className="text-4xl font-bold">Newsletter Composer</h1>
          </div>
          <p className="text-charcoal/60 font-sans text-sm mt-1">
            Compose a member newsletter, preview it live, and send a test or broadcast via Resend.
          </p>
        </header>

        {status && (
          <div className={`flex items-start gap-3 mb-6 p-4 rounded-lg border font-sans text-sm ${
            status.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            {status.type === 'success' ? <CheckCircle size={16} className="mt-0.5 shrink-0" /> : <AlertCircle size={16} className="mt-0.5 shrink-0" />}
            {status.message}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">

          {/* ── Left: Form ── */}
          <div className="space-y-6">

            {/* Envelope fields */}
            <section className="bg-white rounded-xl border border-tan-light p-6 space-y-4">
              <h2 className="text-xs font-sans font-black uppercase tracking-widest text-charcoal/40 mb-2">Email Envelope</h2>
              <Field label="Issue Label" hint="e.g. June 2026 — appears in the header">
                <input
                  className="input-base"
                  value={props.issueLabel}
                  onChange={e => updateField('issueLabel', e.target.value)}
                  placeholder="June 2026"
                />
              </Field>
              <Field label="Subject Line" required>
                <input
                  className="input-base"
                  value={props.subject}
                  onChange={e => updateField('subject', e.target.value)}
                  placeholder="SAHS Member Newsletter — June 2026"
                />
              </Field>
              <Field label="Preview Text" hint="Shown in inbox preview below the subject" required>
                <input
                  className="input-base"
                  value={props.previewText}
                  onChange={e => updateField('previewText', e.target.value)}
                  placeholder="Here's what's happening at the Senoia Area Historical Society this month."
                />
              </Field>
            </section>

            {/* Intro */}
            <section className="bg-white rounded-xl border border-tan-light p-6">
              <h2 className="text-xs font-sans font-black uppercase tracking-widest text-charcoal/40 mb-4">Opening Paragraph</h2>
              <Field label="Intro" required>
                <textarea
                  className="input-base min-h-[100px] resize-y"
                  value={props.intro}
                  onChange={e => updateField('intro', e.target.value)}
                  placeholder="Dear Members, Summer is here and we have a wonderful lineup of programs and events to share with you…"
                />
              </Field>
            </section>

            {/* Sections */}
            <section className="bg-white rounded-xl border border-tan-light p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-sans font-black uppercase tracking-widest text-charcoal/40">Sections</h2>
                <button
                  onClick={addSection}
                  className="flex items-center gap-1.5 text-xs font-sans font-bold uppercase tracking-widest text-tan hover:text-tan-dark transition-colors"
                >
                  <Plus size={14} /> Add Section
                </button>
              </div>

              {props.sections.map((section, i) => (
                <div key={i} className="border border-tan-light rounded-lg p-4 space-y-3 relative">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-sans font-black uppercase tracking-widest text-charcoal/30">Section {i + 1}</span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => moveSection(i, -1)} disabled={i === 0} className="p-1 text-charcoal/30 hover:text-charcoal disabled:opacity-20 transition-colors" title="Move up">
                        <ChevronUp size={14} />
                      </button>
                      <button onClick={() => moveSection(i, 1)} disabled={i === props.sections.length - 1} className="p-1 text-charcoal/30 hover:text-charcoal disabled:opacity-20 transition-colors" title="Move down">
                        <ChevronDown size={14} />
                      </button>
                      {props.sections.length > 1 && (
                        <button onClick={() => removeSection(i)} className="p-1 text-red-400 hover:text-red-600 transition-colors ml-1" title="Remove section">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                  <Field label="Section Title" required>
                    <input
                      className="input-base"
                      value={section.title}
                      onChange={e => updateSection(i, 'title', e.target.value)}
                      placeholder="Upcoming Program — July"
                    />
                  </Field>
                  <Field label="Body" required>
                    <textarea
                      className="input-base min-h-[80px] resize-y"
                      value={section.body}
                      onChange={e => updateSection(i, 'body', e.target.value)}
                      placeholder="Join us on Thursday, July 10th for an evening presentation on…"
                    />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Button Label" hint="Optional">
                      <input
                        className="input-base"
                        value={section.ctaLabel}
                        onChange={e => updateSection(i, 'ctaLabel', e.target.value)}
                        placeholder="Learn More"
                      />
                    </Field>
                    <Field label="Button URL" hint="Optional">
                      <input
                        className="input-base"
                        value={section.ctaUrl}
                        onChange={e => updateSection(i, 'ctaUrl', e.target.value)}
                        placeholder="https://senoiahistory.com/news"
                      />
                    </Field>
                  </div>
                </div>
              ))}
            </section>

            {/* Send controls */}
            <section className="bg-white rounded-xl border border-tan-light p-6 space-y-4">
              <h2 className="text-xs font-sans font-black uppercase tracking-widest text-charcoal/40 mb-2">Send</h2>

              <div className="flex gap-3 items-end">
                <Field label="Test Recipient" className="flex-grow">
                  <input
                    className="input-base"
                    type="email"
                    value={testEmail}
                    onChange={e => setTestEmail(e.target.value)}
                    placeholder="you@senoiahistory.com"
                  />
                </Field>
                <button
                  onClick={sendTest}
                  disabled={sendingTest}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-tan/10 border border-tan/30 text-tan font-sans text-xs font-black uppercase tracking-widest hover:bg-tan/20 transition-colors disabled:opacity-50 whitespace-nowrap"
                >
                  {sendingTest ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  Send Test
                </button>
              </div>

              <div className="border-t border-tan-light pt-4">
                <p className="text-xs font-sans text-charcoal/50 mb-3">
                  "Send to Members" creates a Resend broadcast draft. You'll confirm and send from the Resend dashboard.
                </p>
                <button
                  onClick={sendBroadcast}
                  disabled={sendingBroadcast}
                  className="flex items-center gap-2 px-6 py-3 rounded-lg bg-tan text-white font-sans text-xs font-black uppercase tracking-widest hover:bg-tan-dark transition-colors disabled:opacity-50 w-full justify-center"
                >
                  {sendingBroadcast ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  Send to Members
                </button>
              </div>
            </section>
          </div>

          {/* ── Right: Live Preview ── */}
          <div className="xl:sticky xl:top-24 xl:self-start">
            <div className="bg-white rounded-xl border border-tan-light overflow-hidden shadow-sm">
              <div className="flex items-center justify-between px-5 py-3 border-b border-tan-light bg-cream/50">
                <div className="flex items-center gap-2 text-xs font-sans font-black uppercase tracking-widest text-charcoal/40">
                  <Eye size={13} />
                  Live Preview
                </div>
                {previewLoading && <Loader2 size={13} className="animate-spin text-charcoal/30" />}
              </div>
              <div className="relative" style={{ height: 'calc(100vh - 220px)', minHeight: 500 }}>
                {previewHtml ? (
                  <iframe
                    srcDoc={previewHtml}
                    className="w-full h-full border-0"
                    title="Email preview"
                    sandbox="allow-same-origin"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-charcoal/30 gap-3">
                    <Mail size={32} />
                    <span className="text-sm font-sans">Preview will appear as you type</span>
                  </div>
                )}
                {previewLoading && previewHtml && (
                  <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] flex items-center justify-center">
                    <Loader2 size={20} className="animate-spin text-charcoal/40" />
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}

function Field({
  label,
  hint,
  required,
  children,
  className,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-xs font-sans font-bold uppercase tracking-widest text-charcoal/50 mb-1.5">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
        {hint && <span className="ml-2 normal-case tracking-normal font-normal text-charcoal/30">{hint}</span>}
      </label>
      {children}
    </div>
  );
}
