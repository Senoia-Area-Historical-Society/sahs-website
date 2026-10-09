import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import FilmingInSenoia from '../pages/FilmingInSenoia';
import { SENOIA_FILM_CATALOG, SENOIA_FILM_MAP_PINS } from '../data/senoiaFilms';

// Leaflet needs a real layout engine; the page lazy-loads it, so stub the module.
vi.mock('../components/film/FilmsMap', () => ({ default: () => <div data-testid="films-map" /> }));

const renderPage = () =>
  render(
    <MemoryRouter>
      <FilmingInSenoia />
    </MemoryRouter>
  );

afterEach(cleanup);

describe('FilmingInSenoia page', () => {
  it('shows every production by default and derives its stats from the data', () => {
    renderPage();
    expect(screen.getByText(`${SENOIA_FILM_CATALOG.length}`, { selector: 'span.block' })).toBeTruthy();
    expect(screen.getByText(`${SENOIA_FILM_MAP_PINS.length}`, { selector: 'span.block' })).toBeTruthy();
    expect(screen.getAllByRole('article')).toHaveLength(SENOIA_FILM_CATALOG.length);
  });

  it('exposes filter state to assistive tech with aria-pressed', () => {
    renderPage();
    const decade = screen.getByRole('button', { name: '2020s' });
    expect(decade.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(decade);
    expect(decade.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'All Decades' }).getAttribute('aria-pressed')).toBe('false');
  });

  it('keeps a multi-year series under the 2020s filter', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: '2020s' }));
    expect(screen.getByRole('heading', { name: 'The Walking Dead' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Driving Miss Daisy' })).toBeNull();
  });

  it('hides the catalog filters in map view instead of silently ignoring them', () => {
    renderPage();
    expect(screen.getByRole('textbox', { name: 'Search film productions' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Filming Map/ }));
    expect(screen.queryByRole('textbox', { name: 'Search film productions' })).toBeNull();
    expect(screen.queryByRole('button', { name: '2020s' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Production Cards/ }));
    expect(screen.getByRole('textbox', { name: 'Search film productions' })).toBeTruthy();
  });

  it('anchors each card so the structured-data URLs resolve', () => {
    renderPage();
    for (const film of SENOIA_FILM_CATALOG) {
      expect(document.getElementById(`film-${film.id}`), film.id).not.toBeNull();
    }
  });
});
