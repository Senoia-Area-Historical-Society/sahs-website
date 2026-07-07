import { useState, useEffect } from 'react';
import { collection, query, getDocs, addDoc, updateDoc, doc, serverTimestamp, orderBy, where, writeBatch } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import AdminHeader from './AdminHeader';
import RichTextEditor from '../../components/admin/RichTextEditor';
import { Pencil, Archive, Plus, ArrowLeft, Ticket as TicketIcon, Upload, Trash2, Eye, CheckSquare, Square, X, Link2, Check } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { uploadFile } from '../../services/storage';

const timestampToLocalISO = (timestamp: any): string => {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
};

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
  excerpt?: string;
  // Ticketing fields (stored in Firestore)
  ticketPrice?: number | null;
  capacity?: number | null;
  ticketsSold?: number;
  galleryImages?: string[];
  // Editor-only ephemeral fields (stripped before save)
  _enableTicketing?: boolean;
  _ticketPriceDisplay?: string;
  [key: string]: any;
}

export default function ContentAdmin() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState<Post | Partial<Post> | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadingImageField, setUploadingImageField] = useState<string | null>(null);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const { user } = useAuth();

  const startEditing = (post: Post) => {
    setEditingPost({
      ...post,
      eventStartDate: post.eventDate ? timestampToLocalISO(post.eventDate) : post.eventStartDate || '',
      eventEndDate: post.eventEndDate || '',
      publishDateDisplay: post.publishDate ? timestampToLocalISO(post.publishDate) : '',
      _ticketPriceDisplay: post.ticketPrice ? (post.ticketPrice / 100).toFixed(2) : '',
      _enableTicketing: !!post.ticketPrice,
    });
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
      const proposedSlug = (editingPost.slug || editingPost.title!.toLowerCase().replace(/[^a-z0-9]+/g, '-')).replace(/^-+|-+$/g, '');

      // Slug uniqueness check
      const slugSnap = await getDocs(query(collection(db, 'posts'), where('slug', '==', proposedSlug)));
      const conflict = slugSnap.docs.find(d => d.id !== editingPost.id);
      if (conflict) {
        alert(`Slug "${proposedSlug}" is already used by "${conflict.data().title}". Please choose a different slug.`);
        return;
      }

      const postData: any = {
        ...editingPost,
        type: isEvent ? 'event' : 'news',
        slug: proposedSlug,
        author: editingPost.author || user?.email || 'Admin',
        status: editingPost.status || 'draft',
        updatedAt: serverTimestamp(),
      };

      if (!editingPost.id) {
        postData.createdAt = serverTimestamp();
        if (editingPost.publishDateDisplay) {
          postData.publishDate = new Date(editingPost.publishDateDisplay);
        } else {
          postData.publishDate = serverTimestamp();
        }
      } else {
        if (editingPost.publishDateDisplay) {
          postData.publishDate = new Date(editingPost.publishDateDisplay);
        } else if (editingPost.status === 'published' && !editingPost.publishDate) {
          postData.publishDate = serverTimestamp();
        }
      }

      if (isEvent && editingPost.eventStartDate) {
        postData.eventDate = new Date(editingPost.eventStartDate);
        postData.location = editingPost.eventLocation || '';
      }

      delete postData.publishDateDisplay;

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

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert("Please upload a PDF document.");
      return;
    }

    setUploadingDoc(true);
    try {
      const url = await uploadFile(file, 'content_documents');
      setEditingPost(p => p ? ({ ...p, documentUrl: url }) : null);
      alert("Flyer PDF uploaded successfully!");
    } catch (err) {
      console.error("Error uploading PDF:", err);
      alert("Failed to upload PDF. Please try again.");
    } finally {
      setUploadingDoc(false);
    }
  };

  const handlePostImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: 'mainImage' | 'bannerImage' | 'squareImage') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert("Please upload an image file.");
      return;
    }

    setUploadingImageField(fieldName);
    try {
      const url = await uploadFile(file, 'content_images');
      setEditingPost(p => p ? ({ ...p, [fieldName]: url }) : null);
      alert(`${fieldName === 'mainImage' ? 'Cover' : fieldName === 'bannerImage' ? 'Banner' : 'Square'} image uploaded successfully!`);
    } catch (err) {
      console.error("Error uploading image:", err);
      alert("Failed to upload image.");
    } finally {
      setUploadingImageField(null);
    }
  };

  const handleGalleryImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const invalidFiles = files.filter(f => !f.type.startsWith('image/'));
    if (invalidFiles.length > 0) {
      alert("Only image files are allowed.");
      return;
    }
    setUploadingGallery(true);
    try {
      const urls = await Promise.all(files.map(f => uploadFile(f, 'content_images')));
      setEditingPost(p => p ? ({ ...p, galleryImages: [...(p.galleryImages || []), ...urls] }) : null);
    } catch (err) {
      console.error("Error uploading gallery images:", err);
      alert("Failed to upload one or more gallery images.");
    } finally {
      setUploadingGallery(false);
      e.target.value = '';
    }
  };

  const removeGalleryImage = (idx: number) => {
    setEditingPost(p => {
      if (!p) return null;
      const next = [...(p.galleryImages || [])];
      next.splice(idx, 1);
      return { ...p, galleryImages: next };
    });
  };

  const handleGalleryDrop = (targetIdx: number) => {
    if (dragIndex === null || dragIndex === targetIdx) return;
    setEditingPost(p => {
      if (!p) return null;
      const next = [...(p.galleryImages || [])];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(targetIdx, 0, moved);
      return { ...p, galleryImages: next };
    });
    setDragIndex(null);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === posts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(posts.map(p => p.id)));
    }
  };

  const handleBulkAction = async (action: 'publish' | 'archive' | 'delete') => {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;

    if (action === 'delete') {
      const eventWithSales = posts.filter(p => selectedIds.has(p.id) && (p.ticketsSold ?? 0) > 0);
      if (eventWithSales.length > 0) {
        alert(`Cannot delete: ${eventWithSales.map(p => `"${p.title}"`).join(', ')} has ticket sales. Archive instead.`);
        return;
      }
      const confirmed = window.confirm(`Permanently delete ${count} post${count > 1 ? 's' : ''}? This cannot be undone.`);
      if (!confirmed) return;
    }

    setBulkLoading(true);
    try {
      if (action === 'delete') {
        const batch = writeBatch(db);
        selectedIds.forEach(id => batch.delete(doc(db, 'posts', id)));
        await batch.commit();
      } else {
        const batch = writeBatch(db);
        const now = serverTimestamp();
        selectedIds.forEach(id => {
          const post = posts.find(p => p.id === id);
          const update: any = { status: action === 'publish' ? 'published' : 'archived', updatedAt: now };
          if (action === 'publish' && post && !post.publishDate) {
            update.publishDate = now;
          }
          batch.update(doc(db, 'posts', id), update);
        });
        await batch.commit();
      }
      setSelectedIds(new Set());
      fetchPosts();
    } catch (err) {
      console.error(`Bulk ${action} failed:`, err);
      alert(`Failed to ${action} selected posts.`);
    } finally {
      setBulkLoading(false);
    }
  };

  const fetchPosts = async () => {
    setLoading(true);
    setLoadError(null);
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
    } catch (err: any) {
      console.error("Error fetching posts:", err);
      setLoadError(err?.message || 'Failed to load posts.');
    } finally {
      setLoading(false);
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
                    onChange={e => {
                      const title = e.target.value;
                      const updates: Partial<Post> = { title };
                      if (!editingPost.id) {
                        updates.slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
                      }
                      setEditingPost({ ...editingPost, ...updates });
                    }}
                    className="w-full px-4 py-2 border border-tan-light rounded-md focus:outline-none focus:ring-2 focus:ring-tan/50 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-charcoal mb-2">Category</label>
                  <select
                    value={editingPost.category || 'Blog'}
                    onChange={e => setEditingPost({...editingPost, category: e.target.value as Post['category']})}
                    className="w-full px-4 py-2 border border-tan-light rounded-md focus:outline-none focus:ring-2 focus:ring-tan/50 bg-white"
                  >
                    <option value="Blog">Blog</option>
                    <option value="News">News</option>
                    <option value="Event">Event</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-charcoal mb-2">
                  URL Slug
                  <span className="text-xs font-normal text-charcoal/40 ml-2">auto-generated from title — edit to override</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal/40 text-xs font-mono">/news/</span>
                  <input
                    type="text"
                    value={editingPost.slug || ''}
                    onChange={e => setEditingPost({ ...editingPost, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') })}
                    className="w-full pl-14 pr-4 py-2 border border-tan-light rounded-md font-mono text-sm focus:outline-none focus:ring-2 focus:ring-tan/50 bg-white"
                    placeholder="url-slug-here"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-charcoal mb-2">Publish Date & Time (Optional)</label>
                  <input
                    type="datetime-local"
                    value={editingPost.publishDateDisplay || ''}
                    onChange={e => setEditingPost({...editingPost, publishDateDisplay: e.target.value})}
                    className="w-full px-4 py-2 border border-tan-light rounded-md focus:outline-none focus:ring-2 focus:ring-tan/50 bg-white"
                  />
                  <p className="text-xs text-charcoal/40 mt-1">If blank, defaults to the time of publishing.</p>
                </div>
                <div>
                  <label className="block text-sm font-bold text-charcoal mb-2">Status</label>
                  <select
                    value={editingPost.status || 'draft'}
                    onChange={e => setEditingPost({...editingPost, status: e.target.value as Post['status']})}
                    className="w-full px-4 py-2 border border-tan-light rounded-md focus:outline-none focus:ring-2 focus:ring-tan/50 bg-white"
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
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
                          className="w-full px-3 py-2 border border-tan-light rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-tan/50 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-charcoal mb-1">End Date</label>
                        <input
                          type="datetime-local"
                          value={editingPost.eventEndDate || ''}
                          onChange={e => setEditingPost({...editingPost, eventEndDate: e.target.value})}
                          className="w-full px-3 py-2 border border-tan-light rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-tan/50 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-charcoal mb-1">Location</label>
                        <input
                          type="text"
                          value={editingPost.eventLocation || ''}
                          onChange={e => setEditingPost({...editingPost, eventLocation: e.target.value})}
                          className="w-full px-3 py-2 border border-tan-light rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-tan/50 bg-white"
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

              {/* Media / Images Section */}
              <div className="bg-cream border border-tan-light/50 rounded-lg p-5">
                <p className="text-xs font-bold text-charcoal/50 uppercase tracking-wider mb-4 font-sans">Post Media / Images</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Main Cover Image */}
                  <div className="flex flex-col items-center p-4 border border-tan-light/30 rounded-lg bg-white shadow-xs">
                    <label className="block text-xs font-bold text-charcoal/60 uppercase tracking-wider mb-2 text-center font-sans">Cover Image (Standard)</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => handlePostImageUpload(e, 'mainImage')}
                      className="hidden"
                      id="main-image-upload"
                    />
                    <label
                      htmlFor="main-image-upload"
                      className="w-full text-center bg-cream border border-tan hover:bg-tan/10 text-charcoal py-2 rounded cursor-pointer transition-colors font-sans text-xs font-bold uppercase tracking-wider shadow-2xs mb-3"
                    >
                      {uploadingImageField === 'mainImage' ? 'Uploading...' : 'Choose Cover'}
                    </label>
                    {editingPost.mainImage ? (
                      <div className="relative w-full aspect-video rounded overflow-hidden border border-tan-light/50">
                        <img src={editingPost.mainImage} alt="Cover Preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setEditingPost(p => p ? ({ ...p, mainImage: undefined }) : null)}
                          className="absolute top-1 right-1 bg-red-600 hover:bg-red-800 text-white p-1 rounded-full shadow transition-colors"
                          title="Remove Image"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ) : (
                      <span className="text-[10px] text-charcoal/40 font-sans text-center">No image selected. Recommended for preview cards.</span>
                    )}
                  </div>

                  {/* Wide Banner Image */}
                  <div className="flex flex-col items-center p-4 border border-tan-light/30 rounded-lg bg-white shadow-xs">
                    <label className="block text-xs font-bold text-charcoal/60 uppercase tracking-wider mb-2 text-center font-sans">Top Banner (1280x720)</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => handlePostImageUpload(e, 'bannerImage')}
                      className="hidden"
                      id="banner-image-upload"
                    />
                    <label
                      htmlFor="banner-image-upload"
                      className="w-full text-center bg-cream border border-tan hover:bg-tan/10 text-charcoal py-2 rounded cursor-pointer transition-colors font-sans text-xs font-bold uppercase tracking-wider shadow-2xs mb-3"
                    >
                      {uploadingImageField === 'bannerImage' ? 'Uploading...' : 'Choose Banner'}
                    </label>
                    {editingPost.bannerImage ? (
                      <div className="relative w-full aspect-video rounded overflow-hidden border border-tan-light/50">
                        <img src={editingPost.bannerImage} alt="Banner Preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setEditingPost(p => p ? ({ ...p, bannerImage: undefined }) : null)}
                          className="absolute top-1 right-1 bg-red-600 hover:bg-red-800 text-white p-1 rounded-full shadow transition-colors"
                          title="Remove Image"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ) : (
                      <span className="text-[10px] text-charcoal/40 font-sans text-center">No image selected. Displayed wide at page top.</span>
                    )}
                  </div>

                  {/* Square Image */}
                  <div className="flex flex-col items-center p-4 border border-tan-light/30 rounded-lg bg-white shadow-xs">
                    <label className="block text-xs font-bold text-charcoal/60 uppercase tracking-wider mb-2 text-center font-sans">Square Alt (1080x1080)</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => handlePostImageUpload(e, 'squareImage')}
                      className="hidden"
                      id="square-image-upload"
                    />
                    <label
                      htmlFor="square-image-upload"
                      className="w-full text-center bg-cream border border-tan hover:bg-tan/10 text-charcoal py-2 rounded cursor-pointer transition-colors font-sans text-xs font-bold uppercase tracking-wider shadow-2xs mb-3"
                    >
                      {uploadingImageField === 'squareImage' ? 'Uploading...' : 'Choose Square'}
                    </label>
                    {editingPost.squareImage ? (
                      <div className="relative w-full aspect-square rounded overflow-hidden border border-tan-light/50 max-h-[85px] max-w-[85px]">
                        <img src={editingPost.squareImage} alt="Square Preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setEditingPost(p => p ? ({ ...p, squareImage: undefined }) : null)}
                          className="absolute top-1 right-1 bg-red-600 hover:bg-red-800 text-white p-1 rounded-full shadow transition-colors"
                          title="Remove Image"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ) : (
                      <span className="text-[10px] text-charcoal/40 font-sans text-center">No image selected. Displayed in post body.</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Gallery Images */}
              <div className="bg-cream border border-tan-light/50 rounded-lg p-5">
                <p className="text-xs font-bold text-charcoal/50 uppercase tracking-wider mb-3 font-sans">Gallery Images</p>
                <p className="text-xs text-charcoal/40 font-sans mb-4">Displayed as a photo grid at the bottom of the post. Upload multiple at once. Drag thumbnails to reorder.</p>
                <div className="flex items-center gap-4 mb-4">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleGalleryImageUpload}
                    className="hidden"
                    id="gallery-image-upload"
                  />
                  <label
                    htmlFor="gallery-image-upload"
                    className="flex items-center gap-2 bg-cream border border-tan hover:bg-tan/10 text-charcoal px-5 py-2 rounded cursor-pointer transition-colors font-sans text-xs font-bold uppercase tracking-wider shadow-2xs"
                  >
                    <Plus size={14} /> {uploadingGallery ? 'Uploading...' : 'Add Images'}
                  </label>
                  {(editingPost.galleryImages || []).length > 0 && (
                    <span className="text-xs text-charcoal/50 font-sans">{(editingPost.galleryImages || []).length} image{(editingPost.galleryImages || []).length > 1 ? 's' : ''}</span>
                  )}
                </div>
                {(editingPost.galleryImages || []).length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                    {(editingPost.galleryImages || []).map((url, idx) => (
                      <div
                        key={url}
                        draggable
                        onDragStart={(e) => {
                          setDragIndex(idx);
                          e.dataTransfer.setData('text/plain', String(idx)); // required for Firefox
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => { e.preventDefault(); handleGalleryDrop(idx); }}
                        onDragEnd={() => setDragIndex(null)}
                        className={`relative aspect-square rounded overflow-hidden border group cursor-grab active:cursor-grabbing transition-all ${
                          dragIndex === idx
                            ? 'border-tan opacity-40 scale-95'
                            : dragIndex !== null
                            ? 'border-tan/40 border-dashed border-2'
                            : 'border-tan-light/30'
                        }`}
                      >
                        <img src={url} alt={`Gallery ${idx + 1}`} className="w-full h-full object-cover pointer-events-none" draggable={false} />
                        <button
                          type="button"
                          onClick={() => removeGalleryImage(idx)}
                          className="absolute top-1 right-1 bg-red-600 hover:bg-red-800 text-white p-1 rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Remove"
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-charcoal/30 font-sans italic">No gallery images added yet.</p>
                )}
              </div>

              {/* Document/PDF Flyer Uploader */}
              <div className="bg-cream border border-tan-light/50 rounded-lg p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Upload size={16} className="text-tan" />
                  <span className="text-sm font-bold text-charcoal uppercase tracking-wider font-sans">Optional PDF Flyer / Attachment</span>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 items-center">
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={handleDocUpload}
                    className="hidden"
                    id="doc-upload"
                  />
                  <label
                    htmlFor="doc-upload"
                    className="flex items-center gap-2 bg-cream border border-tan hover:bg-tan/10 text-charcoal px-6 py-2.5 rounded-md cursor-pointer transition-colors font-sans text-sm font-bold uppercase tracking-wider shadow-sm"
                  >
                    {uploadingDoc ? 'Uploading...' : 'Choose Flyer PDF'}
                  </label>
                  {editingPost.documentUrl ? (
                    <div className="flex items-center gap-2 text-sm text-green-700 font-sans">
                      <span>✓ Flyer Uploaded:</span>
                      <a href={editingPost.documentUrl} target="_blank" rel="noreferrer" className="underline font-bold hover:text-green-900">View File</a>
                      <button
                        type="button"
                        onClick={() => setEditingPost(p => p ? ({ ...p, documentUrl: undefined }) : null)}
                        className="text-red-600 hover:underline font-bold ml-2 inline-flex items-center gap-0.5"
                      >
                        <Trash2 size={13} /> Remove
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-charcoal/40 font-sans">No PDF attachment selected. Upload a flyer for visitors to download.</span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-charcoal mb-2">
                  Excerpt
                  <span className="text-xs font-normal text-charcoal/40 ml-2">shown in listing cards — auto-generated from content if left blank</span>
                </label>
                <textarea
                  value={editingPost.excerpt || ''}
                  onChange={e => setEditingPost({ ...editingPost, excerpt: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-tan-light rounded-md focus:outline-none focus:ring-2 focus:ring-tan/50 bg-white font-sans text-sm resize-y"
                  placeholder="Brief summary shown in news listings and social shares..."
                />
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
                  type="button"
                  onClick={() => setShowPreview(true)}
                  className="flex items-center gap-2 px-6 py-2 border border-charcoal/30 text-charcoal/70 rounded hover:bg-cream transition-colors font-bold uppercase tracking-widest text-sm"
                >
                  <Eye size={15} /> Preview
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

            {loadError && (
              <div className="mb-6 p-4 rounded-lg border border-red-200 bg-red-50 text-red-800 font-sans text-sm">
                Failed to load posts: {loadError}. Check the browser console — this usually means a Firestore
                permissions issue rather than there being no content.
              </div>
            )}

            {selectedIds.size > 0 && (
              <div className="mb-4 flex items-center gap-3 bg-tan/10 border border-tan/30 rounded-lg px-4 py-3">
                <span className="text-sm font-bold text-charcoal font-sans">{selectedIds.size} selected</span>
                <div className="flex items-center gap-2 ml-auto">
                  <button
                    onClick={() => handleBulkAction('publish')}
                    disabled={bulkLoading}
                    className="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold uppercase tracking-wider rounded transition-colors disabled:opacity-50"
                  >
                    Publish
                  </button>
                  <button
                    onClick={() => handleBulkAction('archive')}
                    disabled={bulkLoading}
                    className="px-4 py-1.5 bg-charcoal/60 hover:bg-charcoal text-white text-xs font-bold uppercase tracking-wider rounded transition-colors disabled:opacity-50"
                  >
                    Archive
                  </button>
                  <button
                    onClick={() => handleBulkAction('delete')}
                    disabled={bulkLoading}
                    className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase tracking-wider rounded transition-colors disabled:opacity-50"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => setSelectedIds(new Set())}
                    className="ml-2 text-charcoal/40 hover:text-charcoal transition-colors"
                    title="Clear selection"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            )}

            {loading ? (
              <div className="text-center py-12 text-charcoal/60">Loading content...</div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-tan-light overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-cream border-b border-tan-light">
                      <th className="p-4 w-10">
                        <button onClick={toggleSelectAll} className="text-charcoal/40 hover:text-charcoal transition-colors">
                          {selectedIds.size === posts.length && posts.length > 0 ? <CheckSquare size={16} className="text-tan" /> : <Square size={16} />}
                        </button>
                      </th>
                      <th className="p-4 font-sans font-bold text-xs uppercase tracking-wider text-charcoal/60">Title</th>
                      <th className="p-4 font-sans font-bold text-xs uppercase tracking-wider text-charcoal/60">Category</th>
                      <th className="p-4 font-sans font-bold text-xs uppercase tracking-wider text-charcoal/60">Status</th>
                      <th className="p-4 font-sans font-bold text-xs uppercase tracking-wider text-charcoal/60">Last Modified</th>
                      <th className="p-4 font-sans font-bold text-xs uppercase tracking-wider text-charcoal/60 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {posts.map((post) => (
                      <tr key={post.id} className={`border-b border-tan-light/50 last:border-0 hover:bg-cream/50 transition-colors ${selectedIds.has(post.id) ? 'bg-tan/5' : ''}`}>
                        <td className="p-4">
                          <button onClick={() => toggleSelect(post.id)} className="text-charcoal/40 hover:text-tan transition-colors">
                            {selectedIds.has(post.id) ? <CheckSquare size={16} className="text-tan" /> : <Square size={16} />}
                          </button>
                        </td>
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
                        <td className="p-4 flex gap-3 justify-end items-center">
                          {post.status === 'published' && post.slug && (
                            <button
                              title="Copy link"
                              onClick={() => {
                                navigator.clipboard.writeText(`https://senoiahistory.com/news/${post.slug}`);
                                setCopiedId(post.id);
                                setTimeout(() => setCopiedId(null), 2000);
                              }}
                              className="text-charcoal/60 hover:text-tan transition-colors"
                            >
                              {copiedId === post.id ? <Check size={16} className="text-green-600" /> : <Link2 size={16} />}
                            </button>
                          )}
                          <button onClick={() => startEditing(post)} className="text-charcoal/60 hover:text-tan transition-colors" title="Edit">
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
                        <td colSpan={6} className="p-8 text-center text-charcoal/60">No content found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Preview Modal */}
        {showPreview && editingPost && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center overflow-y-auto py-8 px-4">
            <div className="bg-cream w-full max-w-3xl rounded-xl shadow-2xl relative">
              <div className="sticky top-0 bg-white border-b border-tan-light px-6 py-3 flex items-center justify-between rounded-t-xl z-10">
                <div className="flex items-center gap-3">
                  <Eye size={16} className="text-tan" />
                  <span className="font-sans font-bold text-sm uppercase tracking-widest text-charcoal">Preview</span>
                  <span className="text-xs text-charcoal/40 font-sans">(unsaved changes shown)</span>
                </div>
                <div className="flex items-center gap-3">
                  {editingPost.id && editingPost.slug && (
                    <a
                      href={`/news/${editingPost.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-tan hover:text-tan-dark font-sans font-bold uppercase tracking-widest underline"
                    >
                      Open live page
                    </a>
                  )}
                  <button onClick={() => setShowPreview(false)} className="text-charcoal/40 hover:text-charcoal transition-colors">
                    <X size={20} />
                  </button>
                </div>
              </div>
              <article className="p-8 font-serif text-charcoal">
                {editingPost.bannerImage && (
                  <img src={editingPost.bannerImage} alt="" className="w-full rounded-lg mb-6 object-cover max-h-64" />
                )}
                <div className="flex flex-wrap gap-3 mb-4 text-xs font-sans font-bold text-tan uppercase tracking-widest">
                  {editingPost.category && <span>{editingPost.category}</span>}
                  <span className={`px-2 py-0.5 rounded-full ${editingPost.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{editingPost.status || 'draft'}</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-bold leading-tight mb-4">{editingPost.title || 'Untitled'}</h1>
                {editingPost.excerpt && (
                  <p className="text-lg text-charcoal/60 font-sans mb-6 border-l-4 border-tan pl-4">{editingPost.excerpt}</p>
                )}
                {editingPost.mainImage && (
                  <img src={editingPost.mainImage} alt="" className="w-full rounded-lg mb-6 object-cover max-h-80" />
                )}
                {editingPost.content ? (
                  <div className="prose prose-stone max-w-none font-sans" dangerouslySetInnerHTML={{ __html: editingPost.content }} />
                ) : (
                  <p className="text-charcoal/30 italic font-sans">No content yet.</p>
                )}
                {(editingPost.galleryImages || []).length > 0 && (
                  <div className="mt-8">
                    <p className="text-xs font-bold uppercase tracking-widest text-charcoal/40 font-sans mb-3">Gallery</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {(editingPost.galleryImages || []).map((img, idx) => (
                        <img key={idx} src={img} alt={`Gallery ${idx + 1}`} className="w-full aspect-square object-cover rounded" />
                      ))}
                    </div>
                  </div>
                )}
              </article>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
