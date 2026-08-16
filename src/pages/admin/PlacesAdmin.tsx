import { useState, useEffect } from 'react';
import {
  collection, query, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, orderBy, GeoPoint,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { uploadFile } from '../../services/storage';
import AdminHeader from './AdminHeader';
import ErrorBanner from '../../components/admin/ErrorBanner';
import RichTextEditor from '../../components/admin/RichTextEditor';
import { Pencil, Trash2, Plus, ArrowLeft, MapPin, ImageOff, Loader2, X } from 'lucide-react';
import type { HistoricalPlace } from '../../types';

type PlaceType = HistoricalPlace['type'];
const PLACE_TYPES: PlaceType[] = ['Home', 'Business', 'Place or Thing'];

type EditingPlace = Partial<HistoricalPlace> & { lat?: string; lng?: string };

/**
 * Matches ContentAdmin's slug rule. historical_places previously had no admin at all,
 * so slugs arrived only from the Webflow migration and ad-hoc scripts — restricting
 * them here is what keeps them URL- and sitemap-safe.
 */
const toSlug = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export default function PlacesAdmin() {
  const [places, setPlaces] = useState<HistoricalPlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState<EditingPlace | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchPlaces = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const snapshot = await getDocs(query(collection(db, 'historical_places'), orderBy('title')));
      setPlaces(snapshot.docs.map(d => ({ id: d.id, ...d.data() }) as HistoricalPlace));
    } catch (err) {
      console.error('Error fetching historical places:', err);
      setLoadError(err instanceof Error ? err.message : 'Failed to load historical places.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlaces();
  }, []);

  const startEdit = (place: HistoricalPlace) => {
    setEditing({
      ...place,
      lat: place.coordinates ? String(place.coordinates.latitude) : '',
      lng: place.coordinates ? String(place.coordinates.longitude) : '',
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing?.title || !editing.type) return;

    // Partial coordinates would place a pin at the equator; require both or neither.
    const hasLat = !!editing.lat?.trim();
    const hasLng = !!editing.lng?.trim();
    if (hasLat !== hasLng) {
      alert('Enter both latitude and longitude, or leave both blank.');
      return;
    }
    const lat = Number(editing.lat);
    const lng = Number(editing.lng);
    if (hasLat && (Number.isNaN(lat) || lat < -90 || lat > 90 || Number.isNaN(lng) || lng < -180 || lng > 180)) {
      alert('Latitude must be between -90 and 90, longitude between -180 and 180.');
      return;
    }

    setSaving(true);
    try {
      // Built field by field rather than spreading `editing`, so the lat/lng strings
      // used by the form inputs can't leak into the stored document.
      const placeData = {
        title: editing.title,
        type: editing.type,
        slug: toSlug(editing.slug || editing.title),
        excerpt: editing.excerpt || '',
        description: editing.description || '',
        mainImage: editing.mainImage || '',
        galleryImages: editing.galleryImages || [],
        historical_address: editing.historical_address || '',
        coordinates: hasLat ? new GeoPoint(lat, lng) : null,
        updatedAt: serverTimestamp(),
      };

      if (editing.id) {
        await updateDoc(doc(db, 'historical_places', editing.id), placeData);
      } else {
        await addDoc(collection(db, 'historical_places'), { ...placeData, createdAt: serverTimestamp() });
      }
      setEditing(null);
      fetchPlaces();
    } catch (err) {
      console.error('Error saving historical place:', err);
      alert('Failed to save. See the browser console for details.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (place: HistoricalPlace) => {
    if (!window.confirm(`Delete "${place.title}"? This removes the public page at /historic-structures-and-places/${place.slug} and cannot be undone.`)) return;
    try {
      await deleteDoc(doc(db, 'historical_places', place.id));
      fetchPlaces();
    } catch (err) {
      console.error('Error deleting historical place:', err);
      alert('Failed to delete. See the browser console for details.');
    }
  };

  const handleMainImage = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadFile(file, 'historical_places');
      setEditing(prev => (prev ? { ...prev, mainImage: url } : prev));
    } catch (err) {
      console.error('Image upload failed:', err);
      alert('Image upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleGalleryImages = async (files: File[]) => {
    setUploading(true);
    try {
      const urls = await Promise.all(files.map(f => uploadFile(f, 'historical_places')));
      setEditing(prev => (prev ? { ...prev, galleryImages: [...(prev.galleryImages || []), ...urls] } : prev));
    } catch (err) {
      console.error('Gallery upload failed:', err);
      alert('Gallery upload failed.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <AdminHeader />
      <main className="flex-grow p-8 max-w-7xl mx-auto w-full">
        {editing !== null ? (
          <div className="bg-white rounded-lg shadow-sm border border-tan-light p-6">
            <button
              onClick={() => setEditing(null)}
              className="flex items-center gap-2 text-charcoal/60 hover:text-charcoal mb-6"
            >
              <ArrowLeft size={16} /> Back to Historic Places
            </button>
            <h2 className="text-2xl font-serif text-charcoal mb-6">
              {editing.id ? 'Edit Historic Place' : 'New Historic Place'}
            </h2>

            <form onSubmit={handleSave} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-charcoal mb-2">Name</label>
                  <input
                    type="text"
                    required
                    value={editing.title || ''}
                    onChange={e => setEditing({ ...editing, title: e.target.value })}
                    className="w-full px-4 py-2 border border-tan-light rounded-md focus:outline-none focus:ring-2 focus:ring-tan/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-charcoal mb-2">Type</label>
                  <select
                    required
                    value={editing.type || ''}
                    onChange={e => setEditing({ ...editing, type: e.target.value as PlaceType })}
                    className="w-full px-4 py-2 border border-tan-light rounded-md focus:outline-none focus:ring-2 focus:ring-tan/50 bg-white"
                  >
                    <option value="" disabled>Select a type…</option>
                    {PLACE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-charcoal mb-2">URL slug</label>
                <input
                  type="text"
                  placeholder="Leave blank to generate from the name"
                  value={editing.slug || ''}
                  onChange={e => setEditing({ ...editing, slug: toSlug(e.target.value) })}
                  className="w-full px-4 py-2 border border-tan-light rounded-md focus:outline-none focus:ring-2 focus:ring-tan/50 font-mono text-sm"
                />
                <p className="text-xs text-charcoal/50 mt-1 font-sans">
                  senoiahistory.com/historic-structures-and-places/<strong>{editing.slug || toSlug(editing.title || '') || '…'}</strong>
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold text-charcoal mb-2">
                  Short summary
                  <span className="font-normal text-charcoal/50"> — used on the listing page and in search results</span>
                </label>
                <textarea
                  rows={2}
                  maxLength={200}
                  value={editing.excerpt || ''}
                  onChange={e => setEditing({ ...editing, excerpt: e.target.value })}
                  className="w-full px-4 py-2 border border-tan-light rounded-md focus:outline-none focus:ring-2 focus:ring-tan/50"
                />
                <p className="text-xs text-charcoal/50 mt-1 font-sans tabular-nums">
                  {(editing.excerpt || '').length}/200
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold text-charcoal mb-2">Historical address</label>
                <input
                  type="text"
                  placeholder="e.g. 6 Couch St., Senoia, GA"
                  value={editing.historical_address || ''}
                  onChange={e => setEditing({ ...editing, historical_address: e.target.value })}
                  className="w-full px-4 py-2 border border-tan-light rounded-md focus:outline-none focus:ring-2 focus:ring-tan/50"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-charcoal mb-2">
                    <MapPin size={14} className="inline mr-1" />Latitude
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="33.3021"
                    value={editing.lat || ''}
                    onChange={e => setEditing({ ...editing, lat: e.target.value })}
                    className="w-full px-4 py-2 border border-tan-light rounded-md focus:outline-none focus:ring-2 focus:ring-tan/50 tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-charcoal mb-2">
                    <MapPin size={14} className="inline mr-1" />Longitude
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="-84.5555"
                    value={editing.lng || ''}
                    onChange={e => setEditing({ ...editing, lng: e.target.value })}
                    className="w-full px-4 py-2 border border-tan-light rounded-md focus:outline-none focus:ring-2 focus:ring-tan/50 tabular-nums"
                  />
                </div>
              </div>
              <p className="text-xs text-charcoal/50 -mt-3 font-sans">
                Right-click a spot in Google Maps and choose the coordinates to copy them. Leave both blank if the place shouldn't appear on the map.
              </p>

              <div>
                <label className="block text-sm font-bold text-charcoal mb-2">Main image</label>
                {editing.mainImage ? (
                  <div className="relative inline-block">
                    <img src={editing.mainImage} alt="" className="h-40 rounded-md border border-tan-light object-cover" />
                    <button
                      type="button"
                      onClick={() => setEditing({ ...editing, mainImage: '' })}
                      className="absolute -top-2 -right-2 bg-white border border-tan-light rounded-full p-1 shadow-sm hover:bg-red-50"
                      aria-label="Remove main image"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => e.target.files?.[0] && handleMainImage(e.target.files[0])}
                    className="block w-full text-sm text-charcoal/70 font-sans"
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-charcoal mb-2">Gallery images</label>
                {!!editing.galleryImages?.length && (
                  <div className="flex flex-wrap gap-3 mb-3">
                    {editing.galleryImages.map((img, idx) => (
                      <div key={img} className="relative">
                        <img src={img} alt="" className="h-24 w-24 rounded-md border border-tan-light object-cover" />
                        <button
                          type="button"
                          onClick={() => setEditing({
                            ...editing,
                            galleryImages: editing.galleryImages?.filter((_, i) => i !== idx),
                          })}
                          className="absolute -top-2 -right-2 bg-white border border-tan-light rounded-full p-1 shadow-sm hover:bg-red-50"
                          aria-label={`Remove gallery image ${idx + 1}`}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={e => e.target.files && handleGalleryImages(Array.from(e.target.files))}
                  className="block w-full text-sm text-charcoal/70 font-sans"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-charcoal mb-2">Description</label>
                <RichTextEditor
                  value={editing.description || ''}
                  onChange={value => setEditing(prev => (prev ? { ...prev, description: value } : prev))}
                  storagePath="historical_places"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving || uploading}
                  className="bg-tan text-white px-6 py-2 rounded-md font-bold hover:bg-tan-dark transition-colors disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {saving && <Loader2 size={16} className="animate-spin" />}
                  {editing.id ? 'Save changes' : 'Create place'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="text-charcoal/60 hover:text-charcoal px-4 py-2"
                >
                  Cancel
                </button>
                {uploading && (
                  <span className="text-sm text-charcoal/60 font-sans inline-flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin" /> Uploading…
                  </span>
                )}
              </div>
            </form>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-3xl font-serif text-charcoal">Historic Structures &amp; Places</h1>
                <p className="text-charcoal/60 font-sans text-sm mt-1">
                  {loading ? 'Loading…' : `${places.length} place${places.length === 1 ? '' : 's'} published`}
                </p>
              </div>
              <button
                onClick={() => setEditing({ type: 'Home', galleryImages: [] })}
                className="bg-tan text-white px-5 py-2 rounded-md font-bold hover:bg-tan-dark transition-colors inline-flex items-center gap-2"
              >
                <Plus size={16} /> New place
              </button>
            </div>

            {loadError && <ErrorBanner message={loadError} />}

            {!loading && !places.length && !loadError ? (
              <div className="bg-white rounded-lg border border-tan-light p-12 text-center">
                <p className="text-charcoal/60 font-sans">No historic places yet.</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-tan-light overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-cream/60 border-b border-tan-light">
                      <tr className="font-sans text-xs uppercase tracking-wider text-charcoal/60">
                        <th className="px-4 py-3">Place</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Address</th>
                        <th className="px-4 py-3">Map pin</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {places.map(place => (
                        <tr key={place.id} className="border-b border-tan-light/60 last:border-0">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              {place.mainImage ? (
                                <img src={place.mainImage} alt="" className="h-10 w-10 rounded object-cover border border-tan-light" />
                              ) : (
                                <span className="h-10 w-10 rounded bg-cream border border-tan-light grid place-items-center text-charcoal/30">
                                  <ImageOff size={14} />
                                </span>
                              )}
                              <div>
                                <div className="font-bold text-charcoal">{place.title}</div>
                                <div className="text-xs text-charcoal/50 font-mono">/{place.slug}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 font-sans text-sm text-charcoal/70">{place.type}</td>
                          <td className="px-4 py-3 font-sans text-sm text-charcoal/70">{place.historical_address || '—'}</td>
                          <td className="px-4 py-3 font-sans text-sm">
                            {place.coordinates ? (
                              <span className="text-charcoal/70 tabular-nums">
                                {place.coordinates.latitude.toFixed(4)}, {place.coordinates.longitude.toFixed(4)}
                              </span>
                            ) : (
                              <span className="text-charcoal/40">Not set</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <button
                              onClick={() => startEdit(place)}
                              className="text-charcoal/60 hover:text-tan p-2"
                              aria-label={`Edit ${place.title}`}
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(place)}
                              className="text-charcoal/60 hover:text-red-600 p-2"
                              aria-label={`Delete ${place.title}`}
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
