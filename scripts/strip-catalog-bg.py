"""
Strip solid orange studio backgrounds from enables/handitems catalog webps.
Flood-fills from edges so interior pixels of similar color stay intact.
Rewrites assets/enables.json and assets/handitems.json in place.
"""
from __future__ import annotations

import base64
import io
import json
import sys
from collections import deque
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
FILES = [ASSETS / "enables.json", ASSETS / "handitems.json"]

# Studio bg is ~ (189, 106, 0); allow slight compression noise.
TOLERANCE = 28
# WebP quality for lossless-ish alpha; method 4 is a good speed/size tradeoff.
WEBP_QUALITY = 85
WEBP_METHOD = 4


def color_close(a: tuple[int, int, int], b: tuple[int, int, int], tol: int) -> bool:
    return (
        abs(a[0] - b[0]) <= tol
        and abs(a[1] - b[1]) <= tol
        and abs(a[2] - b[2]) <= tol
    )


def sample_bg(px, w: int, h: int) -> tuple[int, int, int]:
    """Median-ish of corner samples (robust to 1px noise)."""
    samples = [
        px[0, 0][:3],
        px[w - 1, 0][:3],
        px[0, h - 1][:3],
        px[w - 1, h - 1][:3],
        px[w // 2, 0][:3],
        px[0, h // 2][:3],
        px[w - 1, h // 2][:3],
        px[w // 2, h - 1][:3],
    ]
    # Pick the mode among corners; fallback first.
    from collections import Counter

    return Counter(samples).most_common(1)[0][0]


def strip_background(im: Image.Image, tol: int = TOLERANCE) -> Image.Image:
    im = im.convert("RGBA")
    w, h = im.size
    px = im.load()
    bg = sample_bg(px, w, h)

    # Only treat nearly-opaque bg-like pixels as candidates.
    def is_bg(x: int, y: int) -> bool:
        r, g, b, a = px[x, y]
        if a < 8:
            return True
        return color_close((r, g, b), bg, tol)

    visited = bytearray(w * h)
    q: deque[tuple[int, int]] = deque()

    def try_seed(x: int, y: int) -> None:
        i = y * w + x
        if visited[i]:
            return
        if not is_bg(x, y):
            return
        visited[i] = 1
        q.append((x, y))

    for x in range(w):
        try_seed(x, 0)
        try_seed(x, h - 1)
    for y in range(h):
        try_seed(0, y)
        try_seed(w - 1, y)

    while q:
        x, y = q.popleft()
        # clear
        r, g, b, _a = px[x, y]
        px[x, y] = (r, g, b, 0)
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if nx < 0 or ny < 0 or nx >= w or ny >= h:
                continue
            i = ny * w + nx
            if visited[i]:
                continue
            if is_bg(nx, ny):
                visited[i] = 1
                q.append((nx, ny))

    return im


def process_data_url(data_url: str) -> str:
    if not data_url or not data_url.startswith("data:image"):
        return data_url
    try:
        header, b64 = data_url.split(",", 1)
    except ValueError:
        return data_url
    raw = base64.b64decode(b64)
    im = Image.open(io.BytesIO(raw))
    out = strip_background(im)
    buf = io.BytesIO()
    out.save(buf, format="WEBP", quality=WEBP_QUALITY, method=WEBP_METHOD, lossless=False)
    encoded = base64.b64encode(buf.getvalue()).decode("ascii")
    return f"data:image/webp;base64,{encoded}"


def process_file(path: Path) -> None:
    print(f"processing {path.name}…")
    data = json.loads(path.read_text(encoding="utf-8"))
    n = len(data)
    for i, item in enumerate(data):
        if "img" not in item:
            continue
        item["img"] = process_data_url(item["img"])
        if (i + 1) % 50 == 0 or i + 1 == n:
            print(f"  {i + 1}/{n}")
    # Compact JSON (no indent) keeps size down like the original.
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"  wrote {path} ({path.stat().st_size // 1024} KB)")


def main() -> int:
    for f in FILES:
        if not f.exists():
            print(f"missing {f}", file=sys.stderr)
            return 1
        process_file(f)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
