import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getVolunteerSheetByToken, getVolunteerSlots, submitVolunteerSignup } from '../services/api';
import type { VolunteerSheet, VolunteerSlot } from '../types';
import { MapPin, Calendar, Users, CheckCircle, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

export default function VolunteerSignup() {
  const { token } = useParams<{ token: string }>();
  const [sheet, setSheet] = useState<VolunteerSheet | null>(null);
  const [slots, setSlots] = useState<VolunteerSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [expandedSlot, setExpandedSlot] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successSlot, setSuccessSlot] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', notes: '' });

  useEffect(() => {
    if (!token) { setNotFound(true); setLoading(false); return; }
    (async () => {
      const s = await getVolunteerSheetByToken(token);
      if (!s) { setNotFound(true); setLoading(false); return; }
      setSheet(s);
      if (s.status === 'active') setSlots(await getVolunteerSlots(s.id));
      setLoading(false);
    })();
  }, [token]);

  const handleToggleSlot = (slotId: string) => {
    setExpandedSlot(prev => prev === slotId ? null : slotId);
    setErrorMsg(null);
    setForm({ firstName: '', lastName: '', email: '', phone: '', notes: '' });
  };

  const handleSubmit = async (e: React.FormEvent, slot: VolunteerSlot) => {
    e.preventDefault();
    if (!sheet) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await submitVolunteerSignup(sheet.id, {
        slotId: slot.id,
        slotLabel: slot.label,
        slotTimeNote: slot.timeNote,
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone || undefined,
        notes: form.notes || undefined,
      });
      setSuccessSlot(slot.id);
      setExpandedSlot(null);
      // Update slot count locally
      setSlots(prev => prev.map(s => s.id === slot.id ? { ...s, filledCount: s.filledCount + 1 } : s));
    } catch (err: any) {
      setErrorMsg(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (ts: any) => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <p className="font-serif text-charcoal/60 text-lg">Loading signup sheet...</p>
      </div>
    );
  }

  if (notFound || !sheet) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-4">
        <div className="text-center">
          <AlertCircle size={48} className="mx-auto text-tan/50 mb-4" />
          <h1 className="text-2xl font-serif text-charcoal mb-2">Signup Sheet Not Found</h1>
          <p className="text-charcoal/60">This link may be invalid or the sheet has been removed.</p>
        </div>
      </div>
    );
  }

  if (sheet.status !== 'active') {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <Users size={48} className="mx-auto text-tan/50 mb-4" />
          <h1 className="text-2xl font-serif text-charcoal mb-2">{sheet.title}</h1>
          <p className="text-charcoal/60 mt-2">
            {sheet.status === 'closed'
              ? 'Volunteer signups for this event are now closed.'
              : 'This signup sheet is not yet open. Please check back soon.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <p className="text-xs font-bold uppercase tracking-widest text-tan mb-3">Volunteer Signup</p>
          <h1 className="text-3xl md:text-4xl font-serif text-charcoal mb-4">{sheet.title}</h1>
          {sheet.description && (
            <p className="text-charcoal/70 leading-relaxed">{sheet.description}</p>
          )}
          <div className="flex flex-wrap justify-center gap-5 mt-5 text-sm text-charcoal/60">
            {sheet.eventDate && (
              <span className="flex items-center gap-1.5">
                <Calendar size={15} className="text-tan" />
                {formatDate(sheet.eventDate)}
              </span>
            )}
            {sheet.eventLocation && (
              <span className="flex items-center gap-1.5">
                <MapPin size={15} className="text-tan" />
                {sheet.eventLocation}
              </span>
            )}
          </div>
        </div>

        {/* Success banner */}
        {successSlot && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
            <CheckCircle size={20} className="text-green-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-bold text-green-800">You're signed up!</p>
              <p className="text-sm text-green-700 mt-0.5">A confirmation email has been sent to {form.email || 'your email address'}. Thank you for volunteering!</p>
            </div>
          </div>
        )}

        {/* Slots */}
        <div className="space-y-3">
          {slots.map(slot => {
            const isFull = slot.filledCount >= slot.capacity;
            const isExpanded = expandedSlot === slot.id;
            const isSuccess = successSlot === slot.id;
            const fillPct = Math.min(100, Math.round((slot.filledCount / slot.capacity) * 100));

            return (
              <div key={slot.id} className={`bg-white rounded-xl border transition-all duration-200 ${
                isFull ? 'border-tan-light/50 opacity-70' : isExpanded ? 'border-tan shadow-md' : 'border-tan-light hover:border-tan/50 hover:shadow-sm'
              }`}>
                <button
                  type="button"
                  disabled={isFull || !!successSlot}
                  onClick={() => handleToggleSlot(slot.id)}
                  className="w-full text-left px-6 py-4 flex items-center justify-between gap-4 disabled:cursor-default"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-bold text-charcoal">{slot.label}</span>
                      {isFull && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">Full</span>}
                      {isSuccess && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1"><CheckCircle size={12} /> Signed up!</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-charcoal/55 flex-wrap">
                      {slot.timeNote && <span>{slot.timeNote}</span>}
                      {slot.shiftDuration && <span className="bg-tan/10 text-tan px-2 py-0.5 rounded-full">{slot.shiftDuration}</span>}
                    </div>
                    {/* Progress bar */}
                    <div className="mt-3 flex items-center gap-3">
                      <div className="flex-1 h-1.5 bg-cream rounded-full overflow-hidden">
                        <div className="h-full bg-tan rounded-full transition-all duration-500" style={{ width: `${fillPct}%` }} />
                      </div>
                      <span className="text-xs text-charcoal/50 shrink-0">{slot.filledCount} / {slot.capacity}</span>
                    </div>
                  </div>
                  {!isFull && !successSlot && (
                    <div className="shrink-0 text-tan">
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                  )}
                </button>

                {/* Signup Form */}
                {isExpanded && !isFull && (
                  <div className="px-6 pb-6 border-t border-tan-light/50">
                    <p className="text-sm text-charcoal/60 mt-4 mb-4">Fill in your information to sign up for <strong>{slot.label}</strong>.</p>
                    {errorMsg && (
                      <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-sm text-red-700">
                        <AlertCircle size={16} /> {errorMsg}
                      </div>
                    )}
                    <form onSubmit={e => handleSubmit(e, slot)} className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-charcoal mb-1 uppercase tracking-wider">First Name *</label>
                          <input type="text" required value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                            className="w-full px-3 py-2 border border-tan-light rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-tan/50" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-charcoal mb-1 uppercase tracking-wider">Last Name *</label>
                          <input type="text" required value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                            className="w-full px-3 py-2 border border-tan-light rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-tan/50" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-charcoal mb-1 uppercase tracking-wider">Email Address *</label>
                        <input type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                          className="w-full px-3 py-2 border border-tan-light rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-tan/50" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-charcoal mb-1 uppercase tracking-wider">Phone</label>
                          <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                            className="w-full px-3 py-2 border border-tan-light rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-tan/50" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-charcoal mb-1 uppercase tracking-wider">Notes (optional)</label>
                        <textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                          placeholder="Any questions or comments..."
                          className="w-full px-3 py-2 border border-tan-light rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-tan/50 resize-none" />
                      </div>
                      <div className="flex gap-3 pt-1">
                        <button type="button" onClick={() => setExpandedSlot(null)} className="px-4 py-2 border border-tan-light text-charcoal/60 rounded-md text-sm hover:bg-cream transition-colors">Cancel</button>
                        <button type="submit" disabled={submitting}
                          className="flex-1 py-2 bg-tan hover:bg-tan-dark text-white rounded-md text-sm font-bold uppercase tracking-wider transition-colors disabled:opacity-60">
                          {submitting ? 'Signing up...' : 'Sign Me Up!'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <p className="text-center text-xs text-charcoal/40 mt-10">
          Questions? Contact us at <a href="mailto:info@senoiahistory.com" className="underline hover:text-tan">info@senoiahistory.com</a>
        </p>
      </div>
    </div>
  );
}
