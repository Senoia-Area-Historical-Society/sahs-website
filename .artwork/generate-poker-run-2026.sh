#!/usr/bin/env bash
# Regenerates the 2026 Cruisin' for History Poker Run artwork with Nano Banana Pro.
#
#   ./.artwork/generate-poker-run-2026.sh            # both masters
#   ./.artwork/generate-poker-run-2026.sh wide       # only the 16:9
#
# WHY THIS SCRIPT EXISTS
#
# The original poker-run set was generated ad hoc and its masters were never
# committed (they are 4K PNGs, and .artwork/*/masters is gitignored), so when
# Bill Wood's September corrections landed there was no way to re-render the
# posters with the right copy — the old set had "$200 best hand" and "Photo
# turn-in 6-7 PM" baked in, both now wrong. This is the missing generator.
#
# The art direction blocks below are copied verbatim from
# generate-fall-winter-2026.sh, which was itself written to match this event's
# artwork. Keep them identical in both files: they are one house style, and the
# fall/winter set is already shipped against it.
#
# Regenerating gives *different* images — the model is not deterministic. That is
# accepted here; the alternative was shipping posters that misstate the prize and
# send entrants to the finish line ninety minutes late.
#
# Masters land in .artwork/poker-run/masters (gitignored). Inspect the lettering
# on every one before running ./.artwork/derive-sizes.sh poker-run — misspelled or
# malformed type is this model's characteristic failure and no downstream step
# checks for it.
set -euo pipefail

# python.org's Python has no system CA store on this machine; see the
# nanobanana skill notes. Without this every call dies CERTIFICATE_VERIFY_FAILED.
export SSL_CERT_FILE="${SSL_CERT_FILE:-$(python3 -c 'import certifi;print(certifi.where())')}"

SKILL="$HOME/.claude/skills/nanobanana"
NB="$SKILL/scripts/nanobanana.py"
ENV_FILE="$SKILL/.env"
OUT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/poker-run"
mkdir -p "$OUT/masters"

# ── Shared art direction ─────────────────────────────────────────────────────
# Identical to generate-fall-winter-2026.sh. Every SAHS poster is one family.
STYLE='Flat vector editorial illustration in the style of a 1940s WPA national-park travel poster, with a subtle halftone paper grain over the whole image. Bold simplified shapes and clean silhouettes. No photorealism, no photographic texture, no glossy 3D rendering, no drop shadows, no lens flare. Colour is a strictly limited warm palette and nothing outside it: cream #fcfaf6, beige #f1ede4, warm tan #8b7355, dark tan #68543f, deep chocolate-brown #3a2d1d, muted antique gold #c9a227, and oxblood #7b2a32. Flat bands of colour only.'

LAYOUT='Composition: a full-bleed horizontal poster. The left 45 percent is a deep chocolate-brown field held clear for type; the illustration fills the right 55 percent and bleeds off the right, top and bottom edges. Type is left-aligned inside that dark field and never overlaps the illustration. Type placement is strict: the left edge of every line of type begins exactly 15 percent of the image width in from the left edge of the image, and no line extends past the 43 percent mark. That 15 percent band of empty dark field to the left of the type is deliberate and must be kept clear — the site centre-crops this poster to a narrower frame and anything closer to the edge is cut off.'

# The one departure from the fall/winter TYPO block: this poster carries TWO
# detail lines, because the corrected rules need both a money line and a
# where-and-when line and cramming them into one produces a line long enough that
# the model starts inventing words in it.
TYPO='All lettering must be rendered crisply and spelled EXACTLY as specified, with no invented, duplicated, garbled or placeholder words anywhere in the image. The eyebrow line is small antique-gold letterspaced sans-serif capitals. The script line is an elegant cream italic serif. The headline is very large heavy cream sans-serif capitals, tightly leaded. Below the headline sits a short antique-gold horizontal rule, then the date line in cream bold sans-serif capitals, then two smaller cream detail lines at 70 percent opacity, stacked one directly above the other and set in the same size and weight as each other.'

NEGATIVE='Critical constraints. The artwork must bleed to all four edges of the frame: no border, no outline, no white margin, no passe-partout, no drop-shadowed card, no rounded corners. The ONLY text anywhere in the image is the specified lines. The illustration itself must contain no writing whatsoever: any depicted paper, parchment, document, book spine, sign, banner, number plate or label is blank or shows only abstract non-letterform texture. Never render decorative script, faux calligraphy, simulated handwriting or invented signatures. Playing cards, if shown, are face down or show only abstract back-pattern texture — never pips, ranks or suits.'

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

# ── The 16:9 master → banner 1920x1080 and card 1200x675 ─────────────────────
# The scene deliberately restates the shipped 2025 poster: a maroon mid-1960s
# American coupe on a red-clay road at sunset, a mossy live oak arching over from
# the right, a white farmhouse on the rise behind. It will not come back
# identical, but it should be recognisably the same event.
wide () {
  gen poker-run-wide 16:9 'Illustration: a maroon oxblood mid-1960s American two-door coupe with chrome bumpers and cream side-wall tyres, seen three-quarter from the front, driving toward the viewer down a red-clay country road at sunset. A large live oak draped with Spanish moss arches over the scene from the right and bleeds off the top and right edges. On a low rise behind the car sits a white two-storey farmhouse with a wraparound porch. The sky is flat horizontal bands of amber, gold and oxblood with two simplified cream clouds. Long flat shadows across the road in the foreground.

Text, exactly:
Eyebrow: SENOIA AREA HISTORICAL SOCIETY
Script line: Cruisin'\'' for History
Headline, on two lines: POKER / RUN
Date line: FRIDAY, SEPTEMBER 25, 2026
Detail line one: $25 per entry - 50/50 payout, $200 minimum
Detail line two: Photo turn-in 3:00-6:30 PM - Stone Lodge, Marimac Lakes'
}

# ── The 1:1 master → square 1200x1200 ────────────────────────────────────────
# Recomposed rather than centre-cropped from the wide master, which would cut the
# type in half. Carries no prize or timing detail on purpose: the square renders
# mid-article directly above the copy that states the rules in full, so anything
# it says about them is a second place for them to go stale.
SQUARE_LAYOUT='Composition: a full-bleed square poster. The illustration fills the lower two thirds and bleeds off the left, right and bottom edges; the upper third is a deep chocolate-brown field holding centred type. All type is centre-aligned. Leave a generous safe area: every piece of type must sit at least 10 percent of the image width in from all four edges, and no key subject in the illustration may touch the outer 6 percent.'

SQUARE_TYPO='All lettering must be rendered crisply and spelled EXACTLY as specified, with no invented, duplicated, garbled or placeholder words anywhere in the image. The eyebrow line is small antique-gold letterspaced sans-serif capitals. The script line is an elegant cream italic serif. The headline is very large heavy cream sans-serif capitals. Below the headline sits a short antique-gold horizontal rule, then the date line in cream bold sans-serif capitals, then one smaller cream detail line at 70 percent opacity.'

square () {
  local out="$OUT/masters/poker-run-square.png"
  echo "▸ poker-run-square (1:1)"
  python3 "$NB" generate \
    --env-file "$ENV_FILE" \
    --model nanobanana-pro --ratio 1:1 --size 4K --output "$out" \
    --prompt "$STYLE

$SQUARE_LAYOUT

$SQUARE_TYPO

$NEGATIVE

Illustration: a maroon oxblood mid-1960s American two-door coupe with chrome bumpers and cream side-wall tyres, seen head-on and centred, parked on a red-clay country road. Behind it a ploughed field in flat amber bands and a large live oak draped with Spanish moss to the right. Flat horizontal sky bands of amber, gold and oxblood. In the lower left foreground, two face-down playing cards lying on the clay, their backs a plain oxblood diamond lattice with no pips, ranks or suits.

Text, exactly:
Eyebrow: SENOIA AREA HISTORICAL SOCIETY
Script line: Cruisin' for History
Headline, on one line: POKER RUN
Date line: FRIDAY, SEPTEMBER 25, 2026
Detail line: Five landmarks - Any vehicle - \$25 per entry"
}

ALL=(wide square)

if [ $# -gt 0 ]; then
  for k in "$@"; do "$k"; done
else
  for k in "${ALL[@]}"; do "$k"; done
fi

echo
echo "Masters in $OUT/masters — inspect the lettering, then run:"
echo "  ./.artwork/derive-sizes.sh poker-run"
