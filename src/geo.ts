// Geographic calculations used by the map.

export type Coordinate = [number, number]; // [lng, lat]
export type Bounds = [Coordinate, Coordinate]; // [[west, south], [east, north]]

// Bounds of a list of coordinates.
// If the points cross the date line (e.g. New Zealand with the Chatham Islands at -176°),
// the "direct" box would go from -176° to +178° and cover the whole world; in that case the
// negative longitudes become >180° (the same place, on the continuous side), and the box is the right size.
export function boundsOfPoints(coordinates: Coordinate[]): Bounds | null {
  if (!coordinates.length) return null;
  const lngs = coordinates.map(([lng]) => lng);
  const crosses = Math.max(...lngs) - Math.min(...lngs) > 180;
  let [west, south, east, north] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const [lng0, lat] of coordinates) {
    const lng = crosses && lng0 < 0 ? lng0 + 360 : lng0;
    west = Math.min(west, lng);
    east = Math.max(east, lng);
    south = Math.min(south, lat);
    north = Math.max(north, lat);
  }
  return [
    [west, south],
    [east, north],
  ];
}

// Zoom at which the globe fills almost all of the free area (width × height in px).
// A small globe = each dragged pixel rotates many degrees and it's easy to miss the target.
// Globe diameter in px ≈ 512 · 2^zoom / π.
export function wholeGlobeZoom(width: number, height: number): number {
  const diameter = Math.max(220, Math.min(width * 0.92, height * 0.94));
  return Math.log2((diameter * Math.PI) / 512);
}
