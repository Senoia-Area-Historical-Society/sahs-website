import type { FilmProduction, FilmingScope, LocationAccessType } from '../data/senoiaFilms';
import { Film, Tv, Video, MapPin, Building2, Home, Lock, Landmark } from 'lucide-react';

export function formatProductionType(type: FilmProduction['type']): { label: string; icon: typeof Film } {
  switch (type) {
    case 'series':
      return { label: 'TV Series', icon: Tv };
    case 'tv_movie':
      return { label: 'TV Movie', icon: Video };
    case 'short':
      return { label: 'Short Film', icon: Video };
    case 'feature':
    default:
      return { label: 'Feature Film', icon: Film };
  }
}

export function formatScopeBadge(scope: FilmingScope): { label: string; color: string } {
  switch (scope) {
    case 'on_location':
      return { label: 'On-Location in Town', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
    case 'soundstage':
      return { label: 'Studio Soundstage', color: 'bg-purple-50 text-purple-800 border-purple-200' };
    case 'regional_landmark':
      return { label: 'Regional Landmark', color: 'bg-amber-50 text-amber-800 border-amber-200' };
  }
}

export function getAccessIcon(accessType: LocationAccessType) {
  switch (accessType) {
    case 'private_residence':
      return <Home size={14} className="text-amber-700 shrink-0" />;
    case 'commercial':
      return <Building2 size={14} className="text-blue-700 shrink-0" />;
    case 'studio_private':
      return <Lock size={14} className="text-purple-700 shrink-0" />;
    case 'historic_site':
      return <Landmark size={14} className="text-stone-700 shrink-0" />;
    case 'public_exterior':
    default:
      return <MapPin size={14} className="text-emerald-700 shrink-0" />;
  }
}
