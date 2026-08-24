"""Trim the model's cream matte, then emit exact-size JPEGs. See derive-sizes.sh."""
import sys, pathlib
from PIL import Image, ImageOps

# Sizes the site expects. ContentAdmin.tsx's labels say 1280x720 / 1080x1080, but
# the shipped .artwork/poker-run set is 1920x1080 / 1200x675 / 1200x1200 and the
# shipped precedent wins — the aspect ratios, which are what actually matter to
# the CSS, agree either way.
WIDE = [("banner", 1920, 1080), ("card", 1200, 675)]
SQUARE = [("square", 1200, 1200)]

# Nano Banana Pro mattes most posters in a cream passe-partout however firmly the
# prompt forbids it — measured at 0 to 3.6 percent across this set, and not
# reliably present on all four sides of the same image. So it has to be measured
# per edge. Three earlier attempts failed, and are worth naming so none is retried:
#
#   * Walking an edge inward while the line "looks unchanged" cannot tell a light
#     matte from the poster's own flat dark type field. It ate 174px of an eyebrow.
#   * Cropping a fixed inset off everything is blind the other way: edges with no
#     matte lose real artwork, which clipped the "H" of HOT CHOCOLATE.
#   * A corner-referenced bounding box is far too brittle — getbbox() spans the
#     whole edge if a single probe pixel differs, so a matte reads as absent.
#
# What survives all three is below: measure each edge independently as a run of
# near-white lines, decide light/dark on an absolute threshold (so a dark type
# field can never be mistaken for matte), and take the median across sample
# positions (so one probe line crossing pale artwork cannot fake a matte, and one
# crossing dark artwork cannot hide one). `edge_matte` is the single primitive;
# the crop and the post-hoc gate both call it, so the check is honest about
# exactly what the crop was aiming at.
PROBE_W = 400     # width of the downsampled copy all measurement runs on
LIGHT = 235       # mean channel value at or above which a line counts as matte
SAMPLES = 9       # probe positions along each edge
MAX_FRAC = 0.06   # never eat more than this much of a side


def _probe(im, width=PROBE_W):
    """BOX-downsampled copy. BOX is a true average, so the halftone grain — which
    swings individual pixels by ~25 per channel — cancels out."""
    w, h = im.size
    return im.resize((width, max(1, round(width * h / w))), Image.BOX)


def edge_matte(im):
    """Depth of the pale border on each edge, as a fraction of that dimension.

    Returns {"L":f, "R":f, "T":f, "B":f}. Zero means the artwork bleeds there.
    """
    probe = _probe(im.convert("RGB"))
    pw, ph = probe.size
    px = probe.load()
    is_light = lambda c: sum(c) / 3 > LIGHT

    def run(seq):
        n = 0
        for c in seq:
            if not is_light(c):
                break
            n += 1
        return n

    def median(vals):
        v = sorted(vals)
        return v[len(v) // 2]

    ys = [round(ph * (i + 1) / (SAMPLES + 1)) for i in range(SAMPLES)]
    xs = [round(pw * (i + 1) / (SAMPLES + 1)) for i in range(SAMPLES)]
    lim_x, lim_y = int(pw * MAX_FRAC) + 2, int(ph * MAX_FRAC) + 2
    return {
        "L": median([run(px[i, y] for i in range(lim_x)) for y in ys]) / pw,
        "R": median([run(px[pw - 1 - i, y] for i in range(lim_x)) for y in ys]) / pw,
        "T": median([run(px[x, i] for i in range(lim_y)) for x in xs]) / ph,
        "B": median([run(px[x, ph - 1 - i] for i in range(lim_y)) for x in xs]) / ph,
    }


def trim_matte(im):
    """Crop the cream passe-partout, leaving genuinely bleeding edges untouched."""
    im = im.convert("RGB")
    w, h = im.size
    m = edge_matte(im)
    pad = 0.005   # clear the anti-aliased boundary itself
    cap = MAX_FRAC

    def px_of(frac, total):
        # Pad only where a matte was found; padding a bleeding edge costs artwork.
        return 0 if frac <= 0 else round(min(cap, frac + pad) * total)

    l, r = px_of(m["L"], w), px_of(m["R"], w)
    t, b = px_of(m["T"], h), px_of(m["B"], h)
    if l or r or t or b:
        print(f"    matte l/t/r/b = {l}/{t}/{r}/{b}")
    return im.crop((l, t, w - r, h - b))


def verify_bleed(path, limit=0.006):
    """Fail loudly if a finished file still has a pale strip along any edge.

    The crop exists so that no cream matte reaches the published image, and
    eyeballing a contact sheet is not a check.
    """
    m = edge_matte(Image.open(path))
    return {k: round(v * 100, 2) for k, v in m.items() if v > limit}


# The "next event" card on /news renders the card image in a 1.48:1 box with
# object-cover, so it centre-crops ~8.3 percent off each side of a 16:9 file. The
# shipped poker-run artwork survives that because its type starts ~14 percent in;
# a poster whose type starts at 3 percent gets its headline sliced ("DECLARATION
# OF INDEPENDENCE" read as "CLARATION / INDEPENDENCE"). Every event reaches that
# slot eventually, so the wides are checked for it here.
FEATURED_RATIO = 1.48


def type_left_margin(im):
    """Where the leftmost lettering starts, as a fraction of width.

    The left of every poster in this set is a flat dark field, and the type on it
    is near-cream, so the first column containing a bright pixel *is* the type.
    Returns 1.0 when nothing bright is found in the left half.
    """
    probe = _probe(im.convert("RGB"), 400)
    pw, ph = probe.size
    px = probe.load()
    for x in range(pw // 2):
        if any(sum(px[x, y]) / 3 > 200 for y in range(0, ph, 2)):
            return x / pw
    return 1.0


def verify_featured_crop(path, margin=0.005):
    """Fail if the featured card's centre-crop would clip the poster's type."""
    im = Image.open(path)
    w, h = im.size
    if abs(w / h - 16 / 9) > 0.02:
        return None                                  # squares never hit this slot
    cut = (1 - (h * FEATURED_RATIO) / w) / 2         # fraction removed from each side
    left = type_left_margin(im)
    if left < cut + margin:
        return {"type_at": round(left * 100, 1), "crop_cuts": round(cut * 100, 1)}
    return None


def widen_left_field(im, target=0.15):
    """Push the type inward until the featured card's centre-crop cannot reach it.

    Asking the model to leave a 15 percent margin does not work — three prompt
    revisions produced margins of 0.8 to 5.2 percent — so the margin is added
    here. The left of every poster is a flat dark field, so widening it is
    invisible: a clean strip from the far left is mirror-tiled to make the pad,
    which carries the same colour *and* the same halftone grain (a solid fill
    would read as a smooth band against the grain). The image keeps its exact
    width and ratio, so the extra space comes off the right, where the
    illustration bleeds off frame anyway.

    The 15 percent target clears two things at once: the 8.4 percent the featured
    card's centre-crop takes off each side, and the "SEP 10" date badge the card
    overlays on the top-left of whatever survives it.
    """
    left = type_left_margin(im)
    if left >= target:
        return im
    w, h = im.size
    add = round((target - left) * w)
    strip_w = max(8, int(left * 0.8 * w))        # stay clear of the first glyph
    strip = im.crop((0, 0, strip_w, h))

    pad = Image.new("RGB", (add, h))
    x, flip = 0, False
    while x < add:
        pad.paste(ImageOps.mirror(strip) if flip else strip, (x, 0))
        x += strip_w
        flip = not flip

    out = Image.new("RGB", (w + add, h))
    out.paste(pad, (0, 0))
    out.paste(im, (add, 0))
    print(f"    widened left field by {round(add / w * 100, 1)}% (type was at {round(left * 100, 1)}%)")
    return out.crop((0, 0, w, h))                # same width: the pad costs the right edge


def center_to_ratio(im, ratio):
    w, h = im.size
    if w / h > ratio:
        nw = round(h * ratio)
        off = (w - nw) // 2
        return im.crop((off, 0, off + nw, h))
    nh = round(w / ratio)
    off = (h - nh) // 2
    return im.crop((0, off, w, off + nh))


def main(src_dir, out_dir):
    src, out = pathlib.Path(src_dir), pathlib.Path(out_dir)
    masters = sorted(src.glob("*.png"))
    if not masters:
        sys.exit(f"no masters in {src}")
    failures = []
    for m in masters:
        base, _, kind = m.stem.rpartition("-")   # "sept-program-wide" -> "sept-program", "wide"
        targets = SQUARE if kind == "square" else WIDE
        ratio = 1.0 if kind == "square" else 16 / 9

        im = Image.open(m)
        before = im.size
        im = center_to_ratio(trim_matte(im), ratio)
        if kind != "square":
            im = widen_left_field(im)
        print(f"{m.stem}: {before[0]}x{before[1]} -> trimmed/cropped {im.size[0]}x{im.size[1]}")
        for name, tw, th in targets:
            dst = out / f"{base}-{name}-{tw}x{th}.jpg"
            im.resize((tw, th), Image.LANCZOS).convert("RGB").save(
                dst, "JPEG", quality=90, optimize=True, progressive=True
            )
            residual = verify_bleed(dst)
            clipped = verify_featured_crop(dst)
            notes = ""
            if residual:
                notes += f"  !! RESIDUAL MATTE {residual}"
                failures.append((dst.name, residual))
            if clipped:
                notes += f"  !! TYPE CLIPPED BY FEATURED CROP {clipped}"
                failures.append((dst.name, clipped))
            print(f"    {dst.name}{notes}")


    if failures:
        sys.exit(f"\n{len(failures)} file(s) still show a matte edge — regenerate those masters.")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
