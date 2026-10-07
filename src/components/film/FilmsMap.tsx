import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Link } from 'react-router-dom';
import L from 'leaflet';
import { SENOIA_FILM_MAP_PINS } from '../../data/senoiaFilms';
import type { FilmMapPin, LocationAccessType } from '../../data/senoiaFilms';
import { ExternalLink, Film, AlertTriangle } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Leaflet marker assets
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const defaultIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function FitBounds({ bounds }: { bounds: L.LatLngBounds | null }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
  }, [map, bounds]);
  return null;
}

interface FilmsMapProps {
  onShowGrid: () => void;
}

export default function FilmsMap({ onShowGrid }: FilmsMapProps) {
  const [tilesFailed, setTilesFailed] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | LocationAccessType>('all');

  const filteredPins = useMemo(() => {
    if (selectedFilter === 'all') return SENOIA_FILM_MAP_PINS;
    return SENOIA_FILM_MAP_PINS.filter(pin => pin.accessType === selectedFilter);
  }, [selectedFilter]);

  const bounds = useMemo(() => {
    if (!filteredPins.length) return null;
    return L.latLngBounds(
      filteredPins.map(pin => [pin.coordinates[0], pin.coordinates[1]] as [number, number])
    );
  }, [filteredPins]);

  return (
    <div className="space-y-4">
      {/* Map Filter Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 md:p-4 rounded-lg border border-tan/20 shadow-sm font-sans text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-bold text-charcoal/70 uppercase tracking-wider">
            Filter Sites:
          </span>
          <button
            onClick={() => setSelectedFilter('all')}
            className={`px-3 py-1.5 rounded transition-all font-semibold ${
              selectedFilter === 'all'
                ? 'bg-tan text-white shadow-sm'
                : 'bg-stone-100 text-charcoal/80 hover:bg-stone-200'
            }`}
          >
            All Sites ({SENOIA_FILM_MAP_PINS.length})
          </button>
          <button
            onClick={() => setSelectedFilter('public_exterior')}
            className={`px-3 py-1.5 rounded transition-all font-semibold ${
              selectedFilter === 'public_exterior'
                ? 'bg-tan text-white shadow-sm'
                : 'bg-stone-100 text-charcoal/80 hover:bg-stone-200'
            }`}
          >
            Public Streets &amp; Tracks
          </button>
          <button
            onClick={() => setSelectedFilter('commercial')}
            className={`px-3 py-1.5 rounded transition-all font-semibold ${
              selectedFilter === 'commercial'
                ? 'bg-tan text-white shadow-sm'
                : 'bg-stone-100 text-charcoal/80 hover:bg-stone-200'
            }`}
          >
            Downtown Commercial
          </button>
          <button
            onClick={() => setSelectedFilter('private_residence')}
            className={`px-3 py-1.5 rounded transition-all font-semibold ${
              selectedFilter === 'private_residence'
                ? 'bg-tan text-white shadow-sm'
                : 'bg-stone-100 text-charcoal/80 hover:bg-stone-200'
            }`}
          >
            Private Residences
          </button>
          <button
            onClick={() => setSelectedFilter('studio_private')}
            className={`px-3 py-1.5 rounded transition-all font-semibold ${
              selectedFilter === 'studio_private'
                ? 'bg-tan text-white shadow-sm'
                : 'bg-stone-100 text-charcoal/80 hover:bg-stone-200'
            }`}
          >
            Riverwood Studio Lot
          </button>
        </div>

        <button
          onClick={onShowGrid}
          className="text-tan-dark font-bold hover:underline"
        >
          Switch to Production Grid →
        </button>
      </div>

      {/* Map Container */}
      <div className="rounded-lg overflow-hidden border border-tan/20 shadow-sm relative">
        {tilesFailed && (
          <div className="absolute inset-x-0 top-0 z-[1000] bg-charcoal/85 text-cream font-sans text-sm px-4 py-3 text-center">
            Map tiles are taking longer to load. Verified filming spots are still marked below,
            or you can{' '}
            <button onClick={onShowGrid} className="underline font-bold">
              browse the production catalog instead
            </button>.
          </div>
        )}

        <MapContainer
          center={[33.3007, -84.5545]}
          zoom={15}
          scrollWheelZoom={false}
          style={{ height: '34rem', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            eventHandlers={{
              tileerror: () => setTilesFailed(true),
              tileload: () => setTilesFailed(false),
            }}
          />
          <FitBounds bounds={bounds} />

          {filteredPins.map((pin: FilmMapPin) => (
            <Marker
              key={pin.id}
              position={[pin.coordinates[0], pin.coordinates[1]]}
              icon={defaultIcon}
            >
              <Popup>
                <div className="font-sans text-charcoal max-w-xs" style={{ minWidth: '15rem' }}>
                  <div className="border-b border-tan/20 pb-2 mb-2">
                    <strong className="text-base font-serif block text-charcoal font-bold">
                      {pin.title}
                    </strong>
                    {pin.address && (
                      <span className="text-xs text-charcoal/60 block mt-0.5">
                        {pin.address}
                      </span>
                    )}
                    <span className="inline-block mt-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-tan/15 text-tan-dark">
                      {pin.accessLabel}
                    </span>
                  </div>

                  <p className="text-xs text-charcoal/80 leading-relaxed mb-3">
                    {pin.description}
                  </p>

                  <div className="mb-3">
                    <span className="text-[11px] font-bold uppercase text-charcoal/60 block mb-1">
                      Filmed Here:
                    </span>
                    <ul className="space-y-1">
                      {pin.productions.map((prod, idx) => (
                        <li key={idx} className="text-xs text-charcoal/80 flex items-start gap-1">
                          <Film size={12} className="text-tan shrink-0 mt-0.5" />
                          <div>
                            <strong>{prod.title}</strong> ({prod.releaseYear})
                            {prod.sceneNote && (
                              <span className="block text-[11px] text-charcoal/60">
                                {prod.sceneNote}
                              </span>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {pin.accessType === 'private_residence' && (
                    <div className="bg-amber-50 text-amber-900 border border-amber-200 rounded p-1.5 text-[11px] flex items-center gap-1.5 mb-2">
                      <AlertTriangle size={13} className="shrink-0 text-amber-700" />
                      <span>Private residence — view from sidewalk only.</span>
                    </div>
                  )}

                  {pin.historicalPlaceSlug && (
                    <Link
                      to={`/historic-structures-and-places/${pin.historicalPlaceSlug}`}
                      className="text-tan-dark font-bold text-xs inline-flex items-center gap-1 hover:underline"
                    >
                      View Historic Place Record <ExternalLink size={12} />
                    </Link>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      <div className="bg-cream/60 border border-tan/20 rounded-lg p-3 text-xs font-sans text-charcoal/70 flex items-center justify-between">
        <span>
          Showing {filteredPins.length} verified filming location{filteredPins.length === 1 ? '' : 's'} around Senoia.
        </span>
        <span className="italic">
          Always respect private residences and ongoing studio operations.
        </span>
      </div>
    </div>
  );
}
