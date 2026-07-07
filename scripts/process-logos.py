"""
Process 4 user-provided chess logo images into theme-appropriate circular emblems.
- Images 1 & 2 (light bg) → light mode logos
- Images 3 & 4 (dark bg) → dark mode logos

Steps per image:
1. Crop to center square
2. Remove any Gemini watermark from the bottom-right corner
3. Apply circular mask (removes square white corners)
4. Add a subtle themed border ring
5. Save at 400x400
"""
from PIL import Image, ImageDraw, ImageFilter
import os

OUTDIR = "public/chess-logos"
os.makedirs(OUTDIR, exist_ok=True)

SIZE = 400

SOURCES = [
    ("upload/Gemini_Generated_Image_wgjwmwwgjwmwwgjw.png",     "light-1.png"),
    ("upload/Gemini_Generated_Image_wgjwmwwgjwmwwgjw (1).png", "light-2.png"),
    ("upload/Gemini_Generated_Image_wgjwmwwgjwmwwgjw (2).png", "dark-1.png"),
    ("upload/Gemini_Generated_Image_wgjwmwwgjwmwwgjw (3).png", "dark-2.png"),
]

def process_logo(src_path, out_name):
    im = Image.open(src_path).convert("RGBA")
    w, h = im.size

    # 1. Crop to center square (use the smaller dimension)
    side = min(w, h)
    left = (w - side) // 2
    top = (h - side) // 2
    im = im.crop((left, top, left + side, top + side))

    # 2. Remove potential Gemini watermark from bottom-right corner.
    #    The watermark is typically a small sparkle icon in the bottom-right
    #    ~8% of the image. We crop that region out and blend it with the
    #    surrounding background.
    crop_w = int(side * 0.12)
    # Sample the background color from an area away from the watermark
    # (bottom-left corner, which should be clean background).
    bg_sample = im.getpixel((int(side * 0.05), int(side * 0.95)))
    # Paint over the bottom-right corner with the sampled background color
    overlay = Image.new("RGBA", im.size, (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    # Blend a rectangle in the bottom-right with the bg color, with a soft edge
    for i in range(crop_w):
        alpha = int(255 * (1 - i / crop_w) ** 2)
        od.rectangle(
            [side - crop_w + i, side - crop_w + i, side, side],
            fill=(*bg_sample[:3], alpha),
        )
    im = Image.alpha_composite(im, overlay)

    # 3. Resize to target size
    im = im.resize((SIZE, SIZE), Image.LANCZOS)

    # 4. Apply circular mask with a soft feathered edge
    mask = Image.new("L", (SIZE, SIZE), 0)
    md = ImageDraw.Draw(mask)
    # Soft edge: draw multiple circles with increasing radius and decreasing alpha
    feather = 3
    for i in range(feather, 0, -1):
        alpha = int(255 * (1 - i / (feather + 1)))
        md.ellipse(
            [i, i, SIZE - 1 - i, SIZE - 1 - i],
            fill=255 if i == 1 else alpha,
        )
    md.ellipse([0, 0, SIZE - 1, SIZE - 1], fill=255)

    final = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    final.paste(im, (0, 0), mask)

    # 5. Add a subtle themed border ring
    ring = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    rd = ImageDraw.Draw(ring)
    # Outer ring
    rd.ellipse([2, 2, SIZE - 3, SIZE - 3], outline=(176, 125, 78, 180), width=3)
    # Inner subtle ring
    rd.ellipse([8, 8, SIZE - 9, SIZE - 9], outline=(176, 125, 78, 60), width=1)
    final = Image.alpha_composite(final, ring)

    # 6. Add a soft drop shadow for depth
    shadow = Image.new("RGBA", (SIZE + 20, SIZE + 20), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.ellipse([8, 10, SIZE + 7, SIZE + 9], fill=(0, 0, 0, 40))
    shadow = shadow.filter(ImageFilter.GaussianBlur(radius=6))

    # Combine shadow + logo
    result = Image.new("RGBA", (SIZE + 20, SIZE + 20), (0, 0, 0, 0))
    result = Image.alpha_composite(result, shadow)
    result.paste(final, (10, 10), final)
    result = result.crop((5, 5, SIZE + 15, SIZE + 15)).resize((SIZE, SIZE), Image.LANCZOS)

    result.save(os.path.join(OUTDIR, out_name), "PNG", optimize=True)
    print(f"✓ saved {out_name} ({os.path.getsize(os.path.join(OUTDIR, out_name))} bytes)")

for src, out in SOURCES:
    process_logo(src, out)

print("\nAll logos processed.")
