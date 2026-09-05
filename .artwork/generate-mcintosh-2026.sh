#!/usr/bin/env bash
# Regenerates the artwork for Dr. Gary McIntosh's 12 September 2026 Meet and Greet.
#
#   ./.artwork/generate-mcintosh-2026.sh
#
# The committed set was generated when the event was a placeholder called "September
# Roundtable" with an unnamed "Dr. McIntosh". Both are now wrong: it is a Meet and Greet,
# and the speaker is Dr. Gary McIntosh. Masters are gitignored, so this script is the
# only way to re-render — see .artwork/generate-poker-run-2026.sh for why every event
# needs one.
#
# ON THE ILLUSTRATION: this event concerns Muscogee (Creek) history and a killing within
# living family memory of the speaker. The scene is deliberately the LAND and nothing
# else — no people, no regalia, no cultural objects, no treaty documents. A generative
# model asked for Native American imagery produces costume-shop stereotype, and it is not
# the Society's to depict. The Georgia piedmont the 1825 treaty concerned carries the
# subject without misrepresenting anyone. Do not "improve" this by adding figures.
#
# Inspect the master's lettering before deriving; then:
#   ./.artwork/derive-sizes.sh mcintosh-roundtable
set -euo pipefail

# python.org's Python has no system CA store on this machine; see the nanobanana skill
# notes. Without this every call dies CERTIFICATE_VERIFY_FAILED.
export SSL_CERT_FILE="${SSL_CERT_FILE:-$(python3 -c 'import certifi;print(certifi.where())')}"

SKILL="$HOME/.claude/skills/nanobanana"
NB="$SKILL/scripts/nanobanana.py"
ENV_FILE="$SKILL/.env"
OUT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/mcintosh-roundtable"
mkdir -p "$OUT/masters"

# ── Shared art direction ─────────────────────────────────────────────────────
# Copied verbatim from generate-poker-run-2026.sh. Every SAHS poster is one family.
STYLE='Flat vector editorial illustration in the style of a 1940s WPA national-park travel poster, with a subtle halftone paper grain over the whole image. Bold simplified shapes and clean silhouettes. No photorealism, no photographic texture, no glossy 3D rendering, no drop shadows, no lens flare. Colour is a strictly limited warm palette and nothing outside it: cream #fcfaf6, beige #f1ede4, warm tan #8b7355, dark tan #68543f, deep chocolate-brown #3a2d1d, muted antique gold #c9a227, and oxblood #7b2a32. Flat bands of colour only.'

LAYOUT='Composition: a full-bleed horizontal poster. The left 45 percent is a deep chocolate-brown field held clear for type; the illustration fills the right 55 percent and bleeds off the right, top and bottom edges. Type is left-aligned inside that dark field and never overlaps the illustration. Type placement is strict: the left edge of every line of type begins exactly 15 percent of the image width in from the left edge of the image, and no line extends past the 43 percent mark. That 15 percent band of empty dark field to the left of the type is deliberate and must be kept clear — the site centre-crops this poster to a narrower frame and anything closer to the edge is cut off.'

TYPO='All lettering must be rendered crisply and spelled EXACTLY as specified, with no invented, duplicated, garbled or placeholder words anywhere in the image. The eyebrow line is small antique-gold letterspaced sans-serif capitals. The script line is an elegant cream italic serif. The headline is very large heavy cream sans-serif capitals, tightly leaded. Below the headline sits a short antique-gold horizontal rule, then the date line in cream bold sans-serif capitals, then a smaller cream detail line at 70 percent opacity.'

NEGATIVE='Critical constraints. The artwork must bleed to all four edges of the frame: no border, no outline, no white margin, no passe-partout, no drop-shadowed card, no rounded corners. The ONLY text anywhere in the image is the specified lines. The illustration itself must contain no writing whatsoever: any depicted paper, parchment, document, book spine, sign, banner, number plate or label is blank or shows only abstract non-letterform texture. Never render decorative script, faux calligraphy, simulated handwriting or invented signatures. Playing cards, if shown, are face down or show only abstract back-pattern texture — never pips, ranks or suits.'

python3 "$NB" generate \
  --env-file "$ENV_FILE" \
  --model nanobanana-pro \
  --ratio 16:9 \
  --size 4K \
  --output "$OUT/masters/mcintosh-roundtable-wide.png" \
  --prompt "$STYLE

$LAYOUT

$TYPO

$NEGATIVE

Illustration: a wide view of the Georgia piedmont at first light, entirely unpeopled. A slow river bends through the middle distance between low wooded bluffs; tall longleaf pines stand in silhouette at the right and bleed off the top and right edges. Beyond the river, rolling hills recede in flat bands of tan and brown. Ground mist lies in flat cream ribbons along the water. The sky is flat horizontal bands of amber, gold and soft oxblood. Quiet, spacious and reverent in mood. No people, no buildings, no boats, no animals, no objects of any kind.

Text, exactly:
Eyebrow: SENOIA AREA HISTORICAL SOCIETY
Script line: Meet and Greet
Headline, on two lines: DR. GARY / MCINTOSH
Date line: SATURDAY, SEPTEMBER 12, 2026
Detail line: 1:00-4:00 PM - Free admission - Light refreshments"

echo
echo "Master in $OUT/masters — inspect the lettering, then run:"
echo "  ./.artwork/derive-sizes.sh mcintosh-roundtable"
