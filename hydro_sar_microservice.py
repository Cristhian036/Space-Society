#!/usr/bin/env python3
"""
SPACE SOCIETY - Microservicio Hidrologico v2 (puerto 8050)
==========================================================
Extraccion de la red de rios desde cero (sin vectores de rios preexistentes),
siguiendo el flujo estandar de hidrologia computacional usado por
RichDEM, PySheds, TauDEM y WhiteboxTools:

 1. DEM a resolucion nativa (AWS Terrarium / SRTM-NASADEM, hasta z12 ~ 35 m/px).
    Sin submuestreo: cada pixel del DEM es una celda del modelo.
 2. Suavizado gaussiano leve (sigma 0.8) para quitar ruido/artefactos del DEM.
 3. Indice de agua observada (opcional) a partir de la imagen satelital
    alineada pixel a pixel (contraste de oscuridad local + azulado) y
    "stream burning" (Hellweger 1997 / AGREE): Z_c = Z - h * P(agua).
    Corrige el problema de los meandros en zonas planas (Altiplano).
 4. Deteccion de lagos (agua + planicie + componente grande) y oceano (Z<=0):
    se usan como sumideros/salidas legitimas (cuencas endorreicas del Titicaca).
 5. Priority-Flood + epsilon (Barnes, Lehman & Mulla 2014) para rellenar
    depresiones espurias y resolver planicies -> todo pixel drena.
 6. Direccion de flujo D8 (O'Callaghan & Mark 1984) por maxima pendiente.
 7. Acumulacion de flujo en km2 reales (area de celda Mercator por latitud).
 8. Umbral de area de contribucion (Tarboton 1991) -> red de cauces.
 9. Orden de Strahler, segmentacion en tramos (link a link), simplificacion
    Douglas-Peucker + suavizado Chaikin -> polilineas finas GeoJSON-like.
"""

import json
import math
import os
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

try:
    from numba import njit

    HAS_NUMBA = True
except ImportError:  # pragma: no cover
    HAS_NUMBA = False

    def njit(*args, **kwargs):
        if args and callable(args[0]):
            return args[0]

        def deco(f):
            return f

        return deco


PORT = 8050
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CACHE_DIR = os.path.join(BASE_DIR, ".dem_cache")
os.makedirs(CACHE_DIR, exist_ok=True)

TERRARIUM_URL = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"
IMAGERY_URL = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"

# 8 vecinos: dy, dx
DY8 = np.array([-1, -1, -1, 0, 0, 1, 1, 1], dtype=np.int64)
DX8 = np.array([-1, 0, 1, -1, 1, -1, 0, 1], dtype=np.int64)


# ----------------------------------------------------------------------------
# Geometria Web Mercator
# ----------------------------------------------------------------------------
def lon2tile_x(lon, z):
    return (lon + 180.0) / 360.0 * (2 ** z)


def lat2tile_y(lat, z):
    r = math.radians(lat)
    return (1.0 - math.log(math.tan(r) + 1.0 / math.cos(r)) / math.pi) / 2.0 * (2 ** z)


def tile_x2lon(x, z):
    return x / (2 ** z) * 360.0 - 180.0


def tile_y2lat(y, z):
    n = math.pi - 2.0 * math.pi * y / (2 ** z)
    return math.degrees(math.atan(math.sinh(n)))


# ----------------------------------------------------------------------------
# Descarga con cache
# ----------------------------------------------------------------------------
def _fetch_tile(kind, z, x, y):
    ext = "png" if kind == "dem" else "jpg"
    path = os.path.join(CACHE_DIR, f"{kind}_{z}_{x}_{y}.{ext}")
    if not os.path.exists(path):
        url = (TERRARIUM_URL if kind == "dem" else IMAGERY_URL).format(z=z, x=x, y=y)
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "SpaceSociety-Hydro/2.0"})
            with urllib.request.urlopen(req, timeout=12) as r:
                data = r.read()
            with open(path, "wb") as f:
                f.write(data)
        except Exception:
            return None
    try:
        with Image.open(path) as im:
            return np.asarray(im.convert("RGB"), dtype=np.float32)
    except Exception:
        return None


def _mosaic(kind, z, x0, x1, y0, y1):
    th, tw = y1 - y0 + 1, x1 - x0 + 1
    out = np.full((th * 256, tw * 256, 3), np.nan, dtype=np.float32)
    jobs = [(tx, ty) for ty in range(y0, y1 + 1) for tx in range(x0, x1 + 1)]
    with ThreadPoolExecutor(max_workers=16) as pool:
        results = list(pool.map(lambda t: _fetch_tile(kind, z, t[0], t[1]), jobs))
    for (tx, ty), arr in zip(jobs, results):
        if arr is not None and arr.shape[0] == 256 and arr.shape[1] == 256:
            r0, c0 = (ty - y0) * 256, (tx - x0) * 256
            out[r0:r0 + 256, c0:c0 + 256] = arr
    return out


# ----------------------------------------------------------------------------
# Nucleos numericos (numba)
# ----------------------------------------------------------------------------
@njit(cache=True)
def priority_flood_eps(z, seeds, eps):
    """Priority-Flood + epsilon (Barnes et al. 2014). Devuelve DEM sin depresiones
    ni planicies: cada celda tiene un vecino estrictamente mas bajo hacia una salida."""
    h, w = z.shape
    n = h * w
    out = z.copy().ravel()
    sd = seeds.ravel()
    closed = np.zeros(n, dtype=np.bool_)
    hv = np.empty(n, dtype=np.float64)
    hi = np.empty(n, dtype=np.int64)
    size = 0
    for i in range(n):
        if sd[i]:
            closed[i] = True
            # push
            k = size
            hv[k] = out[i]
            hi[k] = i
            size += 1
            while k > 0:
                p = (k - 1) // 2
                if hv[p] <= hv[k]:
                    break
                tv = hv[p]; hv[p] = hv[k]; hv[k] = tv
                ti = hi[p]; hi[p] = hi[k]; hi[k] = ti
                k = p
    while size > 0:
        cv = hv[0]
        ci = hi[0]
        size -= 1
        hv[0] = hv[size]
        hi[0] = hi[size]
        k = 0
        while True:
            l = 2 * k + 1
            if l >= size:
                break
            r = l + 1
            m = l
            if r < size and hv[r] < hv[l]:
                m = r
            if hv[k] <= hv[m]:
                break
            tv = hv[m]; hv[m] = hv[k]; hv[k] = tv
            ti = hi[m]; hi[m] = hi[k]; hi[k] = ti
            k = m
        cy = ci // w
        cx = ci - cy * w
        for d in range(8):
            ny = cy + DY8[d]
            nx = cx + DX8[d]
            if ny < 0 or ny >= h or nx < 0 or nx >= w:
                continue
            j = ny * w + nx
            if closed[j]:
                continue
            closed[j] = True
            if out[j] <= cv + eps:
                out[j] = cv + eps
            k = size
            hv[k] = out[j]
            hi[k] = j
            size += 1
            while k > 0:
                p = (k - 1) // 2
                if hv[p] <= hv[k]:
                    break
                tv = hv[p]; hv[p] = hv[k]; hv[k] = tv
                ti = hi[p]; hi[p] = hi[k]; hi[k] = ti
                k = p
    return out.reshape((h, w))


@njit(cache=True)
def d8_receivers(f, sinks, dist_ns, dist_ew_rows):
    """Receptor D8 por maxima pendiente sobre el DEM condicionado."""
    h, w = f.shape
    rec = np.full(h * w, -1, dtype=np.int64)
    for y in range(h):
        dew = dist_ew_rows[y]
        ddiag = math.sqrt(dew * dew + dist_ns * dist_ns)
        for x in range(w):
            i = y * w + x
            if sinks[y, x]:
                continue
            zc = f[y, x]
            best = 0.0
            bj = -1
            for d in range(8):
                ny = y + DY8[d]
                nx = x + DX8[d]
                if ny < 0 or ny >= h or nx < 0 or nx >= w:
                    continue
                if DY8[d] == 0:
                    dd = dew
                elif DX8[d] == 0:
                    dd = dist_ns
                else:
                    dd = ddiag
                s = (zc - f[ny, nx]) / dd
                if s > best:
                    best = s
                    bj = ny * w + nx
            rec[i] = bj
    return rec


@njit(cache=True)
def accumulate(order, rec, area):
    acc = area.copy()
    for k in range(order.shape[0]):
        i = order[k]
        r = rec[i]
        if r >= 0:
            acc[r] += acc[i]
    return acc


@njit(cache=True)
def strahler(order, rec, stream):
    n = rec.shape[0]
    nup = np.zeros(n, dtype=np.int32)
    for i in range(n):
        if stream[i]:
            r = rec[i]
            if r >= 0 and stream[r]:
                nup[r] += 1
    maxo = np.zeros(n, dtype=np.int32)
    cnt = np.zeros(n, dtype=np.int32)
    so = np.zeros(n, dtype=np.int32)
    for k in range(order.shape[0]):
        i = order[k]
        if not stream[i]:
            continue
        if nup[i] == 0:
            o = 1
        else:
            o = maxo[i] + (1 if cnt[i] >= 2 else 0)
        so[i] = o
        r = rec[i]
        if r >= 0 and stream[r]:
            if o > maxo[r]:
                maxo[r] = o
                cnt[r] = 1
            elif o == maxo[r]:
                cnt[r] += 1
    return so, nup


# ----------------------------------------------------------------------------
# Geometria de polilineas
# ----------------------------------------------------------------------------
def douglas_peucker(pts, tol):
    if len(pts) < 3:
        return pts
    pts = np.asarray(pts, dtype=np.float64)
    keep = np.zeros(len(pts), dtype=bool)
    keep[0] = keep[-1] = True
    stack = [(0, len(pts) - 1)]
    while stack:
        a, b = stack.pop()
        if b <= a + 1:
            continue
        pa, pb = pts[a], pts[b]
        seg = pb - pa
        L = np.hypot(seg[0], seg[1])
        mid = pts[a + 1:b]
        if L < 1e-9:
            d = np.hypot(mid[:, 0] - pa[0], mid[:, 1] - pa[1])
        else:
            d = np.abs(seg[0] * (mid[:, 1] - pa[1]) - seg[1] * (mid[:, 0] - pa[0])) / L
        k = int(np.argmax(d))
        if d[k] > tol:
            idx = a + 1 + k
            keep[idx] = True
            stack.append((a, idx))
            stack.append((idx, b))
    return pts[keep]


def chaikin(pts, iters=1):
    pts = np.asarray(pts, dtype=np.float64)
    for _ in range(iters):
        if len(pts) < 3:
            return pts
        q = 0.75 * pts[:-1] + 0.25 * pts[1:]
        r = 0.25 * pts[:-1] + 0.75 * pts[1:]
        mid = np.empty((2 * (len(pts) - 1), 2))
        mid[0::2] = q
        mid[1::2] = r
        pts = np.vstack([pts[:1], mid[1:-1], pts[-1:]])
    return pts


# ----------------------------------------------------------------------------
# Indice de agua observada (imagen satelital alineada al DEM)
# ----------------------------------------------------------------------------
def water_probability(rgb):
    valid = ~np.isnan(rgb[..., 0])
    rgb = np.nan_to_num(rgb, nan=128.0)
    R, G, B = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    br = (R + G + B) / 3.0
    loc = ndi.uniform_filter(br, size=31)
    dark = (loc - br) / (loc + 12.0)                 # contraste de oscuridad local
    blue = (B - R) / (B + R + 1.0)                   # agua profunda/limpia tiende a azul
    p_dark = np.clip((dark - 0.10) / 0.22, 0, 1) * np.clip((150.0 - br) / 70.0, 0, 1)
    p_blue = np.clip((blue - 0.04) / 0.14, 0, 1) * np.clip((140.0 - br) / 70.0, 0, 1)
    p = np.maximum(p_dark, p_blue)
    # Vegetacion riparia (oasis lineales en valles desérticos de la costa peruana)
    green = (G - R) / (G + R + 1.0)
    p_veg = 0.6 * np.clip((green - 0.02) / 0.10, 0, 1) * np.clip((160.0 - br) / 60.0, 0, 1)
    p = np.maximum(p, p_veg)
    p = ndi.median_filter(p, size=3)
    p[~valid] = 0.0
    return p.astype(np.float32)


# ----------------------------------------------------------------------------
# Pipeline principal
# ----------------------------------------------------------------------------
MAX_TILES = {"standard": 16, "high": 36, "ultra": 64}


def choose_zoom(south, north, west, east, res):
    max_tiles = MAX_TILES.get(res, 36)
    if not HAS_NUMBA:
        max_tiles = max(9, max_tiles // 4)
    for z in range(12, 5, -1):
        x0, x1 = int(lon2tile_x(west, z)), int(lon2tile_x(east, z))
        y0, y1 = int(lat2tile_y(north, z)), int(lat2tile_y(south, z))
        if (x1 - x0 + 1) * (y1 - y0 + 1) <= max_tiles:
            return z, x0, x1, y0, y1
    z = 6
    return z, int(lon2tile_x(west, z)), int(lon2tile_x(east, z)), int(lat2tile_y(north, z)), int(lat2tile_y(south, z))


def extract_rivers(south, north, west, east, res="high", sens=1.0, burn=True, burn_depth=10.0):
    t0 = time.perf_counter()
    timings = {}

    south, north = max(-85.0, min(south, north)), min(85.0, max(south, north))
    z, x0, x1, y0, y1 = choose_zoom(south, north, west, east, res)

    dem_rgb = _mosaic("dem", z, x0, x1, y0, y1)
    img_rgb = None
    img_zoom = None
    if burn:
        # Imagen a z+1 (doble resolucion) para captar cauces delgados; luego max-pooling 2x2
        if z >= 10:
            img_zoom = z + 1
            hi = _mosaic("img", img_zoom, 2 * x0, 2 * x1 + 1, 2 * y0, 2 * y1 + 1)
        else:
            img_zoom = z
            hi = _mosaic("img", z, x0, x1, y0, y1)
        img_rgb = hi
    timings["download_ms"] = int((time.perf_counter() - t0) * 1000)

    h, w = dem_rgb.shape[:2]
    nodata = np.isnan(dem_rgb[..., 0])
    dem_rgb = np.nan_to_num(dem_rgb, nan=0.0)
    Z = dem_rgb[..., 0] * 256.0 + dem_rgb[..., 1] + dem_rgb[..., 2] / 256.0 - 32768.0
    Z = Z.astype(np.float64)
    Z[nodata] = 0.0

    # Geometria por fila (metros por pixel en Mercator)
    rows = np.arange(h)
    lat_rows = np.array([tile_y2lat(y0 + (r + 0.5) / 256.0, z) for r in rows])
    mpp_rows = 156543.03392 * np.cos(np.radians(lat_rows)) / (2 ** z)
    cell_area_km2 = np.repeat((mpp_rows ** 2 / 1e6)[:, None], w, axis=1)
    dist_ns = float(np.mean(mpp_rows))

    # 2. Suavizado adaptativo: fuerte en planicies (elimina terrazas de 1 m del DEM
    #    que generan lineas rectas artificiales), leve en relieve montanoso.
    relief_raw = ndi.maximum_filter(Z, size=9) - ndi.minimum_filter(Z, size=9)
    flat_w = np.clip((25.0 - relief_raw) / 20.0, 0.0, 1.0)
    Zs = flat_w * ndi.gaussian_filter(Z, sigma=3.0) + (1.0 - flat_w) * ndi.gaussian_filter(Z, sigma=0.8)

    ocean = (Z <= 0.0) | nodata

    # 3. Indice de agua + stream burning
    wp = np.zeros_like(Zs, dtype=np.float32)
    lakes = np.zeros_like(ocean)
    if burn and img_rgb is not None:
        wp_hi = water_probability(img_rgb)
        if img_zoom == z + 1:
            hh, ww = wp_hi.shape
            wp = wp_hi[: hh // 2 * 2, : ww // 2 * 2].reshape(hh // 2, 2, ww // 2, 2).max(axis=(1, 3))
        else:
            wp = wp_hi
        wp = wp[:h, :w]
        # 4. Lagos: agua + planicie + componente grande (>= ~1.5 km2)
        relief = ndi.maximum_filter(Zs, size=7) - ndi.minimum_filter(Zs, size=7)
        lake_cand = (wp > 0.55) & (relief < 4.0) & ~ocean
        lake_cand = ndi.binary_opening(lake_cand, iterations=2)
        lab, nlab = ndi.label(lake_cand)
        if nlab > 0:
            sizes = ndi.sum(cell_area_km2, lab, index=np.arange(1, nlab + 1))
            big = np.zeros(nlab + 1, dtype=bool)
            big[1:] = sizes >= 1.5
            lakes = big[lab]
        Zc = Zs - burn_depth * wp * (0.5 + flat_w)
    else:
        Zc = Zs
    timings["prep_ms"] = int((time.perf_counter() - t0) * 1000)

    # 5. Priority-Flood + epsilon
    seeds = ocean | lakes
    seeds[0, :] = seeds[-1, :] = True
    seeds[:, 0] = seeds[:, -1] = True
    F = priority_flood_eps(Zc, seeds, 1e-4)

    # 6. D8
    sinks = ocean | lakes
    rec = d8_receivers(F, sinks, dist_ns, mpp_rows.astype(np.float64))

    # 7. Acumulacion (km2)
    order = np.argsort(-F.ravel(), kind="stable").astype(np.int64)
    acc = accumulate(order, rec, cell_area_km2.ravel().astype(np.float64))
    timings["hydro_ms"] = int((time.perf_counter() - t0) * 1000)

    # 8. Umbral de area de contribucion (auto segun extension de la vista)
    land = ~(ocean | lakes)
    total_km2 = float(cell_area_km2[land].sum())
    a_min = float(np.clip(total_km2 / 1200.0, 0.5, 400.0)) / max(0.2, sens)
    land_flat = land.ravel()
    for _ in range(6):
        stream = (acc >= a_min) & land_flat
        if int(stream.sum()) <= 120000:
            break
        a_min *= 1.8

    so, nup = strahler(order, rec, stream)

    # 9. Segmentacion por tramos
    stream_idx = np.nonzero(stream)[0]
    starts = stream_idx[nup[stream_idx] != 1]
    wp_flat = wp.ravel()
    z_flat = Z.ravel()

    def px_to_ll(pts):
        # pts: array (k,2) en (col,row) pixel-center
        lons = tile_x2lon_arr(x0 + (pts[:, 0] + 0.5) / 256.0, z)
        lats = tile_y2lat_arr(y0 + (pts[:, 1] + 0.5) / 256.0, z)
        return np.column_stack([lats, lons])

    links = []
    max_order = int(so.max()) if stream_idx.size else 0
    for s in starts:
        path = [int(s)]
        c = int(rec[s])
        while c >= 0:
            path.append(c)
            if not stream[c] or nup[c] != 1:
                break
            c = int(rec[c])
        if len(path) < 3:
            continue
        p = np.array(path, dtype=np.int64)
        core = p[:-1] if not stream[p[-1]] else p
        rr, cc = np.divmod(p, w)
        pix = np.column_stack([cc, rr]).astype(np.float64)
        pix = douglas_peucker(pix, 0.7)
        pix = chaikin(pix, 2)
        ll = px_to_ll(pix)
        links.append({
            "coords": np.round(ll, 5).tolist(),
            "order": int(so[s]),
            "areaKm2": round(float(acc[core[-1]]), 2),
            "water": round(float(wp_flat[core].mean()), 3),
            "elev": round(float(z_flat[core].mean()), 0),
        })

    # Filtro de legibilidad: si hay demasiados tramos, descartar ordenes bajos
    min_order = 1
    while len(links) > 3500 and min_order < max_order:
        min_order += 1
        links = [l for l in links if l["order"] >= min_order]

    timings["total_ms"] = int((time.perf_counter() - t0) * 1000)

    return {
        "status": "ok",
        "engine": "Priority-Flood+eps / D8 / Strahler (numba)" if HAS_NUMBA else "Priority-Flood+eps / D8 (python)",
        "bounds": {
            "south": tile_y2lat(y1 + 1, z), "north": tile_y2lat(y0, z),
            "west": tile_x2lon(x0, z), "east": tile_x2lon(x1 + 1, z),
        },
        "metrics": {
            "demZoom": z,
            "pixelMeters": round(dist_ns, 1),
            "gridW": int(w), "gridH": int(h), "totalNodes": int(w * h),
            "areaThresholdKm2": round(a_min, 2),
            "maxStrahler": max_order,
            "minOrderShown": min_order,
            "links": len(links),
            "lakePixels": int(lakes.sum()),
            "burn": bool(burn),
            **timings,
        },
        "polylines": links,
    }


def tile_x2lon_arr(x, z):
    return x / (2 ** z) * 360.0 - 180.0


def tile_y2lat_arr(y, z):
    n = np.pi - 2.0 * np.pi * y / (2 ** z)
    return np.degrees(np.arctan(np.sinh(n)))


# ----------------------------------------------------------------------------
# Servidor HTTP
# ----------------------------------------------------------------------------
class Handler(BaseHTTPRequestHandler):
    def _headers(self, status=200):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_OPTIONS(self):
        self._headers(200)

    def do_GET(self):
        u = urlparse(self.path)
        if u.path == "/health":
            self._headers(200)
            self.wfile.write(json.dumps({"status": "online", "numba": HAS_NUMBA, "port": PORT}).encode())
            return
        if u.path == "/api/compute-rivers":
            q = parse_qs(u.query)
            g = lambda k, d: q.get(k, [d])[0]
            try:
                result = extract_rivers(
                    float(g("south", -16.8)), float(g("north", -15.2)),
                    float(g("west", -73.2)), float(g("east", -71.2)),
                    res=g("res", "high"),
                    sens=float(g("sens", 1.0)),
                    burn=g("burn", "1") not in ("0", "false"),
                )
                self._headers(200)
                self.wfile.write(json.dumps(result).encode())
            except Exception as exc:
                import traceback
                traceback.print_exc()
                self._headers(500)
                self.wfile.write(json.dumps({"status": "error", "message": str(exc)}).encode())
            return
        self._headers(404)
        self.wfile.write(b'{"error":"not found"}')

    def log_message(self, fmt, *args):
        pass


if __name__ == "__main__":
    print(f"[SPACE SOCIETY] Hydro v2 en http://localhost:{PORT}  (numba={HAS_NUMBA})")
    # Precompilar nucleos numba con un DEM minimo
    _z = np.random.rand(8, 8)
    _s = np.zeros((8, 8), dtype=np.bool_)
    _s[0, :] = True
    _f = priority_flood_eps(_z, _s, 1e-4)
    _r = d8_receivers(_f, _s, 30.0, np.full(8, 30.0))
    _o = np.argsort(-_f.ravel()).astype(np.int64)
    accumulate(_o, _r, np.ones(64))
    strahler(_o, _r, np.ones(64, dtype=np.bool_))
    ThreadingHTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
