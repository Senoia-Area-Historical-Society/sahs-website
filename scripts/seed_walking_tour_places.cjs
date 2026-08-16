/**
 * Seeds historical_places from the Senoia Walking Tour.
 *
 * Source: "Senoia Walking Tour Script.docx" in the Society's Google Drive (the
 * WalknTours audio tour script). Text is adapted from that script — walking
 * directions ("cross the street carefully", "continue north on Pylant") are
 * stripped, since they make sense in an audio tour and not on a web page.
 * Nothing here is invented; every date, name, and detail comes from the script.
 *
 * Photos come from the Society's "Senoia Walking Tour Photos" folders, converted
 * to webp and committed under public/images/. They are served by Firebase Hosting
 * alongside the site rather than uploaded to Storage, so they are versioned with
 * the code and need no production write to seed. Admin uploads still go to
 * Storage — mainImage is just a URL either way.
 *
 * Coordinates are geocoded from the addresses and verified — see COORDINATES
 * below for how results are filtered. 34 of the 36 stops have a pin; the two
 * churches are identified by intersection rather than street number and have no
 * usable geocoder record, so they stay null and can be pinned in /admin/places.
 *
 * Safe by default: writes to the emulator unless you pass --production, matching
 * the convention in seed_july4_event.cjs. Idempotent — the doc ID is derived from
 * the slug, so re-running updates in place rather than creating duplicates.
 *
 *   node scripts/seed_walking_tour_places.cjs                # emulator
 *   node scripts/seed_walking_tour_places.cjs --production   # real site
 */
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue, GeoPoint } = require('firebase-admin/firestore');

const PRODUCTION = process.argv.includes('--production');
if (!PRODUCTION) {
  process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
}

if (require('firebase-admin').apps.length === 0) {
  initializeApp({ projectId: 'sahs-archives' });
}
const db = getFirestore();

const p = (...paragraphs) => paragraphs.map(t => `<p>${t}</p>`).join('\n');
const tour = file => `/images/walking-tour/${file}.webp`;
const archive = file => `/images/senoia-archive/${file}.webp`;

const PLACES = [
  {
    slug: 'senoia-welcome-center',
    title: 'The Senoia Welcome Center',
    type: 'Business',
    historical_address: '68 Main Street, Senoia, GA 30276',
    mainImage: tour('01-68-main-st'),
    galleryImages: [archive('welcome-center')],
    excerpt: 'Once home to the Senoia Police Department — older locals still remember the jail cell inside.',
    description: p(
      'The City of Senoia Welcome Center at 68 Main Street was once home to the Senoia Police Department. Senior locals remember when it had a jail cell inside.',
      'The Welcome Center is operated and maintained by the Senoia Downtown Development Authority, and carries travel brochures and local maps. Look down as you walk this stretch of Main Street: the plaques set into the sidewalk commemorate the movies and television shows filmed in Senoia.'
    ),
  },
  {
    slug: 'buggy-shop-museum',
    title: 'The Buggy Shop Museum',
    type: 'Business',
    historical_address: '74 Main Street, Senoia, GA 30276',
    mainImage: tour('02-74-main-st'),
    excerpt: 'Built in 1872 and thought to be one of the oldest continuously operated commercial buildings in Georgia.',
    description: p(
      'Built in 1872, this building is considered one of the oldest continuously operated commercial buildings in the state of Georgia.',
      'The wooden structure, now a museum, was formerly a business operated by Walter and Warren Baggarly, the twin sons of Rev. and Mrs. Francis Warren Baggarly. The brothers sold wagons, buggies, horse collars, and plows.'
    ),
  },
  {
    slug: 'senoia-church-of-god-of-prophecy',
    title: 'Senoia Church of God of Prophecy',
    type: 'Place or Thing',
    historical_address: 'Main Street at Johnson Street, Senoia, GA 30276',
    mainImage: tour('03-87-main-st'),
    excerpt: 'A yellow brick church at the corner of Main and Johnson, known for its sanctuary.',
    description: p(
      'The yellow brick church at the corner of Main Street and Johnson is the Senoia Church of God of Prophecy, known locally for its beautiful sanctuary.'
    ),
  },
  {
    slug: 'couch-morgan-house',
    title: 'The Couch-Morgan House',
    historical_address: '101 Main Street, Senoia, GA 30276',
    mainImage: tour('04-101-main-st'),
    galleryImages: [archive('101-main-street'), archive('m-h-couch')],
    excerpt:
      'A Queen Anne home of about 1890, with a wraparound porch, eight fireplaces, and a cast-iron fire escape running through the back porches.',
    description: p(
      'This Queen Anne style home, circa 1890, features a wraparound porch, a second-story balcony, complex gables, and stained-glass windows. The cupola balcony opens off a trunk room so large it was later used as a nursery.',
      'On the back of the house there are double porches, upper and lower, with a cast iron pole running through a hole in the porches as a fire escape. Inside are heart pine woodwork, stained glass, and gingerbread arches. Each of the eight fireplaces has different millwork.',
      'In its early years the brick-floored basement served as the kitchen. Meals were prepared there, carried up to the butler’s pantry, and served in the family’s dining room. Matthew Henderson Couch lived here with his family.'
    ),
  },
  {
    slug: 'baggarly-home',
    title: 'The Baggarly Home',
    historical_address: '100 Baggarly Way, Senoia, GA 30276',
    mainImage: tour('05-100-baggarly-way'),
    galleryImages: [archive('100-baggarly-way')],
    excerpt:
      'Built in the early 1870s and later home to the family of Rev. Francis Warren Baggarly, who bought the tract of land that became Senoia.',
    description: p(
      'This home is believed to have been built in the early 1870s by the Hitch family. It later became the residence of family members of the Rev. Francis Warren Baggarly, who in 1860 purchased the 202.5-acre tract that became Senoia and founded the Methodist church here.',
      'Census records list Rev. Baggarly as a farmer as well as a minister. During the Civil War he ran a sewing factory with looms and sewing machines, where women and children made shoes and hats for the husbands and fathers serving in the war. That enterprise must have served his financial needs — he was never paid for his pastoral work. Around 1871 he began a pipe-making business in partnership with William H. Lankford.'
    ),
  },
  {
    slug: 'first-baptist-church-of-senoia',
    title: 'First Baptist Church of Senoia',
    type: 'Place or Thing',
    historical_address: '41 Johnson Street, Senoia, GA 30276',
    mainImage: tour('06-41-johnson-st'),
    excerpt: 'Constituted in July 1867 as “The Baptist Church of Christ,” founded by a presbytery of three men.',
    description: p(
      'On July 6, 1867, Reverend Henry S. Reese, J. C. Camp, and James Sperling formed a presbytery to found and constitute what was originally named “The Baptist Church of Christ.”'
    ),
  },
  {
    slug: 'jones-humphrey-house',
    title: 'The Jones-Humphrey House',
    historical_address: '9 Johnson Street, Senoia, GA 30276',
    mainImage: tour('07-9-johnson-st'),
    excerpt: 'Built in the early 1850s by the Jones family — a two-storey version of the Gabled Ell, common in 19th-century Georgia.',
    description: p(
      'This home was built between 1850 and 1855 by its original owners, the Jones family. The War family were the second owners, and placed a large swing on the front porch for the father. The Enloe family followed; Mr. Enloe was an elder in the Presbyterian Church. The Humphreys moved into the home in 1956 and raised their four sons here.',
      'The house is a two-story version of a very common late nineteenth century architectural style in Georgia known as the Gabled Ell.'
    ),
  },
  {
    slug: 'former-senoia-presbyterian-church',
    title: 'The Former Senoia Presbyterian Church',
    type: 'Place or Thing',
    historical_address: '386 Pylant Street, Senoia, GA 30276',
    mainImage: tour('08-386-pylant-st'),
    excerpt: 'Begun in 1892 and dedicated in 1894; the only historic church in Senoia with a burial on its grounds.',
    description: p(
      'Construction of the Senoia Presbyterian Church began on December 5, 1892. The building was finished and dedicated in 1894.',
      'Thomas Hightower Peavy, who lived between 1826 and 1871 and served during the Civil War, is the only person buried on the grounds of this church — and the only known person buried at any of the historic churches in Senoia. After serving as a Presbyterian church for many years, the building was used as a wedding chapel.'
    ),
  },
  {
    slug: 'hutchinson-house-pylant',
    title: 'The Hutchinson House',
    historical_address: '368 Pylant Street, Senoia, GA 30276',
    mainImage: tour('09-368-pylant-st'),
    excerpt:
      'An 1892 Gabled Ell Cottage, once home to Jimmy Hutchinson, who became Georgia’s youngest mayor at twenty-five.',
    description: p(
      'Built in 1892, this house is an example of the Gabled Ell Cottage. It is L-shaped and carries folk Victorian details such as the gingerbread trim along the porch.',
      'This was once the home of Jimmy Hutchinson, who at the age of twenty-five became Georgia’s youngest mayor. He served from 1961 to 1968 and was a founding member of Senoia’s Downtown Development Authority. With his father, he operated Hutchinson’s Hardware Store at the corner of Seavy and Main Streets for fifty years.'
    ),
  },
  {
    slug: 'hand-house',
    title: 'The Hand House',
    historical_address: '371 Pylant Street, Senoia, GA 30276',
    mainImage: tour('10-371-pylant-st'),
    excerpt: 'Built in 1907 by the R.D. Cole Manufacturing Company for Lee Hand and his bride, Coral, with an iron fence salvaged from Chattanooga’s Union Station.',
    description: p(
      'Mr. Lee Hand had this home built in 1907 by the R.D. Cole Manufacturing Company of Newnan for his bride, Coral. The Neoclassical structure, with its central pedimented portico and Doric columns, was designed to imitate the earlier Federal style popular in this region in the 1830s.',
      'The old iron fence was purchased from Union Station in Chattanooga when it was being demolished. Mr. Hand owned a general store, started a bank, and was in the peach business.'
    ),
  },
  {
    slug: 'brandenburg-house',
    title: 'The Brandenburg House',
    historical_address: '163 Seavy Street, Senoia, GA 30276',
    mainImage: tour('11-163-seavy-st'),
    galleryImages: [archive('163-seavy-street')],
    excerpt: 'An 1873 Victorian Gothic house of Georgia heart pine and Senoia Brickworks brick, supported by 22-foot crossbeams.',
    description: p(
      'Built in 1873 by George P. Hodnett, this house is an excellent example of the Victorian Gothic style popular immediately after the Civil War. It was constructed with native Georgia heart of pine and bricks from the one-time Senoia Brickworks, and is supported by 22-foot crossbeams.',
      'The three gables characteristic of the style create a “picturesque” irregularity. Victorian Gothic was popularised by A. J. Downing, a landscape architect who published several books on building cottages to ornament a natural setting. The home has four fireplaces upstairs and four down.'
    ),
  },
  {
    slug: 'gibson-house',
    title: 'The Gibson House',
    historical_address: '352 Pylant Street, Senoia, GA 30276',
    mainImage: tour('12-352-pylant-st'),
    galleryImages: [archive('352-pylant')],
    excerpt:
      'A seven-room Early Classical Revival house built by a cotton broker between 1870 and 1880, with an unusual U-shaped plan.',
    description: p(
      'The Gibson House was built by a cotton broker between 1870 and 1880. This seven-room Early Classical Revival home conforms to the original structure shown on the 1898 site map of Senoia.',
      'It has an unusual “U” configuration, with a side entry that accommodated buggies and wagons and gave access from the veranda to both the kitchen and the front hall. Early Classical Revival homes are marked by side gables and a characteristic full-height entry porch; this one was later modified to its present Victorian style.',
      'The house was for many years the residence of Evelyn Gibson, a local school teacher.'
    ),
  },
  {
    slug: 'duke-house',
    title: 'The Duke House',
    historical_address: '304 Pylant Street, Senoia, GA 30276',
    mainImage: tour('13-304-pylant-st'),
    excerpt: 'A circa 1907 bungalow, meticulously renovated, retaining its heart pine floors and beadboard walls.',
    description: p(
      'This circa 1907 bungalow has been meticulously renovated, with an attached garage and modern upgrades added. The home retains its original heart pine floors, beadboard walls and ceilings, and original windows.'
    ),
  },
  {
    slug: 'arnall-house-291-pylant',
    title: 'The Arnall House',
    historical_address: '291 Pylant Street, Senoia, GA 30276',
    mainImage: tour('14-291-pylant-st'),
    galleryImages: [
      archive('291-pylant'),
      archive('ellamaefreemanarnalland-charles-henry-arnall'),
      archive('freemanarnall-marriage-announcement'),
    ],
    excerpt:
      'Built in 1913 with twelve rooms, seven coal-burning fireplaces, and 57 windows containing 847 individual panes of glass.',
    description: p(
      'Built in 1913, this post-Victorian home is in a style sometimes called “Princess Anne” — the transition between the decorative asymmetry of the Queen Anne and the growing interest in the simplicity and classical detail of the Neoclassical. Note the irregular roof line, the fifteen-over-one windows, and the classical Doric column porch.',
      'The house was built with seven coal-burning fireplaces, many of their original iron inserts still in place. It has twelve rooms and 57 windows containing 847 individual panes of glass. Most of the windows retain their original glass and still use a pulley and counterweight mechanism. The main floor is solid maple tongue-and-groove flooring.'
    ),
  },
  {
    slug: 'freeman-house',
    title: 'The Freeman House',
    historical_address: '279 Pylant Street, Senoia, GA 30276',
    mainImage: tour('15-279-pylant-st'),
    excerpt: 'A 1924 Craftsman bungalow designed by Leila Ross Wilburn, one of Georgia’s first female architects.',
    description: p(
      'This Craftsman bungalow, built in 1924, was designed by Leila Ross Wilburn, one of the first female architects in Georgia.',
      'Wilburn designed arts and crafts houses in a range of styles across Atlanta’s most desirable older neighbourhoods, including Decatur, Midtown, Candler Park, and Ansley Park.'
    ),
  },
  {
    slug: 'linch-house',
    title: 'The Linch House',
    historical_address: '270 Pylant Street, Senoia, GA 30276',
    mainImage: tour('16-270-pylant-st'),
    galleryImages: [archive('270-pylant')],
    excerpt: 'An 1889 farmhouse built by Captain William D. Linch, one of the county’s largest landowners and cotton producers.',
    description: p(
      'This 1889 home was built by Captain William D. Linch and is an example of the 19th Century Farmhouse style.',
      'Captain Linch was one of the largest landowners and cotton producers in the county. He fought in the Civil War at Manassas, the Seven Days’ fight at Richmond, Malvern Hill, Cold Harbor, Knoxville, the Wilderness, Fair Oaks, Sharpsburg, and Gettysburg.'
    ),
  },
  {
    slug: 'mcknight-house',
    title: 'The McKnight House',
    historical_address: '258 Pylant Street, Senoia, GA 30276',
    mainImage: tour('17-258-pylant-st'),
    galleryImages: [archive('258-pylant')],
    excerpt: 'A circa 1905 Neoclassical house built as a wedding gift for Mary McKnight — with its front door set off centre for her grand piano.',
    description: p(
      'This circa 1905 Neoclassical house was built as a wedding gift for Mary McKnight by her father, Captain W. D. Linch. It was built by the R.D. Cole Manufacturing Company, the same firm that built the Hand House earlier on this tour.',
      'It is said that Miss Mary directed the front door to be placed off centre in order to accommodate her grand piano in the room to the right.'
    ),
  },
  {
    slug: 'arnall-house-244-pylant',
    title: 'The Arnall House (244 Pylant)',
    historical_address: '244 Pylant Street, Senoia, GA 30276',
    mainImage: tour('18-244-pylant-st'),
    excerpt: 'Built about 1892 for a daughter whose fiancé never returned from the Spanish-American War; later used as a children’s hospital.',
    description: p(
      'This circa 1892 home was originally built by a man for his daughter, who was engaged to be married. Her fiancé went off to fight in the Spanish-American War and, tragically, never returned.',
      'The distraught daughter’s father then let the home be used as a children’s hospital — a home for children with ailments such as chicken pox, which were far more serious then than now.'
    ),
  },
  {
    slug: 'cleveland-house',
    title: 'The Cleveland House',
    historical_address: '230 Pylant Street, Senoia, GA 30276',
    mainImage: tour('19-230-pylant-st'),
    excerpt: 'A restored Craftsman bungalow with Prairie Style stained glass sidelights.',
    description: p(
      'This classic Craftsman bungalow has been beautifully restored. Features include Prairie Style stained glass sidelights, original wood floors, and a sideboard designed to showcase leaded glass windows found in the crawlspace under the house.'
    ),
  },
  {
    slug: 'massengale-house',
    title: 'The Massengale House',
    historical_address: '225 Pylant Street, Senoia, GA 30276',
    mainImage: tour('20-225-pylant-st'),
    galleryImages: [archive('225-pylant')],
    excerpt:
      'Built in 1867 and left abandoned for years, this house was bought in 2012 and brought back over a year-long restoration.',
    description: p(
      'Originally built in 1867, this home sat abandoned for many years until it was purchased for $84,000 in 2012 and underwent a year-long renovation costing approximately $770,000.',
      'The work added a wine cellar, a new kitchen, a new primary bedroom, and an in-ground swimming pool. The renovators kept as much of the original structure as they could.'
    ),
  },
  {
    slug: 'mann-house',
    title: 'The Mann House',
    historical_address: '239 Pylant Street, Senoia, GA 30276',
    mainImage: tour('21-239-pylant-st'),
    excerpt: 'A 1909 American Four Square ordered from a Sears, Roebuck catalog by cotton and peach farmer — and one-time mayor — Oscar Mann.',
    description: p(
      'This 1909 house was built by Oscar Mann, a local cotton and peach farmer and one-time Mayor of Senoia. The home is of the American Four Square design and was acquired through a Sears, Roebuck and Company catalog.',
      'It features a wraparound front porch and both swamp maple and heart of pine flooring, with oak, walnut, and pine fireplace mantels.'
    ),
  },
  {
    slug: 'southern-living-idea-house',
    title: 'The 2012 Southern Living Idea House',
    type: 'Place or Thing',
    historical_address: '57 Morgan Street, Senoia, GA 30276',
    mainImage: tour('22-57-morgan-st'),
    excerpt: 'Senoia’s second turn as a Southern Living Idea House, after the 2010 house drew some 20,000 paying visitors.',
    description: p(
      'The 2012 Southern Living Idea House stands at 57 Morgan Street, at the intersection of Lower Creek Trail.',
      'Senoia had hosted the magazine before: the corner townhouse at 119 McKnight Drive was professionally decorated by Southern Living and named the 2010 Idea House. It was open for tours from June to December that year, and roughly 20,000 visitors paid to see it.'
    ),
  },
  {
    slug: 'sims-house',
    title: 'The Sims House',
    historical_address: '36 Broad Street, Senoia, GA 30276',
    mainImage: tour('23-36-broad-st'),
    excerpt:
      'Built of heart pine in 1871 by Iverson W. Sims, and home to his three daughters, who ran a millinery shop that drew customers from Atlanta.',
    description: p(
      'Iverson W. Sims built this home in 1871 on land purchased from the Savannah, Griffin and Northern Railroad and from William C. Barnes. The house was built of heart pine and has six rooms, five fireplaces, original ceilings, and a wraparound porch.',
      'Mr. Sims’ three unmarried daughters lived in the home their entire lives. The sisters operated a millinery shop in downtown Senoia for many years, and women from Atlanta would take the train down to visit it.'
    ),
  },
  {
    slug: 'culpepper-house',
    title: 'The Culpepper House',
    historical_address: '35 Broad Street, Senoia, GA 30276',
    mainImage: tour('24-35-broad-st'),
    excerpt:
      'Built about 1871 by a returning Confederate soldier, and bought in 1902 by Dr. Wilbur Fiske Culpepper as a gift for his wife.',
    description: p(
      'This circa 1871 home was originally built by John Addy, a returning Confederate soldier, among oak trees planted during the Southern Reconstruction.',
      'Dr. Wilbur Fiske Culpepper, a prominent Senoia area physician for five decades, purchased the home in 1902 as a gift to his wife, Kate. The house was modified to its present Victorian style, with Steamboat Gothic elements, around the turn of the twentieth century.',
      'Dr. Culpepper was raised in Senoia and worked a series of manual labor jobs — including in the horse collar factory and at a local drug store — to pay his way through medical school at New York University, before returning home to practice.'
    ),
  },
  {
    slug: 'senoia-beer-company-building',
    title: 'The Nolan Building (Senoia Beer Company)',
    type: 'Business',
    historical_address: '1 Main Street, Senoia, GA 30276',
    mainImage: tour('25-1-main-st'),
    excerpt: 'The corner where Ben Nolan’s grocery stood and the Enterprise Gazette was printed; rebuilt in the 1920s.',
    description: p(
      'This corner is the early site of a wooden building that housed Ben Nolan’s grocery store. The local newspaper, the <em>Enterprise Gazette</em>, was published from a brick building attached to the back of the grocery.',
      'In the 1920s Ben Nolan replaced the old wooden building with the structure that stands here now.'
    ),
  },
  {
    slug: 'travis-house-bridge-street',
    title: 'The Travis House',
    historical_address: '204 Bridge Street, Senoia, GA 30276',
    mainImage: tour('26-204-bridge-st'),
    excerpt:
      'Built about 1910 from a plan Mrs. Travis found in a magazine, and known locally as the “Fried Green Tomato House.”',
    description: p(
      'According to local history, Mrs. Travis ordered the plan for this house after seeing it in <em>The Ladies’ Home Journal</em>. Construction started in 1907 or 1908, and because homes were built almost entirely by hand, it took about three years to finish.',
      'Typical of Victorian homes, the house has an asymmetrical mass, large one-over-one windows, and a wraparound porch. Especially interesting is the placement of the entrance at the corner of the building.',
      'Locals refer to this home as the “Fried Green Tomato House,” as several scenes from the film were shot here.'
    ),
  },
  {
    slug: 'nolan-house',
    title: 'The Nolan House',
    historical_address: '207 Bridge Street, Senoia, GA 30276',
    mainImage: tour('27-207-bridge-st'),
    excerpt: 'Built by Benjamin A. Nolan, who owned the general store and ran the Enterprise-Gazette newspaper.',
    description: p(
      'This home, across from the Fried Green Tomato house, was built by Mr. Benjamin A. Nolan, who owned the general store and ran the <em>Enterprise-Gazette</em> newspaper.',
      'It has undergone extensive renovation over the past two decades, and retains five original fireplaces and mantels, original beadboard ceilings, crown molding, and wainscoting.'
    ),
  },
  {
    slug: 'addy-hollberg-house',
    title: 'The Addy-Hollberg House',
    historical_address: '222 Bridge Street, Senoia, GA 30276',
    mainImage: tour('28-222-bridge-st'),
    excerpt: 'A heavy timber house joined with wooden pegs, built by John Addy and John Mays and remodeled in 1930.',
    description: p(
      'Built by John Addy and John Mays, this home is of heavy timber construction with wooden peg joints. The two-story house was originally one room deep, with exterior end chimneys, and was extensively remodeled in 1930.',
      'The house was heated only by wood. When the C. F. Hollberg Jr. family moved in in 1942, they hired someone to dig a basement.'
    ),
  },
  {
    slug: 'senoia-united-methodist-church',
    title: 'Senoia United Methodist Church',
    type: 'Place or Thing',
    historical_address: 'Bridge Street at Seavy Street, Senoia, GA 30276',
    mainImage: tour('29-229-bridge-st'),
    excerpt: 'Founded in 1861 by Rev. Francis Warren Baggarly, whose first meetings were held in a brush arbor.',
    description: p(
      'Rev. Francis Warren Baggarly founded the Methodist Episcopal Church South in 1861, holding the first meetings in a brush arbor. The congregation next used the upstairs of the Rock House as its first “permanent” site.',
      'The sanctuary standing today was built in 1897.'
    ),
  },
  {
    slug: 'atkinson-house',
    title: 'The Atkinson House',
    historical_address: '351 Seavy Street, Senoia, GA 30276',
    mainImage: tour('30-351-seavy-st'),
    excerpt:
      'A house that began as a single story — said to date to about 1842 — with a second storey added roughly a decade later.',
    description: p(
      'This home was a one-story house when it was built. The current owners were told the original structure went up around 1842, with the second story added about ten years later. The first record of the house is its appearance on the tax rolls in 1870 or 1872, so circa 1870 is the date generally used.',
      'The Atkinsons bought the home from the original family around 1960 and lived here for some forty-two years. Joe Atkinson planted almost everything in the yard from seed, except the pecan trees, which are very old.'
    ),
  },
  {
    slug: 'hutchinson-house-seavy',
    title: 'The Hutchinson House (365 Seavy)',
    historical_address: '365 Seavy Street, Senoia, GA 30276',
    mainImage: tour('31-365-seavy-st'),
    excerpt: 'A 1904 Craftsman built from a Sears, Roebuck kit delivered in crates, and in the Hutchinson family for over eighty years.',
    description: p(
      'This two-story frame home was in the Hutchinson family for over eighty years, from its construction in 1904 by L. L. Hutchinson — owner of Hutchinson Hardware, and Mayor of Senoia in 1912 when the Brantley Institute was rebuilt.',
      'The Craftsman style home was built from a Sears, Roebuck catalog kit delivered in crates.'
    ),
  },
  {
    slug: 'the-blue-house',
    title: 'The Blue House',
    historical_address: '354 Seavy Street, Senoia, GA 30276',
    mainImage: tour('32-354-seavy-st'),
    excerpt: 'A circa 1870 Greek Revival cottage, named for its long-time paint colour, with rooms unusually added to the front.',
    description: p(
      'Locals call 354 Seavy Street the “Blue House” for its long-time paint colour. This circa 1870 Greek Revival cottage has a center hall plan with three fireplaces and heart pine floors.',
      'The three front rooms were built onto the front of the house — unusual, as rooms are normally added to the side or the back. The front door dates from the 1870s rather than the later Victorian period when those front rooms were added.'
    ),
  },
  {
    slug: 'travis-house-seavy',
    title: 'The Travis House (348 Seavy)',
    historical_address: '348 Seavy Street, Senoia, GA 30276',
    mainImage: tour('33-348-seavy-st'),
    excerpt: 'A Victorian cottage built by merchant and farmer Stoddard C. Travis, who bought a four-acre “town square” in 1906.',
    description: p(
      'This Victorian Cottage was built by Stoddard C. Travis, a Senoia merchant and farmer.',
      'In 1906 he purchased what was called a town square — four lots totalling a little over four acres, bounded by Clark Street to the west, Johnson to the north, and Seavy to the south.'
    ),
  },
  {
    slug: 'hardy-house',
    title: 'The Hardy House',
    historical_address: '298 Seavy Street, Senoia, GA 30276',
    mainImage: tour('34-298-seavy-st'),
    excerpt: 'A circa 1885 Queen Anne home built by Joseph Hardy.',
    description: p(
      'This circa 1885 Queen Anne-style home was built by Joseph Hardy.'
    ),
  },
  {
    slug: 'barnes-house',
    title: 'The Barnes House',
    historical_address: '271 Seavy Street, Senoia, GA 30276',
    mainImage: tour('35-271-seavy-st'),
    galleryImages: [archive('271-seavy-street')],
    excerpt: 'A circa 1850 home of the Barnes family, among the earliest settlers to migrate from Newberry, South Carolina.',
    description: p(
      'Among the area’s earliest settlers migrating from Newberry, South Carolina, was the Barnes family — the original occupants of this circa 1850 home.',
      'Senoia was incorporated as a town in 1866, with William Cunningham Barnes and Rev. Francis Baggarly among its commissioners, after the first railroad was resumed and completed to Newnan. In 1867 William Cunningham Barnes and his family sold the easement for that line.'
    ),
  },
  {
    slug: 'former-hollberg-hotel',
    title: 'The Former Hollberg Hotel',
    type: 'Business',
    historical_address: '252 Seavy Street, Senoia, GA 30276',
    mainImage: tour('36-252-seavy-st'),
    galleryImages: [
      archive('hollberg-hotel-confederate-soldiers-and-their-wives'),
      archive('c-f-hollberg-with-1910-studebaker'),
    ],
    excerpt:
      'Built in 1906–07 by C. F. Hollberg, Sr., and among the first buildings in Coweta County with electricity. Now the Veranda Historic Inn.',
    description: p(
      'Listed on the National Register of Historic Places, this mansion operates today as The Veranda Historic Inn.',
      'Built in 1906–1907 by C. F. Hollberg, Sr., the Hollberg Hotel was one of the first buildings in Coweta County to have electricity, generated by the nearby Starr’s Mill hydro-electric plant.'
    ),
  },
];

/**
 * Coordinates geocoded from the addresses above via OpenStreetMap's Nominatim,
 * then filtered: a result is only kept if its returned house number matches the
 * address exactly and it falls inside a bounding box around Senoia. That rejects
 * the street- and town-centroid fallbacks a geocoder returns when it can't find a
 * building — which would put a confident-looking pin on the wrong house.
 *
 * The two churches are absent because they're identified by intersection rather
 * than street number and Nominatim has no record of them; add those pins by hand.
 */
const COORDINATES = {
  'senoia-welcome-center': [33.3017826, -84.5542032],
  'buggy-shop-museum': [33.3019151, -84.5541928],
  'couch-morgan-house': [33.3027224, -84.5541203],
  'baggarly-home': [33.303181, -84.5546655],
  'first-baptist-church-of-senoia': [33.3025615, -84.5555018],
  'jones-humphrey-house': [33.3025827, -84.5559012],
  'former-senoia-presbyterian-church': [33.3022836, -84.5563045],
  'hutchinson-house-pylant': [33.3018586, -84.5563729],
  'hand-house': [33.3022288, -84.5561148],
  'brandenburg-house': [33.3012425, -84.5555465],
  'gibson-house': [33.301277, -84.556455],
  'duke-house': [33.300256, -84.556742],
  'arnall-house-291-pylant': [33.2998455, -84.5570823],
  'freeman-house': [33.2996061, -84.5575275],
  'linch-house': [33.2997624, -84.557609],
  'mcknight-house': [33.2995937, -84.5579185],
  'arnall-house-244-pylant': [33.299301, -84.558474],
  'cleveland-house': [33.2991439, -84.5588161],
  'massengale-house': [33.2987673, -84.5591436],
  'mann-house': [33.2989306, -84.5588526],
  'southern-living-idea-house': [33.298308, -84.556355],
  'sims-house': [33.297657, -84.5539785],
  'culpepper-house': [33.2975063, -84.5537922],
  'senoia-beer-company-building': [33.299983, -84.5539674],
  'travis-house-bridge-street': [33.2998353, -84.5521564],
  'nolan-house': [33.2997975, -84.551963],
  'addy-hollberg-house': [33.3002689, -84.5520999],
  'atkinson-house': [33.300866, -84.54972],
  'hutchinson-house-seavy': [33.3008438, -84.5494423],
  'the-blue-house': [33.3010349, -84.5497624],
  'travis-house-seavy': [33.3010459, -84.5499006],
  'hardy-house': [33.301174, -84.551725],
  'barnes-house': [33.3010461, -84.5524087],
  'former-hollberg-hotel': [33.3012227, -84.5526237],
};

async function seed() {
  const target = PRODUCTION ? 'PRODUCTION' : 'the emulator';
  console.log(`Seeding ${PLACES.length} walking-tour places into ${target}…\n`);

  for (const place of PLACES) {
    await db.collection('historical_places').doc(place.slug).set(
      {
        type: 'Home',
        galleryImages: [],
        ...place,
        coordinates: COORDINATES[place.slug]
          ? new GeoPoint(COORDINATES[place.slug][0], COORDINATES[place.slug][1])
          : null,
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    console.log(`  ${place.title}`);
  }

  const homes = PLACES.filter(x => !x.type || x.type === 'Home').length;
  const pinned = PLACES.filter(x => COORDINATES[x.slug]).length;
  console.log(`\nDone — ${homes} homes, ${PLACES.length - homes} other places, ${pinned} with map pins.`);
  console.log('Photos are served from public/images/; add map pins in /admin/places.');
  if (!PRODUCTION) console.log('This run wrote to the emulator only. Re-run with --production for the live site.');
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
