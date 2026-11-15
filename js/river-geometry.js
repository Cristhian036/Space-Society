/* Planar clipping for regional [latitude, longitude] lines and polygon rings. */
(function (root) {
  'use strict';
  const EPS = 1e-10;
  const cross = (a, b) => a[0] * b[1] - a[1] * b[0];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
  const same = (a, b) => Math.abs(a[0] - b[0]) < EPS && Math.abs(a[1] - b[1]) < EPS;
  const valid = p => Array.isArray(p) && p.length >= 2 && Number.isFinite(p[0]) && Number.isFinite(p[1]);

  function pointInPolygon(p, ring) {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const a = ring[j], b = ring[i], d = sub(b, a), q = sub(p, a);
      const length = Math.hypot(...d);
      if (length < EPS) { if (same(p, a)) return true; continue; }
      if (Math.abs(cross(d, q)) <= EPS * length &&
          p[0] >= Math.min(a[0], b[0]) - EPS && p[0] <= Math.max(a[0], b[0]) + EPS &&
          p[1] >= Math.min(a[1], b[1]) - EPS && p[1] <= Math.max(a[1], b[1]) + EPS) return true;
      if ((a[1] > p[1]) !== (b[1] > p[1]) &&
          p[0] < a[0] + (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1])) inside = !inside;
    }
    return inside;
  }

  function clipLineToPolygons(line, polygons) {
    const rings = polygons.filter(r => r.length >= 3 && r.every(valid));
    const parts = [];
    let current = [];
    const flush = () => { if (current.length >= 2) parts.push(current); current = []; };
    for (let k = 1; k < line.length; k++) {
      const a = line[k - 1], b = line[k];
      if (!valid(a) || !valid(b)) { flush(); continue; }
      if (same(a, b)) continue;
      const d = sub(b, a), cuts = [0, 1], norm = d[0] ** 2 + d[1] ** 2;
      for (const ring of rings) {
        for (let i = 0; i < ring.length; i++) {
          const c = ring[i], e = sub(ring[(i + 1) % ring.length], c), q = sub(c, a);
          const denom = cross(d, e);
          if (Math.abs(denom) > EPS * Math.hypot(...d) * Math.hypot(...e)) {
            const t = cross(q, e) / denom, u = cross(q, d) / denom;
            if (t >= -EPS && t <= 1 + EPS && u >= -EPS && u <= 1 + EPS) cuts.push(Math.max(0, Math.min(1, t)));
          } else if (Math.abs(cross(q, d)) <= EPS * Math.hypot(...d)) {
            // Collinear edges: split at their endpoints as well.
            for (const p of [c, ring[(i + 1) % ring.length]]) {
              const v = sub(p, a), t = (v[0] * d[0] + v[1] * d[1]) / norm;
              if (t > 0 && t < 1) cuts.push(t);
            }
          }
        }
      }
      cuts.sort((x, y) => x - y);
      const ts = cuts.filter((t, i) => i === 0 || t - cuts[i - 1] > EPS);
      const at = t => [a[0] + t * d[0], a[1] + t * d[1]];
      for (let i = 1; i < ts.length; i++) {
        const lo = ts[i - 1], hi = ts[i];
        if (!rings.some(r => pointInPolygon(at((lo + hi) / 2), r))) { flush(); continue; }
        const p = at(lo), q = at(hi);
        if (current.length && !same(current[current.length - 1], p)) flush();
        if (!current.length) current.push(p);
        if (!same(current[current.length - 1], q)) current.push(q);
      }
    }
    flush();
    return parts;
  }
  const api = { pointInPolygon, clipLineToPolygons };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.RiverGeometry = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
