import { Link } from 'react-router-dom';
import { Clapperboard, MapPin, Camera, Archive } from 'lucide-react';
import Seo from '../components/Seo';

/*
 * SEO target: film-tourism searches around Senoia ("Walking Dead filming locations
 * Senoia", "Fried Green Tomatoes filming location", "things to do in Senoia GA"),
 * which currently go to TripAdvisor, tour operators, and blogs.
 *
 * Everything asserted here is either the Society's own published claim (see
 * About.tsx — five display rooms, the Walking Dead display, film-history collecting)
 * or a widely documented production fact. Deliberately NOT asserted, because SAHS
 * holds the sources and this file's author does not:
 *   - what specific artifacts, props, or photographs the display case contains
 *   - production counts ("25 productions" appears in third-party sources, unverified)
 *   - anything about current filming activity or studio tour operations
 * Add those via the museum's own records rather than from secondary sources.
 */
export default function FilmingInSenoia() {
  return (
    <div className="bg-cream min-h-screen pt-24 pb-16 px-4 md:px-6 lg:px-8 font-serif text-charcoal">
      <Seo
        title="Filming in Senoia"
        description="Senoia, Georgia has stood in for towns across film and television — from Fried Green Tomatoes to The Walking Dead. See the history behind the locations at the SAHS Museum."
      />

      <div className="max-w-4xl mx-auto">
        <header className="mb-12 border-b border-tan pb-8">
          <span className="font-sans text-xs uppercase tracking-widest text-tan-dark font-bold">
            <Clapperboard size={14} className="inline mr-2 -mt-1" />
            Senoia on Screen
          </span>
          <h1 className="text-4xl md:text-5xl font-bold mt-3 mb-5 leading-tight">
            Filming in Senoia
          </h1>
          <p className="text-xl font-sans text-charcoal/70 leading-relaxed">
            For more than forty years, filmmakers have come to Senoia because the town still
            looks like itself. The storefronts, porches, and tree-lined streets that draw
            production crews are the same ones the Historical Society has worked to preserve.
          </p>
        </header>

        <div className="prose prose-lg max-w-none text-charcoal">
          <p className="leading-relaxed">
            Visitors often arrive in Senoia looking for a location they recognize from a screen,
            and leave having found a town with a much longer story. That is the connection this
            page — and the museum a few steps off Main Street — exists to make.
          </p>
        </div>

        <section className="mt-14">
          <h2 className="text-2xl font-bold mb-4 border-b-2 border-tan/40 pb-2">
            Fried Green Tomatoes (1991)
          </h2>
          <div className="prose prose-lg max-w-none text-charcoal">
            <p className="leading-relaxed">
              The film that introduced Senoia to a national audience. The production used the town
              as the setting for Whistle Stop, and the Travis-McDaniel home on Bridge Street served
              as the Threadgoode family house. Thirty years on, it remains the reason many visitors
              make the trip.
            </p>
            <p className="leading-relaxed">
              The houses used in the production were not sets. They were — and remain — homes in a
              town whose historic building stock has been continuously lived in. Several appear in
              our{' '}
              <Link to="/historic-structures-and-places">record of historic structures and places</Link>.
            </p>
          </div>
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-bold mb-4 border-b-2 border-tan/40 pb-2">
            The Walking Dead
          </h2>
          <div className="prose prose-lg max-w-none text-charcoal">
            <p className="leading-relaxed">
              Senoia became Woodbury, and for years the town lived alongside a major television
              production. The series brought a generation of visitors who had never heard of Senoia
              before, and it reshaped the downtown they arrived in.
            </p>
            <p className="leading-relaxed">
              The museum keeps a contemporary display devoted to the series as part of our film
              history collection — the most recent chapter in a local story that runs back to the
              Creek Nation and Chief William McIntosh.
            </p>
          </div>
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-bold mb-4 border-b-2 border-tan/40 pb-2">
            A working film town
          </h2>
          <div className="prose prose-lg max-w-none text-charcoal">
            <p className="leading-relaxed">
              Senoia's film history did not begin or end with either production. The establishment
              of a studio here in the 1980s made the town a standing location for feature and
              television work, and productions including <em>Pet Sematary II</em> and{' '}
              <em>Drop Dead Diva</em> have shot in and around Senoia in the decades since.
            </p>
            <p className="leading-relaxed">
              The Society collects artifacts, documents, and photographs connected to this work in
              the same way we collect them for the town's earlier industries — because film is now
              part of the economic and social history of the Senoia area, not separate from it.
            </p>
          </div>
        </section>

        <section className="mt-14 bg-white rounded-lg border border-tan/20 p-8 shadow-sm">
          <h2 className="text-2xl font-bold mb-6">Seeing it for yourself</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-sans">
            <div>
              <Camera className="text-tan mb-3" size={22} />
              <h3 className="font-bold mb-2 font-serif text-lg">At the museum</h3>
              <p className="text-charcoal/70 text-sm leading-relaxed">
                Five display rooms covering Senoia's history, including our film display.
                Admission is free.
              </p>
              <Link
                to="/location-and-hours"
                className="text-tan font-bold text-sm uppercase tracking-wide hover:text-tan-dark inline-block mt-3"
              >
                Hours &amp; location →
              </Link>
            </div>
            <div>
              <MapPin className="text-tan mb-3" size={22} />
              <h3 className="font-bold mb-2 font-serif text-lg">Around town</h3>
              <p className="text-charcoal/70 text-sm leading-relaxed">
                Many filming locations are private homes and businesses. Our record of historic
                structures gives their history.
              </p>
              <Link
                to="/historic-structures-and-places"
                className="text-tan font-bold text-sm uppercase tracking-wide hover:text-tan-dark inline-block mt-3"
              >
                Historic places →
              </Link>
            </div>
            <div>
              <Archive className="text-tan mb-3" size={22} />
              <h3 className="font-bold mb-2 font-serif text-lg">In the archive</h3>
              <p className="text-charcoal/70 text-sm leading-relaxed">
                Photographs and documents from across Senoia's history, digitized and searchable.
              </p>
              <a
                href="https://archives.senoiahistory.com/"
                className="text-tan font-bold text-sm uppercase tracking-wide hover:text-tan-dark inline-block mt-3"
              >
                Digital archive →
              </a>
            </div>
          </div>
          <p className="text-sm text-charcoal/60 font-sans mt-6 pt-6 border-t border-tan/15 leading-relaxed">
            Please remember that Senoia is a residential town. Many of the houses visitors come to
            see are private homes whose owners live in them year-round.
          </p>
        </section>

        <div className="mt-12 text-center">
          <p className="font-sans text-charcoal/70 mb-5">
            Do you have photographs or material from a production filmed in Senoia?
          </p>
          <Link
            to="/contact-sahs"
            className="bg-tan text-white px-8 py-3 rounded uppercase font-bold tracking-widest hover:bg-tan-dark transition-all font-sans text-sm inline-block"
          >
            Get in touch
          </Link>
        </div>
      </div>
    </div>
  );
}
