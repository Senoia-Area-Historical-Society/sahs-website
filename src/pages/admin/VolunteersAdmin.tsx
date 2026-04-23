import { useState, useEffect, useCallback } from 'react';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import AdminHeader from './AdminHeader';
import { useAuth } from '../../contexts/AuthContext';
import {
  Plus, ArrowLeft, Pencil, Users, Copy, Check, X, Trash2,
  ChevronUp, ChevronDown, Link as LinkIcon, Eye
} from 'lucide-react';
import {
  getVolunteerSheets, createVolunteerSheet, updateVolunteerSheet,
  getVolunteerSlots, saveVolunteerSlot, deleteVolunteerSlot,
  getRegistrations, updateRegistrationStatus
} from '../../services/api';
import type { VolunteerSheet, VolunteerSlot, VolunteerRegistration } from '../../types';

type View = 'list' | 'editor' | 'roster';

interface SlotDraft extends Partial<VolunteerSlot> {
  _key: string;
}

interface PostOption { id: string; title: string; eventDate?: any; location?: string; }

export default function VolunteersAdmin() {
  const { user } = useAuth();
  const [view, setView] = useState<View>('list');
  const [sheets, setSheets] = useState<VolunteerSheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Editor state
  const [editingSheet, setEditingSheet] = useState<Partial<VolunteerSheet> | null>(null);
  const [slots, setSlots] = useState<SlotDraft[]>([]);
  const [eventOptions, setEventOptions] = useState<PostOption[]>([]);

  // Roster state
  const [rosterSheet, setRosterSheet] = useState<VolunteerSheet | null>(null);
  const [rosterSlots, setRosterSlots] = useState<VolunteerSlot[]>([]);
  const [registrations, setRegistrations] = useState<VolunteerRegistration[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);

  const fetchSheets = useCallback(async () => {
    setLoading(true);
    setSheets(await getVolunteerSheets());
    setLoading(false);
  }, []);

  const fetchEventOptions = useCallback(async () => {
    try {
      const q = query(collection(db, 'posts'), orderBy('eventDate', 'asc'));
      const snap = await getDocs(q);
      const events = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as any))
        .filter((p: any) => p.type === 'event' || p.category === 'Event')
        .map((p: any) => ({ id: p.id, title: p.title, eventDate: p.eventDate, location: p.location || p.eventLocation }));
      setEventOptions(events);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchSheets(); fetchEventOptions(); }, [fetchSheets, fetchEventOptions]);

  const openEditor = async (sheet?: VolunteerSheet) => {
    if (sheet) {
      setEditingSheet({ ...sheet });
      const existing = await getVolunteerSlots(sheet.id);
      setSlots(existing.map(s => ({ ...s, _key: s.id })));
    } else {
      setEditingSheet({ status: 'draft', title: '' });
      setSlots([]);
    }
    setView('editor');
  };

  const openRoster = async (sheet: VolunteerSheet) => {
    setRosterSheet(sheet);
    setRosterLoading(true);
    setView('roster');
    const [sl, regs] = await Promise.all([
      getVolunteerSlots(sheet.id),
      getRegistrations(sheet.id),
    ]);
    setRosterSlots(sl);
    setRegistrations(regs);
    setRosterLoading(false);
  };

  const handleEventLink = (postId: string) => {
    const ev = eventOptions.find(e => e.id === postId);
    if (!ev) { setEditingSheet(s => ({ ...s, eventPostId: '' })); return; }
    setEditingSheet(s => ({
      ...s,
      eventPostId: ev.id,
      eventDate: ev.eventDate ?? null,
      eventLocation: ev.location || '',
    }));
  };

  const addSlot = () => {
    setSlots(prev => [...prev, {
      _key: crypto.randomUUID(),
      label: '',
      timeNote: '',
      shiftDuration: '',
      capacity: 5,
      filledCount: 0,
      sortOrder: prev.length,
      sheetId: editingSheet?.id || '',
    }]);
  };

  const updateSlot = (key: string, field: string, value: any) => {
    setSlots(prev => prev.map(s => s._key === key ? { ...s, [field]: value } : s));
  };

  const moveSlot = (key: string, dir: -1 | 1) => {
    setSlots(prev => {
      const idx = prev.findIndex(s => s._key === key);
      const next = idx + dir;
      if (next < 0 || next >= prev.length) return prev;
      const arr = [...prev];
      [arr[idx], arr[next]] = [arr[next], arr[idx]];
      return arr.map((s, i) => ({ ...s, sortOrder: i }));
    });
  };

  const removeSlot = (key: string) => {
    setSlots(prev => prev.filter(s => s._key !== key).map((s, i) => ({ ...s, sortOrder: i })));
  };

  const handleSaveSheet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSheet?.title) { alert('Title is required.'); return; }
    setSaving(true);
    try {
      let sheetId = editingSheet.id;
      if (sheetId) {
        await updateVolunteerSheet(sheetId, {
          title: editingSheet.title,
          description: editingSheet.description ?? null,
          eventPostId: editingSheet.eventPostId ?? null,
          eventDate: editingSheet.eventDate ?? null,
          eventLocation: editingSheet.eventLocation ?? null,
          status: editingSheet.status as VolunteerSheet['status'],
        });
      } else {
        sheetId = await createVolunteerSheet({
          title: editingSheet.title!,
          description: editingSheet.description ?? null,
          eventPostId: editingSheet.eventPostId ?? null,
          eventDate: editingSheet.eventDate ?? null,
          eventLocation: editingSheet.eventLocation ?? null,
          status: (editingSheet.status as VolunteerSheet['status']) || 'draft',
          createdBy: user?.email || 'admin',
        });
      }
      // Save slots
      for (const slot of slots) {
        await saveVolunteerSlot(sheetId!, {
          id: slot.id,
          sheetId: sheetId!,
          label: slot.label || '',
          timeNote: slot.timeNote ?? null,
          shiftDuration: slot.shiftDuration ?? null,
          capacity: Number(slot.capacity) || 1,
          filledCount: slot.filledCount || 0,
          sortOrder: slot.sortOrder || 0,
        } as VolunteerSlot & { id?: string });
      }
      await fetchSheets();
      setView('list');
    } catch (err) {
      console.error(err);
      alert('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSlot = async (slot: SlotDraft) => {
    if (!editingSheet?.id || !slot.id) { removeSlot(slot._key); return; }
    if (!confirm(`Delete slot "${slot.label}"?`)) return;
    await deleteVolunteerSlot(editingSheet.id, slot.id);
    removeSlot(slot._key);
  };

  const copyShareLink = async (sheet: VolunteerSheet) => {
    const url = `${window.location.origin}/volunteer/${sheet.shareToken}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(sheet.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCancelReg = async (reg: VolunteerRegistration) => {
    if (!rosterSheet || !confirm(`Remove ${reg.firstName} ${reg.lastName} from this slot?`)) return;
    await updateRegistrationStatus(rosterSheet.id, reg.id, 'cancelled');
    setRegistrations(prev => prev.map(r => r.id === reg.id ? { ...r, status: 'cancelled' } : r));
  };

  const exportCSV = () => {
    if (!rosterSheet) return;
    const rows = registrations.filter(r => r.status === 'confirmed').map(r => [
      r.slotLabel, r.slotTimeNote || '', r.firstName, r.lastName, r.email, r.phone || '', r.notes || '',
      r.signedUpAt ? (r.signedUpAt as any).toDate().toLocaleDateString() : ''
    ]);
    const csv = [['Slot', 'Time', 'First Name', 'Last Name', 'Email', 'Phone', 'Notes', 'Signed Up'], ...rows]
      .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `${rosterSheet.title.replace(/\s+/g, '_')}_volunteers.csv`;
    a.click();
  };

  const statusBadge = (status: string) => {
    const cls = status === 'active' ? 'bg-green-100 text-green-800'
      : status === 'closed' ? 'bg-gray-100 text-gray-800'
      : 'bg-yellow-100 text-yellow-800';
    return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${cls}`}>{status}</span>;
  };

  // ── Roster View ────────────────────────────────────────────────────────────
  if (view === 'roster' && rosterSheet) {
    const confirmedBySlot = rosterSlots.map(slot => ({
      slot,
      regs: registrations.filter(r => r.slotId === slot.id && r.status === 'confirmed'),
    }));
    const totalConfirmed = registrations.filter(r => r.status === 'confirmed').length;

    return (
      <div className="min-h-screen bg-cream flex flex-col">
        <AdminHeader />
        <main className="flex-grow p-8 max-w-7xl mx-auto w-full">
          <button onClick={() => setView('list')} className="flex items-center gap-2 text-charcoal/60 hover:text-charcoal mb-6">
            <ArrowLeft size={16} /> Back to Volunteers
          </button>
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-3xl font-serif text-charcoal">{rosterSheet.title}</h2>
              <p className="text-sm text-charcoal/60 mt-1">{totalConfirmed} confirmed volunteer{totalConfirmed !== 1 ? 's' : ''}</p>
            </div>
            <button onClick={exportCSV} className="flex items-center gap-2 bg-tan hover:bg-tan-dark text-white px-5 py-2 rounded-md text-sm font-bold uppercase tracking-wider transition-colors">
              Export CSV
            </button>
          </div>
          {rosterLoading ? (
            <div className="text-center py-12 text-charcoal/60">Loading roster...</div>
          ) : (
            <div className="space-y-6">
              {confirmedBySlot.map(({ slot, regs }) => (
                <div key={slot.id} className="bg-white rounded-lg shadow-sm border border-tan-light overflow-hidden">
                  <div className="bg-cream px-6 py-3 flex items-center justify-between border-b border-tan-light">
                    <div>
                      <span className="font-bold text-charcoal">{slot.label}</span>
                      {slot.timeNote && <span className="ml-2 text-sm text-charcoal/60">{slot.timeNote}</span>}
                      {slot.shiftDuration && <span className="ml-2 text-xs bg-tan/20 text-tan px-2 py-0.5 rounded-full">{slot.shiftDuration}</span>}
                    </div>
                    <span className="text-sm font-medium text-charcoal/70">{regs.length} / {slot.capacity} filled</span>
                  </div>
                  {regs.length === 0 ? (
                    <div className="p-6 text-sm text-charcoal/50 italic">No volunteers signed up for this slot.</div>
                  ) : (
                    <table className="w-full text-left border-collapse text-sm">
                      <thead><tr className="border-b border-tan-light/50">
                        <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-charcoal/50">Name</th>
                        <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-charcoal/50">Email</th>
                        <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-charcoal/50">Phone</th>
                        <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-charcoal/50">Signed Up</th>
                        <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-charcoal/50 text-right">Actions</th>
                      </tr></thead>
                      <tbody>
                        {regs.map(reg => (
                          <tr key={reg.id} className="border-b border-tan-light/30 last:border-0 hover:bg-cream/40">
                            <td className="px-6 py-3 font-medium text-charcoal">{reg.firstName} {reg.lastName}</td>
                            <td className="px-6 py-3 text-charcoal/70">{reg.email}</td>
                            <td className="px-6 py-3 text-charcoal/70">{reg.phone || '—'}</td>
                            <td className="px-6 py-3 text-charcoal/60 text-xs">
                              {reg.signedUpAt ? (reg.signedUpAt as any).toDate().toLocaleDateString() : '—'}
                            </td>
                            <td className="px-6 py-3 text-right">
                              <button onClick={() => handleCancelReg(reg)} title="Remove registration" className="text-charcoal/40 hover:text-red-600 transition-colors">
                                <X size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    );
  }

  // ── Editor View ────────────────────────────────────────────────────────────
  if (view === 'editor') {
    return (
      <div className="min-h-screen bg-cream flex flex-col">
        <AdminHeader />
        <main className="flex-grow p-8 max-w-5xl mx-auto w-full">
          <button onClick={() => setView('list')} className="flex items-center gap-2 text-charcoal/60 hover:text-charcoal mb-6">
            <ArrowLeft size={16} /> Back to Volunteers
          </button>
          <h2 className="text-2xl font-serif text-charcoal mb-6">
            {editingSheet?.id ? 'Edit Volunteer Sheet' : 'New Volunteer Sheet'}
          </h2>
          <form onSubmit={handleSaveSheet} className="space-y-6">
            {/* Sheet Details */}
            <div className="bg-white rounded-lg shadow-sm border border-tan-light p-6 space-y-5">
              <h3 className="font-bold text-charcoal uppercase tracking-wider text-sm border-b border-tan-light pb-3">Sheet Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-bold text-charcoal mb-1">Title <span className="text-red-500">*</span></label>
                  <input type="text" required value={editingSheet?.title || ''} onChange={e => setEditingSheet(s => ({ ...s, title: e.target.value }))}
                    className="w-full px-4 py-2 border border-tan-light rounded-md focus:outline-none focus:ring-2 focus:ring-tan/50" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-charcoal mb-1">Status</label>
                  <select value={editingSheet?.status || 'draft'} onChange={e => setEditingSheet(s => ({ ...s, status: e.target.value as any }))}
                    className="w-full px-4 py-2 border border-tan-light rounded-md focus:outline-none focus:ring-2 focus:ring-tan/50">
                    <option value="draft">Draft</option>
                    <option value="active">Active (Public)</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-charcoal mb-1">Description</label>
                <textarea rows={3} value={editingSheet?.description || ''} onChange={e => setEditingSheet(s => ({ ...s, description: e.target.value }))}
                  placeholder="Brief description shown to volunteers on the public signup page..."
                  className="w-full px-4 py-2 border border-tan-light rounded-md focus:outline-none focus:ring-2 focus:ring-tan/50 resize-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-charcoal mb-1 flex items-center gap-1">
                  <LinkIcon size={14} /> Link to Event
                </label>
                <select value={editingSheet?.eventPostId || ''} onChange={e => handleEventLink(e.target.value)}
                  className="w-full px-4 py-2 border border-tan-light rounded-md focus:outline-none focus:ring-2 focus:ring-tan/50">
                  <option value="">— No linked event —</option>
                  {eventOptions.map(ev => (
                    <option key={ev.id} value={ev.id}>{ev.title}</option>
                  ))}
                </select>
                {editingSheet?.eventPostId && (
                  <div className="mt-2 flex gap-4 text-xs text-charcoal/60 bg-tan/5 rounded p-2 border border-tan/20">
                    {editingSheet.eventDate && <span>📅 {(editingSheet.eventDate as any).toDate?.().toLocaleDateString() || String(editingSheet.eventDate)}</span>}
                    {editingSheet.eventLocation && <span>📍 {editingSheet.eventLocation}</span>}
                  </div>
                )}
              </div>
            </div>

            {/* Slot Builder */}
            <div className="bg-white rounded-lg shadow-sm border border-tan-light p-6 space-y-4">
              <div className="flex justify-between items-center border-b border-tan-light pb-3">
                <h3 className="font-bold text-charcoal uppercase tracking-wider text-sm">Volunteer Slots</h3>
                <button type="button" onClick={addSlot} className="flex items-center gap-1.5 text-tan hover:text-tan-dark text-sm font-bold uppercase tracking-wider transition-colors">
                  <Plus size={16} /> Add Slot
                </button>
              </div>
              {slots.length === 0 && (
                <p className="text-sm text-charcoal/50 italic py-4 text-center">No slots yet. Click "Add Slot" to create volunteer roles.</p>
              )}
              <div className="space-y-3">
                {slots.map((slot, idx) => (
                  <div key={slot._key} className="border border-tan-light rounded-lg p-4 bg-cream/30">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-charcoal/60 mb-1 uppercase tracking-wider">Role / Label *</label>
                        <input type="text" required value={slot.label || ''} onChange={e => updateSlot(slot._key, 'label', e.target.value)}
                          placeholder="e.g. Greet guests at entrance"
                          className="w-full px-3 py-2 border border-tan-light rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-tan/50" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-charcoal/60 mb-1 uppercase tracking-wider">Capacity</label>
                        <input type="number" min={1} value={slot.capacity || 1} onChange={e => updateSlot(slot._key, 'capacity', parseInt(e.target.value))}
                          className="w-full px-3 py-2 border border-tan-light rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-tan/50" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-charcoal/60 mb-1 uppercase tracking-wider">Duration</label>
                        <input type="text" value={slot.shiftDuration || ''} onChange={e => updateSlot(slot._key, 'shiftDuration', e.target.value)}
                          placeholder="e.g. 2 hours"
                          className="w-full px-3 py-2 border border-tan-light rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-tan/50" />
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <input type="text" value={slot.timeNote || ''} onChange={e => updateSlot(slot._key, 'timeNote', e.target.value)}
                        placeholder="Time note (e.g. 9:00 AM – 11:00 AM)"
                        className="flex-1 px-3 py-1.5 border border-tan-light rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-tan/50" />
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => moveSlot(slot._key, -1)} disabled={idx === 0} className="p-1 text-charcoal/40 hover:text-charcoal disabled:opacity-20 transition-colors"><ChevronUp size={16} /></button>
                        <button type="button" onClick={() => moveSlot(slot._key, 1)} disabled={idx === slots.length - 1} className="p-1 text-charcoal/40 hover:text-charcoal disabled:opacity-20 transition-colors"><ChevronDown size={16} /></button>
                        <button type="button" onClick={() => handleDeleteSlot(slot)} className="p-1 text-charcoal/40 hover:text-red-600 transition-colors ml-1"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-4">
              <button type="button" onClick={() => setView('list')} className="px-6 py-2 border border-tan text-tan rounded hover:bg-tan/10 transition-colors font-bold uppercase tracking-widest text-sm">Cancel</button>
              <button type="submit" disabled={saving} className="px-6 py-2 bg-tan text-white rounded hover:bg-tan-dark transition-colors font-bold uppercase tracking-widest text-sm disabled:opacity-60">
                {saving ? 'Saving...' : 'Save Sheet'}
              </button>
            </div>
          </form>
        </main>
      </div>
    );
  }

  // ── List View ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <AdminHeader />
      <main className="flex-grow p-8 max-w-7xl mx-auto w-full">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-serif text-charcoal">Volunteers</h2>
            <p className="text-sm text-charcoal/60 mt-1">Create and manage volunteer signup sheets for SAHS events.</p>
          </div>
          <button onClick={() => openEditor()} className="flex items-center gap-2 bg-tan hover:bg-tan-dark text-white px-6 py-2 rounded-md transition-colors font-sans text-sm font-bold uppercase tracking-wider shadow-sm">
            <Plus size={18} /> New Sheet
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-charcoal/60">Loading volunteer sheets...</div>
        ) : sheets.length === 0 ? (
          <div className="bg-white rounded-lg border border-tan-light p-12 text-center">
            <Users size={40} className="mx-auto text-tan/40 mb-4" />
            <p className="text-charcoal/60 font-serif text-lg">No volunteer sheets yet.</p>
            <p className="text-sm text-charcoal/40 mt-1 mb-6">Create your first sheet to start managing volunteers for SAHS events.</p>
            <button onClick={() => openEditor()} className="inline-flex items-center gap-2 bg-tan text-white px-6 py-2 rounded-md text-sm font-bold uppercase tracking-wider hover:bg-tan-dark transition-colors">
              <Plus size={16} /> Create First Sheet
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-tan-light overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-cream border-b border-tan-light">
                  <th className="p-4 font-sans font-bold text-xs uppercase tracking-wider text-charcoal/60">Sheet / Event</th>
                  <th className="p-4 font-sans font-bold text-xs uppercase tracking-wider text-charcoal/60">Status</th>
                  <th className="p-4 font-sans font-bold text-xs uppercase tracking-wider text-charcoal/60">Event Date</th>
                  <th className="p-4 font-sans font-bold text-xs uppercase tracking-wider text-charcoal/60 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sheets.map(sheet => (
                  <tr key={sheet.id} className="border-b border-tan-light/50 last:border-0 hover:bg-cream/50 transition-colors">
                    <td className="p-4">
                      <p className="font-serif text-charcoal font-medium">{sheet.title}</p>
                      {sheet.eventLocation && <p className="text-xs text-charcoal/50 mt-0.5">📍 {sheet.eventLocation}</p>}
                    </td>
                    <td className="p-4">{statusBadge(sheet.status)}</td>
                    <td className="p-4 text-sm text-charcoal/70">
                      {sheet.eventDate ? (sheet.eventDate as any).toDate?.().toLocaleDateString() : '—'}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3 justify-end">
                        <button onClick={() => copyShareLink(sheet)} title="Copy public share link"
                          className="text-charcoal/50 hover:text-tan transition-colors">
                          {copiedId === sheet.id ? <Check size={18} className="text-green-600" /> : <Copy size={18} />}
                        </button>
                        <button onClick={() => openRoster(sheet)} title="View volunteer roster" className="text-charcoal/50 hover:text-tan transition-colors">
                          <Eye size={18} />
                        </button>
                        <button onClick={() => openEditor(sheet)} title="Edit sheet" className="text-charcoal/50 hover:text-tan transition-colors">
                          <Pencil size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
