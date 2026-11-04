#!/usr/bin/env bash
# Generates artwork for the "Website & Digital Marketing" lot in the 2026 auction.
# Same art direction as the auction poster in generate-fall-winter-2026.sh, so
# the lot reads as part of that family.
#
#   ./.artwork/generate-auction-digital-services.sh                # all three
#   ./.artwork/generate-auction-digital-services.sh wide square    # only these
#
# Inspect the lettering on every master, then run:
#   ./.artwork/derive-sizes.sh auction-digital-services
#   ./.artwork/generate-auction-digital-services.sh flyer square_top
set -euo pipefail

export SSL_CERT_FILE="${SSL_CERT_FILE:-$(python3 -c 'import certifi;print(certifi.where())')}"

SKILL="$HOME/.claude/skills/nanobanana"
NB="$SKILL/scripts/nanobanana.py"
ENV_FILE="$SKILL/.env"
OUT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/auction-digital-services"
mkdir -p "$OUT/masters"

STYLE='Flat vector editorial illustration in the style of a 1940s WPA national-park travel poster, with a subtle halftone paper grain over the whole image. Bold simplified shapes and clean silhouettes. No photorealism, no photographic texture, no glossy 3D rendering, no drop shadows, no lens flare. Colour is a strictly limited warm palette and nothing outside it: cream #fcfaf6, beige #f1ede4, warm tan #8b7355, dark tan #68543f, deep chocolate-brown #3a2d1d, muted antique gold #c9a227, and oxblood #7b2a32. Flat bands of colour only.'

# Unlike the event posters there is no date line, so this names four lines.
TYPO='All lettering must be rendered crisply and spelled EXACTLY as specified, with no invented, duplicated, garbled or placeholder words anywhere in the image. The eyebrow line is small antique-gold letterspaced sans-serif capitals. The script line is an elegant cream italic serif. The headline is very large heavy cream sans-serif capitals, tightly leaded. Below the headline sits a short antique-gold horizontal rule, then a smaller cream detail line.'

# Screens are the new risk here: the model fills them with convincing gibberish.
NEGATIVE='Critical constraints. The artwork must bleed to all four edges of the frame: no border, no outline, no white margin, no passe-partout, no drop-shadowed card, no rounded corners. The ONLY text anywhere in the image is the four specified lines. The illustration itself must contain no writing whatsoever and no numerals: every screen, browser window, address bar, shop sign, awning and window is blank or shows only abstract flat colour blocks and bars, with no letters, numbers, web addresses, logos or icons containing glyphs. Never render decorative script, faux calligraphy or simulated handwriting.'

COPY='Text, exactly:
Eyebrow: SAHS ANNUAL CHARITY AUCTION
Script line: Website & Digital Marketing
Headline, on two lines: YOUR BUSINESS / ON THE MAP
Detail line: Custom website - SEO - Google Business setup'

SCENE='a charming two-storey brick small-town Main Street storefront with a striped awning, seen head-on and framed inside an oversized simple browser window drawn as flat shapes: a plain rectangular frame with a blank title bar and three small plain dots. A very large oxblood map pin with a cream centre stands above the storefront as if marking its location on a map. Behind everything, warm sky in concentric flat amber bands radiating from the pin, and a big oak with Spanish moss at the side. Vintage meets modern, warm and welcoming.'

LAYOUT_WIDE='Composition: a full-bleed horizontal poster. The left 45 percent is a deep chocolate-brown field held clear for type; the illustration fills the right 55 percent and bleeds off the right, top and bottom edges. Type is left-aligned inside that dark field and never overlaps the illustration. Type placement is strict: the left edge of every line of type begins exactly 15 percent of the image width in from the left edge of the image, and no line extends past the 43 percent mark. That 15 percent band of empty dark field to the left of the type is deliberate and must be kept clear, because the site centre-crops this poster to a narrower frame.'

LAYOUT_SQUARE='Composition: a full-bleed square poster. The illustration fills the lower two thirds and bleeds off the left, right and bottom edges; the upper third is a deep chocolate-brown field holding centred type. All type is centre-aligned. Leave a generous safe area: every piece of type must sit at least 10 percent of the image width in from all four edges, and no key subject in the illustration may touch the outer 6 percent.'

LAYOUT_PORTRAIT='Composition: a full-bleed vertical poster for a printed table sign. The upper 40 percent is a deep chocolate-brown field holding centred type; the illustration fills the lower 60 percent and bleeds off the left, right and bottom edges. All type is centre-aligned. Leave a generous safe area: every piece of type must sit at least 10 percent of the image width in from the left and right edges and at least 8 percent from the top edge, and no key subject may touch the outer 6 percent.'

gen () {          # gen <master-name> <ratio> <layout>
  local key="$1" ratio="$2" layout="$3"
  echo "▸ $key ($ratio)"
  python3 "$NB" generate \
    --env-file "$ENV_FILE" \
    --model nanobanana-pro --ratio "$ratio" --size 4K \
    --output "$OUT/masters/$key.png" \
    --prompt "$STYLE

$layout

$TYPO

$NEGATIVE

Illustration: $SCENE

$COPY"
}

wide ()     { gen digital-services-wide 16:9 "$LAYOUT_WIDE"; }
square ()   { gen digital-services-square 1:1 "$LAYOUT_SQUARE"; }
# In a subdirectory because derive_sizes.py globs masters/*.png and would crop
# anything not named -square to 16:9. Run the flyer function after inspecting it.
portrait () { mkdir -p "$OUT/masters/portrait"; gen portrait/digital-services-portrait 3:4 "$LAYOUT_PORTRAIT"; }

# The model sets the top line too near the edge on the stacked layouts, where it
# would be clipped in print. Lower the type by stretching the flat dark strip above
# it, and take the same height off the bottom, which is only ground.
#
# flyer is letter size at 300 dpi. 3:4 is taller than 8.5x11, and that excess also
# comes off the bottom, so the flyer is cropped from the bottom only.
lower_type='
import sys
from PIL import Image
sys.path.insert(0, sys.argv[1])
from derive_sizes import trim_matte
def lower(im, strip, add):
    w, h = im.size
    out = Image.new("RGB", (w, h + add))
    out.paste(im.crop((0, 0, w, strip)).resize((w, strip + add), Image.BICUBIC), (0, 0))
    out.paste(im.crop((0, strip, w, h)), (0, strip + add))
    return out.crop((0, 0, w, h))
'

flyer () {
  python3 -c "$lower_type"'
im = lower(trim_matte(Image.open(sys.argv[2])).convert("RGB"), 90, 150)
w, h = im.size
im = im.crop((0, 0, w, round(w * 11 / 8.5))).resize((2550, 3300), Image.LANCZOS)
im.save(sys.argv[3], "JPEG", quality=92, optimize=True, dpi=(300, 300))
' "$(dirname "$OUT")" "$OUT/masters/portrait/digital-services-portrait.png" "$OUT/digital-services-flyer-8.5x11.jpg"
}

# Run after derive-sizes.sh, which regenerates the square with the type too high.
square_top () {
  python3 -c "$lower_type"'
lower(Image.open(sys.argv[2]).convert("RGB"), 14, 40).save(sys.argv[2], "JPEG", quality=90, optimize=True, progressive=True)
' "$(dirname "$OUT")" "$OUT/digital-services-square-1200x1200.jpg"
}

if [ $# -gt 0 ]; then
  for k in "$@"; do "$k" & done
else
  wide & square & portrait &
fi
wait
echo "Masters in $OUT/masters"
