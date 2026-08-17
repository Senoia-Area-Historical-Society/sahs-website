import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Link } from 'react-router-dom';
import L from 'leaflet';
import type { HistoricalPlace } from '../../types';
import 'leaflet/dist/leaflet.css';

// Leaflet resolves its default marker icons from a relative path that breaks once
// the CSS is bundled and hashed, so the icon is built explicitly from the packaged
// assets instead. Same approach as archive-app's ArchiveMap.
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const icon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

/**
 * Keeps the viewport on whatever is currently plotted as the filter changes.
 *
 * The fit runs in an effect rather than during render: moving the map is a side
 * effect on something outside React, and doing it in the render body would fire
 * on every render — including StrictMode's double invocation, and any render
 * React starts but never commits — which would yank a panned viewport back.
 */
function FitBounds({ bounds }: { bounds: L.LatLngBounds | null }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 17 });
  }, [map, bounds]);
  return null;
}

interface PlacesMapProps {
  places: HistoricalPlace[];
  /** Lets the tile-failure notice offer the list as a way out. */
  onShowList: () => void;
}

export default function PlacesMap({ places, onShowList }: PlacesMapProps) {
  const [tilesFailed, setTilesFailed] = useState(false);
  // Only places that were actually geocoded can be plotted. Two of the tour stops
  // are identified by intersection and have no pin yet.
  const plotted = useMemo(
    () => places.filter(p => p.coordinates),
    [places]
  );

  const bounds = useMemo(() => {
    if (!plotted.length) return null;
    return L.latLngBounds(
      plotted.map(p => [p.coordinates!.latitude, p.coordinates!.longitude] as [number, number])
    );
  }, [plotted]);

  if (!plotted.length) {
    return (
      <div className="bg-white rounded-lg border border-tan/20 py-16 text-center">
        <p className="font-sans text-charcoal/70 italic">
          None of these places have map locations yet.
        </p>
      </div>
    );
  }

  const missing = places.length - plotted.length;

  return (
    <div>
      <div className="rounded-lg overflow-hidden border border-tan/20 shadow-sm relative">
        {tilesFailed && (
          // Markers and popups keep working without imagery, so the map stays useful
          // — this just explains the grey rather than leaving it looking broken.
          <div className="absolute inset-x-0 top-0 z-[1000] bg-charcoal/85 text-cream font-sans text-sm px-4 py-3 text-center">
            Map imagery isn’t loading right now. The locations below are still marked,
            or you can <button onClick={onShowList} className="underline font-bold">browse the list instead</button>.
          </div>
        )}
        <MapContainer
          center={[33.3007, -84.5545]}
          zoom={16}
          scrollWheelZoom={false}
          style={{ height: '32rem', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            eventHandlers={{
              // Fires per failed tile. OSM's public servers are donation-funded and
              // may throttle or block without notice, and rural signal drops tiles
              // too — either way the visitor should be told, not left staring at grey.
              tileerror: () => setTilesFailed(true),
              tileload: () => setTilesFailed(false),
            }}
          />
          <FitBounds bounds={bounds} />

          {plotted.map(place => (
            <Marker
              key={place.id}
              position={[place.coordinates!.latitude, place.coordinates!.longitude]}
              icon={icon}
            >
              <Popup>
                <div className="font-sans" style={{ minWidth: '11rem' }}>
                  {place.mainImage && (
                    <img
                      src={place.mainImage}
                      alt={place.title}
                      style={{ width: '100%', height: '6rem', objectFit: 'cover', borderRadius: '3px' }}
                    />
                  )}
                  <div style={{ marginTop: place.mainImage ? '.5rem' : 0 }}>
                    <strong className="text-charcoal">{place.title}</strong>
                    {place.historical_address && (
                      <div className="text-charcoal/60" style={{ fontSize: '.75rem', marginTop: '.15rem' }}>
                        {place.historical_address}
                      </div>
                    )}
                    <Link
                      to={`/historic-structures-and-places/${place.slug}`}
                      className="text-tan"
                      style={{ display: 'inline-block', marginTop: '.4rem', fontWeight: 700, fontSize: '.75rem' }}
                    >
                      Explore details →
                    </Link>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      <p className="text-xs font-sans text-charcoal/50 mt-3">
        Showing {plotted.length} location{plotted.length === 1 ? '' : 's'}
        {missing > 0 && ` — ${missing} without a map location yet`}. Many of these are
        private residences; please view them from the street.
      </p>
    </div>
  );
}
