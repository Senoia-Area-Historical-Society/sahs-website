import { useState, useEffect } from 'react';
import { collection, query, getDocs, addDoc, updateDoc, doc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import AdminHeader from './AdminHeader';
import RichTextEditor from '../../components/admin/RichTextEditor';
import { Pencil, Archive, Plus, ArrowLeft, Ticket as TicketIcon } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface Post {
  id: string;
  title: string;
  slug: string;
  content: string;
  author: string;
  category: 'Blog' | 'News' | 'Event';
  status: 'draft' | 'published' | 'archived';
  eventStartDate?: string;
  eventEndDate?: string;
  eventLocation?: string;
  publishDate?: any;
  createdAt: any;
  updatedAt: any;
  // Ticketing fields (stored in Firestore)
  ticketPrice?: number | null;
  capacity?: number | null;
  ticketsSold?: number;
  // Editor-only ephemeral fields (stripped before save)
  _enableTicketing?: boolean;
  _ticketPriceDisplay?: string;
  [key: string]: any;
}

export default function ContentAdmin() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPost, setEditingPost] = useState<Post | Partial<Post> | null>(null);
  const { user } = useAuth();

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const fetchedPosts = snapshot.docs.map(doc => {
        const data = doc.data();
        let category = data.category;
        if (!category) {
          category = data.type === 'event' ? 'Event' : 'News';
        }
        return { id: doc.id, ...data, category } as Post;
      });
      setPosts(fetchedPosts);
    } catch (err) {
      console.error("Error fetching posts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPost || !editingPost.title || !editingPost.category) {
      alert("Please fill in required fields.");
      return;
    }

    try {
      const isEvent = editingPost.category === 'Event';
      const postData: any = {
        ...editingPost,
        type: isEvent ? 'event' : 'news',
        slug: editingPost.slug || editingPost.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        author: editingPost.author || user?.email || 'Admin',
        status: editingPost.status || 'draft',
        updatedAt: serverTimestamp(),
      };

      if (!editingPost.id) {
        postData.createdAt = serverTimestamp();
        postData.publishDate = serverTimestamp();
      } else if (editingPost.status === 'published' && !editingPost.publishDate) {
        postData.publishDate = serverTimestamp();
      }

      if (isEvent && editingPost.eventStartDate) {
        postData.eventDate = new Date(editingPost.eventStartDate);
        postData.location = editingPost.eventLocation || '';
      }

      // Ticketing config — convert display price ($) to cents for Stripe
      if (isEvent) {
        const enableTicketing = editingPost._enableTicketing;
        if (enableTicketing && editingPost._ticketPriceDisplay) {
          postData.ticketPrice = Math.round(parseFloat(editingPost._ticketPriceDisplay) * 100);
          postData.capacity = parseInt(String(editingPost.capacity)) || null;
        } else if (!enableTicketing) {
          postData.ticketPrice = null;
          postData.capacity = null;
        }
        // Never overwrite ticketsSold from the editor
        delete postData.ticketsSold;
        // Clean up display-only fields
        delete postData._enableTicketing;
        delete postData._ticketPriceDisplay;
      }

      if (editingPost.id) {
        await updateDoc(doc(db, 'posts', editingPost.id), postData);
      } else {
        await addDoc(collection(db, 'posts'), {
          ...postData,
          createdAt: serverTimestamp(),
        });
      }
      
      setEditingPost(null);
      fetchPosts();
    } catch (err) {
      console.error("Error saving post:", err);
      alert("Failed to save post.");
    }
  };

  const handleArchive = async (id: string) => {
    try {
      await updateDoc(doc(db, 'posts', id), {
        status: 'archived',
        updatedAt: serverTimestamp()
      });
      fetchPosts();
    } catch (err) {
      console.error("Error archiving post:", err);
      alert("Failed to archive post.");
    }
  };

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <AdminHeader />
      <main className="flex-grow p-8 max-w-7xl mx-auto w-full">
        {editingPost !== null ? (
          <div className="bg-white rounded-lg shadow-sm border border-tan-light p-6">
            <button 
              onClick={() => setEditingPost(null)}
              className="flex items-center gap-2 text-charcoal/60 hover:text-charcoal mb-6"
            >
              <ArrowLeft size={16} /> Back to Content
            </button>
            <h2 className="text-2xl font-serif text-charcoal mb-6">
              {editingPost.id ? 'Edit Post' : 'New Post'}
            </h2>
            <form onSubmit={handleSave} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-charcoal mb-2">Title</label>
                  <input
                    type="text"
                    required
                    value={editingPost.title || ''}
                    onChange={e => setEditingPost({...editingPost, title: e.target.value})}
                    className="w-full px-4 py-2 border border-tan-light rounded-md focus:outline-none focus:ring-2 focus:ring-tan/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-charcoal mb-2">Category</label>
                  <select
                    value={editingPost.category || 'Blog'}
                    onChange={e => setEditingPost({...editingPost, category: e.target.value as Post['category']})}
                    className="w-full px-4 py-2 border border-tan-light rounded-md focus:outline-none focus:ring-2 focus:ring-tan/50"
                  >
                    <option value="Blog">Blog</option>
                    <option value="News">News</option>
                    <option value="Event">Event</option>
                  </select>
                </div>
              </div>

              {editingPost.category === 'Event' && (
                <>
                  {/* Event Details */}
                  <div className="bg-tan/10 p-4 rounded-md">
                    <p className="text-xs font-bold text-charcoal/50 uppercase tracking-wider mb-3">Event Details</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-charcoal mb-1">Start Date</label>
                        <input
                          type="datetime-local"
                          value={editingPost.eventStartDate || ''}
                          onChange={e => setEditingPost({...editingPost, eventStartDate: e.target.value})}
                          className="w-full px-3 py-2 border border-tan-light rounded-md text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-charcoal mb-1">End Date</label>
                        <input
                          type="datetime-local"
                          value={editingPost.eventEndDate || ''}
                          onChange={e => setEditingPost({...editingPost, eventEndDate: e.target.value})}
                          className="w-full px-3 py-2 border border-tan-light rounded-md text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-charcoal mb-1">Location</label>
                        <input
                          type="text"
                          value={editingPost.eventLocation || ''}
                          onChange={e => setEditingPost({...editingPost, eventLocation: e.target.value})}
                          className="w-full px-3 py-2 border border-tan-light rounded-md text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Ticketing Panel */}
                  <div className="bg-white border border-tan-light rounded-lg p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <TicketIcon size={16} className="text-tan" />
                        <p className="text-sm font-bold text-charcoal uppercase tracking-wider">Ticketing</p>
                      </div>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <span className="text-sm text-charcoal/60">{editingPost._enableTicketing ? 'Enabled' : 'Disabled'}</span>
                        <div
                          onClick={() => setEditingPost(p => p ? ({ ...p, _enableTicketing: !p._enableTicketing }) : p)}
                          className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                            editingPost._enableTicketing ? 'bg-tan' : 'bg-charcoal/20'
                          }`}
                        >
                          <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                            editingPost._enableTicketing ? 'translate-x-5' : 'translate-x-0'
                          }`} />
                        </div>
                      </label>
                    </div>

                    {editingPost._enableTicketing && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-charcoal/60 uppercase tracking-wider mb-1">Ticket Price ($)</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal/50 text-sm">$</span>
                            <input
                              type="number"
                              min="0.01"
                              step="0.01"
                              required
                              value={editingPost._ticketPriceDisplay || (editingPost.ticketPrice ? (editingPost.ticketPrice / 100).toFixed(2) : '')}
                              onChange={e => setEditingPost(p => ({ ...p, _ticketPriceDisplay: e.target.value }))}
                              placeholder="0.00"
                              className="w-full pl-7 pr-3 py-2 border border-tan-light rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-tan/50"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-charcoal/60 uppercase tracking-wider mb-1">Max Capacity</label>
                          <input
                            type="number"
                            min="1"
                            required
                            value={editingPost.capacity || ''}
                            onChange={e => setEditingPost(p => ({ ...p, capacity: parseInt(e.target.value) || undefined }))}
                            placeholder="e.g. 100"
                            className="w-full px-3 py-2 border border-tan-light rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-tan/50"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-charcoal/60 uppercase tracking-wider mb-1">Tickets Sold</label>
                          <div className="px-3 py-2 bg-cream border border-tan-light/50 rounded-md text-sm text-charcoal/70">
                            {editingPost.ticketsSold ?? 0}
                            {editingPost.capacity ? ` / ${editingPost.capacity}` : ''}
                            <span className="ml-2 text-xs text-charcoal/40">(read-only)</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-bold text-charcoal mb-2">Status</label>
                <select
                  value={editingPost.status || 'draft'}
                  onChange={e => setEditingPost({...editingPost, status: e.target.value as Post['status']})}
                  className="w-full px-4 py-2 border border-tan-light rounded-md focus:outline-none focus:ring-2 focus:ring-tan/50"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-charcoal mb-2">Content</label>
                <RichTextEditor
                  value={editingPost.content || ''}
                  onChange={(content) => setEditingPost({...editingPost, content})}
                />
              </div>

              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => setEditingPost(null)}
                  className="px-6 py-2 border border-tan text-tan rounded hover:bg-tan/10 transition-colors font-bold uppercase tracking-widest text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-tan text-white rounded hover:bg-tan-dark transition-colors font-bold uppercase tracking-widest text-sm"
                >
                  Save Post
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div>
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-serif text-charcoal">Content Management</h2>
              <button 
                onClick={() => setEditingPost({ category: 'Blog', status: 'draft' })}
                className="flex items-center gap-2 bg-tan hover:bg-tan-dark text-white px-6 py-2 rounded-md transition-colors font-sans text-sm font-bold uppercase tracking-wider shadow-sm"
              >
                <Plus size={18} />
                New Post
              </button>
            </div>

            {loading ? (
              <div className="text-center py-12 text-charcoal/60">Loading content...</div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-tan-light overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-cream border-b border-tan-light">
                      <th className="p-4 font-sans font-bold text-xs uppercase tracking-wider text-charcoal/60">Title</th>
                      <th className="p-4 font-sans font-bold text-xs uppercase tracking-wider text-charcoal/60">Category</th>
                      <th className="p-4 font-sans font-bold text-xs uppercase tracking-wider text-charcoal/60">Status</th>
                      <th className="p-4 font-sans font-bold text-xs uppercase tracking-wider text-charcoal/60">Last Modified</th>
                      <th className="p-4 font-sans font-bold text-xs uppercase tracking-wider text-charcoal/60 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {posts.map((post) => (
                      <tr key={post.id} className="border-b border-tan-light/50 last:border-0 hover:bg-cream/50 transition-colors">
                        <td className="p-4 font-serif text-charcoal">{post.title}</td>
                        <td className="p-4 text-sm text-charcoal/80">{post.category}</td>
                        <td className="p-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            post.status === 'published' ? 'bg-green-100 text-green-800' : 
                            post.status === 'archived' ? 'bg-gray-100 text-gray-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {post.status}
                          </span>
                        </td>
                        <td className="p-4 text-xs text-charcoal/60">
                          {post.author || 'Admin'}<br/>
                          {post.updatedAt?.toDate().toLocaleDateString() || post.createdAt?.toDate().toLocaleDateString() || 'N/A'}
                        </td>
                        <td className="p-4 flex gap-3 justify-end">
                          <button onClick={() => setEditingPost(post)} className="text-charcoal/60 hover:text-tan transition-colors">
                            <Pencil size={18} />
                          </button>
                          <button title="Archive Post" onClick={() => handleArchive(post.id)} className="text-charcoal/60 hover:text-red-600 transition-colors">
                            <Archive size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {posts.length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-charcoal/60">No content found.</td>
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
