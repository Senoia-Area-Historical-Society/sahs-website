import { Award, MapPin, Footprints, Info } from 'lucide-react';
import type { FilmProduction } from '../../data/senoiaFilms';

interface WalkOfFameGuideProps {
  plaqueFilms: FilmProduction[];
  onSelectFilm: (film: FilmProduction) => void;
}

export default function WalkOfFameGuide({ plaqueFilms, onSelectFilm }: WalkOfFameGuideProps) {
  return (
    <section className="bg-white rounded-xl border border-tan/30 p-6 md:p-8 shadow-sm my-12 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-tan/20 pb-6 mb-6">
        <div>
          <span className="text-xs uppercase tracking-widest text-tan-dark font-bold inline-flex items-center gap-1.5">
            <Award size={15} className="text-tan-dark" />
            Historic Main Street Walk of Fame
          </span>
          <h2 className="text-2xl md:text-3xl font-serif font-bold text-charcoal mt-1">
            Sidewalk Commemorative Plaques
          </h2>
        </div>
        <div className="bg-amber-50 text-amber-900 border border-amber-200/80 rounded-lg px-4 py-2 text-xs font-semibold flex items-center gap-2 self-start md:self-auto">
          <Footprints size={16} className="text-amber-800" />
          <span>{plaqueFilms.length} Commemorative Plaques on Main Street</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 text-charcoal/80 text-sm leading-relaxed">
        <div className="bg-cream/40 p-5 rounded-lg border border-tan/15">
          <h3 className="font-bold font-serif text-charcoal text-base mb-2 flex items-center gap-2">
            <MapPin size={16} className="text-tan-dark" />
            Where to Find Them
          </h3>
          <p>
            Commemorative plaques are embedded into the red brick sidewalks lining downtown Main Street, primarily extending between Seavy Street and Bridge Street.
          </p>
        </div>

        <div className="bg-cream/40 p-5 rounded-lg border border-tan/15">
          <h3 className="font-bold font-serif text-charcoal text-base mb-2 flex items-center gap-2">
            <Footprints size={16} className="text-tan-dark" />
            Walking Starting Point
          </h3>
          <p>
            Begin your walk outside the <strong>Senoia Welcome Center at 68 Main Street</strong> (once the town police station and jail). Walk south along either side of Main Street, looking down into the sidewalk bricks.
          </p>
        </div>

        <div className="bg-cream/40 p-5 rounded-lg border border-tan/15">
          <h3 className="font-bold font-serif text-charcoal text-base mb-2 flex items-center gap-2">
            <Info size={16} className="text-tan-dark" />
            A Living Tradition
          </h3>
          <p>
            Instituted in cooperation with the Senoia Downtown Development Authority, these plaques honor the cinematic productions that chose Senoia as their backdrop since 1989.
          </p>
        </div>
      </div>

      <h3 className="font-bold font-serif text-charcoal text-lg mb-3">
        Productions Honored with Sidewalk Plaques:
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {plaqueFilms.map((film) => (
          <button
            key={film.id}
            onClick={() => onSelectFilm(film)}
            className="text-left bg-stone-50 hover:bg-amber-50/80 border border-stone-200 hover:border-amber-300 p-3 rounded-lg transition-all group focus:outline-none focus:ring-2 focus:ring-tan"
          >
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 mb-1">
              <Award size={13} className="text-amber-700 group-hover:scale-110 transition-transform" />
              <span>{film.releaseYear}</span>
            </div>
            <div className="font-serif font-bold text-sm text-charcoal group-hover:text-tan-dark transition-colors line-clamp-1">
              {film.plaque.engravedTitle || film.title}
            </div>
            <div className="text-[11px] text-charcoal/60 line-clamp-1 mt-0.5">
              {film.productionCompany.split('/')[0].trim()}
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
