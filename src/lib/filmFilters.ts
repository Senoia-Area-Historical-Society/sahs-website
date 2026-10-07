import type { FilmProduction, FilmingScope, ProductionType } from '../data/senoiaFilms';

export const DECADES = ['1980s', '1990s', '2000s', '2010s', '2020s'] as const;
export type Decade = (typeof DECADES)[number];

export interface FilmFilters {
  query: string;
  type: 'all' | ProductionType;
  decade: 'all' | Decade;
  scope: 'all' | FilmingScope;
  plaqueOnly: boolean;
  landmarksOnly: boolean;
}

export const DEFAULT_FILM_FILTERS: FilmFilters = {
  query: '',
  type: 'all',
  decade: 'all',
  scope: 'all',
  plaqueOnly: false,
  landmarksOnly: false,
};

export function hasActiveFilmFilters(f: FilmFilters): boolean {
  return Boolean(
    f.query.trim() ||
      f.type !== 'all' ||
      f.decade !== 'all' ||
      f.scope !== 'all' ||
      f.plaqueOnly ||
      f.landmarksOnly
  );
}

/**
 * A production belongs to every decade it was on air, not just the one it
 * premiered in — a series that ran 2010–2022 is also a 2020s production.
 */
export function filmSpansDecade(film: FilmProduction, decade: Decade): boolean {
  const start = Number(decade.slice(0, 4));
  const end = start + 9;
  const lastYear = film.endYear ?? film.releaseYear;
  return film.releaseYear <= end && lastYear >= start;
}

function matchesQuery(film: FilmProduction, rawQuery: string): boolean {
  const query = rawQuery.toLowerCase().trim();
  if (!query) return true;
  const has = (text: string) => text.toLowerCase().includes(query);
  return (
    has(film.title) ||
    has(film.logline) ||
    has(film.senoiaStory) ||
    film.keyCast.some(has) ||
    film.directors.some(has) ||
    film.locations.some(l => has(l.name) || (l.address ? has(l.address) : false))
  );
}

export function filterFilms(films: FilmProduction[], f: FilmFilters): FilmProduction[] {
  return films.filter(film => {
    if (!matchesQuery(film, f.query)) return false;
    if (f.type !== 'all' && film.type !== f.type) return false;
    if (f.decade !== 'all' && !filmSpansDecade(film, f.decade)) return false;
    if (f.scope !== 'all' && !film.filmingScopes.includes(f.scope)) return false;
    if (f.plaqueOnly && !film.plaque.installed) return false;
    if (f.landmarksOnly && !film.locations.some(l => Boolean(l.historicalPlaceSlug))) return false;
    return true;
  });
}
