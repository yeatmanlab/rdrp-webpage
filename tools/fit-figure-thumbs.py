"""Render card thumbnails that fill a fixed 3:2 box without slicing through figure panels.

trim margin -> find background gutters -> cut at the gutter nearest the target size
-> pad the small remainder with the figure's own background colour.
"""
from PIL import Image, ImageChops
import re, os, sys

TARGET = 1.5
OUTW = 560
OUTDIR = 'assets/figures/thumbs/'

def bg_color(im):
    w, h = im.size
    px = [im.getpixel(p) for p in [(0,0),(w-1,0),(0,h-1),(w-1,h-1),(w//2,0),(w//2,h-1)]]
    px.sort(key=lambda c: sum(c))
    return px[len(px)//2]

def trim(im, bg, tol=8):
    diff = ImageChops.difference(im, Image.new('RGB', im.size, bg)).convert('L').point(lambda v: 255 if v > tol else 0)
    b = diff.getbbox()
    return im.crop(b) if b else im

def gutters(mask, axis, min_run=6):
    """Runs of near-empty lines along `axis`; returns their midpoints."""
    w, h = mask.size
    px = mask.load()
    n, other = (w, h) if axis == 'x' else (h, w)
    empty = []
    for i in range(n):
        ink = 0
        for j in range(0, other, 2):          # sample every other pixel; plenty for gutter detection
            if (px[i, j] if axis == 'x' else px[j, i]) > 0:
                ink += 1
                if ink > other * 0.012: break
        empty.append(ink <= other * 0.012)
    runs, start = [], None
    for i, e in enumerate(empty + [False]):
        if e and start is None: start = i
        elif not e and start is not None:
            if i - start >= min_run: runs.append((start + i) // 2)
            start = None
    return runs

def fit(path):
    im = Image.open(path).convert('RGB')
    bg = bg_color(im)
    t = trim(im, bg)
    w, h = t.size
    mask = ImageChops.difference(t, Image.new('RGB', t.size, bg)).convert('L').point(lambda v: 255 if v > 8 else 0)

    if w / h > TARGET:                                  # too wide: cut width
        want = int(round(h * TARGET))
        cands = [g for g in gutters(mask, 'x') if want * 0.55 <= g <= min(w, want * 1.9)]
        cut = min(cands, key=lambda g: abs(g - want)) if cands else want
        t = t.crop((0, 0, min(cut, w), h))
    elif w / h < TARGET:                                # too tall: cut height
        want = int(round(w / TARGET))
        cands = [g for g in gutters(mask, 'y') if want * 0.55 <= g <= min(h, want * 1.9)]
        cut = min(cands, key=lambda g: abs(g - want)) if cands else want
        t = t.crop((0, 0, w, min(cut, h)))

    # cutting at a gutter rarely lands on the exact ratio; pad the remainder in the
    # figure's own background colour so the box still fills edge to edge
    w, h = t.size
    if w / h > TARGET: nw, nh = w, int(round(w / TARGET))
    else:              nh, nw = h, int(round(h * TARGET))
    canvas = Image.new('RGB', (nw, nh), bg)
    canvas.paste(t, ((nw - w) // 2, (nh - h) // 2))
    return canvas.resize((OUTW, int(round(OUTW / TARGET))), Image.LANCZOS)

if __name__ == '__main__':
    src = open('shared-data.js', encoding='utf-8').read()
    figs = sorted(set(re.findall(r'figure: "([^"]+)"', src)))
    only = sys.argv[1:] or None
    total = 0
    for p in figs:
        if only and os.path.basename(p) not in only: continue
        if not os.path.exists(p): print('MISSING', p); continue
        out = OUTDIR + os.path.basename(p)
        fit(p).save(out, 'JPEG', quality=80, optimize=True)
        total += os.path.getsize(out)
    print('wrote thumbs, %.1f MB' % (total / 1048576))
