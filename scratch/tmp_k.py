import sys, numpy as np
from scipy import ndimage as ndi
from PIL import Image, ImageDraw
import gcov_rivers as R
from gcov_water import read_raster
H5 = r"data\nisar\NISAR_L2_PR_GCOV_033_147_A_169_2005_DHDH_A_20261022T104048_20261022T104115_P05036_N_F_J_001.h5"
west, south, east, north = -72.80, -16.68, -72.70, -16.58
db, transform, crs, meta = read_raster(H5, (west, south, east, north), "HHHH", "power", [1])
valid = np.isfinite(db)
sm = ndi.median_filter(np.where(valid, db, np.nan_to_num(db, nan=float(np.nanmedian(db)))), size=3)
sm[~valid] = np.nan
for size in (15, 25, 41):
    for k in (1.5, 2.0, 2.5, 3.0):
        masks, resp = R.detect_channels(sm, size, k, k)
        for kind in ("brillo",):
            lines, stats, kept = R.extract_lines(masks[kind], db, 20.0, 2000.0, 150.0, 6000.0)
            print(f"size={size} k={k} {kind}: pix={masks[kind].sum():7d} lineas={len(lines):3d} "
                  f"largo_total={sum(s['length_m'] for s in stats)/1000:.1f} km "
                  f"elong_min={min([s['elongation'] for s in stats], default=0):.1f}")
