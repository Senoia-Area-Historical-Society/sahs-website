import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import type { FilmProduction, LocationAccessType } from '../../data/senoiaFilms';
import { formatProductionType, formatScopeBadge, getAccessIcon } from '../../lib/filmFormatters';
import { X, Award, ExternalLink, AlertTriangle, MapPin, Clapperboard, Building } from 'lucide-react';

interface FilmDetailModalProps {
  film: FilmProduction | null;
  onClose: () => void;
}

function getAccessBadge(accessType: LocationAccessType): { label: string; color: string } {
  switch (accessType) {
    case 'private_residence':
      return {
        label: 'Private Residence (Sidewalk View Only)',
        color: 'bg-amber-100 text-amber-900 border-amber-300',
      };
    case 'studio_private':
      return {
        label: 'Active Studio Lot (Closed to Public)',
        color: 'bg-purple-100 text-purple-900 border-purple-300',
      };
    case 'commercial':
      return {
        label: 'Public Commercial District / Business',
        color: 'bg-blue-100 text-blue-900 border-blue-300',
      };
    case 'historic_site':
      return {
        label: 'Historic Landmark / Public Park',
        color: 'bg-stone-100 text-stone-800 border-stone-300',
      };
    case 'public_exterior':
    default:
      return {
        label: 'Public Street / Viewable Exterior',
        color: 'bg-emerald-100 text-emerald-900 border-emerald-300',
      };
  }
}

export default function FilmDetailModal({ film, onClose }: FilmDetailModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Keep the latest onClose without making it an effect dependency: the parent passes a
  // fresh arrow every render, and re-running the effect would reset focus and scroll-lock.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const isOpen = film !== null;

  // Close on Escape, trap Tab inside the dialog, lock page scroll, restore focus on close
  useEffect(() => {
    if (!isOpen) return;

    const FOCUSABLE =
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab' || !modalRef.current) return;

      const focusable = Array.from(modalRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (!modalRef.current.contains(active)) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    const prevActiveElement = document.activeElement as HTMLElement | null;
    const focusTimer = window.setTimeout(() => closeButtonRef.current?.focus(), 50);

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
      prevActiveElement?.focus();
    };
  }, [isOpen]);

  if (!film) return null;

  const { label: typeLabel, icon: TypeIcon } = formatProductionType(film.type);
  const yearDisplay = film.endYear && film.endYear !== film.releaseYear
    ? `${film.releaseYear}–${film.endYear}`
    : `${film.releaseYear}`;

  const hasPrivateResidence = film.locations.some(loc => loc.accessType === 'private_residence');

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-charcoal/80 backdrop-blur-sm flex justify-center items-center p-4 md:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="film-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={modalRef}
        className="bg-cream rounded-xl border border-tan/30 shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden text-charcoal font-sans"
      >
        {/* Header */}
        <div className="bg-white p-6 border-b border-tan/20 flex items-start justify-between sticky top-0 z-10">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2 text-xs">
              <span className="font-bold text-tan-dark bg-tan/10 px-2.5 py-1 rounded inline-flex items-center gap-1.5">
                <TypeIcon size={14} aria-hidden="true" />
                {typeLabel}
              </span>
              <span className="font-semibold text-charcoal/70 bg-stone-100 px-2.5 py-1 rounded">
                {yearDisplay}
              </span>
              {film.plaque.installed && (
                <span className="bg-amber-100 text-amber-900 border border-amber-300 font-semibold px-2 py-0.5 rounded inline-flex items-center gap-1">
                  <Award size={13} className="text-amber-700" aria-hidden="true" />
                  Main St Walk of Fame Plaque
                </span>
              )}
            </div>
            <h2 id="film-modal-title" className="text-3xl font-serif font-bold text-charcoal leading-tight">
              {film.title}
            </h2>
            <p className="text-sm text-charcoal/60 mt-1">
              {film.productionCompany}
            </p>
          </div>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="p-2 text-charcoal/50 hover:text-charcoal hover:bg-stone-100 rounded-full transition-colors ml-4 focus:outline-none focus:ring-2 focus:ring-tan"
            aria-label="Close dialog"
          >
            <X size={22} aria-hidden="true" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 md:p-8 overflow-y-auto space-y-6">
          {/* Filming Scope Badges */}
          <div className="flex flex-wrap gap-2">
            {film.filmingScopes.map((scope) => {
              const badge = formatScopeBadge(scope);
              return (
                <span
                  key={scope}
                  className={`text-xs font-semibold px-3 py-1 rounded-full border ${badge.color}`}
                >
                  {badge.label}
                </span>
              );
            })}
          </div>

          {/* Logline */}
          <div className="text-base text-charcoal/80 italic font-serif leading-relaxed border-l-4 border-tan pl-4 py-1">
            "{film.logline}"
          </div>

          {/* Senoia Filming Story */}
          <div>
            <h3 className="text-lg font-bold font-serif text-charcoal flex items-center gap-2 mb-2">
              <Clapperboard size={18} className="text-tan-dark" aria-hidden="true" />
              Senoia Production History
            </h3>
            <p className="text-sm md:text-base text-charcoal/85 leading-relaxed bg-white p-5 rounded-lg border border-tan/20 shadow-sm">
              {film.senoiaStory}
            </p>
          </div>

          {/* Residential Respect Warning if applicable */}
          {hasPrivateResidence && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3 text-amber-900 text-xs md:text-sm leading-relaxed">
              <AlertTriangle size={18} className="text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <strong>Respect for Private Homeowners:</strong> Filming locations marked as private residences are actively lived in year-round. Please enjoy their architecture respectfully from public sidewalks and roadways. Do not step onto private yards, driveways, or porches.
              </div>
            </div>
          )}

          {/* Filming Locations Breakdown */}
          {film.locations.length > 0 && (
            <div>
              <h3 className="text-lg font-bold font-serif text-charcoal flex items-center gap-2 mb-3">
                <MapPin size={18} className="text-tan-dark" aria-hidden="true" />
                Documented Senoia Locations ({film.locations.length})
              </h3>
              <div className="space-y-3">
                {film.locations.map((loc, idx) => {
                  const badge = getAccessBadge(loc.accessType);
                  return (
                    <div
                      key={idx}
                      className="bg-white rounded-lg border border-tan/20 p-4 shadow-sm"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          {getAccessIcon(loc.accessType)}
                          <h4 className="font-bold text-base text-charcoal">
                            {loc.name}
                          </h4>
                        </div>
                        <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${badge.color}`}>
                          {badge.label}
                        </span>
                      </div>

                      {loc.address && (
                        <p className="text-xs text-charcoal/60 mb-2">
                          {loc.address}
                        </p>
                      )}

                      {loc.sceneDescription && (
                        <p className="text-xs md:text-sm text-charcoal/80 leading-relaxed mb-3">
                          <strong className="text-charcoal/90">Scenes Filmed:</strong> {loc.sceneDescription}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-100 text-xs">
                        <span className="text-charcoal/60 italic">
                          {loc.accessNote}
                        </span>
                        {loc.historicalPlaceSlug && (
                          <Link
                            to={`/historic-structures-and-places/${loc.historicalPlaceSlug}`}
                            className="text-tan-dark font-bold hover:underline inline-flex items-center gap-1"
                          >
                            Read SAHS Historic Structure Record <ExternalLink size={12} aria-hidden="true" />
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Walk of Fame Plaque Details */}
          {film.plaque.installed && (
            <div className="bg-amber-50/70 border border-amber-200/80 rounded-lg p-5">
              <h3 className="text-base font-bold font-serif text-amber-950 flex items-center gap-2 mb-2">
                <Award size={18} className="text-amber-700" aria-hidden="true" />
                Main Street Sidewalk Walk of Fame
              </h3>
              <p className="text-xs md:text-sm text-amber-900/90 leading-relaxed mb-2">
                A commemorative plaque for <strong>{film.plaque.engravedTitle || film.title}</strong> is set into the brick sidewalk along downtown Main Street.
              </p>
              {film.plaque.locationDescription && (
                <p className="text-xs text-amber-800 font-medium">
                  📍 Location: {film.plaque.locationDescription}
                </p>
              )}
            </div>
          )}

          {/* Studio Note */}
          {film.studioNote && (
            <div className="bg-purple-50/60 border border-purple-200/80 rounded-lg p-5">
              <h3 className="text-base font-bold font-serif text-purple-950 flex items-center gap-2 mb-2">
                <Building size={18} className="text-purple-800" aria-hidden="true" />
                Riverwood / Raleigh Studios Record
              </h3>
              <p className="text-xs md:text-sm text-purple-900/90 leading-relaxed">
                {film.studioNote}
              </p>
            </div>
          )}

          {/* Credits & Cast Info */}
          <div className="bg-white rounded-lg border border-tan/20 p-5 shadow-sm text-xs md:text-sm space-y-2">
            <div>
              <span className="font-semibold text-charcoal">Key Cast:</span>{' '}
              <span className="text-charcoal/80">{film.keyCast.join(', ')}</span>
            </div>
            <div>
              <span className="font-semibold text-charcoal">Directed by:</span>{' '}
              <span className="text-charcoal/80">{film.directors.join(', ')}</span>
            </div>
            <div>
              <span className="font-semibold text-charcoal">Production Company:</span>{' '}
              <span className="text-charcoal/80">{film.productionCompany}</span>
            </div>
          </div>

          {/* Verification / Sources */}
          <div className="pt-2 text-xs text-charcoal/50 border-t border-tan/15">
            <span className="font-semibold">Citations &amp; Verification:</span>{' '}
            {film.verifiedBy.join(' · ')}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-stone-50 border-t border-tan/20 flex justify-end">
          <button
            onClick={onClose}
            className="bg-charcoal text-cream hover:bg-charcoal/85 px-6 py-2 rounded text-xs font-bold uppercase tracking-wider transition-colors focus:outline-none focus:ring-2 focus:ring-tan"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
