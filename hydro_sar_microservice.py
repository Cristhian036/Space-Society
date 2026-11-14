#!/usr/bin/env python3
"""
SPACE SOCIETY — Microservicio Matemático HydroSAR + D8 + Profundidad DEM + Otsu
================================================================================
Servidor HTTP en puerto 8050 (con CORS habilitado) que extrae redes de ríos,
quebradas y zonas de desborde 100% mediante cálculo matemático desde cero
(ab-initio), sin utilizar shapefiles ni coordenadas preexistentes de ríos.

Algoritmos implementados:
1. Ingesta y caché local de matrices de elevación/profundidad AWS Terrarium (SRTM/NASADEM).
2. Decodificación matricial en punto flotante: Z(x,y) = (R*256 + G + B/256) - 32768.
3. Cálculo de Profundidad de Incisión de Cañón/Valle (Valley Depth / HAND proxy) y Pendiente (nabla Z).
4. Enrutamiento Gravitacional D8 (O'Callaghan & Mark, 1984) con ordenamiento topológico de cumbres a mar.
5. Índice Compuesto HydroSAR + TWI y Umbralización Bimodal Automática de Otsu (1979).
6. Trazado Vectorial de Líneas de Corriente (D8 Streamline Vectorization) -> GeoJSON Polylines.
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

PORT = 8050
CACHE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".dem_cache")
os.makedirs(CACHE_DIR, exist_ok=True)


def lon2tile_x(lon: float, zoom: int) -> float:
    return ((lon + 180.0) / 360.0) * (2 ** zoom)


def lat2tile_y(lat: float, zoom: int) -> float:
    rad = math.radians(lat)
    return ((1.0 - math.log(math.tan(rad) + (1.0 / math.cos(rad))) / math.pi) / 2.0) * (2 ** zoom)


def tile_x2lon(x: float, zoom: int) -> float:
    return (x / (2 ** zoom)) * 360.0 - 180.0


def tile_y2lat(y: float, zoom: int) -> float:
    n = math.pi - (2.0 * math.pi * y) / (2 ** zoom)
    return math.degrees(math.atan(0.5 * (math.exp(n) - math.exp(-n))))


def fetch_terrarium_tile(z: int, x: int, y: int):
    """Descarga o lee desde caché local un tile de elevación Terrarium (256x256 PNG)."""
    cache_path = os.path.join(CACHE_DIR, f"terrarium_{z}_{x}_{y}.png")
    if not os.path.exists(cache_path):
        url = f"https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "SpaceSociety-HydroSAR/2.0"})
            with urllib.request.urlopen(req, timeout=8) as resp:
                data = resp.read()
            with open(cache_path, "wb") as f:
                f.write(data)
        except Exception:
            return None

    try:
        with Image.open(cache_path) as img:
            return np.array(img.convert("RGB"), dtype=np.float32)
    except Exception:
        return None


def compute_otsu_threshold(values: np.ndarray) -> float:
    """Calcula el umbral óptimo bimodal mediante el método de Otsu (1979)."""
    valid = values[values > 1.5]
    if valid.size < 50:
        return float(np.percentile(values, 85)) if values.size > 0 else 5.0

    v_min = float(valid.min())
    v_max = float(valid.max())
    if v_max - v_min < 1e-5:
        return v_min

    hist, bin_edges = np.histogram(valid, bins=256, range=(v_min, v_max))
    hist = hist.astype(np.float64)
    total = valid.size

    sum_total = np.dot(np.arange(256), hist)
    sum_b = 0.0
    w_b = 0.0
    var_max = 0.0
    best_bin = 128

    for t in range(256):
        w_b += hist[t]
        if w_b == 0:
            continue
        w_f = total - w_b
        if w_f == 0:
            break
        sum_b += t * hist[t]
        m_b = sum_b / w_b
        m_f = (sum_total - sum_b) / w_f
        var_between = w_b * w_f * ((m_b - m_f) ** 2)
        if var_between > var_max:
            var_max = var_between
            best_bin = t

    return float(v_min + (best_bin / 255.0) * (v_max - v_min))


def run_ab_initio_hydro_sar(
    south: float,
    north: float,
    west: float,
    east: float,
    res_mode: str = "high",
    sensitivity: float = 1.1,
    flood_intensity: float = 0.8,
):
    """
    Ejecuta el pipeline matemático completo:
    1. Ensamblado de matriz DEM Z(x,y)
    2. Cálculo de Profundidad de Incisión del Valle (Valley Depth / HAND) y Pendiente (nabla Z)
    3. Enrutamiento Gravitacional D8 (O'Callaghan & Mark)
    4. Umbralización de Otsu (1979)
    5. Vectorización de líneas de corriente continuas (Streamline Tracing) y llanuras de desborde
    """
    t0 = time.perf_counter()

    # Clamping a límites de Perú
    south = max(-18.4, min(-0.05, south))
    north = max(-18.3, min(-0.02, north))
    west = max(-81.4, min(-68.5, west))
    east = max(-81.3, min(-68.4, east))

    lat_span = max(0.15, abs(north - south))
    if lat_span > 8.0:
        dem_zoom = 7
    elif lat_span > 3.5:
        dem_zoom = 8
    elif lat_span > 1.6:
        dem_zoom = 9
    else:
        dem_zoom = 10

    x_min = int(math.floor(lon2tile_x(west, dem_zoom)))
    x_max = int(math.floor(lon2tile_x(east, dem_zoom)))
    y_min = int(math.floor(lat2tile_y(north, dem_zoom)))
    y_max = int(math.floor(lat2tile_y(south, dem_zoom)))

    # Limitar grilla de tiles a máximo 5x5 para respuesta rápida
    x_max = min(x_min + 4, x_max)
    y_max = min(y_min + 4, y_max)
    tiles_w = x_max - x_min + 1
    tiles_h = y_max - y_min + 1

    coords = [(ty, tx) for ty in range(y_min, y_max + 1) for tx in range(x_min, x_max + 1)]
    full_rgb = np.zeros((tiles_h * 256, tiles_w * 256, 3), dtype=np.float32)

    with ThreadPoolExecutor(max_workers=12) as pool:
        futures = {pool.submit(fetch_terrarium_tile, dem_zoom, tx, ty): (ty, tx) for ty, tx in coords}
        for fut in futures:
            ty, tx = futures[fut]
            arr = fut.result()
            if arr is not None:
                r0 = (ty - y_min) * 256
                c0 = (tx - x_min) * 256
                full_rgb[r0 : r0 + 256, c0 : c0 + 256, :] = arr

    # Redimensionar a la malla objetivo de cálculo vectorial
    target_dim = 420 if res_mode == "ultra" else (320 if res_mode == "high" else 240)
    aspect = tiles_w / max(1, tiles_h)
    grid_w = target_dim if aspect >= 1.0 else max(120, int(round(target_dim * aspect)))
    grid_h = max(120, int(round(target_dim / aspect))) if aspect >= 1.0 else target_dim

    # Submuestreo matricial rápido en numpy
    y_indices = np.linspace(0, full_rgb.shape[0] - 1, grid_h).astype(np.int32)
    x_indices = np.linspace(0, full_rgb.shape[1] - 1, grid_w).astype(np.int32)
    sampled_rgb = full_rgb[np.ix_(y_indices, x_indices)]

    # 1. Decodificación de Altitud / Profundidad Z(x,y) en metros
    Z = (sampled_rgb[:, :, 0] * 256.0 + sampled_rgb[:, :, 1] + sampled_rgb[:, :, 2] / 256.0) - 32768.0
    land_mask = Z > 1.5

    # 2. Profundidad de Incisión del Valle (Valley Depth / HAND proxy) y Pendiente (Sobel / Diferencias Finitas)
    rad = max(3, int(round(grid_w / 75)))
    z_pad = np.pad(Z, rad, mode="edge")
    H, W = Z.shape

    surround = (
        z_pad[0:H, rad : rad + W]
        + z_pad[2 * rad : 2 * rad + H, rad : rad + W]
        + z_pad[rad : rad + H, 0:W]
        + z_pad[rad : rad + H, 2 * rad : 2 * rad + W]
        + z_pad[0:H, 0:W]
        + z_pad[0:H, 2 * rad : 2 * rad + W]
        + z_pad[2 * rad : 2 * rad + H, 0:W]
        + z_pad[2 * rad : 2 * rad + H, 2 * rad : 2 * rad + W]
    ) * 0.125

    valley_depth = np.maximum(0.0, surround - Z) * land_mask

    dz_dy, dz_dx = np.gradient(Z)
    slope = np.hypot(dz_dx, dz_dy)

    # 3. Acondicionamiento Hidrológico y Enrutamiento Gravitacional D8 (O'Callaghan & Mark, 1984)
    Z_hydro = Z - valley_depth * 0.68
    flat_Z = Z_hydro.ravel()
    flat_land = land_mask.ravel()
    N = flat_Z.size

    # Ordenar índices de tierra firme de mayor cota a menor cota
    land_indices = np.nonzero(flat_land)[0]
    sorted_order = land_indices[np.argsort(-flat_Z[land_indices])]

    # Peso inicial de escorrentía pluvial andina
    flow_accum = np.where(Z > 2200.0, 2.5, np.where(Z > 1000.0, 1.5, 1.0)).astype(np.float32).ravel() * flat_land
    downstream_ptr = np.full(N, -1, dtype=np.int32)

    # Offsets D8 precalculados
    d8_offsets = np.array([-W - 1, -W, -W + 1, -1, 1, W - 1, W, W + 1], dtype=np.int32)
    d8_weights = np.array([0.7071, 1.0, 0.7071, 1.0, 1.0, 0.7071, 1.0, 0.7071], dtype=np.float32)

    # Propagar caudal D8 desde la cordillera hasta el océano
    for idx in sorted_order:
        y = idx // W
        x = idx - y * W
        if y <= 1 or y >= H - 2 or x <= 1 or x >= W - 2:
            continue

        z_curr = flat_Z[idx]
        best_n = -1
        max_drop = 0.0

        for d in range(8):
            n_idx = idx + int(d8_offsets[d])
            drop = (z_curr - flat_Z[n_idx]) * float(d8_weights[d])
            if drop > max_drop:
                max_drop = drop
                best_n = n_idx

        if best_n != -1:
            downstream_ptr[idx] = best_n
            flow_accum[best_n] += flow_accum[idx]

    # 4. Puntaje Compuesto HydroSAR + TWI y Umbral Bimodal de Otsu
    flow_2d = flow_accum.reshape((H, W))
    log_flow = np.log1p(flow_2d)
    depth_boost = np.log1p(valley_depth * 0.5)
    floodplain_factor = np.where((Z < 650.0) & (slope < 6.5), 1.35, 1.0)
    hydro_score = (log_flow * 1.48 + depth_boost * 0.85) * floodplain_factor * land_mask

    otsu_val = compute_otsu_threshold(hydro_score)
    flood_mult = 0.85 + flood_intensity * 0.35
    stream_thresh = (otsu_val * 1.42) / max(0.5, sensitivity * flood_mult)
    main_thresh = stream_thresh * 1.35

    # Coordenadas geográficas de la matriz
    grid_north = tile_y2lat(y_min, dem_zoom)
    grid_south = tile_y2lat(y_max + 1, dem_zoom)
    grid_west = tile_x2lon(x_min, dem_zoom)
    grid_east = tile_x2lon(x_max + 1, dem_zoom)

    def idx_to_latlon(cell_idx: int):
        cy = cell_idx // W
        cx = cell_idx - cy * W
        lat = grid_north - (cy / float(H)) * (grid_north - grid_south)
        lon = grid_west + (cx / float(W)) * (grid_east - grid_west)
        return [round(lat, 5), round(lon, 5)]

    # 5. Vectorización Matemática D8: Trazar polilíneas continuas siguiendo los punteros gravitacionales D8
    flat_score = hydro_score.ravel()
    flat_depth = valley_depth.ravel()
    flat_elev = Z.ravel()
    flat_slope = slope.ravel()

    stream_candidates = np.nonzero(flat_score >= stream_thresh)[0]
    # Ordenar candidatos de mayor acumulación/puntaje a menor para trazar los troncos principales primero
    stream_candidates = stream_candidates[np.argsort(-flat_score[stream_candidates])]

    visited = np.zeros(N, dtype=bool)
    polylines = []
    overflow_zones = []

    # También ordenar de menor acumulación dentro del umbral hacia aguas abajo para lograr trazos largos
    channel_heads = stream_candidates[::-1]

    for start_idx in channel_heads:
        if visited[start_idx]:
            continue

        coords_list = []
        curr = int(start_idx)
        max_flow_in_seg = 0.0
        sum_depth = 0.0
        steps = 0

        while curr != -1 and steps < 400:
            if flat_score[curr] < stream_thresh * 0.82:
                break
            coords_list.append(idx_to_latlon(curr))
            flat_flow = float(flow_accum[curr])
            if flat_flow > max_flow_in_seg:
                max_flow_in_seg = flat_flow
            sum_depth += float(flat_depth[curr])
            steps += 1

            # Detectar punto crítico de desborde matemático si la pendiente es baja y el caudal es alto
            if (
                steps % 6 == 0
                and flood_intensity >= 0.4
                and flat_flow > 180.0
                and flat_slope[curr] < 8.5
                and flat_elev[curr] < 2400.0
                and len(overflow_zones) < 40
            ):
                lat_lon = idx_to_latlon(curr)
                overflow_zones.append(
                    {
                        "coords": lat_lon,
                        "elev": round(float(flat_elev[curr]), 1),
                        "valleyDepth": round(float(flat_depth[curr]), 1),
                        "slope": round(float(flat_slope[curr]), 2),
                        "flowCells": int(round(flat_flow)),
                        "sarDb": round(-(15.2 + min(6.5, math.log1p(flat_flow) * 0.65)), 1),
                    }
                )

            if visited[curr]:
                break
            visited[curr] = True
            curr = int(downstream_ptr[curr])

        if len(coords_list) >= 4:
            mean_depth = sum_depth / len(coords_list)
            is_main = max_flow_in_seg >= 140.0 or (flat_score[start_idx] >= main_thresh)
            est_db = round(-(14.2 + min(7.8, math.log1p(max_flow_in_seg) * 0.58)), 1)
            polylines.append(
                {
                    "coords": coords_list,
                    "isMainStem": bool(is_main),
                    "maxFlowCells": int(round(max_flow_in_seg)),
                    "meanDepthMeters": round(mean_depth, 1),
                    "estimatedSarDb": est_db,
                }
            )
            if len(polylines) >= 450:
                break

    elapsed_ms = int(round((time.perf_counter() - t0) * 1000))

    return {
        "status": "ok",
        "engine": "Python NumPy HydroSAR + D8 + ValleyDepth + Otsu",
        "bounds": {"south": grid_south, "north": grid_north, "west": grid_west, "east": grid_east},
        "metrics": {
            "elapsedMs": elapsed_ms,
            "gridW": int(W),
            "gridH": int(H),
            "totalNodes": int(N),
            "otsuThreshold": round(otsu_val, 3),
            "extractedPolylines": len(polylines),
            "overflowZonesCount": len(overflow_zones),
            "maxValleyDepthMeters": round(float(valley_depth.max()), 1),
            "maxElevationMeters": round(float(Z.max()), 1),
        },
        "polylines": polylines,
        "overflowZones": overflow_zones,
    }


class HydroSarHandler(BaseHTTPRequestHandler):
    def _send_cors_headers(self, status=200, content_type="application/json"):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_OPTIONS(self):
        self._send_cors_headers(200)

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/health":
            self._send_cors_headers(200)
            self.wfile.write(
                json.dumps(
                    {
                        "status": "online",
                        "service": "Space Society Python HydroSAR Mathematical Engine",
                        "port": PORT,
                    }
                ).encode("utf-8")
            )
            return

        if parsed.path == "/api/compute-rivers":
            qs = parse_qs(parsed.query)
            try:
                south = float(qs.get("south", [-16.8])[0])
                north = float(qs.get("north", [-15.2])[0])
                west = float(qs.get("west", [-73.2])[0])
                east = float(qs.get("east", [-71.2])[0])
                res_mode = qs.get("res", ["high"])[0]
                sensitivity = float(qs.get("sens", [1.1])[0])
                flood_intensity = float(qs.get("flood", [0.85])[0])

                result = run_ab_initio_hydro_sar(
                    south=south,
                    north=north,
                    west=west,
                    east=east,
                    res_mode=res_mode,
                    sensitivity=sensitivity,
                    flood_intensity=flood_intensity,
                )
                self._send_cors_headers(200)
                self.wfile.write(json.dumps(result).encode("utf-8"))
            except Exception as exc:
                self._send_cors_headers(500)
                self.wfile.write(json.dumps({"status": "error", "message": str(exc)}).encode("utf-8"))
            return

        self._send_cors_headers(404)
        self.wfile.write(json.dumps({"error": "Not found"}).encode("utf-8"))

    def log_message(self, format, *args):
        # Silenciar logs repetitivos por consola
        pass


if __name__ == "__main__":
    print(f"[SPACE SOCIETY] Microservicio Python HydroSAR + D8 + Otsu activo en http://localhost:{PORT}")
    server = ThreadingHTTPServer(("0.0.0.0", PORT), HydroSarHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
