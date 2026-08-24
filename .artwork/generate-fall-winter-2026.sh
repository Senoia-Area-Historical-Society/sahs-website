#!/usr/bin/env bash
# Regenerates the Fall/Winter 2026 event artwork with Nano Banana Pro.
#
#   ./.artwork/generate-fall-winter-2026.sh            # all events
#   ./.artwork/generate-fall-winter-2026.sh sept-program auction   # only these
#
# Masters are generated at 4K and downscaled with sips into the three sizes the
# post editor expects (see ContentAdmin.tsx): a 1920x1080 banner, a 1200x675
# preview card, and — for the events that use one — a 1200x1200 square.
# Text rendering is the failure mode to watch: inspect every master before
# committing, and regenerate any whose lettering is misspelled or malformed.
set -euo pipefail

# python.org's Python has no system CA store on this machine; see the
# nanobanana skill notes. Without this every call dies CERTIFICATE_VERIFY_FAILED.
export SSL_CERT_FILE="${SSL_CERT_FILE:-$(python3 -c 'import certifi;print(certifi.where())')}"

SKILL="$HOME/.claude/skills/nanobanana"
NB="$SKILL/scripts/nanobanana.py"
ENV_FILE="$SKILL/.env"
OUT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/fall-winter-2026"
mkdir -p "$OUT/masters"

# ── Shared art direction ─────────────────────────────────────────────────────
# Every poster in the set must read as one family, matching the 2026 Poker Run
# artwork already in .artwork/poker-run/.
STYLE='Flat vector editorial illustration in the style of a 1940s WPA national-park travel poster, with a subtle halftone paper grain over the whole image. Bold simplified shapes and clean silhouettes. No photorealism, no photographic texture, no glossy 3D rendering, no drop shadows, no lens flare. Colour is a strictly limited warm palette and nothing outside it: cream #fcfaf6, beige #f1ede4, warm tan #8b7355, dark tan #68543f, deep chocolate-brown #3a2d1d, muted antique gold #c9a227, and oxblood #7b2a32. Flat bands of colour only.'

LAYOUT='Composition: a full-bleed horizontal poster. The left 45 percent is a deep chocolate-brown field held clear for type; the illustration fills the right 55 percent and bleeds off the right, top and bottom edges. Type is left-aligned inside that dark field and never overlaps the illustration. Type placement is strict: the left edge of every line of type begins exactly 15 percent of the image width in from the left edge of the image, and no line extends past the 43 percent mark. That 15 percent band of empty dark field to the left of the type is deliberate and must be kept clear — the site centre-crops this poster to a narrower frame and anything closer to the edge is cut off.'

TYPO='All lettering must be rendered crisply and spelled EXACTLY as specified, with no invented, duplicated, garbled or placeholder words anywhere in the image. The eyebrow line is small antique-gold letterspaced sans-serif capitals. The script line is an elegant cream italic serif. The headline is very large heavy cream sans-serif capitals, tightly leaded. Below the headline sits a short antique-gold horizontal rule, then the date line in cream bold sans-serif capitals, then a smaller cream detail line at 70 percent opacity.'

# Two failure modes seen in the first pass, both worth naming explicitly: the
# model adds a cream passe-partout border unless told the art bleeds, and it
# fills illustrated paper and signage with convincing-looking gibberish script.
NEGATIVE='Critical constraints. The artwork must bleed to all four edges of the frame: no border, no outline, no white margin, no passe-partout, no drop-shadowed card, no rounded corners. The ONLY text anywhere in the image is the five specified lines. The illustration itself must contain no writing whatsoever: any depicted paper, parchment, document, book spine, sign, banner or label is blank or shows only abstract non-letterform texture. Never render decorative script, faux calligraphy, simulated handwriting or invented signatures.'

gen () {          # gen <key> <ratio> <scene-and-copy>
  local key="$1" ratio="$2" body="$3"
  local out="$OUT/masters/$key.png"
  echo "▸ $key ($ratio)"
  python3 "$NB" generate \
    --env-file "$ENV_FILE" \
    --model nanobanana-pro \
    --ratio "$ratio" \
    --size 4K \
    --output "$out" \
    --prompt "$STYLE

$LAYOUT

$TYPO

$NEGATIVE

$body"
}

# ── The six events ───────────────────────────────────────────────────────────

sept_program () {
  gen sept-program-wide 16:9 'Illustration: an 18th-century scene rendered as flat shapes — a large furled parchment of the Declaration of Independence lying open, a quill standing in a brass inkwell beside it, a guttering candle throwing a warm amber pool of light, and a stack of leather-bound books. Warm candlelight radiating outward in concentric flat bands.

Text, exactly:
Eyebrow: SENOIA AREA HISTORICAL SOCIETY
Script line: September Monthly Program
Headline, on two lines: DECLARATION / OF INDEPENDENCE
Date line: THURSDAY, SEPTEMBER 10, 2026
Detail line: Nicole Williams, PhD - Free admission - 7:00 PM'
}

volunteers () {
  gen volunteers-wide 16:9 'Illustration: a white open-sided shuttle golf cart carrying passengers down a small-town Main Street, seen three-quarter from the front. Behind it, a row of classic 1960s American cars parked at an angle along the kerb, striped awnings on two-storey brick storefronts, a big oak with Spanish moss overhead, and a warm early-autumn sky in flat amber bands.

Text, exactly:
Eyebrow: SENOIA AREA HISTORICAL SOCIETY
Script line: 21st Annual Senoia Car Show
Headline, on two lines: SHUTTLE DRIVERS / WANTED
Date line: SATURDAY, SEPTEMBER 26, 2026
Detail line: Morning, mid-day and afternoon shifts - senoiacar.show'
}

oct_program () {
  gen oct-program-wide 16:9 'Illustration: a grand Victorian house with a wraparound porch and a turret, shown mid-restoration — one half in weathered grey clapboard, the other half freshly painted cream, with light timber scaffolding across the facade, a ladder, and a rolled architectural blueprint and trowel in the foreground. Autumn oak leaves drifting. Flat amber and oxblood sky bands behind.

Text, exactly:
Eyebrow: SENOIA AREA HISTORICAL SOCIETY
Script line: October Monthly Program
Headline, on two lines: HISTORIC / PRESERVATION
Date line: THURSDAY, OCTOBER 8, 2026
Detail line: Professor Mark Janzen, University of West Georgia - 7:00 PM'
}

auction () {
  gen auction-wide 16:9 'Illustration: an auctioneer stand rendered as flat shapes — a wooden gavel mid-strike on its block, a raised numbered bidding paddle, and behind them a table of antiques in silhouette: a mantel clock, a porcelain vase, a gilt picture frame, a candlestick. A warm pool of lamplight from above in concentric flat bands. Celebratory but elegant.

Text, exactly:
Eyebrow: SENOIA AREA HISTORICAL SOCIETY
Script line: Annual Charity
Headline, on one line: AUCTION
Date line: SATURDAY, NOVEMBER 14, 2026
Detail line: Tickets $30 - Food, bidding and a cash bar'
}

christmas () {
  gen christmas-wide 16:9 'Illustration: a grand two-storey Victorian house at dusk with a wraparound porch, every window glowing warm gold, an evergreen wreath with an oxblood ribbon on the front door, garland twisted along the porch rail, and warm string lights. Bare winter oaks either side, a deep blue-brown twilight sky with flat bands and a scatter of small gold stars. No snow.

Text, exactly:
Eyebrow: SENOIA AREA HISTORICAL SOCIETY
Script line: Save the Date
Headline, on two lines: CHRISTMAS / PARTY
Date line: DECEMBER 2026
Detail line: Date to be confirmed - watch this space'
}

hotchocolate () {
  gen hotchocolate-wide 16:9 'Illustration: a close, cosy view of a porch rail at night on a grand Victorian house. On the rail sits a cream enamel mug of hot chocolate with a marshmallow and three curling flat ribbons of steam. Evergreen garland with small oxblood berries wound along the rail, a hurricane lantern with a lit candle beside the mug, and behind it the softly glowing windows of the house and a lamplit street of historic homes receding into a deep twilight.

Text, exactly:
Eyebrow: SENOIA AREA HISTORICAL SOCIETY
Script line: Candlelight Tour of Homes
Headline, on two lines: HOT CHOCOLATE / AT THE CARMICHAEL HOUSE
Date line: DECEMBER 2026
Detail line: Date to be confirmed - free to all tour guests'
}

# ── Square variants (1:1) for the events that use a squareImage ──────────────
# Same subject, recomposed for a centred vertical stack rather than reused —
# a centre-crop of a 16:9 poster would cut the type in half.
SQUARE_LAYOUT='Composition: a full-bleed square poster. The illustration fills the lower two thirds and bleeds off the left, right and bottom edges; the upper third is a deep chocolate-brown field holding centred type. All type is centre-aligned. Leave a generous safe area: every piece of type must sit at least 10 percent of the image width in from all four edges, and no key subject in the illustration may touch the outer 6 percent.'

gen_square () {
  local key="$1" body="$2"
  local out="$OUT/masters/$key.png"
  echo "▸ $key (1:1)"
  python3 "$NB" generate \
    --env-file "$ENV_FILE" \
    --model nanobanana-pro --ratio 1:1 --size 4K --output "$out" \
    --prompt "$STYLE

$SQUARE_LAYOUT

$TYPO

$NEGATIVE

$body"
}

volunteers_square () {
  gen_square volunteers-square 'Illustration: a white open-sided shuttle golf cart carrying passengers, seen head-on and centred, on a small-town Main Street lined with angle-parked classic 1960s American cars, brick storefronts with striped awnings, and a big mossy oak arching overhead against flat amber sky bands.

Text, exactly:
Eyebrow: SENOIA AREA HISTORICAL SOCIETY
Script line: 21st Annual Senoia Car Show
Headline, on two lines: SHUTTLE DRIVERS / WANTED
Date line: SATURDAY, SEPTEMBER 26, 2026
Detail line: Sign up at senoiacar.show'
}

auction_square () {
  gen_square auction-square 'Illustration: a wooden auction gavel mid-strike on its block, centred, with a raised bidding paddle behind it whose face is completely blank and carries no number, letter or marking of any kind and a silhouetted row of antiques below — a mantel clock, a porcelain vase, a gilt frame, a candlestick — under a warm pool of lamplight in concentric flat bands.

Text, exactly:
Eyebrow: SENOIA AREA HISTORICAL SOCIETY
Script line: Annual Charity
Headline, on one line: AUCTION
Date line: SATURDAY, NOVEMBER 14, 2026
Detail line: Tickets $30 - Senoia Area Historical Society'
}

christmas_square () {
  gen_square christmas-square 'Illustration: a grand two-storey Victorian house at dusk, centred and seen head-on, every window glowing warm gold, an evergreen wreath with an oxblood ribbon on the door, garland along the porch rail, warm string lights, bare winter oaks either side, deep blue-brown twilight sky with a scatter of small gold stars. No snow.

Text, exactly:
Eyebrow: SENOIA AREA HISTORICAL SOCIETY
Script line: Save the Date
Headline, on two lines: CHRISTMAS / PARTY
Date line: DECEMBER 2026
Detail line: Date to be confirmed'
}

ALL=(sept_program volunteers oct_program auction christmas hotchocolate
     volunteers_square auction_square christmas_square)

if [ $# -gt 0 ]; then
  for k in "$@"; do "$k"; done
else
  for k in "${ALL[@]}"; do "$k"; done
fi

echo
echo "Masters in $OUT/masters — inspect the lettering, then run ./.artwork/derive-sizes.sh"
