#!/usr/bin/env bash
# Generates teaser posters for eight lots in the 2026 Annual Charity Auction, in the
# same family as generate-auction-digital-services.sh.
#
#   ./.artwork/generate-auction-2026-teasers.sh                  # every lot
#   ./.artwork/generate-auction-2026-teasers.sh napa_wide stunt_square  # only these
#
# Inspect the lettering on every master, then run:
#   ./.artwork/derive-sizes.sh auction-2026-teasers
#   ./.artwork/generate-auction-2026-teasers.sh square_top
#
# The bordeaux, chicken and distillery banner and card files had a flag added to the 1
# in "14" by hand, because the model drew it like a capital I. The masters still have
# the flagless 1, so deriving those lots again brings it back.
set -uo pipefail

export SSL_CERT_FILE="${SSL_CERT_FILE:-$(python3 -c 'import certifi;print(certifi.where())')}"

SKILL="$HOME/.claude/skills/nanobanana"
NB="$SKILL/scripts/nanobanana.py"
ENV_FILE="$SKILL/.env"
OUT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/auction-2026-teasers"
mkdir -p "$OUT/masters"

STYLE='Flat vector editorial illustration in the style of a 1940s WPA national-park travel poster, with a subtle halftone paper grain over the whole image. Bold simplified shapes and clean silhouettes. No photorealism, no photographic texture, no glossy 3D rendering, no drop shadows, no lens flare. Colour is a strictly limited warm palette and nothing outside it: cream #fcfaf6, beige #f1ede4, warm tan #8b7355, dark tan #68543f, deep chocolate-brown #3a2d1d, muted antique gold #c9a227, and oxblood #7b2a32. Flat bands of colour only.'

TYPO='All lettering must be rendered crisply and spelled EXACTLY as specified, with no invented, duplicated, garbled or placeholder words anywhere in the image. The eyebrow line is small antique-gold letterspaced sans-serif capitals. The script line is an elegant cream italic serif. The headline is very large heavy cream sans-serif capitals, tightly leaded. Below the headline sits a short antique-gold horizontal rule, then a smaller cream detail line.'

NEGATIVE='Critical constraints. The artwork must bleed to all four edges of the frame: no border, no outline, no white margin, no passe-partout, no drop-shadowed card, no rounded corners. The ONLY text anywhere in the image is the four specified lines. The illustration itself must contain no writing whatsoever and no numerals: every bottle, label, barrel, sign, crate and ribbon is blank or shows only abstract flat colour blocks, with no letters, numbers, logos, brand marks or trademarks. Never render decorative script, faux calligraphy or simulated handwriting.'

LAYOUT_WIDE='Composition: a full-bleed horizontal poster. The left 45 percent is a deep chocolate-brown field held clear for type; the illustration fills the right 55 percent and bleeds off the right, top and bottom edges. Type is left-aligned inside that dark field and never overlaps the illustration. Type placement is strict: the left edge of every line of type begins exactly 15 percent of the image width in from the left edge of the image, and no line extends past the 43 percent mark. That 15 percent band of empty dark field to the left of the type is deliberate and must be kept clear, because the site centre-crops this poster to a narrower frame. Keep the main subject in the middle of the illustration area, away from its right edge.'

LAYOUT_SQUARE='Composition: a full-bleed square poster. The illustration fills the lower two thirds and bleeds off the left, right and bottom edges; the upper third is a deep chocolate-brown field holding centred type. All type is centre-aligned. Leave a generous safe area: every piece of type must sit at least 10 percent of the image width in from all four edges, and no key subject in the illustration may touch the outer 6 percent.'

gen () {          # gen <master-name> <ratio> <layout> <scene> <script-line> <headline>
  echo "▸ $1 ($2)"
  python3 "$NB" generate \
    --env-file "$ENV_FILE" \
    --model "${MODEL:-nanobanana-pro}" --ratio "$2" --size "${SIZE:-2K}" --timeout 280 \
    --output "$OUT/masters/$1.png" \
    --prompt "$STYLE

$3

$TYPO

$NEGATIVE

Illustration: $4

Text, exactly:
Eyebrow: SAHS ANNUAL CHARITY AUCTION
Script line: $5
Headline, on two lines: $6
Detail line: Up for bid Saturday, November 14" \
    || echo "!! FAILED $1"
}

# Each lot defines <key>_wide and <key>_square from one scene and one set of copy.
lot () {          # lot <key> <scene> <script-line> <headline>
  eval "${1}_wide ()   { gen '$1-wide' 16:9 \"\$LAYOUT_WIDE\" \"$2\" \"$3\" \"$4\"; }"
  eval "${1}_square () { gen '$1-square' 1:1 \"\$LAYOUT_SQUARE\" \"$2\" \"$3\" \"$4\"; }"
}

lot napa 'rolling vineyard rows in flat bands under a warm sky, and in the foreground a table with two wine glasses, a plain unlabelled wine bottle and a wooden board of cheese and grapes. Elegant and inviting.' \
  'Wine Tasting & Food Pairings for Six' 'A TASTE / OF NAPA'

lot bordeaux 'a stately stone French chateau with a slate roof at the top of a gentle hill, long straight vineyard rows running toward it, and a bunch of dark grapes on the vine in the foreground. Warm late-afternoon sky in flat bands.' \
  'One Week in France' 'A WEEK IN / BORDEAUX'

lot flowers 'a generous hand-tied arrangement of dahlias, zinnias and garden roses in a plain stoneware pitcher on a farmhouse table, with rows of a flower farm stretching behind it under a warm sky in flat bands.' \
  'From The Pioneer Flower Farmer' 'SIX MONTHS / OF BLOOMS'

lot distillery 'a Georgia farm scene with a weathered barn and a gleaming copper pot still beside a stack of plain oak barrels, a split-rail fence and rolling fields behind, under a warm sky in flat amber bands.' \
  'A Tour of Doc Brown Distillery Farm' 'A SPIRITED / TOUR'

lot stunt 'a dramatic silhouette of a stunt performer in mid-air, arms and legs spread, leaping from the roof of a two-storey small-town brick building toward a large plain air bag on the street below, with a plain film camera on a tripod and a director chair in silhouette at the kerb. Energetic and fun, with warm concentric bands of colour behind the leap.' \
  'Two Hours with a Professional Stunt Man' 'DO NOT TRY / THIS AT HOME'

lot chicken 'a Southern supper table seen from just above, covered in a gingham cloth: a big platter of golden fried chicken at the centre, surrounded by bowls of mashed potatoes, green beans and corn, a basket of biscuits, and a pitcher of sweet tea with glasses, set on a porch with warm evening light in flat bands.' \
  'Fried Chicken Dinner for Eight' 'PASS THE / FRIED CHICKEN'

lot santa 'a jolly, traditional Santa Claus in a full oxblood suit with a white beard, carrying a plain sack over one shoulder, walking up the steps of a grand Victorian house at dusk. Every window glows warm gold, an evergreen wreath with an oxblood ribbon hangs on the front door, and garland runs along the porch rail. Warm twilight sky in flat bands with a scatter of small gold stars. No snow. Friendly and magical.' \
  'One Hour for Friends, Kids & Grandkids' 'A VISIT / FROM SANTA'

# The detail line is named here because a sans 1 kept rendering as a capital I ("I4").
lot ebikes 'two complete modern electric bicycles with a slim battery on the frame, parked side by side on a grassy rise under a big oak with Spanish moss. Both bikes are fully visible, centred in the illustration area, with clear space between them and the right edge. In front of them a plaid picnic blanket with a wicker basket. A small-town street of brick storefronts and rolling fields behind, under a warm sky in flat amber bands. The bikes are plain, with no logos. The detail line is set in the same serif as the script line, upright, and the 1 in 14 is an old-style numeral with a clear flag and foot serif.' \
  'Two E-Bike Rentals from Senoia Bicycle' 'PEDAL / AND PICNIC'

# The model sets the top line too near the edge on the square layout. Lower the type
# by stretching the flat dark strip above it, and take the same height off the bottom.
# Run after derive-sizes.sh, which regenerates each square with the type too high.
square_top () {
  python3 - "$OUT" <<'PY'
import sys, pathlib
from PIL import Image
for f in sorted(pathlib.Path(sys.argv[1]).glob("*-square-1200x1200.jpg")):
    im = Image.open(f).convert("RGB")
    w, h = im.size
    grey = im.convert("L").crop((w // 5, 0, w * 4 // 5, 300))
    first = next(y for y in range(300) if max(grey.crop((0, y, grey.width, y + 1)).getdata()) > 110)
    add = max(0, 60 - first)
    print(f"{f.name}: first type row {first}, lowering by {add}")
    if not add:
        continue
    strip = max(first - 4, 1)
    out = Image.new("RGB", (w, h + add))
    out.paste(im.crop((0, 0, w, strip)).resize((w, strip + add), Image.BICUBIC), (0, 0))
    out.paste(im.crop((0, strip, w, h)), (0, strip + add))
    out.crop((0, 0, w, h)).save(f, "JPEG", quality=90, optimize=True, progressive=True)
PY
}

ALL=(napa_wide napa_square bordeaux_wide bordeaux_square flowers_wide flowers_square
     distillery_wide distillery_square stunt_wide stunt_square chicken_wide chicken_square
     santa_wide santa_square ebikes_wide ebikes_square)

# Four at a time, at 2K: 4K requests timed out here, one at a time as well as in parallel.
n=0
for k in ${@:-${ALL[@]}}; do
  "$k" &
  n=$((n + 1))
  if [ $((n % 4)) -eq 0 ]; then wait; fi
done
wait
echo "Done. Output in $OUT"
