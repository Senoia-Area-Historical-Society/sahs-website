export type ProductionType = 'feature' | 'series' | 'tv_movie';

export type FilmingScope = 'on_location' | 'soundstage' | 'regional_landmark';

export type LocationAccessType =
  | 'private_residence'
  | 'public_exterior'
  | 'commercial'
  | 'studio_private'
  | 'historic_site';

export interface FilmLocation {
  name: string;
  address?: string;
  coordinates?: [number, number]; // [lat, lng]
  accessType: LocationAccessType;
  accessNote: string;
  historicalPlaceSlug?: string; // Link to /historic-structures-and-places/:slug
  sceneDescription?: string;
}

export interface WalkOfFamePlaque {
  installed: boolean;
  engravedTitle?: string;
  engravedYear?: string;
  locationDescription?: string;
}

export interface FilmProduction {
  id: string;
  title: string;
  releaseYear: number;
  endYear?: number; // For multi-year television series
  type: ProductionType;
  filmingScopes: FilmingScope[];
  directors: string[];
  keyCast: string[];
  productionCompany: string;
  logline: string;
  senoiaStory: string;
  locations: FilmLocation[];
  plaque: WalkOfFamePlaque;
  studioNote?: string;
  verifiedBy: string[];
}

export interface FilmMapPin {
  id: string;
  title: string;
  address?: string;
  coordinates: [number, number];
  accessType: LocationAccessType;
  accessLabel: string;
  description: string;
  historicalPlaceSlug?: string;
  productions: {
    title: string;
    releaseYear: number;
    sceneNote?: string;
  }[];
}

export const SENOIA_FILM_CATALOG: FilmProduction[] = [
  {
    id: 'the-walking-dead',
    title: 'The Walking Dead',
    releaseYear: 2010,
    endYear: 2022,
    type: 'series',
    filmingScopes: ['on_location', 'soundstage'],
    directors: ['Frank Darabont', 'Greg Nicotero', 'Michael E. Satrazemis', 'David Boyd'],
    keyCast: ['Andrew Lincoln', 'Norman Reedus', 'Melissa McBride', 'Danai Gurira', 'Lauren Cohan', 'Chandler Riggs', 'Jeffrey Dean Morgan', 'David Morrissey'],
    productionCompany: 'AMC Studios / Riverwood Studios / Raleigh Studios Atlanta / Idiot Box Productions',
    logline: 'Sheriff Deputy Rick Grimes wakes from a coma into a post-apocalyptic world overrun by the undead and searches for his family while leading a band of survivors.',
    senoiaStory:
      'The defining production in Senoia’s screen history. Beginning in Season 3 (2012), historic Main Street was transformed into the walled survivor town of Woodbury under the Governor’s rule. Shortly after, the Gin property just steps from downtown was built out into the Alexandria Safe Zone, complete with permanent security walls, modern brownstones, and windmill set pieces that remained in place for eight years. Riverwood Studios served as the central production headquarters, soundstage facility, and backlot for the Sanctuary, the Heaps (trash yard), and hilltop sets. The show’s decade in Senoia revitalized downtown commerce, spurred preservation and sensitive new infill construction, and turned the community into an international destination for screen tourism.',
    locations: [
      {
        name: 'Downtown Main Street (Woodbury Set)',
        address: 'Main Street between Seavy St & Bridge St, Senoia, GA',
        accessType: 'public_exterior',
        accessNote: 'Public commercial downtown district. All storefronts are active shops and restaurants.',
        sceneDescription: 'Served as the fortified town of Woodbury throughout Season 3, featuring guarded barricades, town meetings, and street patrols.',
      },
      {
        name: 'The Gin Property (Alexandria Safe Zone)',
        address: 'Morgan Street & Pylant Street, Senoia, GA',
        accessType: 'private_residence',
        accessNote: 'Private residential neighborhood. Please remain on public streets and respect residents’ privacy.',
        sceneDescription: 'The gated community of Alexandria from Season 5 through Season 11. Custom-built residential houses and windmill encircled by the iconic metal corrugated wall.',
      },
      {
        name: 'Esco Feed Mill',
        address: 'Crook Road / Barnes St, Senoia, GA',
        accessType: 'historic_site',
        accessNote: 'Historic agricultural mill structure. Viewable from public roads.',
        sceneDescription: 'Featured in multiple reconnaissance and confrontation sequences across Seasons 3 through 6.',
      },
      {
        name: 'Riverwood Studios (AMC Studios Lot)',
        address: '600 Chestlehurst Rd / Luther Bailey Rd, Senoia, GA',
        accessType: 'studio_private',
        accessNote: 'Active working film studio lot. Closed to the public.',
        sceneDescription: 'Hosted soundstages, workshop mills, production offices, and backlot sets for the Sanctuary, the Junkyard, and prison interiors.',
      },
      {
        name: 'Senoia Cemetery',
        address: 'Pylant Street, Senoia, GA',
        accessType: 'public_exterior',
        accessNote: 'Historic municipal cemetery. Open to quiet, respectful visitation.',
        sceneDescription: 'Atmospheric backdrop used in survivor transit scenes and outdoor memorial sequences.',
      },
    ],
    plaque: {
      installed: true,
      engravedTitle: 'The Walking Dead',
      engravedYear: '2012',
      locationDescription: 'Main Street sidewalk in historic downtown Senoia.',
    },
    studioNote: 'From Season 3 (2012) through the series finale, Riverwood Studios served as the production headquarters, soundstage facility, and backlot. AMC Studios purchased the 140-acre studio complex outright in 2017.',
    verifiedBy: ['SAHS Museum Film Exhibition', 'Main Street Walk of Fame Plaque', 'AMC Studios Production Records', 'Coweta County Film Commission'],
  },
  {
    id: 'fried-green-tomatoes',
    title: 'Fried Green Tomatoes',
    releaseYear: 1991,
    type: 'feature',
    filmingScopes: ['on_location'],
    directors: ['Jon Avnet'],
    keyCast: ['Kathy Bates', 'Jessica Tandy', 'Mary Stuart Masterson', 'Mary-Louise Parker', 'Cicely Tyson'],
    productionCompany: 'Universal Pictures / The Jon Avnet Company / Act III Communications',
    logline: 'An unhappy housewife befriending an elderly nursing-home resident is captivated by her tales of the people who shaped the town of Whistle Stop, Alabama in the 1920s and 30s.',
    senoiaStory:
      'The landmark motion picture that first brought Senoia to global cinematic renown. Director Jon Avnet selected Senoia because the town’s authentic architectural fabric perfectly captured the Depression-era South without requiring fabricated studio backlots. The two-story Victorian home built circa 1910 at 204 Bridge Street was chosen as the Threadgoode family house, and the nearby CSX railroad overpass on Bridge Street was the setting for the tragic scene where Buddy Threadgoode is caught on the tracks.',
    locations: [
      {
        name: 'The Travis-McDaniel House (Threadgoode House)',
        address: '204 Bridge Street, Senoia, GA 30276',
        coordinates: [33.2998353, -84.5521564],
        accessType: 'private_residence',
        accessNote: 'Private residence. Please admire respectfully from the sidewalk; do not trespass onto the porch or lawn.',
        historicalPlaceSlug: 'travis-house-bridge-street',
        sceneDescription: 'The home of the Threadgoode family where Idgie, Buddy, and their siblings grew up in 1920s Whistle Stop.',
      },
      {
        name: 'Bridge Street Railroad Overpass & Track',
        address: 'Bridge Street at the railroad crossing, Senoia, GA',
        accessType: 'public_exterior',
        accessNote: 'Public roadway and active rail corridor. Always remain clear of active railroad tracks.',
        sceneDescription: 'The dramatic railroad scene where young Buddy Threadgoode catches his boot in the track tie as the train approaches.',
      },
    ],
    plaque: {
      installed: true,
      engravedTitle: 'Fried Green Tomatoes',
      engravedYear: '1991',
      locationDescription: 'Main Street sidewalk in downtown Senoia.',
    },
    studioNote: 'Filmed on location throughout Senoia and Juliette, Georgia, utilizing Riverwood Studios for staging and production logistics.',
    verifiedBy: ['SAHS Museum Permanent Records', 'Main Street Walk of Fame Plaque', 'Universal Pictures Credits', 'Coweta County Film Commission'],
  },
  {
    id: 'driving-miss-daisy',
    title: 'Driving Miss Daisy',
    releaseYear: 1989,
    type: 'feature',
    filmingScopes: ['on_location'],
    directors: ['Bruce Beresford'],
    keyCast: ['Morgan Freeman', 'Jessica Tandy', 'Dan Aykroyd', 'Patti LuPone', 'Esther Rolle'],
    productionCompany: 'Warner Bros. / The Zanuck Company',
    logline: 'An elderly Jewish widow living in Atlanta develops an unlikely friendship and deep mutual respect with her African-American chauffeur over twenty-five years.',
    senoiaStory:
      'Winner of four Academy Awards including Best Picture. The production utilized rural Coweta County highways, vintage roadside settings, and Senoia’s period-accurate countryside to represent mid-century Georgia roadways as Hoke Colburn drove Miss Daisy Werthan across the state.',
    locations: [
      {
        name: 'Senoia Countryside & Historic Roadways',
        address: 'Historic routes surrounding Senoia, GA',
        accessType: 'public_exterior',
        accessNote: 'Public scenic driving routes throughout Coweta County.',
        sceneDescription: 'Mid-century automobile driving sequences showcasing untouched rolling Georgia farmland and tree canopies.',
      },
    ],
    plaque: {
      installed: true,
      engravedTitle: 'Driving Miss Daisy',
      engravedYear: '1989',
      locationDescription: 'Main Street sidewalk in downtown Senoia.',
    },
    verifiedBy: ['Main Street Walk of Fame Plaque', 'Coweta County Film Commission', 'Academy Award Filmography'],
  },
  {
    id: 'the-conjuring-the-devil-made-me-do-it',
    title: 'The Conjuring: The Devil Made Me Do It',
    releaseYear: 2021,
    type: 'feature',
    filmingScopes: ['on_location'],
    directors: ['Michael Chaves'],
    keyCast: ['Patrick Wilson', 'Vera Farmiga', 'Ruairi O’Connor', 'Sarah Catherine Hook', 'Julian Hilliard'],
    productionCompany: 'Warner Bros. / New Line Cinema / The Safran Company / Atomic Monster',
    logline: 'Paranormal investigators Ed and Lorraine Warren take on a chilling case of terror, murder, and unknown evil that shocked real-life courtroom history in 1981.',
    senoiaStory:
      'Thirty years after Fried Green Tomatoes filmed at 204 Bridge Street, Warner Bros. and New Line Cinema returned to the historic Travis-McDaniel House in Senoia to serve as the Glatzel family residence. The distinctive Victorian home with its wraparound porch and large corner entryway formed the atmospheric core for the film’s opening exorcism sequence and family investigation scenes.',
    locations: [
      {
        name: 'The Travis-McDaniel House (Glatzel Family Home)',
        address: '204 Bridge Street, Senoia, GA 30276',
        coordinates: [33.2998353, -84.5521564],
        accessType: 'private_residence',
        accessNote: 'Private residence. Please view only from public streets; do not enter property.',
        historicalPlaceSlug: 'travis-house-bridge-street',
        sceneDescription: 'The Glatzel family home where the climactic opening demonic confrontation and bedroom exorcism sequence take place.',
      },
    ],
    plaque: {
      installed: false,
      locationDescription: 'Filmed in 2019; released in 2021.',
    },
    verifiedBy: ['SAHS Archives', 'Coweta County Film Commission', 'Warner Bros. Production Notes'],
  },
  {
    id: 'sweet-home-alabama',
    title: 'Sweet Home Alabama',
    releaseYear: 2002,
    type: 'feature',
    filmingScopes: ['regional_landmark'],
    directors: ['Andy Tennant'],
    keyCast: ['Reese Witherspoon', 'Josh Lucas', 'Patrick Dempsey', 'Candice Bergen', 'Fred Ward', 'Mary Kay Place'],
    productionCompany: 'Touchstone Pictures / Original Film',
    logline: 'A young New York fashion designer who gets engaged to the city’s most eligible bachelor must return home to Alabama to obtain a divorce from her childhood sweetheart.',
    senoiaStory:
      'While the fictional town of Pigeon Creek was composited from several Georgia communities, historic Starr’s Mill—situated just three miles northeast of Senoia along GA-85—was chosen as the iconic setting for Jake Perry’s glassblowing studio, "Deep South Glass." The picturesque red gristmill on the mill pond has become an enduring pilgrimage site for fans visiting the Senoia area.',
    locations: [
      {
        name: 'Historic Starr’s Mill (Deep South Glass)',
        address: '1152 GA-85, Senoia / Fayetteville area, GA 30215',
        coordinates: [33.3295136, -84.5090313],
        accessType: 'historic_site',
        accessNote: 'Public historic park owned and preserved by Fayette County. Scenic grounds and waterfall viewable during daytime.',
        sceneDescription: 'Jake Perry’s glassblowing workshop where Melanie discovers his successful lightning-struck glass creations.',
      },
    ],
    plaque: {
      installed: true,
      engravedTitle: 'Sweet Home Alabama',
      engravedYear: '2002',
      locationDescription: 'Main Street sidewalk in downtown Senoia.',
    },
    verifiedBy: ['Main Street Walk of Fame Plaque', 'Georgia Department of Economic Development Film Office', 'Touchstone Pictures Credits'],
  },
  {
    id: 'pet-sematary-ii',
    title: 'Pet Sematary II',
    releaseYear: 1992,
    type: 'feature',
    filmingScopes: ['on_location'],
    directors: ['Mary Lambert'],
    keyCast: ['Edward Furlong', 'Anthony Edwards', 'Clancy Brown', 'Jared Rushton', 'Darlanne Fluegel'],
    productionCompany: 'Paramount Pictures',
    logline: 'A teenage boy and his father move to a small town in Maine, where he discovers an ancient burial ground capable of bringing the dead back to life with horrifying consequences.',
    senoiaStory:
      'Paramount Pictures filmed extensively in and around Senoia, transforming the quiet town into Ludlow, Maine. Locations included the historic Bridge Street railroad trestle, surrounding wooded trails, and local residences, with production based directly out of Riverwood Studios.',
    locations: [
      {
        name: 'Bridge Street Railroad Cut & Trestle',
        address: 'Bridge Street & Seavy Street crossing, Senoia, GA',
        accessType: 'public_exterior',
        accessNote: 'Public street perspective. Active railroad corridor.',
        sceneDescription: 'Town tracks and rural paths traversed by Jeff and Drew during their explorations of the town.',
      },
      {
        name: 'Historic Downtown Streets',
        address: 'Main Street & Seavy Street, Senoia, GA',
        accessType: 'public_exterior',
        accessNote: 'Public downtown commercial sidewalks.',
        sceneDescription: 'Town exteriors portraying the sleepy small town of Ludlow.',
      },
    ],
    plaque: {
      installed: true,
      engravedTitle: 'Pet Sematary II',
      engravedYear: '1992',
      locationDescription: 'Main Street sidewalk in downtown Senoia.',
    },
    studioNote: 'Utilized Riverwood Studios soundstage facilities for interior set staging and effects prep.',
    verifiedBy: ['SAHS Permanent Display', 'Main Street Walk of Fame Plaque', 'Paramount Pictures Records'],
  },
  {
    id: 'freejack',
    title: 'Freejack',
    releaseYear: 1992,
    type: 'feature',
    filmingScopes: ['soundstage'],
    directors: ['Geoff Murphy'],
    keyCast: ['Emilio Estevez', 'Mick Jagger', 'Rene Russo', 'Anthony Hopkins', 'Jonathan Banks'],
    productionCompany: 'Morgan Creek Productions / Warner Bros.',
    logline: 'A racecar driver about to perish in a fiery crash is snatched from the instant of impact and transported into a dystopian futuristic world where the wealthy harvest young bodies.',
    senoiaStory:
      'One of the major early productions to utilize Riverwood Studios shortly after its 1989 inception by Paul Lombardi. Large soundstages and backlot workshop spaces at the Senoia facility hosted high-concept sci-fi sets, futuristic transport vehicles, and stunt rigs alongside location work throughout metro Atlanta.',
    locations: [
      {
        name: 'Riverwood Studios Soundstages',
        address: '600 Chestlehurst Rd, Senoia, GA',
        accessType: 'studio_private',
        accessNote: 'Private studio complex (now AMC Studios). Closed to the public.',
        sceneDescription: 'Interior set builds including the high-tech body transplant laboratory and corporate chambers.',
      },
    ],
    plaque: {
      installed: true,
      engravedTitle: 'Freejack',
      engravedYear: '1992',
      locationDescription: 'Main Street sidewalk in downtown Senoia.',
    },
    studioNote: 'Key demonstration of Riverwood Studios’ capacity to handle major Hollywood genre productions in Coweta County.',
    verifiedBy: ['Main Street Walk of Fame Plaque', 'Riverwood Studios Historical Records', 'Warner Bros. Credits'],
  },
  {
    id: 'the-war',
    title: 'The War',
    releaseYear: 1994,
    type: 'feature',
    filmingScopes: ['soundstage', 'on_location'],
    directors: ['Jon Avnet'],
    keyCast: ['Kevin Costner', 'Elijah Wood', 'Mare Winningham', 'Lexi Randall'],
    productionCompany: 'Universal Pictures / Island World',
    logline: 'A Vietnam veteran struggling with PTSD and poverty tries to rebuild a peaceful life for his family in rural Mississippi while his children build an elaborate treehouse.',
    senoiaStory:
      'Director Jon Avnet returned to Senoia three years after Fried Green Tomatoes to base this poignant drama out of Riverwood Studios. The rural woodlands and rustic farmland of the Senoia countryside provided the authentic backdrop for the children’s fort battles and the Simmons family homestead.',
    locations: [
      {
        name: 'Riverwood Studios & Senoia Countryside',
        address: 'Senoia, GA 30276',
        accessType: 'studio_private',
        accessNote: 'Private studio and surrounding rural properties.',
        sceneDescription: 'Rural home builds and treehouse sequences staged in local woodlands.',
      },
    ],
    plaque: {
      installed: true,
      engravedTitle: 'The War',
      engravedYear: '1994',
      locationDescription: 'Main Street sidewalk in downtown Senoia.',
    },
    studioNote: 'Based out of Riverwood Studios under producer Jon Avnet and studio head Paul Lombardi.',
    verifiedBy: ['Main Street Walk of Fame Plaque', 'Universal Pictures Records', 'Coweta County Film Commission'],
  },
  {
    id: 'andersonville',
    title: 'Andersonville',
    releaseYear: 1996,
    type: 'tv_movie',
    filmingScopes: ['soundstage', 'on_location'],
    directors: ['John Frankenheimer'],
    keyCast: ['Jarrod Emick', 'Frederic Forrest', 'Ted Marcoux', 'Carmen Argenziano', 'Cliff De Young'],
    productionCompany: 'Turner Network Television (TNT)',
    logline: 'Union soldiers captured during the American Civil War endure horrific conditions in the infamous Confederate prisoner-of-war camp in southwestern Georgia.',
    senoiaStory:
      'Legendary director John Frankenheimer constructed an immense, meticulous full-scale replica of the Andersonville stockade across dozens of acres of Riverwood Studios’ backlot property in Senoia. The production earned Frankenheimer an Emmy Award for Outstanding Directing and demonstrated Senoia’s extraordinary scale for period backlot construction.',
    locations: [
      {
        name: 'Riverwood Studios Backlot (Stockade Replica)',
        address: 'Chestlehurst Road property, Senoia, GA',
        accessType: 'studio_private',
        accessNote: 'Private studio property (now AMC Studios). Closed to the public.',
        sceneDescription: 'Full-scale stockade walls, tents, dead-line boundary, and muddy encampment of the notorious military prison.',
      },
    ],
    plaque: {
      installed: true,
      engravedTitle: 'Andersonville',
      engravedYear: '1996',
      locationDescription: 'Main Street sidewalk in downtown Senoia.',
    },
    studioNote: 'One of the largest historical backlot set builds erected in Georgia prior to the 2000s.',
    verifiedBy: ['Main Street Walk of Fame Plaque', 'Emmy Award Records', 'Riverwood Studios Production History'],
  },
  {
    id: 'a-christmas-memory',
    title: 'A Christmas Memory',
    releaseYear: 1997,
    type: 'tv_movie',
    filmingScopes: ['on_location'],
    directors: ['Glenn Jordan'],
    keyCast: ['Patty Duke', 'Piper Laurie', 'Jeffrey DeMunn', 'Anita Gillette'],
    productionCompany: 'Hallmark Hall of Fame Productions / CBS',
    logline: 'An autobiographical adaptation of Truman Capote’s beloved holiday story of a young boy and his elderly eccentric cousin celebrating an unforgettable 1930s Christmas.',
    senoiaStory:
      'Filmed along Senoia’s historic residential streets and downtown storefronts. The town’s preserved turn-of-the-century architecture stood in for 1930s rural Alabama, showcasing Senoia’s classic porches, pecan trees, and traditional holiday warmth.',
    locations: [
      {
        name: 'Historic Residential Streets',
        address: 'Johnson St & Bridge St area, Senoia, GA',
        accessType: 'public_exterior',
        accessNote: 'Quiet residential streets. Public sidewalks only.',
        sceneDescription: 'Period holiday buggy and walking scenes under the town’s pecan trees.',
      },
    ],
    plaque: {
      installed: true,
      engravedTitle: 'A Christmas Memory',
      engravedYear: '1997',
      locationDescription: 'Main Street sidewalk in downtown Senoia.',
    },
    verifiedBy: ['Main Street Walk of Fame Plaque', 'Hallmark Hall of Fame Archive', 'SAHS Museum Records'],
  },
  {
    id: 'the-fighting-temptations',
    title: 'The Fighting Temptations',
    releaseYear: 2003,
    type: 'feature',
    filmingScopes: ['on_location'],
    directors: ['Jonathan Lynn'],
    keyCast: ['Cuba Gooding Jr.', 'Beyoncé Knowles', 'Mike Epps', 'Faith Evans', 'Steve Harvey'],
    productionCompany: 'Paramount Pictures / MTV Films',
    logline: 'An ambitious New York advertising executive must return to a small Georgia hometown and lead a ragtag church gospel choir to victory in a major competition to collect his aunt’s inheritance.',
    senoiaStory:
      'Downtown Senoia and surrounding Coweta County communities provided the Southern setting for Darrin Hill’s homecoming. The local streets, classic storefronts, and Southern hospitality captured the spirit of the fictional town of Monte Carlo, Georgia.',
    locations: [
      {
        name: 'Historic Senoia Downtown & Environs',
        address: 'Main Street, Senoia, GA 30276',
        accessType: 'public_exterior',
        accessNote: 'Public downtown commercial district.',
        sceneDescription: 'Town exteriors where Darrin reconnects with childhood acquaintances and encounters local characters.',
      },
    ],
    plaque: {
      installed: true,
      engravedTitle: 'The Fighting Temptations',
      engravedYear: '2003',
      locationDescription: 'Main Street sidewalk in downtown Senoia.',
    },
    verifiedBy: ['Main Street Walk of Fame Plaque', 'Paramount Pictures Production Records', 'Coweta County Film Commission'],
  },
  {
    id: 'broken-bridges',
    title: 'Broken Bridges',
    releaseYear: 2006,
    type: 'feature',
    filmingScopes: ['on_location'],
    directors: ['Steven Goldmann'],
    keyCast: ['Toby Keith', 'Kelly Preston', 'Lindsey Haun', 'Burt Reynolds', 'Tess Harper'],
    productionCompany: 'Paramount Classics / CMT Films',
    logline: 'A faded country music star returns to his small hometown for a funeral, where he encounters his high school sweetheart and meets the teenage daughter he never knew.',
    senoiaStory:
      'Paramount Classics and CMT filmed throughout historic Senoia, using the town’s iconic Main Street storefronts, local diner settings, and residential front porches to depict the close-knit community of Oakhurst, Tennessee.',
    locations: [
      {
        name: 'Historic Main Street Storefronts',
        address: 'Main Street, Senoia, GA 30276',
        accessType: 'commercial',
        accessNote: 'Public downtown business district.',
        sceneDescription: 'Downtown main street strolls, local shop visits, and conversations outside small-town storefronts.',
      },
    ],
    plaque: {
      installed: true,
      engravedTitle: 'Broken Bridges',
      engravedYear: '2006',
      locationDescription: 'Main Street sidewalk in downtown Senoia.',
    },
    verifiedBy: ['Main Street Walk of Fame Plaque', 'Paramount Classics Credits', 'Coweta County Film Commission'],
  },
  {
    id: 'meet-the-browns',
    title: 'Meet the Browns',
    releaseYear: 2008,
    type: 'feature',
    filmingScopes: ['soundstage', 'on_location'],
    directors: ['Tyler Perry'],
    keyCast: ['Angela Bassett', 'Tyler Perry', 'Rick Fox', 'David Mann', 'Tamela Mann'],
    productionCompany: 'Lionsgate / Tyler Perry Studios',
    logline: 'A struggling single mother in Chicago takes her family to Georgia for the funeral of a father she never met, only to discover her eccentric and joyous extended family.',
    senoiaStory:
      'Tyler Perry filmed scenes across Senoia and utilized Riverwood Studios for production infrastructure and set builds, combining the town’s authentic Georgia setting with Atlanta-area soundstage resources.',
    locations: [
      {
        name: 'Senoia Area Exteriors & Riverwood Studios',
        address: 'Senoia, GA 30276',
        accessType: 'studio_private',
        accessNote: 'Private studio lot and local scenic road corridors.',
        sceneDescription: 'Arrival sequences and local Georgia countryside exteriors.',
      },
    ],
    plaque: {
      installed: true,
      engravedTitle: 'Meet the Browns',
      engravedYear: '2008',
      locationDescription: 'Main Street sidewalk in downtown Senoia.',
    },
    verifiedBy: ['Main Street Walk of Fame Plaque', 'Lionsgate Production Notes', 'Georgia Film Office'],
  },
  {
    id: 'drop-dead-diva',
    title: 'Drop Dead Diva',
    releaseYear: 2009,
    endYear: 2014,
    type: 'series',
    filmingScopes: ['on_location', 'soundstage'],
    directors: ['Michael Grossman', 'Jamie Babbit', 'Dwight H. Little', 'Kevin Hooks'],
    keyCast: ['Brooke Elliott', 'Margaret Cho', 'Jackson Hurst', 'Kate Levering', 'April Bowlby'],
    productionCompany: 'Lifetime / Sony Pictures Television',
    logline: 'A shallow aspiring model who dies in a car crash is reincarnated in the body of a brilliant, plus-size attorney who has just passed away.',
    senoiaStory:
      'For six seasons, Drop Dead Diva maintained its primary production offices and interior courtroom and law office soundstages at Riverwood Studios / Raleigh Studios Atlanta in Senoia. The cast and crew were beloved fixtures on Senoia’s Main Street, frequently stepping outside the soundstages to shoot outdoor café and street scenes right in downtown.',
    locations: [
      {
        name: 'Riverwood / Raleigh Studios Atlanta Soundstages',
        address: 'Chestlehurst Road, Senoia, GA',
        accessType: 'studio_private',
        accessNote: 'Active production studio (now AMC Studios). Closed to the public.',
        sceneDescription: 'Extensive multi-floor sets for the Harrison & Parker law firm, conference rooms, and courtrooms.',
      },
      {
        name: 'Downtown Main Street Cafés & Sidewalks',
        address: 'Main Street, Senoia, GA 30276',
        accessType: 'commercial',
        accessNote: 'Public commercial downtown district.',
        sceneDescription: 'Lunch meetings, sidewalk conversations, and exterior office arrivals filmed around downtown Senoia.',
      },
    ],
    plaque: {
      installed: true,
      engravedTitle: 'Drop Dead Diva',
      engravedYear: '2009',
      locationDescription: 'Main Street sidewalk in downtown Senoia.',
    },
    studioNote: 'Brought hundreds of cast and crew members to Senoia continuously between 2009 and 2014, playing a major role in downtown revitalization.',
    verifiedBy: ['SAHS Permanent Exhibition', 'Main Street Walk of Fame Plaque', 'Sony Pictures Television Records'],
  },
  {
    id: 'killers',
    title: 'Killers',
    releaseYear: 2010,
    type: 'feature',
    filmingScopes: ['on_location'],
    directors: ['Robert Luketic'],
    keyCast: ['Ashton Kutcher', 'Katherine Heigl', 'Tom Selleck', 'Catherine O’Hara', 'Martin Mull'],
    productionCompany: 'Lionsgate / Katalyst Media',
    logline: 'A woman discovers that her seemingly perfect suburban husband is actually an undercover government assassin whose former colleagues are now out to eliminate him.',
    senoiaStory:
      'Lionsgate shot suburban street chases and residential exterior scenes in quiet Senoia neighborhoods, highlighting the manicured lawns, white fences, and tree-lined streets that gave the couple’s suburban life its peaceful veneer.',
    locations: [
      {
        name: 'Senoia Residential Streets',
        address: 'Senoia, GA 30276',
        accessType: 'private_residence',
        accessNote: 'Active residential streets. Please observe from sidewalks only.',
        sceneDescription: 'Suburban neighborhood drives and quiet residential street scenes.',
      },
    ],
    plaque: {
      installed: true,
      engravedTitle: 'Killers',
      engravedYear: '2010',
      locationDescription: 'Main Street sidewalk in downtown Senoia.',
    },
    verifiedBy: ['Main Street Walk of Fame Plaque', 'Lionsgate Credits', 'Coweta County Film Commission'],
  },
  {
    id: 'footloose',
    title: 'Footloose',
    releaseYear: 2011,
    type: 'feature',
    filmingScopes: ['on_location'],
    directors: ['Craig Brewer'],
    keyCast: ['Kenny Wormald', 'Julianne Hough', 'Dennis Quaid', 'Andie MacDowell', 'Miles Teller'],
    productionCompany: 'Paramount Pictures / MTV Films / Spyglass Entertainment',
    logline: 'City teenager Ren MacCormack moves to a conservative Southern small town that has banned dancing and loud rock music, sparking a youthful rebellion.',
    senoiaStory:
      'Director Craig Brewer filmed key scenes throughout Coweta County, utilizing Senoia’s historic brick architecture and authentic town character to depict the fictional town of Bomont, Georgia. The production captured the timeless character of local Main Street buildings and surrounding country highways.',
    locations: [
      {
        name: 'Historic Main Street Architecture',
        address: 'Main Street, Senoia, GA 30276',
        accessType: 'public_exterior',
        accessNote: 'Public downtown commercial sidewalks.',
        sceneDescription: 'Town storefronts and streetscapes establishing Bomont’s conservative small-town atmosphere.',
      },
    ],
    plaque: {
      installed: true,
      engravedTitle: 'Footloose',
      engravedYear: '2011',
      locationDescription: 'Main Street sidewalk in downtown Senoia.',
    },
    verifiedBy: ['Main Street Walk of Fame Plaque', 'Paramount Pictures Records', 'Coweta County Film Commission'],
  },
  {
    id: 'ill-fly-away',
    title: 'I’ll Fly Away',
    releaseYear: 1991,
    endYear: 1993,
    type: 'series',
    filmingScopes: ['on_location'],
    directors: ['Ian Sander', 'Joshua Brand', 'John Falsey'],
    keyCast: ['Sam Waterston', 'Regina Taylor', 'Jeremy London', 'Ashlee Levitch', 'Jason London'],
    productionCompany: 'Lorimar Television / Brand-Falsey Productions / NBC',
    logline: 'A Southern district attorney and his African-American housekeeper navigate social and moral shifts during the emerging Civil Rights movement of the late 1950s and early 1960s.',
    senoiaStory:
      'Critically acclaimed winner of two Emmy Awards and three Golden Globes. The production used Senoia’s preserved mid-century architectural details, historic churches, and courthouse squares across Coweta County to depict the fictional town of Bryland, Georgia.',
    locations: [
      {
        name: 'Historic Senoia Town Environs',
        address: 'Senoia, GA 30276',
        accessType: 'public_exterior',
        accessNote: 'Public sidewalks and town center.',
        sceneDescription: '1950s period streetscapes, town strolls, and community meetings.',
      },
    ],
    plaque: {
      installed: true,
      engravedTitle: 'I’ll Fly Away',
      engravedYear: '1991',
      locationDescription: 'Main Street sidewalk in downtown Senoia.',
    },
    verifiedBy: ['Main Street Walk of Fame Plaque', 'Emmy Award Archive', 'SAHS Museum Records'],
  },
  {
    id: 'joyful-noise',
    title: 'Joyful Noise',
    releaseYear: 2012,
    type: 'feature',
    filmingScopes: ['on_location'],
    directors: ['Todd Graff'],
    keyCast: ['Queen Latifah', 'Dolly Parton', 'Keke Palmer', 'Jeremy Jordan', 'Courtney B. Vance'],
    productionCompany: 'Warner Bros. / Alcon Entertainment',
    logline: 'Two strong-minded women clash when they are tasked with leading a small-town Georgia church choir to the national gospel choir competition.',
    senoiaStory:
      'Filmed across small communities in Coweta County and western Georgia. The production captured the intimate community feeling of local churches and Main Street businesses, highlighting the region’s musical and cultural roots.',
    locations: [
      {
        name: 'Coweta County & Senoia Community Settings',
        address: 'Senoia area, GA 30276',
        accessType: 'public_exterior',
        accessNote: 'Public town streets and local venues.',
        sceneDescription: 'Community gatherings and small-town choir rehearsal backdrops.',
      },
    ],
    plaque: {
      installed: false,
      locationDescription: 'Filmed in 2011; released in 2012.',
    },
    verifiedBy: ['Coweta County Film Commission', 'Warner Bros. Production Records'],
  },
  {
    id: 'lawless',
    title: 'Lawless',
    releaseYear: 2012,
    type: 'feature',
    filmingScopes: ['on_location'],
    directors: ['John Hillcoat'],
    keyCast: ['Shia LaBeouf', 'Tom Hardy', 'Jason Clarke', 'Guy Pearce', 'Jessica Chastain', 'Mia Wasikowska', 'Gary Oldman'],
    productionCompany: 'The Weinstein Company / Annapurna Pictures',
    logline: 'During the Prohibition era in Franklin County, Virginia, three bootlegging brothers face ruthless threats from a corrupt Chicago special deputy.',
    senoiaStory:
      'John Hillcoat brought an all-star ensemble to western Georgia, using the remote dirt roads, dense woods, and vintage farmsteads surrounding Senoia and Coweta County to authentically stand in for Depression-era Franklin County, Virginia.',
    locations: [
      {
        name: 'Senoia Countryside & Woodland Corridors',
        address: 'Rural Senoia, GA 30276',
        accessType: 'public_exterior',
        accessNote: 'Scenic rural roads. Please respect adjoining private farmland.',
        sceneDescription: 'Prohibition-era automobile runs through thick forest roads and rural moonshine drop points.',
      },
    ],
    plaque: {
      installed: false,
      locationDescription: 'Filmed throughout Coweta County in 2011.',
    },
    verifiedBy: ['Coweta County Film Commission', 'Georgia Film Office', 'Production Notes'],
  },
  {
    id: 'thunder-road',
    title: 'Thunder Road',
    releaseYear: 2026,
    type: 'series',
    filmingScopes: ['soundstage', 'on_location'],
    directors: ['To Be Announced'],
    keyCast: ['Dennis Quaid'],
    productionCompany: 'AMC Studios / Riverwood Studios',
    logline: 'A high-stakes drama series centered around the gritty culture, intense rivalries, and legendary history of Southern stock car racing.',
    senoiaStory:
      'AMC Studios returned to its Riverwood Studios production hub in Senoia in August 2026 to commence production on this flagship stock car racing series starring Dennis Quaid, reaffirming Senoia’s standing as an active, premier television production center.',
    locations: [
      {
        name: 'Riverwood Studios (AMC Studios Lot)',
        address: '600 Chestlehurst Rd, Senoia, GA 30276',
        accessType: 'studio_private',
        accessNote: 'Private studio facility. Strictly closed to the public.',
        sceneDescription: 'Soundstage race shop builds, technical garages, and interior drama sets.',
      },
    ],
    plaque: {
      installed: false,
      locationDescription: 'In production at Riverwood Studios.',
    },
    studioNote: 'Demonstrates AMC Studios’ continued long-term investment in the Senoia studio facility.',
    verifiedBy: ['AMC Studios Press Announcements', 'Coweta County Production Registry', 'Atlanta Journal-Constitution (2026)'],
  },
];

export const SENOIA_FILM_MAP_PINS: FilmMapPin[] = [
  {
    id: 'pin-travis-mcdaniel',
    title: 'The Travis-McDaniel House',
    address: '204 Bridge Street, Senoia, GA 30276',
    coordinates: [33.2998353, -84.5521564],
    accessType: 'private_residence',
    accessLabel: 'Private Residence — observe from sidewalk only',
    description: 'Circa 1910 Victorian home famously featured in both Fried Green Tomatoes (the Threadgoode family house) and The Conjuring: The Devil Made Me Do It (the Glatzel home).',
    historicalPlaceSlug: 'travis-house-bridge-street',
    productions: [
      {
        title: 'Fried Green Tomatoes',
        releaseYear: 1991,
        sceneNote: 'The Threadgoode family residence throughout the film.',
      },
      {
        title: 'The Conjuring: The Devil Made Me Do It',
        releaseYear: 2021,
        sceneNote: 'The Glatzel family home and opening exorcism sequence.',
      },
    ],
  },
  {
    id: 'pin-main-street-woodbury',
    title: 'Downtown Main Street (Woodbury Set)',
    address: 'Main Street between Seavy St & Bridge St, Senoia, GA 30276',
    coordinates: [33.3009, -84.5541],
    accessType: 'commercial',
    accessLabel: 'Public Downtown Commercial District',
    description: 'The historic heart of Senoia. Served as Woodbury in The Walking Dead, Bomont in Footloose, and the backdrop for Drop Dead Diva, Broken Bridges, and Pet Sematary II. Sidewalk plaques line this street.',
    historicalPlaceSlug: 'senoia-welcome-center',
    productions: [
      {
        title: 'The Walking Dead',
        releaseYear: 2010,
        sceneNote: 'The walled survivor town of Woodbury (Season 3).',
      },
      {
        title: 'Drop Dead Diva',
        releaseYear: 2009,
        sceneNote: 'Exterior sidewalk cafés, law office strolls, and street scenes.',
      },
      {
        title: 'Footloose',
        releaseYear: 2011,
        sceneNote: 'Bomont town center storefronts.',
      },
      {
        title: 'Broken Bridges',
        releaseYear: 2006,
        sceneNote: 'Hometown streetscapes and diner exteriors.',
      },
    ],
  },
  {
    id: 'pin-starrs-mill',
    title: 'Historic Starr’s Mill (Deep South Glass)',
    address: '1152 GA-85, Senoia / Fayetteville area, GA 30215',
    coordinates: [33.3295136, -84.5090313],
    accessType: 'historic_site',
    accessLabel: 'Public Historic County Park',
    description: 'Picturesque 1907 grist mill and waterfall along Whitewater Creek just 3 miles outside Senoia. Portrayed Jake Perry’s glassblowing studio in Sweet Home Alabama.',
    productions: [
      {
        title: 'Sweet Home Alabama',
        releaseYear: 2002,
        sceneNote: 'Jake’s glassblowing studio "Deep South Glass".',
      },
    ],
  },
  {
    id: 'pin-senoia-welcome-center',
    title: 'Senoia Welcome Center (Walk of Fame Starting Point)',
    address: '68 Main Street, Senoia, GA 30276',
    coordinates: [33.3017826, -84.5542032],
    accessType: 'commercial',
    accessLabel: 'Public Welcome Center & Visitor Services',
    description: 'Operated by the Senoia Downtown Development Authority. Starting point for the sidewalk Walk of Fame plaques installed into the Main Street brick.',
    historicalPlaceSlug: 'senoia-welcome-center',
    productions: [
      {
        title: 'Main Street Walk of Fame',
        releaseYear: 1989,
        sceneNote: 'Plaques commemorating movies and television filmed in Senoia begin outside 68 Main St.',
      },
    ],
  },
];
