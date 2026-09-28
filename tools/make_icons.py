"""Generate the PWA icons. Run with: python tools/make_icons.py"""
import os
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(os.path.dirname(HERE), "icons")
os.makedirs(OUT, exist_ok=True)

BG = (14, 17, 22, 255)
ACC = (76, 154, 255, 255)
FG = (232, 237, 244, 255)


def font(size):
    for name in ("segoeuib.ttf", "arialbd.ttf", "DejaVuSans-Bold.ttf"):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default()


def draw_icon(size, maskable=False):
    img = Image.new("RGBA", (size, size), BG)
    d = ImageDraw.Draw(img)

    pad = int(size * (0.18 if maskable else 0.10))
    d.rounded_rectangle(
        [pad, pad, size - pad, size - pad],
        radius=int(size * (0.10 if maskable else 0.18)),
        fill=(21, 26, 33, 255),
        outline=ACC,
        width=max(2, int(size * 0.018)),
    )

    ring = size * 0.26
    cx = cy = size / 2
    width = max(2, int(size * 0.05))
    d.ellipse([cx - ring, cy - ring, cx + ring, cy + ring], outline=ACC, width=width)
    d.ellipse(
        [cx - ring * 0.38, cy - ring * 0.38, cx + ring * 0.38, cy + ring * 0.38],
        fill=ACC,
    )

    for i in range(8):
        import math
        a = math.radians(i * 45 + 11)
        x0 = cx + math.cos(a) * ring * 1.0
        y0 = cy + math.sin(a) * ring * 1.0
        x1 = cx + math.cos(a) * ring * 1.42
        y1 = cy + math.sin(a) * ring * 1.42
        d.line([x0, y0, x1, y1], fill=ACC, width=width)

    f = font(int(size * 0.20))
    label = "M"
    box = d.textbbox((0, 0), label, font=f)
    tw, th = box[2] - box[0], box[3] - box[1]
    tx = size - tw - size * 0.10
    ty = size - th - size * 0.13
    d.text((tx, ty - box[1]), label, font=f, fill=FG)

    return img


for size, name, maskable in [
    (192, "icon-192.png", False),
    (512, "icon-512.png", False),
    (512, "icon-maskable-512.png", True),
    (180, "apple-touch-icon.png", False),
]:
    path = os.path.join(OUT, name)
    draw_icon(size, maskable).save(path)
    print("wrote", path, size)
