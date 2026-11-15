"""Cauces detectados en la imagen NISAR GCOV (malla nativa de 20 m).

El detector no usa un umbral absoluto de dB. Trabaja sobre la respuesta
top-hat morfológica, que realza estructuras estrechas (cauces, pistas,
líneas de vegetación ribereña) frente al fondo, en los dos signos:

- `white top-hat` (imagen menos apertura): cauces claros, corredor ripario,
  sedimento. En Banda L la vegetación densa sobre el agua produce
  retrodispersión alta y doble rebote.
- `black top-hat` (cierre menos imagen): agua abierta y sombra de espejo,
  que en L-Band es muy oscura.

Sobre esa respuesta se aplica un filtro de forma: un cauce es una franja
delgada y continua (largo/estrecho); una sombra de ladera o un edificio es
una mancha. Se conservan solo los componentes alargados y se extrae su
esqueleto como geometría vectorial.

Salidas: GeoJSON de cauces, PNG de la imagen SAR para el visor y manifiesto.
"""
import argparse
import json
import warnings
from pathlib import Path

import numpy as np
import rasterio
from rasterio.warp import Resampling, calculate_default_transform, reproject, transform_bounds
from rasterio.transform import array_bounds
from scipy import ndimage as ndi
from skimage.morphology import skeletonize

from gcov_water import read_raster

DEFAULT_SCALE_M = 400.0
DEFAULT_K_BRIGHT = 2.5
DEFAULT_K_DARK = 2.5
DEFAULT_MIN_LENGTH_M = 500.0
DEFAULT_MAX_WIDTH_M = 200.0
DEFAULT_MIN_AREA_M2 = 6000.0


def _block_median(a, block):
    h, w = a.shape
    hb, wb = (h // block) * block, (w // block) * block
    if hb == 0 or wb == 0:
        return np.full((max(h // block, 1), max(w // block, 1)), np.nan)
    b = a[:hb, :wb].reshape(hb // block, block, wb // block, block)
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        return np.nanmedian(b, axis=(1, 3))


def _upsample(coarse, block, shape):
    up = ndi.zoom(coarse, block, order=1)
    pad = np.full(shape, np.nan)
    h, w = min(shape[0], up.shape[0]), min(shape[1], up.shape[1])
    pad[:h, :w] = up[:h, :w]
    if h < shape[0]:
        pad[h:, :] = pad[h - 1, :]
    if w < shape[1]:
        pad[:, w:] = pad[:, w - 1:w]
    return pad


def local_background(db, block=10, scale_blocks=5):
    """Fondo local robusto: mediana por bloques, escala = MAD local."""
    bg = _upsample(_block_median(db, block), block, db.shape)
    bg = ndi.uniform_filter(np.nan_to_num(bg, nan=float(np.nanmedian(bg))),
                            size=scale_blocks * block, mode="nearest")
    mad = _upsample(_block_median(np.abs(db - bg), block), block, db.shape)
    return bg, mad


def robust_z(response):
    """Estandariza una respuesta con su propia mediana y MAD."""
    vals = response[np.isfinite(response)]
    if vals.size == 0:
        return np.full(response.shape, np.nan)
    med = float(np.median(vals))
    mad = 1.4826 * float(np.median(np.abs(vals - med)))
    z = (response - med) / max(mad, 0.15)
    z[~np.isfinite(response)] = np.nan
    return z


def tophat_response(db, size_px):
    """Respuesta top-hat: realza estructuras más estrechas que `size_px`."""
    bright = db - ndi.grey_opening(db, size=size_px)
    dark = ndi.grey_closing(db, size=size_px) - db
    return bright, dark


def detect_channels(db, size_px, k_bright, k_dark):
    """Máscara de cauces: estructuras lineales claras u oscuras."""
    bright, dark = tophat_response(db, size_px)
    zb = robust_z(bright)
    zd = robust_z(dark)
    mask_bright = np.isfinite(zb) & (zb >= k_bright)
    mask_dark = np.isfinite(zd) & (zd >= k_dark)
    return {"brillo": mask_bright, "oscuro": mask_dark}, {"brillo": zb, "oscuro": zd}


def component_shape(label_image, values, pixel_m):
    out = {}
    for lab in np.unique(label_image):
        if lab == 0:
            continue
        comp = label_image == lab
        ys, xs = np.nonzero(comp)
        area_px = float(len(ys))
        skel_px = float(skeletonize(comp).sum())
        length_m = skel_px * pixel_m
        width_m = (area_px * pixel_m * pixel_m / length_m) if length_m > 0 else np.inf
        pts = np.column_stack([xs, ys]).astype(float)
        centre = pts.mean(axis=0)
        cov = np.cov((pts - centre).T)
        eig = np.linalg.eigvalsh(cov)[::-1] if cov.ndim else np.array([0.0, 0.0])
        elongation = float(np.sqrt(float(eig[0]) / max(float(eig[1]), 1e-6)))
        dB = float(np.nanmedian(values[ys, xs]))
        out[int(lab)] = {"area_px": area_px, "length_m": length_m, "width_m": width_m,
                         "elongation": elongation, "db": dB}
    return out


def _chains(skel):
    """Cadenas de píxeles esqueléticos (grafo de 8 vecinos)."""
    ys, xs = np.nonzero(skel)
    adj = {(int(x), int(y)): (int(x), int(y)) for x, y in zip(xs, ys)}
    visited = set()
    chains = []
    for start in adj:
        if start in visited:
            continue
        stack = [start]
        visited.add(start)
        chain = [start]
        while stack:
            cx, cy = stack.pop()
            for dx in (-1, 0, 1):
                for dy in (-1, 0, 1):
                    if dx == 0 and dy == 0:
                        continue
                    nb = (cx + dx, cy + dy)
                    if nb in adj and nb not in visited:
                        visited.add(nb)
                        stack.append(nb)
                        chain.append(nb)
        chains.append(chain)
    return chains


def extract_lines(mask, values, pixel_m, min_length_m, max_width_m, min_area_m2):
    """Cauces como líneas: esqueleto de componentes alargados."""
    labels, n = ndi.label(mask, structure=np.ones((3, 3)))
    if not n:
        return [], [], np.zeros_like(mask)
    shapes = component_shape(labels, values, pixel_m)
    keep = []
    for lab, s in shapes.items():
        if s["area_px"] * pixel_m * pixel_m < min_area_m2:
            continue
        if s["length_m"] < min_length_m:
            continue
        if s["width_m"] > max_width_m:
            continue
        if s["elongation"] < 2.0:
            continue
        keep.append(lab)
    lines, stats = [], []
    kept_mask = np.zeros_like(mask)
    for lab in keep:
        comp = labels == lab
        kept_mask |= comp
        for chain in _chains(skeletonize(comp)):
            if len(chain) < 3:
                continue
            px = np.array([[c[0], c[1]] for c in chain], dtype=float)
            lines.append(px)
            stats.append({**shapes[lab], "points": len(chain)})
    return lines, stats, kept_mask


def to_geographic(pixels, transform, crs):
    xs = transform.c + transform.a * (pixels[:, 0] + 0.5)
    ys = transform.f + transform.e * (pixels[:, 1] + 0.5)
    lons, lats = rasterio.warp.transform(crs, "EPSG:4326", list(xs), list(ys))
    return list(zip(lons, lats))


def web_mercator_grid(shape, transform, crs):
    bounds = array_bounds(*shape, transform)
    wt, width, height = calculate_default_transform(crs, "EPSG:3857", shape[1], shape[0], *bounds)
    west, south, east, north = transform_bounds("EPSG:3857", "EPSG:4326", *array_bounds(height, width, wt))
    return wt, width, height, [[south, west], [north, east]]


def write_sar_png(path, db, transform, crs):
    """Imagen SAR monocroma en Web Mercator para el visor."""
    shape = db.shape
    wt, width, height, bounds = web_mercator_grid(shape, transform, crs)
    valid = np.isfinite(db)
    vals = db[valid]
    lo, hi = float(np.percentile(vals, 2)), float(np.percentile(vals, 98))
    scaled = np.zeros(shape, np.uint8)
    scaled[valid] = np.clip((db[valid] - lo) / max(hi - lo, 1e-6) * 255.0, 0, 255).astype(np.uint8)
    scaled[~valid] = 255
    warped = np.full((height, width), 255, dtype=np.uint8)
    reproject(scaled, warped, src_transform=transform, src_crs=crs,
              dst_transform=wt, dst_crs="EPSG:3857", src_nodata=255, dst_nodata=255,
              resampling=Resampling.bilinear)
    rgba = np.zeros((height, width, 4), dtype=np.uint8)
    grey = warped.astype(np.uint16)
    rgba[..., 0] = grey
    rgba[..., 1] = grey
    rgba[..., 2] = np.clip(grey.astype(np.int16) + 14, 0, 255)
    rgba[..., 3] = np.where(warped == 255, 0, 255)
    from PIL import Image
    Image.fromarray(rgba).save(path)
    return bounds, lo, hi


def write_mask_png(path, mask, transform, crs, colors):
    shape = mask.shape
    wt, width, height, bounds = web_mercator_grid(shape, transform, crs)
    warped = np.full((height, width), 255, dtype=np.uint8)
    reproject(mask.astype(np.uint8), warped, src_transform=transform, src_crs=crs,
              dst_transform=wt, dst_crs="EPSG:3857", src_nodata=255, dst_nodata=255,
              resampling=Resampling.nearest)
    rgba = np.zeros((height, width, 4), dtype=np.uint8)
    for value, color in colors.items():
        rgba[warped == value] = color
    from PIL import Image
    Image.fromarray(rgba).save(path)
    return bounds


def run(before_path, after_path, bbox, output, scale_m=DEFAULT_SCALE_M, k_bright=DEFAULT_K_BRIGHT,
        k_dark=DEFAULT_K_DARK, min_length_m=DEFAULT_MIN_LENGTH_M, max_width_m=DEFAULT_MAX_WIDTH_M,
        min_area_m2=DEFAULT_MIN_AREA_M2, polarization="HHHH", mask_values=None):
    output = Path(output)
    output.mkdir(parents=True, exist_ok=True)
    before, transform, crs, meta_before = read_raster(before_path, bbox, polarization, "power", mask_values)
    after, at, ac, meta_after = read_raster(after_path, bbox, polarization, "power", mask_values)
    pixel_m = abs(transform.a)
    size_px = max(int(round(scale_m / pixel_m)), 3) | 1
    min_area_px = max(int(round(min_area_m2 / (pixel_m * pixel_m))), 1)

    per_date = {}
    for label, data in (("before", before), ("after", after)):
        valid = np.isfinite(data)
        sm = ndi.median_filter(np.where(valid, data, np.nan_to_num(data, nan=float(np.nanmedian(data)))), size=3)
        sm[~valid] = np.nan
        masks, responses = detect_channels(sm, size_px, k_bright, k_dark)
        found = {}
        kept = {}
        for kind, mask in masks.items():
            lines, stats, kept_mask = extract_lines(mask, data, pixel_m, min_length_m, max_width_m, min_area_m2)
            found[kind] = {"lines": lines, "stats": stats}
            kept[kind] = kept_mask
        per_date[label] = {"masks": masks, "found": found, "kept": kept, "sm": sm}

    features = []
    for label in ("before", "after"):
        meta = meta_before if label == "before" else meta_after
        for kind, found in per_date[label]["found"].items():
            for line, s in zip(found["lines"], found["stats"]):
                coords = to_geographic(line, transform, crs)
                features.append({
                    "type": "Feature",
                    "geometry": {"type": "LineString",
                                 "coordinates": [[round(x, 6), round(y, 6)] for x, y in coords]},
                    "properties": {
                        "tipo": "corredor_ripario_claro" if kind == "brillo" else "agua_abierta_oscura",
                        "fecha": label,
                        "adquisicion": meta.get("zeroDopplerStartTime", "")[:10],
                        "largo_m": round(s["length_m"], 1),
                        "ancho_m": round(s["width_m"], 1),
                        "elongacion": round(s["elongation"], 2),
                        "db_medio": round(s["db"], 2),
                        "origen": "NISAR L2 GCOV, deteccion top-hat + filtro de forma",
                    },
                })
    (output / "channels.geojson").write_text(
        json.dumps({"type": "FeatureCollection", "features": features}, ensure_ascii=False), encoding="utf-8")

    counts = {}
    for label in ("before", "after"):
        counts[label] = {kind: len(per_date[label]["found"][kind]["lines"])
                         for kind in per_date[label]["found"]}

    # cambio entre fechas: agua candidata presente en una sola adquisición
    mask_b = per_date["before"]["kept"]["brillo"] | per_date["before"]["kept"]["oscuro"]
    mask_a = per_date["after"]["kept"]["brillo"] | per_date["after"]["kept"]["oscuro"]
    change = np.full(before.shape, 255, dtype=np.uint8)
    change[mask_b | mask_a] = 0
    change[mask_b & mask_a] = 1
    change[mask_a & ~mask_b] = 2
    change[mask_b & ~mask_a] = 3
    write_mask_png(output / "change.png", change, transform, crs,
                   {1: (0, 215, 255, 210), 2: (255, 70, 110, 220), 3: (255, 185, 45, 210)})

    for feature in features:
        fecha = feature["properties"]["fecha"]
        if fecha == "before":
            propio, otro = mask_b, mask_a
        else:
            propio, otro = mask_a, mask_b
        pts = feature["geometry"]["coordinates"]
        lons = [p[0] for p in pts]
        lats = [p[1] for p in pts]
        xs, ys = rasterio.warp.transform("EPSG:4326", crs.to_string(), lons, lats)
        rows, cols = rasterio.transform.rowcol(transform, list(xs), list(ys))
        rows = np.clip(np.array(rows), 0, before.shape[0] - 1)
        cols = np.clip(np.array(cols), 0, before.shape[1] - 1)
        own = propio[rows, cols].mean()
        oth = otro[rows, cols].mean()
        if own > 0 and oth > 0:
            estado = "persistente"
        elif own > 0:
            estado = "nuevo"
        else:
            estado = "retirado"
        feature["properties"]["cambio"] = estado
        feature["properties"]["coincide_otra_fecha_porcentaje"] = round(float(oth) * 100, 1)

    (output / "channels.geojson").write_text(
        json.dumps({"type": "FeatureCollection", "features": features}, ensure_ascii=False), encoding="utf-8")

    bounds = None
    for label, fname in (("before", "sar_before.png"), ("after", "sar_after.png")):
        b, lo, hi = write_sar_png(output / fname, per_date[label]["sm"], transform, crs)
        bounds = bounds or b
    mask_colors = {1: (0, 215, 255, 200), 2: (255, 196, 61, 200)}
    merged = np.zeros(before.shape, np.uint8)
    merged[per_date["before"]["kept"]["oscuro"]] = 1
    merged[per_date["before"]["kept"]["brillo"]] = 2
    write_mask_png(output / "channels_before.png", merged, transform, crs, mask_colors)
    merged_a = np.zeros(before.shape, np.uint8)
    merged_a[per_date["after"]["kept"]["oscuro"]] = 1
    merged_a[per_date["after"]["kept"]["brillo"]] = 2
    write_mask_png(output / "channels_after.png", merged_a, transform, crs, mask_colors)

    manifest = {
        "bounds": bounds,
        "layers": {
            "sar_before": "sar_before.png",
            "sar_after": "sar_after.png",
            "channels_before": "channels_before.png",
            "channels_after": "channels_after.png",
        },
        "channels": "channels.geojson",
        "change_layer": "change.png",
        "status": "nisar_channel_detector_unvalidated",
        "before": meta_before,
        "after": meta_after,
        "detector": {
            "tipo": "top-hat morfológico + filtro de forma (largo/estrecho) + esqueleto",
            "escala_m": scale_m,
            "k_brillo": k_bright,
            "k_oscuro": k_dark,
            "largo_min_m": min_length_m,
            "ancho_max_m": max_width_m,
            "area_min_m2": min_area_m2,
            "pixel_m": pixel_m,
            "resolucion_nativa": True,
        },
        "lineas": counts,
        "legend": "Cian: agua abierta o sombra especular (oscura en L). Amarillo: corredor ripario o cauce "
                  "con vegetación (brillante en L, doble rebote). Líneas: esqueleto del cauce detectado.",
        "warning": "Detección exploratoria sobre GCOV nativo. No demuestra inundación ni ausencia de ella.",
    }
    (output / "web_manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    return manifest


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--before", required=True)
    p.add_argument("--after", required=True)
    p.add_argument("--bbox", nargs=4, type=float, metavar=("WEST", "SOUTH", "EAST", "NORTH"), required=True)
    p.add_argument("--output", required=True)
    p.add_argument("--scale", type=float, default=DEFAULT_SCALE_M)
    p.add_argument("--k-bright", type=float, default=DEFAULT_K_BRIGHT)
    p.add_argument("--k-dark", type=float, default=DEFAULT_K_DARK)
    p.add_argument("--min-length", type=float, default=DEFAULT_MIN_LENGTH_M)
    p.add_argument("--max-width", type=float, default=DEFAULT_MAX_WIDTH_M)
    p.add_argument("--min-area", type=float, default=DEFAULT_MIN_AREA_M2)
    p.add_argument("--polarization", choices=["HHHH", "HVHV"], default="HHHH")
    p.add_argument("--mask-values", nargs="+", type=int)
    a = p.parse_args()
    m = run(a.before, a.after, a.bbox, a.output, a.scale, a.k_bright, a.k_dark, a.min_length,
            a.max_width, a.min_area, a.polarization, a.mask_values)
    print(json.dumps({k: v for k, v in m.items() if k not in ("before", "after")}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
