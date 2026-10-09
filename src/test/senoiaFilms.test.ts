import { describe, it, expect } from 'vitest';
import {
  SENOIA_FILM_CATALOG,
  SENOIA_FILM_MAP_PINS
} from '../data/senoiaFilms';
import { formatProductionType, formatScopeBadge } from '../lib/filmFormatters';

describe('Senoia Film Catalog Data Integrity', () => {
  it('contains at least 15 verified film and television productions', () => {
    expect(SENOIA_FILM_CATALOG.length).toBeGreaterThanOrEqual(15);
  });

  it('has unique IDs for every production in the catalog', () => {
    const ids = SENOIA_FILM_CATALOG.map(p => p.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('has valid titles, loglines, and senoia stories for every production', () => {
    for (const film of SENOIA_FILM_CATALOG) {
      expect(film.title.trim().length).toBeGreaterThan(0);
      expect(film.logline.trim().length).toBeGreaterThan(10);
      expect(film.senoiaStory.trim().length).toBeGreaterThan(20);
      expect(film.productionCompany.trim().length).toBeGreaterThan(0);
      expect(film.verifiedBy.length).toBeGreaterThan(0);
    }
  });

  it('has valid release years within expected ranges (1980 to current era)', () => {
    for (const film of SENOIA_FILM_CATALOG) {
      expect(film.releaseYear).toBeGreaterThanOrEqual(1980);
      expect(film.releaseYear).toBeLessThanOrEqual(2030);
      if (film.endYear) {
        expect(film.endYear).toBeGreaterThanOrEqual(film.releaseYear);
      }
    }
  });

  it('assigns valid filming scopes to every production', () => {
    const allowedScopes = ['on_location', 'soundstage', 'regional_landmark'];
    for (const film of SENOIA_FILM_CATALOG) {
      expect(film.filmingScopes.length).toBeGreaterThan(0);
      for (const scope of film.filmingScopes) {
        expect(allowedScopes).toContain(scope);
      }
    }
  });

  it('validates coordinates on mapped film locations', () => {
    for (const film of SENOIA_FILM_CATALOG) {
      for (const loc of film.locations) {
        if (loc.coordinates) {
          const [lat, lng] = loc.coordinates;
          // Senoia / Starr's Mill area (Coweta + Fayette). Tight enough that a
          // county-centroid or state-level placeholder fails.
          expect(lat).toBeGreaterThan(33.25);
          expect(lat).toBeLessThan(33.35);
          expect(lng).toBeGreaterThan(-84.6);
          expect(lng).toBeLessThan(-84.45);
        }
      }
    }
  });

  it('has valid Walk of Fame plaque records', () => {
    const plaqueFilms = SENOIA_FILM_CATALOG.filter(f => f.plaque.installed);
    expect(plaqueFilms.length).toBeGreaterThanOrEqual(10);
    for (const film of plaqueFilms) {
      expect(film.plaque.installed).toBe(true);
      expect(film.plaque.locationDescription?.trim().length).toBeGreaterThan(10);
    }
  });

  it('includes key landmark productions: The Walking Dead, Fried Green Tomatoes, Driving Miss Daisy', () => {
    const titles = SENOIA_FILM_CATALOG.map(f => f.title);
    expect(titles).toContain('The Walking Dead');
    expect(titles).toContain('Fried Green Tomatoes');
    expect(titles).toContain('Driving Miss Daisy');
    expect(titles).toContain('Sweet Home Alabama');
    expect(titles).toContain('The Conjuring: The Devil Made Me Do It');
  });
});

describe('Senoia Film Map Pins Data Integrity', () => {
  it('contains map pins with unique IDs', () => {
    expect(SENOIA_FILM_MAP_PINS.length).toBeGreaterThanOrEqual(3);
    const pinIds = SENOIA_FILM_MAP_PINS.map(p => p.id);
    expect(new Set(pinIds).size).toBe(pinIds.length);
  });

  it('has coordinates centered around the Senoia, GA area for every pin', () => {
    for (const pin of SENOIA_FILM_MAP_PINS) {
      const [lat, lng] = pin.coordinates;
      expect(lat).toBeGreaterThan(33.2);
      expect(lat).toBeLessThan(33.4);
      expect(lng).toBeGreaterThan(-84.65);
      expect(lng).toBeLessThan(-84.45);
    }
  });

  it('associates at least one production with each map pin', () => {
    for (const pin of SENOIA_FILM_MAP_PINS) {
      expect(pin.productions.length).toBeGreaterThan(0);
      expect(pin.accessLabel).toBeDefined();
      expect(pin.description.length).toBeGreaterThan(15);
    }
  });

  it('only lists productions that exist in the catalog', () => {
    const titles = new Set(SENOIA_FILM_CATALOG.map(f => f.title));
    for (const pin of SENOIA_FILM_MAP_PINS) {
      for (const prod of pin.productions) {
        if (prod.title === 'Main Street Walk of Fame') continue; // not a production
        expect(titles, `${pin.id}: ${prod.title}`).toContain(prod.title);
      }
    }
  });

  it('has no two distinct pins at the same coordinates', () => {
    const keys = SENOIA_FILM_MAP_PINS.map(p => p.coordinates.join(','));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('keeps catalog coordinates in agreement with a map pin (no placeholder points)', () => {
    const pinKeys = new Set(SENOIA_FILM_MAP_PINS.map(p => p.coordinates.join(',')));
    for (const film of SENOIA_FILM_CATALOG) {
      for (const loc of film.locations) {
        if (loc.coordinates) {
          expect(pinKeys, `${film.title}: ${loc.name}`).toContain(loc.coordinates.join(','));
        }
      }
    }
  });

  it('links the Travis-McDaniel House to the travis-house-bridge-street historic slug', () => {
    const travisPin = SENOIA_FILM_MAP_PINS.find(p => p.id === 'pin-travis-mcdaniel');
    expect(travisPin).toBeDefined();
    expect(travisPin?.historicalPlaceSlug).toBe('travis-house-bridge-street');
  });
});

describe('Film UI formatting helpers', () => {
  it('correctly labels production types', () => {
    expect(formatProductionType('feature').label).toBe('Feature Film');
    expect(formatProductionType('series').label).toBe('TV Series');
    expect(formatProductionType('tv_movie').label).toBe('TV Movie');
  });

  it('correctly formats scope badges', () => {
    expect(formatScopeBadge('on_location').label).toBe('On-Location in Town');
    expect(formatScopeBadge('soundstage').label).toBe('Studio Soundstage');
    expect(formatScopeBadge('regional_landmark').label).toBe('Regional Landmark');
  });
});
