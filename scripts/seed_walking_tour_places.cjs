/**
 * Seeds historical_places with ten homes from the Senoia Walking Tour.
 *
 * Source: "Senoia Walking Tour Script.docx" in the Society's Google Drive (the
 * WalknTours audio tour script). Text is adapted from that script — walking
 * directions ("cross the street carefully", "continue north on Pylant") are
 * stripped, since they make sense in an audio tour and not on a web page.
 * Nothing here is invented; every date, name, and detail comes from the script.
 *
 * Photos are NOT set. The tour photos live in Drive named by stop number and
 * address (e.g. "4_101 Main St.jpg"), so each record below names the file that
 * belongs to it — upload it in /admin/places, which is a one-field edit per home.
 *
 * Coordinates are left null deliberately. The script gives street addresses but
 * no lat/lng, and guessing a pin for a private residence is worse than no pin.
 * Add them in /admin/places (right-click the spot in Google Maps to copy them).
 *
 * Safe by default: writes to the emulator unless you pass --production, matching
 * the convention in seed_july4_event.cjs. Idempotent — the doc ID is derived from
 * the slug, so re-running updates in place rather than creating duplicates.
 *
 *   node scripts/seed_walking_tour_places.cjs                # emulator
 *   node scripts/seed_walking_tour_places.cjs --production   # real site
 */
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

const PRODUCTION = process.argv.includes('--production');
if (!PRODUCTION) {
  process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
}

if (require('firebase-admin').apps.length === 0) {
  initializeApp({ projectId: 'sahs-archives' });
}
const db = getFirestore();

const p = (...paragraphs) => paragraphs.map(t => `<p>${t}</p>`).join('\n');

const PLACES = [
  {
    slug: 'couch-morgan-house',
    title: 'The Couch-Morgan House',
    historical_address: '101 Main Street, Senoia, GA 30276',
    photo: '4_101 Main St.jpg',
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
    photo: '5_100 Baggarly Way.jpg',
    excerpt:
      'Built in the early 1870s and later home to the family of Rev. Francis Warren Baggarly, who bought the tract of land that became Senoia.',
    description: p(
      'This home is believed to have been built in the early 1870s by the Hitch family. It later became the residence of family members of the Rev. Francis Warren Baggarly, who in 1860 purchased the 202.5-acre tract that became Senoia and founded the Methodist church here.',
      'Census records list Rev. Baggarly as a farmer as well as a minister. During the Civil War he ran a sewing factory with looms and sewing machines, where women and children made shoes and hats for the husbands and fathers serving in the war. That enterprise must have served his financial needs — he was never paid for his pastoral work. Around 1871 he began a pipe-making business in partnership with William H. Lankford.'
    ),
  },
  {
    slug: 'hutchinson-house-pylant',
    title: 'The Hutchinson House',
    historical_address: '368 Pylant Street, Senoia, GA 30276',
    photo: '9_368 Pylant St.jpg',
    excerpt:
      'An 1892 Gabled Ell Cottage, once home to Jimmy Hutchinson, who became Georgia’s youngest mayor at twenty-five.',
    description: p(
      'Built in 1892, this house is an example of the Gabled Ell Cottage. It is L-shaped and carries folk Victorian details such as the gingerbread trim along the porch.',
      'This was once the home of Jimmy Hutchinson, who at the age of twenty-five became Georgia’s youngest mayor. He served from 1961 to 1968 and was a founding member of Senoia’s Downtown Development Authority. With his father, he operated Hutchinson’s Hardware Store at the corner of Seavy and Main Streets for fifty years.'
    ),
  },
  {
    slug: 'gibson-house',
    title: 'The Gibson House',
    historical_address: '352 Pylant Street, Senoia, GA 30276',
    photo: '12_352 Pylant St.jpg',
    excerpt:
      'A seven-room Early Classical Revival house built by a cotton broker between 1870 and 1880, with an unusual U-shaped plan.',
    description: p(
      'The Gibson House was built by a cotton broker between 1870 and 1880. This seven-room Early Classical Revival home conforms to the original structure shown on the 1898 site map of Senoia.',
      'It has an unusual “U” configuration, with a side entry that accommodated buggies and wagons and gave access from the veranda to both the kitchen and the front hall. Early Classical Revival homes are marked by side gables and a characteristic full-height entry porch; this one was later modified to its present Victorian style.',
      'The house was for many years the residence of Evelyn Gibson, a local school teacher.'
    ),
  },
  {
    slug: 'arnall-house-291-pylant',
    title: 'The Arnall House',
    historical_address: '291 Pylant Street, Senoia, GA 30276',
    photo: '14_291 Pylant St.jpg',
    excerpt:
      'Built in 1913 with twelve rooms, seven coal-burning fireplaces, and 57 windows containing 847 individual panes of glass.',
    description: p(
      'Built in 1913, this post-Victorian home is in a style sometimes called “Princess Anne” — the transition between the decorative asymmetry of the Queen Anne and the growing interest in the simplicity and classical detail of the Neoclassical. Note the irregular roof line, the fifteen-over-one windows, and the classical Doric column porch.',
      'The house was built with seven coal-burning fireplaces, many of their original iron inserts still in place. It has twelve rooms and 57 windows containing 847 individual panes of glass. Most of the windows retain their original glass and still use a pulley and counterweight mechanism. The main floor is solid maple tongue-and-groove flooring.'
    ),
  },
  {
    slug: 'massengale-house',
    title: 'The Massengale House',
    historical_address: '225 Pylant Street, Senoia, GA 30276',
    photo: '20_225 Pylant St.jpg',
    excerpt:
      'Built in 1867 and left abandoned for years, this house was bought in 2012 and brought back over a year-long restoration.',
    description: p(
      'Originally built in 1867, this home sat abandoned for many years until it was purchased for $84,000 in 2012 and underwent a year-long renovation costing approximately $770,000.',
      'The work added a wine cellar, a new kitchen, a new primary bedroom, and an in-ground swimming pool. The renovators kept as much of the original structure as they could.'
    ),
  },
  {
    slug: 'sims-house',
    title: 'The Sims House',
    historical_address: '36 Broad Street, Senoia, GA 30276',
    photo: '23_36 Broad St.jpg',
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
    photo: '24_35 Broad St.jpg',
    excerpt:
      'Built about 1871 by a returning Confederate soldier, and bought in 1902 by Dr. Wilbur Fiske Culpepper as a gift for his wife.',
    description: p(
      'This circa 1871 home was originally built by John Addy, a returning Confederate soldier, among oak trees planted during the Southern Reconstruction.',
      'Dr. Wilbur Fiske Culpepper, a prominent Senoia area physician for five decades, purchased the home in 1902 as a gift to his wife, Kate. The house was modified to its present Victorian style, with Steamboat Gothic elements, around the turn of the twentieth century.',
      'Dr. Culpepper was raised in Senoia and worked a series of manual labor jobs — including in the horse collar factory and at a local drug store — to pay his way through medical school at New York University, before returning home to practice.'
    ),
  },
  {
    slug: 'travis-house-bridge-street',
    title: 'The Travis House',
    historical_address: '204 Bridge Street, Senoia, GA 30276',
    photo: '26_204 Bridge St.jpg',
    excerpt:
      'Built about 1910 from a plan Mrs. Travis found in a magazine, and known locally as the “Fried Green Tomato House.”',
    description: p(
      'According to local history, Mrs. Travis ordered the plan for this house after seeing it in <em>The Ladies’ Home Journal</em>. Construction started in 1907 or 1908, and because homes were built almost entirely by hand, it took about three years to finish.',
      'Typical of Victorian homes, the house has an asymmetrical mass, large one-over-one windows, and a wraparound porch. Especially interesting is the placement of the entrance at the corner of the building.',
      'Locals refer to this home as the “Fried Green Tomato House,” as several scenes from the film were shot here.'
    ),
  },
  {
    slug: 'atkinson-house',
    title: 'The Atkinson House',
    historical_address: '351 Seavy Street, Senoia, GA 30276',
    photo: '30_351 Seavy St.jpg',
    excerpt:
      'A house that began as a single story — said to date to about 1842 — with a second storey added roughly a decade later.',
    description: p(
      'This home was a one-story house when it was built. The current owners were told the original structure went up around 1842, with the second story added about ten years later. The first record of the house is its appearance on the tax rolls in 1870 or 1872, so circa 1870 is the date generally used.',
      'The Atkinsons bought the home from the original family around 1960 and lived here for some forty-two years. Joe Atkinson planted almost everything in the yard from seed, except the pecan trees, which are very old.'
    ),
  },
];

async function seed() {
  const target = PRODUCTION ? 'PRODUCTION' : 'the emulator';
  console.log(`Seeding ${PLACES.length} walking-tour homes into ${target}…\n`);

  for (const place of PLACES) {
    const { photo, ...fields } = place;
    await db.collection('historical_places').doc(place.slug).set(
      {
        ...fields,
        type: 'Home',
        mainImage: '',
        galleryImages: [],
        coordinates: null,
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    console.log(`  ${place.title.padEnd(28)} → /historic-structures-and-places/${place.slug}`);
    console.log(`  ${''.padEnd(28)}   photo to upload: ${photo}`);
  }

  console.log(`\nDone. Next: add a photo and a map pin for each in /admin/places.`);
  if (!PRODUCTION) console.log('This run wrote to the emulator only. Re-run with --production for the live site.');
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
