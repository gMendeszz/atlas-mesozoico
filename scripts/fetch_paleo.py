"""
Downloads paleogeographic reconstructions for the "ancient continents" mode.

For each time slice (70, 80, ..., 250 million years ago), asks the GPlates Web Service for:
  - the continent outlines at that time
  - the position, at that time, of each collection site in public/data/dinos.json
This keeps points and continents always in the same model and the same time slice.

Model: PALEOMAP (Scotese 2016, CC BY 4.0) — https://doi.org/10.5281/zenodo.10596609
Service: GPlates Web Service (EarthByte / University of Sydney) — https://gws.gplates.org

Run AFTER fetch_data.py (it uses the site list from there):
    python scripts/fetch_paleo.py            # uses the local cache if present
    python scripts/fetch_paleo.py --refresh  # downloads everything again

Output: public/data/paleo/<time>.json, one file per time slice. Coordinates in tenths of a
degree, as integers (-172 = -17.2°) — the uncertainty of the reconstructions is far larger:
  points  [lng, lat, lng, lat, ...] in the same order as "sites" (null = no reconstruction)
  coasts  list of outlines; each one [lng0, lat0, dlng1, dlat1, ...]: the first point is
          absolute and the following ones are the difference from the previous (small numbers)
"""

import argparse
import hashlib
import json
import time
import urllib.parse
import urllib.request
from pathlib import Path

GWS = "https://gws.gplates.org"
MODEL = "PALEOMAP"
TIME_SLICES = range(70, 251, 10)
USER_AGENT = "MesozoicAtlas/0.1 (educational project)"
PAUSE_SECONDS = 2  # pause between requests, as a courtesy to the server
TOLERANCE_DEGREES = 0.15  # outline simplification (~17 km); invisible at the globe's zoom levels
MIN_AREA = 0.2  # square degrees; drops islets (80% of the outlines, 0.2% of the area)

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "public" / "data" / "dinos.json"
CACHE = ROOT / "data" / "raw" / "paleo"
OUTPUT = ROOT / "public" / "data" / "paleo"


def fetch(cache_name, url, post_data, refresh):
    """GET (or POST, if there is data) with a local cache. Returns the JSON."""
    file = CACHE / f"{cache_name}.json"
    if file.exists() and not refresh:
        return json.loads(file.read_text(encoding="utf-8"))

    body = urllib.parse.urlencode(post_data).encode() if post_data else None
    req = urllib.request.Request(url, data=body, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=300) as resp:
        text = resp.read().decode("utf-8")

    CACHE.mkdir(parents=True, exist_ok=True)
    file.write_text(text, encoding="utf-8")
    time.sleep(PAUSE_SECONDS)
    return json.loads(text)


def distance_to_segment(p, a, b):
    """Distance (in degrees, planar) from point p to segment a-b."""
    (px, py), (ax, ay), (bx, by) = p, a, b
    dx, dy = bx - ax, by - ay
    if dx == 0 and dy == 0:
        return ((px - ax) ** 2 + (py - ay) ** 2) ** 0.5
    t = max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
    return ((px - ax - t * dx) ** 2 + (py - ay - t * dy) ** 2) ** 0.5


def simplify(points, tol):
    """Ramer–Douglas–Peucker (iterative version, no recursion)."""
    if len(points) < 3:
        return points
    keep = [False] * len(points)
    keep[0] = keep[-1] = True
    stack = [(0, len(points) - 1)]
    while stack:
        start, end = stack.pop()
        largest, idx = 0, None
        for i in range(start + 1, end):
            d = distance_to_segment(points[i], points[start], points[end])
            if d > largest:
                largest, idx = d, i
        if idx is not None and largest > tol:
            keep[idx] = True
            stack += [(start, idx), (idx, end)]
    return [p for p, k in zip(points, keep) if k]


def area(ring):
    """Approximate area in square degrees (shoelace formula)."""
    return abs(sum(x0 * y1 - x1 * y0 for (x0, y0), (x1, y1) in zip(ring, ring[1:]))) / 2


def unwrap(ring):
    """Outlines that cross the date line (179° → -179°) become continuous (179° → 181°);
    without this the map would draw a band across the whole world."""
    output = [(ring[0][0], ring[0][1])]
    for x, y in ring[1:]:
        previous = output[-1][0]
        while x - previous > 180:
            x -= 360
        while x - previous < -180:
            x += 360
        output.append((x, y))
    return output


def tenths(v):
    return int(round(v * 10))


def outlines(geojson):
    """Outer rings of the polygons: simplified, without islets, in tenths with deltas."""
    output = []
    for f in geojson.get("features", []):
        g = f.get("geometry") or {}
        if g.get("type") not in ("Polygon", "MultiPolygon"):
            continue
        polygons = [g["coordinates"]] if g["type"] == "Polygon" else g["coordinates"]
        for polygon in polygons:
            ring = polygon[0]
            if area(ring) < MIN_AREA:
                continue
            ring = simplify(unwrap(ring), TOLERANCE_DEGREES)
            ints = [(tenths(x), tenths(y)) for x, y in ring]
            ints = [p for i, p in enumerate(ints) if i == 0 or p != ints[i - 1]]
            if len(ints) < 4:
                continue
            flat = list(ints[0])
            for (x0, y0), (x1, y1) in zip(ints, ints[1:]):
                flat += [x1 - x0, y1 - y0]
            output.append(flat)
    return output


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--refresh", action="store_true", help="ignore the cache")
    args = parser.parse_args()

    data = json.loads(DATA.read_text(encoding="utf-8"))
    lats, lngs = data["sites"]["lat"], data["sites"]["lng"]
    print(f"{len(lats)} sites from {DATA.relative_to(ROOT)}")
    # The positions cache depends on the exact list of coordinates: if dinos.json changes,
    # the positions are requested again (positions from another list are never reused).
    signature = hashlib.sha1(json.dumps([lats, lngs]).encode()).hexdigest()[:10]

    OUTPUT.mkdir(parents=True, exist_ok=True)
    for t in TIME_SLICES:
        print(f"{t} million years ago...", end=" ", flush=True)
        coasts = fetch(f"coasts_{t}", f"{GWS}/reconstruct/coastlines/?time={t}&model={MODEL}", None, args.refresh)
        recon = fetch(
            f"points_{t}_{signature}",
            f"{GWS}/reconstruct/reconstruct_points/",
            {
                "lats": ",".join(map(str, lats)),
                "lons": ",".join(map(str, lngs)),
                "time": t,
                "model": MODEL,
                "return_null_points": "",
            },
            args.refresh,
        )

        coords = recon["coordinates"]
        if len(coords) != len(lats):
            raise RuntimeError(f"GPlates returned {len(coords)} points, expected {len(lats)}")
        points = []
        for c in coords:
            points += [tenths(c[0]), tenths(c[1])] if c else [None, None]

        output = {
            "t": t,
            "model": MODEL,
            "generated_from": data["meta"]["generated_at"],
            "signature": signature,
            "n_sites": len(lats),
            "points": points,
            "coasts": outlines(coasts),
        }
        file = OUTPUT / f"{t}.json"
        file.write_text(json.dumps(output, separators=(",", ":")), encoding="utf-8")
        nulls = sum(1 for c in coords if not c)
        print(f"{len(output['coasts'])} outlines, {nulls} sites with no reconstruction, "
              f"{file.stat().st_size / 1e3:.0f} KB")


if __name__ == "__main__":
    main()
