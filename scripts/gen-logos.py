"""
Generate 4 theme-appropriate chess-themed logo emblems using PIL.
- 2 for light mode: warm cream/parchment bg, dark mahogany knight
- 2 for dark mode: deep charcoal-brown bg, luminous gold/ivory knight

Each is a 400x400 circular emblem with:
- Themed gradient background
- Subtle chess-board pattern texture
- A large Staunton knight glyph centered
- A small crown accent
- Themed border ring
No external watermarks.
"""
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os
import math

OUTDIR = "public/chess-logos"
os.makedirs(OUTDIR, exist_ok=True)

SIZE = 400
CENTER = SIZE // 2
RADIUS = SIZE // 2 - 8

# Unicode chess glyphs (solid Staunton)
KNIGHT = "\u265E"  # ♞
QUEEN = "\u265B"   # ♛
KING = "\u265A"    # ♚
CROWN = "\u265A"   # use king glyph as crown accent

# Try to load a good font with chess glyphs
FONT_PATHS = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/TTF/DejaVuSans.ttf",
    "/usr/share/fonts/dejavu/DejaVuSans.ttf",
]
FONT_PATH = None
for p in FONT_PATHS:
    if os.path.exists(p):
        FONT_PATH = p
        break

def get_font(size):
    if FONT_PATH:
        return ImageFont.truetype(FONT_PATH, size)
    return ImageFont.load_default()

def make_circular_mask(size):
    """Return a circular alpha mask."""
    mask = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(mask)
    d.ellipse([0, 0, size - 1, size - 1], fill=255)
    return mask

def draw_checkerboard_theme(draw, size, light_color, dark_color, alpha=35):
    """Draw a faint checkerboard pattern inside the circle."""
    sq = size // 8
    for r in range(8):
        for c in range(8):
            if (r + c) % 2 == 0:
                color = (*light_color, alpha)
            else:
                color = (*dark_color, alpha)
            # We'll draw as RGBA later; here just note positions
            x0 = c * sq
            y0 = r * sq
            draw.rectangle([x0, y0, x0 + sq, y0 + sq], fill=color)

def make_gradient_bg(size, color_top, color_bottom):
    """Create a vertical gradient background."""
    bg = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    px = bg.load()
    for y in range(size):
        t = y / (size - 1)
        r = int(color_top[0] + (color_bottom[0] - color_top[0]) * t)
        g = int(color_top[1] + (color_bottom[1] - color_top[1]) * t)
        b = int(color_top[2] + (color_bottom[2] - color_top[2]) * t)
        for x in range(size):
            px[x, y] = (r, g, b, 255)
    return bg

def make_logo(name, bg_top, bg_bottom, checker_light, checker_dark, piece_color, piece_stroke, ring_color, accent_color, glyph=KNIGHT):
    """Create one themed logo emblem."""
    # 1. Gradient background
    img = make_gradient_bg(SIZE, bg_top, bg_bottom)

    # 2. Faint checkerboard pattern overlay
    pattern = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    pd = ImageDraw.Draw(pattern)
    sq = SIZE // 8
    for r in range(8):
        for c in range(8):
            if (r + c) % 2 == 0:
                pd.rectangle([c * sq, r * sq, (c + 1) * sq, (r + 1) * sq],
                             fill=(*checker_light, 30))
            else:
                pd.rectangle([c * sq, r * sq, (c + 1) * sq, (r + 1) * sq],
                             fill=(*checker_dark, 30))
    img = Image.alpha_composite(img, pattern)

    # 3. Soft radial vignette to focus center
    vignette = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    vd = ImageDraw.Draw(vignette)
    for i in range(20):
        alpha = int(8 * (1 - i / 20))
        vd.ellipse([CENTER - RADIUS + i*2, CENTER - RADIUS + i*2,
                    CENTER + RADIUS - i*2, CENTER + RADIUS - i*2],
                   outline=(0, 0, 0, alpha))
    img = Image.alpha_composite(img, vignette)

    # 4. Draw the chess piece glyph centered
    draw = ImageDraw.Draw(img)
    # Large piece
    piece_font = get_font(220)
    # Measure
    bbox = draw.textbbox((0, 0), glyph, font=piece_font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    tx = (SIZE - tw) // 2 - bbox[0]
    ty = (SIZE - th) // 2 - bbox[1] - 10

    # Draw stroke (outline) by drawing text multiple times offset
    stroke_w = 3
    for dx in range(-stroke_w, stroke_w + 1):
        for dy in range(-stroke_w, stroke_w + 1):
            if dx*dx + dy*dy <= stroke_w*stroke_w:
                draw.text((tx + dx, ty + dy), glyph, font=piece_font, fill=piece_stroke)
    # Draw fill
    draw.text((tx, ty), glyph, font=piece_font, fill=piece_color)

    # 5. Small crown accent above the piece
    crown_font = get_font(48)
    cb = draw.textbbox((0, 0), CROWN, font=crown_font)
    ctw = cb[2] - cb[0]
    ctx = (SIZE - ctw) // 2 - cb[0]
    cty = 50
    draw.text((ctx, cty), CROWN, font=crown_font, fill=accent_color)

    # 6. Border ring
    ring = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    rd = ImageDraw.Draw(ring)
    rd.ellipse([4, 4, SIZE - 5, SIZE - 5], outline=(*ring_color, 200), width=4)
    rd.ellipse([10, 10, SIZE - 11, SIZE - 11], outline=(*ring_color, 80), width=1)
    img = Image.alpha_composite(img, ring)

    # 7. Apply circular mask
    mask = make_circular_mask(SIZE)
    final = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    final.paste(img, (0, 0), mask)

    final.save(os.path.join(OUTDIR, name), "PNG", optimize=True)
    print(f"✓ saved {name}")

# ── Light mode logos (warm cream/parchment bg, dark mahogany pieces) ──
make_logo(
    "light-1.png",
    bg_top=(247, 241, 227),      # warm parchment
    bg_bottom=(231, 214, 169),   # deeper maple
    checker_light=(255, 248, 220),
    checker_dark=(176, 125, 78),
    piece_color=(58, 36, 24),    # dark mahogany
    piece_stroke=(28, 16, 8),
    ring_color=(176, 125, 78),   # walnut
    accent_color=(218, 165, 32), # gold crown
    glyph=KNIGHT,
)

make_logo(
    "light-2.png",
    bg_top=(240, 220, 180),      # honey
    bg_bottom=(224, 196, 140),   # bronze
    checker_light=(247, 239, 217),
    checker_dark=(148, 99, 58),
    piece_color=(44, 24, 16),
    piece_stroke=(20, 10, 4),
    ring_color=(148, 99, 58),
    accent_color=(218, 165, 32),
    glyph=QUEEN,
)

# ── Dark mode logos (deep charcoal-brown bg, luminous gold/ivory pieces) ──
make_logo(
    "dark-1.png",
    bg_top=(38, 28, 20),         # deep charcoal-brown
    bg_bottom=(20, 14, 10),      # near-black
    checker_light=(80, 50, 30),
    checker_dark=(30, 20, 14),
    piece_color=(240, 200, 100), # luminous gold
    piece_stroke=(255, 220, 140),
    ring_color=(196, 165, 116),  # amber
    accent_color=(255, 209, 102),# bright gold crown
    glyph=KNIGHT,
)

make_logo(
    "dark-2.png",
    bg_top=(44, 32, 22),
    bg_bottom=(16, 12, 8),
    checker_light=(70, 44, 26),
    checker_dark=(24, 16, 12),
    piece_color=(242, 230, 200), # luminous ivory
    piece_stroke=(255, 245, 220),
    ring_color=(196, 165, 116),
    accent_color=(255, 209, 102),
    glyph=KING,
)

print("All logos generated.")
