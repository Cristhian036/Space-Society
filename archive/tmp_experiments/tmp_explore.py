"""Exploracion temporal: recorte SAR + red de referencia superpuesta."""
import json
import sys
from pathlib import Path

import numpy as np
import rasterio
from PIL import Image, ImageDraw

from gcov_water import read_raster

H5 = r"data\nisar\NISAR_L2_PR_GCOV_033_147_A_169_2005_DHDH_A_20261022T104048_20261022T104115_P05036_N_F_J_001.h5"


def main():
    west, south, east, north = (float(v) for v in sys.argv[1:5])
    out = sys.argv[5] if len(sys.argv) > 5 else "tmp_sar.png"
    db, transform, crs, meta = read_raster(H5, (west, south, east, north), "HHHH", "power", [1])
    valid = np.isfinite(db)
    print("shape", db.shape, "valid", valid.sum(), "meta", meta)
    vals = db[valid]
    print("db pct", np.percentile(vals, [1, 5, 25, 50, 75, 95, 99]))
    lo, hi = np.percentile(vals, [2, 98])
    img = np.zeros(db.shape, np.uint8)
    img[valid] = np.clip((db[valid] - lo) / max(hi - lo, 1e-6) * 255, 0, 255).astype(np.uint8)
    rgba = np.zeros(db.shape + (4,), np.uint8)
    rgba[..., 0] = img
    rgba[..., 1] = img
    rgba[..., 2] = img
    rgba[..., 3] = np.where(valid, 255, 0)
    pil = Image.fromarray(rgba).convert("RGB")

    # Red de referencia dentro del bbox
    net = json.loads(Path("assets/river_reference_network.json").read_text(encoding="utf-8"))
    from rasterio.warp import transform as warp
    xs = transform.c + transform.a * (np.arange(db.shape[1]) + 0.5)
    ys = transform.f + transform.e * (np.arange(db.shape[0]) + 0.5)
    XX, YY = np.meshgrid(xs, ys)
    lons, lats = warp(crs, "EPSG:4326", XX.ravel(), YY.ravel())
    lons = np.asarray(lons).reshape(db.shape)
    lats = np.asarray(lats).reshape(db.shape)
    lon0, lon1 = lons[0, 0], lons[0, -1]
    lat0, lat1 = lats[0, 0], lats[-1, 0]

    def to_px(lon, lat):
        cx = (lon - lon0) / (lon1 - lon0) * db.shape[1]
        cy = (lat0 - lat) / (lat0 - lat1) * db.shape[0]
        return cx, cy

    d = ImageDraw.Draw(pil)
    count = 0
    for p in net["polylines"]:
        cs = p["coords"]
        if not cs:
            continue
        lats_c = [c[0] for c in cs]
        lons_c = [c[1] for c in cs]
        if max(lats_c) < south or min(lats_c) > north or max(lons_c) < west or min(lons_c) > east:
            continue
        pts = [to_px(lo, la) for lo, la in zip(lons_c, lats_c)]
        d.line(pts, fill=(255, 40, 40), width=2)
        count += 1
    print("reference polylines in bbox:", count)
    pil.save(out)
    print("saved", out, pil.size)


if __name__ == "__main__":
    main()
