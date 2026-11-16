"""Recorte ampliado de SAR con la red de referencia encima."""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi

from gcov_water import read_raster

H5 = r"data\nisar\NISAR_L2_PR_GCOV_033_147_A_169_2005_DHDH_A_20261022T104048_20261022T104115_P05036_N_F_J_001.h5"


def main():
    west, south, east, north = (float(v) for v in sys.argv[1:5])
    out = sys.argv[5]
    zoom = float(sys.argv[6]) if len(sys.argv) > 6 else 3.0
    db, transform, crs, meta = read_raster(H5, (west, south, east, north), "HHHH", "power", [1])
    valid = np.isfinite(db)
    sm = ndi.median_filter(np.where(valid, db, np.nan_to_num(db, nan=float(np.nanmedian(db)))), size=3)
    lo, hi = np.percentile(sm[valid], [2, 98])
    img = np.zeros(db.shape, np.uint8)
    img[valid] = np.clip((sm[valid] - lo) / max(hi - lo, 1e-6) * 255, 0, 255).astype(np.uint8)
    rgba = np.zeros(db.shape + (4,), np.uint8)
    rgba[..., 0] = rgba[..., 1] = rgba[..., 2] = img
    rgba[..., 3] = np.where(valid, 255, 0)
    pil = Image.fromarray(rgba).convert("RGB")
    w, h = pil.size
    pil = pil.resize((int(w * zoom), int(h * zoom)), Image.LANCZOS)
    d = ImageDraw.Draw(pil)
    net = json.loads(Path("assets/river_reference_network.json").read_text(encoding="utf-8"))
    for p in net["polylines"]:
        cs = p["coords"]
        if not cs:
            continue
        pts = []
        for lat, lon in cs:
            cx = (lon - west) / (east - west) * w * zoom
            cy = (north - lat) / (north - south) * h * zoom
            pts.append((cx, cy))
        d.line(pts, fill=(255, 30, 30), width=2)
    pil.save(out)
    print("saved", out, pil.size, "px/pixel", 20.0 / zoom)


if __name__ == "__main__":
    main()
