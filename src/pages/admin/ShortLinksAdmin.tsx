import { useEffect, useState } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { ShortLink } from '../../types';
import { Loader2, Link as LinkIcon, Trash2, ExternalLink } from 'lucide-react';
import AdminHeader from './AdminHeader';
import ErrorBanner from '../../components/admin/ErrorBanner';
import { format } from 'date-fns';

export default function ShortLinksAdmin() {
  const [links, setLinks] = useState<ShortLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  
  const [newSlug, setNewSlug] = useState('');
  const [newTarget, setNewTarget] = useState('');
  const [saving, setSaving] = useState(false);
  
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadLinks();
  }, []);

  const loadLinks = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const q = query(collection(db, 'shortlinks'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ShortLink));
      setLinks(data);
    } catch (err: any) {
      console.error('Failed to load shortlinks', err);
      setLoadError(err?.message || 'Failed to load shortlinks.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSlug || !newTarget) return;
    
    // basic validation
    const slug = newSlug.trim().replace(/^\/+/, '').replace(/\/+$/, '');
    let target = newTarget.trim();
    if (!target.startsWith('http://') && !target.startsWith('https://')) {
      target = 'https://' + target;
    }

    setSaving(true);
    try {
      await addDoc(collection(db, 'shortlinks'), {
        slug,
        targetUrl: target,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setNewSlug('');
      setNewTarget('');
      loadLinks();
    } catch (err) {
      console.error('Failed to create shortlink', err);
      alert('Failed to create shortlink. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, slug: string) => {
    if (!confirm(`Are you sure you want to delete the shortlink for /${slug}?`)) return;
    
    setDeletingId(id);
    try {
      await deleteDoc(doc(db, 'shortlinks', id));
      setLinks(prev => prev.filter(l => l.id !== id));
    } catch (err) {
      console.error('Failed to delete shortlink', err);
      alert('Failed to delete shortlink.');
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (val: any) => {
    if (!val) return '—';
    const d = typeof val === 'string' ? new Date(val) : val.toDate?.() ?? new Date(val);
    return format(d, 'PP');
  };

  return (
    <div className="bg-cream min-h-screen font-serif text-charcoal flex flex-col">
      <AdminHeader />
      <main className="flex-grow p-8 max-w-5xl mx-auto w-full">
        <header className="mb-8 border-b border-tan pb-6">
          <h1 className="text-4xl font-bold mb-1">Short Link Manager</h1>
          <p className="text-charcoal/60 font-sans text-sm">Create and manage custom sahs.site URL redirects.</p>
        </header>

        {/* Create Form */}
        <div className="bg-white rounded-lg shadow-sm border border-tan-light p-6 mb-8">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><LinkIcon size={20} className="text-tan" /> Create New Link</h2>
          <form onSubmit={handleCreate} className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="block text-xs font-bold font-sans text-charcoal/60 uppercase tracking-wider mb-1">Custom Slug</label>
              <div className="flex rounded-lg border border-tan-light overflow-hidden focus-within:ring-2 focus-within:ring-tan/50">
                <span className="bg-cream px-3 py-2 text-charcoal/50 font-mono text-sm border-r border-tan-light flex items-center">sahs.site/</span>
                <input 
                  type="text" 
                  value={newSlug} 
                  onChange={e => setNewSlug(e.target.value)}
                  placeholder="e.g. spring-event"
                  className="w-full px-3 py-2 font-mono text-sm focus:outline-none"
                  required
                />
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-bold font-sans text-charcoal/60 uppercase tracking-wider mb-1">Target URL</label>
              <input 
                type="url" 
                value={newTarget} 
                onChange={e => setNewTarget(e.target.value)}
                placeholder="https://example.com/some/long/path"
                className="w-full px-3 py-2 border border-tan-light rounded-lg font-sans text-sm focus:outline-none focus:ring-2 focus:ring-tan/50"
                required
              />
            </div>
            <button 
              type="submit" 
              disabled={saving}
              className="bg-charcoal text-white px-6 py-2 rounded-lg font-bold uppercase tracking-wider text-sm hover:bg-black transition-colors disabled:opacity-50 h-[38px] flex items-center justify-center shrink-0"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : 'Create'}
            </button>
          </form>
        </div>

        {loadError && <ErrorBanner message={`Failed to load shortlinks: ${loadError}.`} />}

        {/* Links List */}
        {loading ? (
          <div className="flex justify-center items-center h-48"><Loader2 className="animate-spin h-10 w-10 text-tan" /></div>
        ) : links.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-lg border border-tan/20">
            <LinkIcon className="mx-auto h-12 w-12 text-charcoal/20 mb-4" />
            <p className="text-lg font-sans italic text-charcoal/60">No custom shortlinks created yet.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-tan-light overflow-hidden">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-cream border-b border-tan-light">
                  <th className="px-4 py-3 font-sans font-bold text-xs uppercase tracking-wider text-charcoal/50">Slug</th>
                  <th className="px-4 py-3 font-sans font-bold text-xs uppercase tracking-wider text-charcoal/50">Target URL</th>
                  <th className="px-4 py-3 font-sans font-bold text-xs uppercase tracking-wider text-charcoal/50">Created</th>
                  <th className="px-4 py-3 font-sans font-bold text-xs uppercase tracking-wider text-charcoal/50 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {links.map(link => (
                  <tr key={link.id} className="border-b border-tan-light/50 last:border-0 hover:bg-cream/40 transition-colors">
                    <td className="px-4 py-3">
                      <a href={`https://sahs.site/${link.slug}`} target="_blank" rel="noreferrer" className="font-mono text-tan font-bold flex items-center gap-1 hover:underline">
                        /{link.slug} <ExternalLink size={12} />
                      </a>
                    </td>
                    <td className="px-4 py-3 text-charcoal/80 max-w-md truncate" title={link.targetUrl}>
                      {link.targetUrl}
                    </td>
                    <td className="px-4 py-3 text-charcoal/60 text-xs">
                      {formatDate(link.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(link.id, link.slug)}
                        disabled={deletingId === link.id}
                        className="text-charcoal/40 hover:text-red-600 transition-colors disabled:opacity-40 inline-flex items-center"
                        title="Delete shortlink"
                      >
                        {deletingId === link.id ? <Loader2 size={17} className="animate-spin" /> : <Trash2 size={17} />}
                      </button>
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
