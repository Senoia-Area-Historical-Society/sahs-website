import { describe, it, expect } from 'vitest';
import { SENOIA_FILM_CATALOG } from '../data/senoiaFilms';
import {
  DEFAULT_FILM_FILTERS,
  filmSpansDecade,
  filterFilms,
  hasActiveFilmFilters,
  type FilmFilters,
} from '../lib/filmFilters';

const run = (patch: Partial<FilmFilters>) =>
  filterFilms(SENOIA_FILM_CATALOG, { ...DEFAULT_FILM_FILTERS, ...patch });
const titles = (films: { title: string }[]) => films.map(f => f.title);

describe('filterFilms', () => {
  it('returns the whole catalog with default filters', () => {
    expect(run({})).toHaveLength(SENOIA_FILM_CATALOG.length);
    expect(hasActiveFilmFilters(DEFAULT_FILM_FILTERS)).toBe(false);
  });

  it('treats a whitespace-only query as no query', () => {
    expect(run({ query: '   ' })).toHaveLength(SENOIA_FILM_CATALOG.length);
    expect(hasActiveFilmFilters({ ...DEFAULT_FILM_FILTERS, query: '   ' })).toBe(false);
  });

  it('searches titles case-insensitively', () => {
    expect(titles(run({ query: 'walking DEAD' }))).toContain('The Walking Dead');
  });

  it('searches cast, directors and location names', () => {
    expect(titles(run({ query: 'Norman Reedus' }))).toContain('The Walking Dead');
    expect(titles(run({ query: 'Jon Avnet' }))).toContain('Fried Green Tomatoes');
    expect(titles(run({ query: 'Travis-McDaniel' }))).toContain('Fried Green Tomatoes');
  });

  it('returns nothing for a query that matches nothing', () => {
    expect(run({ query: 'zzzz-no-such-film' })).toEqual([]);
  });

  it('filters by format', () => {
    const series = run({ type: 'series' });
    expect(series.length).toBeGreaterThan(0);
    expect(series.every(f => f.type === 'series')).toBe(true);
  });

  it('filters by scope', () => {
    const stage = run({ scope: 'soundstage' });
    expect(stage.length).toBeGreaterThan(0);
    expect(stage.every(f => f.filmingScopes.includes('soundstage'))).toBe(true);
  });

  it('plaque-only keeps only plaque productions', () => {
    const plaque = run({ plaqueOnly: true });
    expect(plaque.length).toBeGreaterThan(0);
    expect(plaque.every(f => f.plaque.installed)).toBe(true);
  });

  it('landmarks-only keeps only productions linked to a historic place', () => {
    const linked = run({ landmarksOnly: true });
    expect(titles(linked)).toContain('Fried Green Tomatoes');
    expect(linked.every(f => f.locations.some(l => l.historicalPlaceSlug))).toBe(true);
  });

  it('combines filters with AND semantics', () => {
    const both = run({ type: 'series', plaqueOnly: true });
    expect(both.every(f => f.type === 'series' && f.plaque.installed)).toBe(true);
  });
});

describe('decade filtering', () => {
  it('places a multi-year series in every decade it aired, not only its premiere decade', () => {
    const twd = SENOIA_FILM_CATALOG.find(f => f.title === 'The Walking Dead')!;
    expect(filmSpansDecade(twd, '2010s')).toBe(true);
    expect(filmSpansDecade(twd, '2020s')).toBe(true);
    expect(filmSpansDecade(twd, '2000s')).toBe(false);
    expect(titles(run({ decade: '2020s' }))).toContain('The Walking Dead');
  });

  it('places a single-year film only in its own decade', () => {
    const daisy = SENOIA_FILM_CATALOG.find(f => f.title === 'Driving Miss Daisy')!;
    expect(filmSpansDecade(daisy, '1980s')).toBe(true);
    expect(filmSpansDecade(daisy, '1990s')).toBe(false);
  });

  it('every production appears under at least one decade filter', () => {
    const decades = ['1980s', '1990s', '2000s', '2010s', '2020s'] as const;
    for (const film of SENOIA_FILM_CATALOG) {
      expect(decades.some(d => filmSpansDecade(film, d)), film.title).toBe(true);
    }
  });
});
