"""Sintesis de parametros del detector sobre una AOI real."""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi

import gcov_rivers as R
from gcov_water import read_raster

H5 = r"data\nisar\NISAR_L2_PR_GCOV_033_147_A_169_2005_DHDH_A_20261022T104048_20261022T104115_P05036_N_F_J_001.h5"


def sar_rgb(db):
    valid = np.isfinite(db)
    lo, hi = np.percentile(db[valid], [2, 98])
    img = np.zeros(db.shape, np.uint8)
    img[valid] = np.clip((db[valid] - lo) / max(hi - lo, 1e-6) * 255, 0, 255).astype(np.uint8)
    rgba = np.zeros(db.shape + (4,), np.uint8)
    rgba[..., 0] = rgba[..., 1] = rgba[..., 2] = img
    rgba[..., 3] = np.where(valid, 255, 0)
    return Image.fromarray(rgba).convert("RGB")


def reference_pts(bbox):
    net = json.loads(Path("assets/river_reference_network.json").read_text(encoding="utf-8"))
    west, south, east, north = bbox
    pts = []
    for p in net["polylines"]:
        cs = p["coords"]
        if not cs:
            continue
        if max(c[0] for c in cs) < south or min(c[0] for c in cs) > north:
            continue
        if max(c[1] for c in cs) < west or min(c[1] for c in cs) > east:
            continue
        pts.extend([[c[1], c[0]] for c in cs])
    return np.asarray(pts, float)


def main():
    west, south, east, north = (float(v) for v in sys.argv[1:5])
    scale = float(sys.argv[5])
    k = float(sys.argv[6])
    min_len = float(sys.argv[7])
    max_w = float(sys.argv[8])
    out = sys.argv[9]
    db, transform, crs, meta = read_raster(H5, (west, south, east, north), "HHHH", "power", [1])
    pixel_m = abs(transform.a)
    size_px = max(int(round(scale / pixel_m)), 3) | 1
    valid = np.isfinite(db)
    sm = ndi.median_filter(np.where(valid, db, np.nan_to_num(db, nan=float(np.nanmedian(db)))), size=3)
    sm[~valid] = np.nan
    masks, _ = R.detect_channels(sm, size_px, k, k)
    base = sar_rgb(db)
    d = ImageDraw.Draw(base)
    cols = {"brillo": (255, 212, 59), "oscuro": (0, 229, 255)}
    for kind, mask in masks.items():
        lines, stats, kept = R.extract_lines(mask, db, pixel_m, min_len, max_w, 6000.0)
        print(f"{kind}: pixeles={mask.sum()} lineas={len(lines)}")
        rgba = np.zeros(db.shape + (4,), np.uint8)
        rgba[kept] = (*cols[kind], 150)
        base = Image.alpha_composite(base.convert("RGBA"), Image.fromarray(rgba)).convert("RGB")
        d = ImageDraw.Draw(base)
        for ln in lines:
            coords = R.to_geographic(ln, transform, crs)
            px = []
            for lon, lat in coords:
                cx = (lon - west) / (east - west) * db.shape[1]
                cy = (north - lat) / (north - south) * db.shape[0]
                px.append((cx, cy))
            if len(px) > 1:
                d.line(px, fill=cols[kind], width=3)
    # referencia en rojo tenue
    ref = reference_pts((west, south, east, north))
    for lon, lat in ref:
        cx = (lon - west) / (east - west) * db.shape[1]
        cy = (north - lat) / (north - south) * db.shape[0]
        d.ellipse([cx - 1, cy - 1, cx + 1, cy + 1], fill=(255, 0, 0))
    base.save(out)
    print("saved", out, base.size)


if __name__ == "__main__":
    main()
