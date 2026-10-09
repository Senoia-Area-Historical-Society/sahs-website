import { useState, useMemo, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import {
  Clapperboard,
  Search,
  X,
  MapPin,
  Camera,
  Archive,
  Award,
  Building,
  RotateCcw,
  LayoutGrid,
  Map as MapIcon,
  HelpCircle,
  Building2,
  Film
} from 'lucide-react';
import Seo from '../components/Seo';
import ErrorBoundary from '../components/ErrorBoundary';
import { SENOIA_FILM_CATALOG, SENOIA_FILM_MAP_PINS } from '../data/senoiaFilms';
import type {
  FilmProduction,
  ProductionType,
  FilmingScope
} from '../data/senoiaFilms';
import {
  DECADES,
  filterFilms,
  hasActiveFilmFilters,
  type Decade,
  type FilmFilters,
} from '../lib/filmFilters';
import FilmCard from '../components/film/FilmCard';
import FilmDetailModal from '../components/film/FilmDetailModal';
import WalkOfFameGuide from '../components/film/WalkOfFameGuide';

// Lazy-load Leaflet map to keep initial page bundle lean
const FilmsMap = lazy(() => import('../components/film/FilmsMap'));

const PAGE_URL = 'https://senoiahistory.com/filming-in-senoia';

// Structured data: an ItemList of Movies and TV Series. Items link to the card anchors on
// this page. There is no artwork in the catalog yet, so this describes the page to crawlers
// but won't qualify for image-based rich results until each production has an `image`.
const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name: 'Movies and TV Productions Filmed in Senoia, GA',
  description: 'A comprehensive index of cinematic and television productions filmed on location and in soundstages in Senoia, Georgia.',
  itemListElement: SENOIA_FILM_CATALOG.map((film, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    url: `${PAGE_URL}#film-${film.id}`,
    item: {
      '@type': film.type === 'series' ? 'TVSeries' : 'Movie',
      name: film.title,
      datePublished: `${film.releaseYear}`,
      description: film.logline,
      director: film.directors.map(name => ({ '@type': 'Person', name })),
      actor: film.keyCast.map(name => ({ '@type': 'Person', name })),
    },
  })),
};

const YEARS_OF_SCREEN_HISTORY =
  new Date().getFullYear() - Math.min(...SENOIA_FILM_CATALOG.map(f => f.releaseYear));

export default function FilmingInSenoia() {
  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | ProductionType>('all');
  const [selectedDecade, setSelectedDecade] = useState<'all' | Decade>('all');
  const [selectedScope, setSelectedScope] = useState<'all' | FilmingScope>('all');
  const [plaqueOnly, setPlaqueOnly] = useState(false);
  const [landmarksOnly, setLandmarksOnly] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');

  // Modal State
  const [selectedFilm, setSelectedFilm] = useState<FilmProduction | null>(null);

  // Plaque films for the guide
  const plaqueFilms = useMemo(
    () => SENOIA_FILM_CATALOG.filter(f => f.plaque.installed),
    []
  );

  const filters = useMemo<FilmFilters>(
    () => ({
      query: searchQuery,
      type: selectedType,
      decade: selectedDecade,
      scope: selectedScope,
      plaqueOnly,
      landmarksOnly,
    }),
    [searchQuery, selectedType, selectedDecade, selectedScope, plaqueOnly, landmarksOnly]
  );

  const filteredFilms = useMemo(() => filterFilms(SENOIA_FILM_CATALOG, filters), [filters]);
  const hasActiveFilters = hasActiveFilmFilters(filters);

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedType('all');
    setSelectedDecade('all');
    setSelectedScope('all');
    setPlaqueOnly(false);
    setLandmarksOnly(false);
  };

  return (
    <div className="bg-cream min-h-screen pt-24 pb-16 px-4 md:px-6 lg:px-8 font-serif text-charcoal">
      <Seo
        title="Filming in Senoia | Movie & TV Production Index"
        description="Explore the complete verified index of movies and television shows filmed in Senoia, Georgia — from Fried Green Tomatoes and Driving Miss Daisy to The Walking Dead. Verified locations, sidewalk plaques, and museum history."
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <div className="max-w-7xl mx-auto">
        {/* Header & Historical Overview */}
        <header className="mb-12 border-b border-tan pb-8">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="font-sans text-xs uppercase tracking-widest text-tan-dark font-bold inline-flex items-center gap-1.5">
              <Clapperboard size={15} aria-hidden="true" />
              Senoia Area Historical Society
            </span>
            <span className="font-sans text-xs text-charcoal/50">·</span>
            <span className="font-sans text-xs font-semibold text-charcoal/70 uppercase tracking-wider">
              Screen Heritage Archive
            </span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold mt-2 mb-5 leading-tight">
            Filming in Senoia
          </h1>
          <p className="text-xl font-sans text-charcoal/80 leading-relaxed max-w-4xl">
            For nearly four decades, filmmakers have come to Senoia because the town still
            looks like itself. The Victorian porches, brick storefronts, and tree-lined streets
            that draw production crews are the very fabric the Historical Society has worked to
            preserve since 1976.
          </p>

          <p className="text-base font-sans text-charcoal/70 leading-relaxed mt-4 max-w-4xl">
            From Academy Award winners like <em>Driving Miss Daisy</em> and beloved classics like{' '}
            <em>Fried Green Tomatoes</em> to the cultural phenomenon of <em>The Walking Dead</em>,
            explore our comprehensive catalog of verified productions, Main Street sidewalk plaques,
            and historic local landmarks below.
          </p>
        </header>

        {/* Highlight Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10 font-sans">
          <div className="bg-white p-5 rounded-lg border border-tan/20 shadow-sm text-center">
            <span className="block text-3xl font-bold text-tan-dark font-serif">
              {SENOIA_FILM_CATALOG.length}
            </span>
            <span className="text-xs text-charcoal/70 font-semibold uppercase tracking-wider mt-1 block">
              Documented Productions
            </span>
          </div>

          <div className="bg-white p-5 rounded-lg border border-tan/20 shadow-sm text-center">
            <span className="block text-3xl font-bold text-tan-dark font-serif">
              {YEARS_OF_SCREEN_HISTORY}+
            </span>
            <span className="text-xs text-charcoal/70 font-semibold uppercase tracking-wider mt-1 block">
              Years of Screen History
            </span>
          </div>

          <div className="bg-white p-5 rounded-lg border border-tan/20 shadow-sm text-center">
            <span className="block text-3xl font-bold text-tan-dark font-serif">
              {plaqueFilms.length}
            </span>
            <span className="text-xs text-charcoal/70 font-semibold uppercase tracking-wider mt-1 block">
              Main St Sidewalk Plaques
            </span>
          </div>

          <div className="bg-white p-5 rounded-lg border border-tan/20 shadow-sm text-center">
            <span className="block text-3xl font-bold text-tan-dark font-serif">
              {SENOIA_FILM_MAP_PINS.length}
            </span>
            <span className="text-xs text-charcoal/70 font-semibold uppercase tracking-wider mt-1 block">
              Cataloged Local Landmarks
            </span>
          </div>
        </div>

        {/* View Switcher & Filter Bar */}
        <section className="bg-white rounded-xl border border-tan/20 p-6 shadow-sm mb-8 font-sans">
          <div
            className={`flex flex-col md:flex-row md:items-center justify-between gap-4 ${
              viewMode === 'grid' ? 'border-b border-tan/15 pb-5 mb-5' : ''
            }`}
          >
            {viewMode === 'grid' ? (
              <div className="relative flex-grow max-w-lg">
                <Search
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-charcoal/40"
                  aria-hidden="true"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by title, actor, director, location, or keyword…"
                  className="w-full pl-10 pr-10 py-2.5 text-sm rounded-lg border border-stone-200 bg-stone-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-tan focus:border-transparent text-charcoal placeholder:text-charcoal/40 transition-colors"
                  aria-label="Search film productions"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal/40 hover:text-charcoal p-1"
                    aria-label="Clear search"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            ) : (
              <p className="text-sm text-charcoal/70 max-w-lg">
                The map shows every mapped filming site. Switch to Production Cards to search and filter the catalog.
              </p>
            )}

            {/* View Mode Toggle: Grid vs Map */}
            <div className="flex items-center gap-2 self-start md:self-auto">
              <span className="text-xs font-semibold text-charcoal/60 uppercase tracking-wider mr-1">
                View:
              </span>
              <div className="bg-stone-100 p-1 rounded-lg flex items-center border border-stone-200 text-xs font-semibold">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all ${
                    viewMode === 'grid'
                      ? 'bg-white text-tan-dark shadow-sm'
                      : 'text-charcoal/70 hover:text-charcoal'
                  }`}
                  aria-pressed={viewMode === 'grid'}
                >
                  <LayoutGrid size={15} />
                  Production Cards
                </button>
                <button
                  onClick={() => setViewMode('map')}
                  className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all ${
                    viewMode === 'map'
                      ? 'bg-white text-tan-dark shadow-sm'
                      : 'text-charcoal/70 hover:text-charcoal'
                  }`}
                  aria-pressed={viewMode === 'map'}
                >
                  <MapIcon size={15} />
                  Filming Map
                </button>
              </div>
            </div>
          </div>

          {viewMode === 'grid' && (
            <div className="space-y-4 text-xs">
              {/* Format filter */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-charcoal/70 uppercase tracking-wider min-w-[70px]">
                  Format:
                </span>
                {(['all', 'feature', 'series', 'tv_movie'] as const).map((type) => {
                  const label =
                    type === 'all'
                      ? 'All Formats'
                      : type === 'feature'
                      ? 'Feature Films'
                      : type === 'series'
                      ? 'TV Series'
                      : 'TV Movies';
                  const isActive = selectedType === type;
                  return (
                    <button
                      key={type}
                      onClick={() => setSelectedType(type)}
                      aria-pressed={isActive}
                      className={`px-3 py-1.5 rounded-full font-semibold transition-all ${
                        isActive
                          ? 'bg-tan text-white shadow-sm'
                          : 'bg-stone-100 text-charcoal/70 hover:bg-stone-200'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* Decade filter */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-charcoal/70 uppercase tracking-wider min-w-[70px]">
                  Decade:
                </span>
                {(['all', ...DECADES] as const).map((decade) => {
                  const isActive = selectedDecade === decade;
                  return (
                    <button
                      key={decade}
                      onClick={() => setSelectedDecade(decade)}
                      aria-pressed={isActive}
                      className={`px-3 py-1.5 rounded-full font-semibold transition-all ${
                        isActive
                          ? 'bg-tan text-white shadow-sm'
                          : 'bg-stone-100 text-charcoal/70 hover:bg-stone-200'
                      }`}
                    >
                      {decade === 'all' ? 'All Decades' : decade}
                    </button>
                  );
                })}
              </div>

              {/* Scope filter */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-charcoal/70 uppercase tracking-wider min-w-[70px]">
                  Scope:
                </span>
                {(['all', 'on_location', 'soundstage', 'regional_landmark'] as const).map((scope) => {
                  const label =
                    scope === 'all'
                      ? 'All Types'
                      : scope === 'on_location'
                      ? 'On-Location in Town'
                      : scope === 'soundstage'
                      ? 'Studio Soundstage'
                      : 'Regional Landmark';
                  const isActive = selectedScope === scope;
                  return (
                    <button
                      key={scope}
                      onClick={() => setSelectedScope(scope)}
                      aria-pressed={isActive}
                      className={`px-3 py-1.5 rounded-full font-semibold transition-all ${
                        isActive
                          ? 'bg-tan text-white shadow-sm'
                          : 'bg-stone-100 text-charcoal/70 hover:bg-stone-200'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* Checkbox Toggles & Reset */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-stone-100">
                <div className="flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-charcoal/80 font-medium">
                    <input
                      type="checkbox"
                      checked={plaqueOnly}
                      onChange={(e) => setPlaqueOnly(e.target.checked)}
                      className="rounded text-tan focus:ring-tan w-4 h-4 border-stone-300"
                    />
                    <Award size={14} className="text-amber-700" />
                    Main Street Walk of Fame Plaques Only
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none text-charcoal/80 font-medium">
                    <input
                      type="checkbox"
                      checked={landmarksOnly}
                      onChange={(e) => setLandmarksOnly(e.target.checked)}
                      className="rounded text-tan focus:ring-tan w-4 h-4 border-stone-300"
                    />
                    <Building2 size={14} className="text-tan-dark" />
                    Linked to Verified Historic Structures
                  </label>
                </div>

                {hasActiveFilters && (
                  <button
                    onClick={resetFilters}
                    className="text-tan-dark hover:text-tan font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <RotateCcw size={13} />
                    Reset All Filters
                  </button>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Content Section: Map vs Grid */}
        {viewMode === 'map' ? (
          <section aria-label="Senoia Filming Locations Map" className="mb-12">
            <ErrorBoundary
              label="Filming Map"
              fallback={
                <div className="bg-white rounded-lg border border-tan/20 p-8 text-center font-sans text-charcoal/70">
                  <p className="font-semibold mb-2">The filming locations map couldn’t be loaded right now.</p>
                  <button onClick={() => setViewMode('grid')} className="text-tan-dark font-bold underline">
                    Browse the production cards instead
                  </button>
                </div>
              }
            >
              <Suspense
                fallback={
                  <div className="bg-white rounded-lg border border-tan/20 h-96 flex justify-center items-center font-sans text-charcoal/60">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tan mr-3" />
                    Loading interactive filming locations map…
                  </div>
                }
              >
                <FilmsMap onShowGrid={() => setViewMode('grid')} />
              </Suspense>
            </ErrorBoundary>
          </section>
        ) : (
          <section aria-labelledby="film-catalog-heading" className="mb-12">
            <h2 id="film-catalog-heading" className="sr-only">
              Film and Television Catalog
            </h2>
            {/* Results counter */}
            <div className="flex items-center justify-between mb-6 font-sans text-xs text-charcoal/70">
              <span>
                Showing <strong>{filteredFilms.length}</strong> of{' '}
                <strong>{SENOIA_FILM_CATALOG.length}</strong> productions
                {hasActiveFilters && ' (filtered)'}
              </span>
              <span className="hidden sm:inline italic">
                Click any title to view scene details and location access notes
              </span>
            </div>

            {filteredFilms.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredFilms.map((film) => (
                  <FilmCard
                    key={film.id}
                    film={film}
                    onSelect={(f) => setSelectedFilm(f)}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-tan/20 p-12 text-center font-sans">
                <Film size={36} className="mx-auto text-tan mb-3" />
                <h3 className="text-lg font-bold font-serif text-charcoal mb-2">
                  No productions match your current filters
                </h3>
                <p className="text-sm text-charcoal/70 max-w-md mx-auto mb-5 leading-relaxed">
                  Try clearing your search terms or expanding your filter criteria to see other titles in Senoia's film history.
                </p>
                <button
                  onClick={resetFilters}
                  className="bg-tan text-white px-5 py-2 rounded text-xs font-bold uppercase tracking-wider hover:bg-tan-dark transition-colors inline-flex items-center gap-1.5"
                >
                  <RotateCcw size={13} />
                  Reset Filters
                </button>
              </div>
            )}
          </section>
        )}

        {/* Walk of Fame Sidewalk Guide Section */}
        <WalkOfFameGuide
          plaqueFilms={plaqueFilms}
          onSelectFilm={(film) => setSelectedFilm(film)}
        />

        {/* Riverwood Studios & Economic Heritage Section */}
        <section className="bg-white rounded-xl border border-tan/30 p-8 shadow-sm mb-12">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-tan-dark font-bold font-sans mb-2">
            <Building size={16} />
            Studio History &amp; Economic Impact
          </div>
          <h2 className="text-2xl md:text-3xl font-bold font-serif mb-4 text-charcoal">
            Riverwood Studios &amp; The "Hollywood of the South"
          </h2>
          <div className="prose prose-lg max-w-none text-charcoal font-sans text-sm md:text-base space-y-4 leading-relaxed">
            <p>
              Senoia's modern screen chapter began in 1989 when producer Paul Lombardi established{' '}
              <strong>Riverwood Studios</strong> on 140 rural acres just outside downtown. Rather than
              treating the town as a temporary location, the studio envisioned Senoia as a permanent
              "live backlot" where historic architecture, natural woodlands, and purpose-built soundstages
              could support major studio motion pictures.
            </p>
            <p>
              In the 1990s and 2000s, studio president Scott Tigchelaar expanded operations and helped
              champion the landmark <strong>2008 Georgia Film Tax Credit</strong>, which transformed the
              state into one of the world's leading production centers. Under a management agreement,
              the facility operated for several years as <strong>Raleigh Studios Atlanta</strong>, hosting
              Lifetime's <em>Drop Dead Diva</em> and, from 2012, AMC's <em>The Walking Dead</em>.
            </p>
            <p>
              In 2017, AMC Studios purchased the Riverwood facility outright. The decade of continuous filming
              spurred thoughtful downtown infill development, restored historic storefronts, and brought
              entrepreneurs and visitors from every continent. Today, the studio continues to anchor major
              screen projects, including the Dennis Quaid racing drama <em>Thunder Road</em> (2026).
            </p>
          </div>
        </section>

        {/* Seeing it for yourself (Museum & Etiquette) */}
        <section className="bg-white rounded-lg border border-tan/20 p-8 shadow-sm mb-12">
          <h2 className="text-2xl font-bold mb-6 font-serif">Seeing it for yourself</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-sans">
            <div>
              <Camera className="text-tan mb-3" size={24} />
              <h3 className="font-bold mb-2 font-serif text-lg">At the museum</h3>
              <p className="text-charcoal/70 text-sm leading-relaxed">
                Five display rooms covering Senoia's history, including our dedicated film history display featuring props, artifacts, and photographs. Admission is free.
              </p>
              <Link
                to="/location-and-hours"
                className="text-tan-dark font-bold text-xs uppercase tracking-wide hover:underline inline-block mt-3"
              >
                Hours &amp; location →
              </Link>
            </div>
            <div>
              <MapPin className="text-tan mb-3" size={24} />
              <h3 className="font-bold mb-2 font-serif text-lg">Around town</h3>
              <p className="text-charcoal/70 text-sm leading-relaxed">
                Many filming locations are private homes and active businesses. Please observe from sidewalks and respect homeowners' privacy year-round.
              </p>
              <Link
                to="/historic-structures-and-places"
                className="text-tan-dark font-bold text-xs uppercase tracking-wide hover:underline inline-block mt-3"
              >
                Historic places database →
              </Link>
            </div>
            <div>
              <Archive className="text-tan mb-3" size={24} />
              <h3 className="font-bold mb-2 font-serif text-lg">In the digital archive</h3>
              <p className="text-charcoal/70 text-sm leading-relaxed">
                Photographs, letters, and documents from across Senoia's history, digitized and searchable through the SAHS archives platform.
              </p>
              <a
                href="https://archives.senoiahistory.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-tan-dark font-bold text-xs uppercase tracking-wide hover:underline inline-block mt-3"
              >
                Digital archive →
              </a>
            </div>
          </div>
          <p className="text-xs text-charcoal/60 font-sans mt-6 pt-6 border-t border-tan/15 leading-relaxed">
            Please remember that Senoia is a residential town. Many of the houses visitors come to
            see are private homes whose owners live in them year-round. Always observe residential
            filming locations from public streets and sidewalks.
          </p>
        </section>

        {/* Community Submission Banner */}
        <div className="text-center font-sans bg-cream/80 border border-tan/25 rounded-xl p-8 max-w-3xl mx-auto">
          <HelpCircle size={28} className="mx-auto text-tan-dark mb-2" />
          <h3 className="text-xl font-bold font-serif text-charcoal mb-2">
            Do you have photos or memories from a Senoia production?
          </h3>
          <p className="text-charcoal/70 text-sm leading-relaxed mb-5 max-w-xl mx-auto">
            The Historical Society continuously collects artifacts, set photographs, call sheets, and personal recollections connected to filming in the Senoia area.
          </p>
          <Link
            to="/contact-sahs"
            className="bg-tan text-white px-8 py-3 rounded uppercase font-bold tracking-widest hover:bg-tan-dark transition-all text-xs inline-block shadow-sm"
          >
            Contact the Society
          </Link>
        </div>
      </div>

      {/* Detail Modal */}
      <FilmDetailModal
        film={selectedFilm}
        onClose={() => setSelectedFilm(null)}
      />
    </div>
  );
}
