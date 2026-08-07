"""
Reframe handitem catalog sprites so content fill matches enables cards.

Source handitems are full-body avatars on a tall 200x360 canvas; after bg strip
they still look skinny/stretched next to effect sprites. We:
  1) crop to alpha bbox (+padding)
  2) scale uniformly onto a fresh 200x360 transparent canvas
  3) target fill similar to enables (~50% of canvas height, centered slightly high)
"""
from __future__ import annotations

import base64
import io
import json
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PATH = ROOT / "assets" / "handitems.json"

CANVAS_W = 200
CANVAS_H = 360
# Target content height as fraction of canvas.
# Handitems are tall/narrow full-body shots; a fuller fill matches enable card weight
# (Hibisco also zoomed handitems harder than enables).
TARGET_H_FRAC = 0.62
# Max content width fraction (leave side breathing room)
MAX_W_FRAC = 0.88
# Extra pad around alpha bbox before scale (fraction of bbox size)
BBOX_PAD = 0.04
# Vertical placement: 0 = top, 0.5 = center of free space — bias a bit upward
V_BIAS = 0.32

WEBP_QUALITY = 85
WEBP_METHOD = 4


def reframe(im: Image.Image) -> Image.Image:
    im = im.convert("RGBA")
    alpha = im.split()[-1]
    bbox = alpha.getbbox()
    if not bbox:
        return Image.new("RGBA", (CANVAS_W, CANVAS_H), (0, 0, 0, 0))

    x0, y0, x1, y1 = bbox
    bw, bh = x1 - x0, y1 - y0
    pad_x = max(2, int(bw * BBOX_PAD))
    pad_y = max(2, int(bh * BBOX_PAD))
    x0 = max(0, x0 - pad_x)
    y0 = max(0, y0 - pad_y)
    x1 = min(im.width, x1 + pad_x)
    y1 = min(im.height, y1 + pad_y)
    crop = im.crop((x0, y0, x1, y1))

    target_h = int(CANVAS_H * TARGET_H_FRAC)
    target_w_max = int(CANVAS_W * MAX_W_FRAC)
    cw, ch = crop.size
    scale = target_h / ch
    if cw * scale > target_w_max:
        scale = target_w_max / cw
    nw = max(1, int(round(cw * scale)))
    nh = max(1, int(round(ch * scale)))
    resized = crop.resize((nw, nh), Image.Resampling.LANCZOS)

    canvas = Image.new("RGBA", (CANVAS_W, CANVAS_H), (0, 0, 0, 0))
    x = (CANVAS_W - nw) // 2
    free_y = CANVAS_H - nh
    y = max(0, int(free_y * V_BIAS))
    # Keep a little bottom margin for the name overlay band when displayed
    y = min(y, CANVAS_H - nh - 8)
    canvas.paste(resized, (x, y), resized)
    return canvas


def process_data_url(data_url: str) -> str:
    if not data_url or not data_url.startswith("data:image"):
        return data_url
    try:
        _header, b64 = data_url.split(",", 1)
    except ValueError:
        return data_url
    im = Image.open(io.BytesIO(base64.b64decode(b64)))
    out = reframe(im)
    buf = io.BytesIO()
    out.save(buf, format="WEBP", quality=WEBP_QUALITY, method=WEBP_METHOD, lossless=False)
    return "data:image/webp;base64," + base64.b64encode(buf.getvalue()).decode("ascii")


def main() -> int:
    if not PATH.exists():
        print(f"missing {PATH}", file=sys.stderr)
        return 1
    data = json.loads(PATH.read_text(encoding="utf-8"))
    n = len(data)
    for i, item in enumerate(data):
        if "img" in item:
            item["img"] = process_data_url(item["img"])
        if (i + 1) % 50 == 0 or i + 1 == n:
            print(f"  {i + 1}/{n}")
    PATH.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"wrote {PATH} ({PATH.stat().st_size // 1024} KB)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
