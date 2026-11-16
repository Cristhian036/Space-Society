"""Mapa de respuesta del detector sobre la imagen SAR."""
import sys

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

from gcov_water import read_raster

H5 = r"data\nisar\NISAR_L2_PR_GCOV_033_147_A_169_2005_DHDH_A_20261022T104048_20260622T104115.h5"
H5 = r"data\nisar\NISAR_L2_PR_GCOV_033_147_A_169_2005_DHDH_A_20261022T104048_20261022T104115_P05036_N_F_J_001.h5"


def main():
    west, south, east, north = (float(v) for v in sys.argv[1:5])
    out = sys.argv[5]
    db, transform, crs, meta = read_raster(H5, (west, south, east, north), "HHHH", "power", [1])
    valid = np.isfinite(db)
    sm = ndi.median_filter(np.where(valid, db, np.nan_to_num(db, nan=float(np.nanmedian(db)))), size=3)
    sm[~valid] = np.nan
    panels = []
    for size in (9, 15, 25, 41):
        bright = sm - ndi.grey_opening(sm, size=size)
        dark = ndi.grey_closing(sm, size=size) - sm
        for name, resp in (("claro", bright), ("oscuro", dark)):
            v = resp[valid]
            lo, hi = np.percentile(v, [50, 99.7])
            img = np.zeros(db.shape, np.uint8)
            img[valid] = np.clip((resp[valid] - lo) / max(hi - lo, 1e-6) * 255, 0, 255).astype(np.uint8)
            panels.append((f"{name} s={size}", img))
    h = db.shape[0]
    w = db.shape[1]
    canvas = Image.new("RGB", (w * 2, h * 4), (0, 0, 0))
    for i, (label, img) in enumerate(panels):
        canvas.paste(Image.fromarray(img).convert("RGB"), ((i % 2) * w, (i // 2) * h))
    canvas.save(out)
    print("saved", out, canvas.size, "orden:", [p[0] for p in panels])


if __name__ == "__main__":
    main()
