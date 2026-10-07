import type { FilmProduction } from '../../data/senoiaFilms';
import { Award, Eye } from 'lucide-react';
import { formatProductionType, formatScopeBadge, getAccessIcon } from '../../lib/filmFormatters';

interface FilmCardProps {
  film: FilmProduction;
  onSelect: (film: FilmProduction) => void;
}

export default function FilmCard({ film, onSelect }: FilmCardProps) {
  const { label: typeLabel, icon: TypeIcon } = formatProductionType(film.type);
  const yearDisplay = film.endYear && film.endYear !== film.releaseYear
    ? `${film.releaseYear}–${film.endYear}`
    : `${film.releaseYear}`;

  return (
    <article
      className="bg-white rounded-lg border border-tan/30 shadow-sm hover:shadow-md hover:border-tan transition-all flex flex-col h-full overflow-hidden group focus-within:ring-2 focus-within:ring-tan"
      aria-labelledby={`film-title-${film.id}`}
    >
      <div className="p-6 flex flex-col flex-grow">
        {/* Top Badges */}
        <div className="flex flex-wrap items-center gap-2 mb-3 font-sans text-xs">
          <span className="font-bold text-tan-dark bg-tan/10 px-2.5 py-1 rounded inline-flex items-center gap-1.5">
            <TypeIcon size={13} aria-hidden="true" />
            {typeLabel}
          </span>
          <span className="font-semibold text-charcoal/70 bg-stone-100 px-2.5 py-1 rounded">
            {yearDisplay}
          </span>
          {film.plaque.installed && (
            <span
              className="bg-amber-100 text-amber-900 border border-amber-200 font-semibold px-2 py-0.5 rounded inline-flex items-center gap-1"
              title="Commemorated with a Walk of Fame sidewalk plaque on Main Street"
            >
              <Award size={12} className="text-amber-700" aria-hidden="true" />
              Main St Plaque
            </span>
          )}
        </div>

        {/* Title */}
        <h3
          id={`film-title-${film.id}`}
          className="text-2xl font-bold font-serif text-charcoal group-hover:text-tan-dark transition-colors leading-snug mb-2"
        >
          {film.title}
        </h3>

        {/* Filming Scope Badges */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {film.filmingScopes.map((scope) => {
            const badge = formatScopeBadge(scope);
            return (
              <span
                key={scope}
                className={`text-[11px] font-sans font-medium px-2 py-0.5 rounded-full border ${badge.color}`}
              >
                {badge.label}
              </span>
            );
          })}
        </div>

        {/* Logline */}
        <p className="text-charcoal/70 text-sm font-sans leading-relaxed mb-4 line-clamp-2">
          {film.logline}
        </p>

        {/* Senoia Connection Snippet */}
        <div className="bg-cream/60 rounded p-3 mb-4 border border-tan/15 text-xs font-sans text-charcoal/80 flex-grow">
          <strong className="block text-tan-dark font-semibold uppercase tracking-wider text-[10px] mb-1">
            Senoia Connection
          </strong>
          <p className="line-clamp-3 leading-relaxed">
            {film.senoiaStory}
          </p>
        </div>

        {/* Locations quick tags */}
        {film.locations.length > 0 && (
          <div className="mb-4">
            <span className="text-[11px] font-sans font-semibold text-charcoal/60 uppercase tracking-wider block mb-1.5">
              Verified Sites ({film.locations.length})
            </span>
            <ul className="space-y-1">
              {film.locations.slice(0, 2).map((loc, idx) => (
                <li
                  key={idx}
                  className="text-xs font-sans text-charcoal/75 flex items-center gap-1.5 truncate"
                  title={`${loc.name} — ${loc.accessNote}`}
                >
                  {getAccessIcon(loc.accessType)}
                  <span className="truncate">{loc.name}</span>
                </li>
              ))}
              {film.locations.length > 2 && (
                <li className="text-[11px] font-sans text-tan-dark italic pl-5">
                  +{film.locations.length - 2} more filming location{film.locations.length - 2 > 1 ? 's' : ''}
                </li>
              )}
            </ul>
          </div>
        )}

        {/* Key Cast & Director */}
        <div className="pt-3 border-t border-tan/15 text-xs font-sans text-charcoal/65 mt-auto">
          {film.keyCast.length > 0 && (
            <p className="truncate mb-1">
              <span className="font-medium text-charcoal/80">Cast:</span> {film.keyCast.slice(0, 3).join(', ')}
              {film.keyCast.length > 3 && '…'}
            </p>
          )}
          {film.directors.length > 0 && (
            <p className="truncate">
              <span className="font-medium text-charcoal/80">Dir:</span> {film.directors.join(', ')}
            </p>
          )}
        </div>
      </div>

      {/* Action Footer */}
      <div className="p-4 bg-stone-50/80 border-t border-tan/20 flex items-center justify-between">
        <button
          onClick={() => onSelect(film)}
          className="w-full bg-tan/15 text-tan-dark hover:bg-tan hover:text-white font-sans font-bold text-xs uppercase tracking-wider py-2.5 px-4 rounded transition-colors flex items-center justify-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-tan"
          aria-label={`View full details for ${film.title}`}
        >
          <Eye size={14} aria-hidden="true" />
          View Details &amp; Locations
        </button>
      </div>
    </article>
  );
}
