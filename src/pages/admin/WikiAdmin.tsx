import { useState, useEffect } from 'react';
import { collection, query, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import AdminHeader from './AdminHeader';
import RichTextEditor from '../../components/admin/RichTextEditor';
import { Pencil, Trash2, Plus, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface WikiPage {
  id: string;
  title: string;
  slug: string;
  content: string;
  category: string;
  lastModifiedBy: string;
  createdAt: any;
  updatedAt: any;
}

export default function WikiAdmin() {
  const [pages, setPages] = useState<WikiPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPage, setEditingPage] = useState<WikiPage | Partial<WikiPage> | null>(null);
  const { user } = useAuth();

  const fetchPages = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'wiki'), orderBy('category'), orderBy('title'));
      const snapshot = await getDocs(q);
      const fetchedPages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WikiPage));
      setPages(fetchedPages);
    } catch (err) {
      console.error("Error fetching wiki pages:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPages();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPage || !editingPage.title || !editingPage.category) {
      alert("Please fill in required fields.");
      return;
    }

    try {
      const pageData = {
        ...editingPage,
        slug: editingPage.slug || editingPage.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        lastModifiedBy: user?.email || 'Admin',
        updatedAt: serverTimestamp(),
      };

      if (editingPage.id) {
        await updateDoc(doc(db, 'wiki', editingPage.id), pageData);
      } else {
        await addDoc(collection(db, 'wiki'), {
          ...pageData,
          createdAt: serverTimestamp(),
        });
      }
      
      setEditingPage(null);
      fetchPages();
    } catch (err) {
      console.error("Error saving wiki page:", err);
      alert("Failed to save wiki page.");
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this wiki page?")) {
      await deleteDoc(doc(db, 'wiki', id));
      fetchPages();
    }
  };

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <AdminHeader />
      <main className="flex-grow p-8 max-w-7xl mx-auto w-full">
        {editingPage !== null ? (
          <div className="bg-white rounded-lg shadow-sm border border-tan-light p-6">
            <button 
              onClick={() => setEditingPage(null)}
              className="flex items-center gap-2 text-charcoal/60 hover:text-charcoal mb-6"
            >
              <ArrowLeft size={16} /> Back to Wiki
            </button>
            <h2 className="text-2xl font-serif text-charcoal mb-6">
              {editingPage.id ? 'Edit Wiki Page' : 'New Wiki Page'}
            </h2>
            <form onSubmit={handleSave} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-charcoal mb-2">Title</label>
                  <input
                    type="text"
                    required
                    value={editingPage.title || ''}
                    onChange={e => setEditingPage({...editingPage, title: e.target.value})}
                    className="w-full px-4 py-2 border border-tan-light rounded-md focus:outline-none focus:ring-2 focus:ring-tan/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-charcoal mb-2">Category</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Policies, Guides, General"
                    value={editingPage.category || ''}
                    onChange={e => setEditingPage({...editingPage, category: e.target.value})}
                    className="w-full px-4 py-2 border border-tan-light rounded-md focus:outline-none focus:ring-2 focus:ring-tan/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-charcoal mb-2">Content</label>
                <RichTextEditor
                  value={editingPage.content || ''}
                  onChange={(content) => setEditingPage({...editingPage, content})}
                  storagePath="wiki_images"
                />
              </div>

              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => setEditingPage(null)}
                  className="px-6 py-2 border border-tan text-tan rounded hover:bg-tan/10 transition-colors font-bold uppercase tracking-widest text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-tan text-white rounded hover:bg-tan-dark transition-colors font-bold uppercase tracking-widest text-sm"
                >
                  Save Page
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div>
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-serif text-charcoal">Internal Wiki</h2>
              <button 
                onClick={() => setEditingPage({})}
                className="flex items-center gap-2 bg-tan hover:bg-tan-dark text-white px-6 py-2 rounded-md transition-colors font-sans text-sm font-bold uppercase tracking-wider shadow-sm"
              >
                <Plus size={18} />
                New Page
              </button>
            </div>

            {loading ? (
              <div className="text-center py-12 text-charcoal/60">Loading wiki...</div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-tan-light overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-cream border-b border-tan-light">
                      <th className="p-4 font-sans font-bold text-xs uppercase tracking-wider text-charcoal/60">Title</th>
                      <th className="p-4 font-sans font-bold text-xs uppercase tracking-wider text-charcoal/60">Category</th>
                      <th className="p-4 font-sans font-bold text-xs uppercase tracking-wider text-charcoal/60">Last Modified</th>
                      <th className="p-4 font-sans font-bold text-xs uppercase tracking-wider text-charcoal/60 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pages.map((page) => (
                      <tr key={page.id} className="border-b border-tan-light/50 last:border-0 hover:bg-cream/50 transition-colors">
                        <td className="p-4 font-serif text-charcoal">{page.title}</td>
                        <td className="p-4 text-sm text-charcoal/80">
                          <span className="bg-tan/20 text-tan-dark px-2 py-1 rounded text-xs font-bold uppercase">{page.category}</span>
                        </td>
                        <td className="p-4 text-xs text-charcoal/60">
                          {page.lastModifiedBy}<br/>
                          {page.updatedAt?.toDate().toLocaleDateString() || 'N/A'}
                        </td>
                        <td className="p-4 flex gap-3 justify-end">
                          <button onClick={() => setEditingPage(page)} className="text-charcoal/60 hover:text-tan transition-colors">
                            <Pencil size={18} />
                          </button>
                          <button onClick={() => handleDelete(page.id)} className="text-charcoal/60 hover:text-red-600 transition-colors">
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {pages.length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-charcoal/60">No wiki pages found. Start by migrating the Google Doc.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
