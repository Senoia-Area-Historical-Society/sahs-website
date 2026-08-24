#!/usr/bin/env bash
# Turns the Nano Banana masters into the exact files the seed script uploads.
#
#   ./.artwork/derive-sizes.sh
#
# Two jobs, both of which have to be done in code rather than in the prompt:
#
#  1. Trim the border. Nano Banana Pro insists on matting the poster in a cream
#     passe-partout no matter how firmly the prompt forbids it, so the frame is
#     detected by scanning in from each edge and cropped away here.
#  2. Hit the exact aspect ratios and pixel sizes. Masters come back at whatever
#     the model felt like (5504x3072 = 1.7917, not 16:9), so each is centre-cropped
#     to a true 16:9 or 1:1 and then resampled to the sizes the poker-run set
#     established: 1920x1080 banner, 1200x675 card, 1200x1200 square.
# Masters are gitignored (60MB of 4K PNGs); the derived JPEGs are committed. From a
# fresh clone, run generate-fall-winter-2026.sh first — note that regenerating gives
# *new* images, since the model is not deterministic.
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
python3 "$DIR/derive_sizes.py" "$DIR/fall-winter-2026/masters" "$DIR/fall-winter-2026"
