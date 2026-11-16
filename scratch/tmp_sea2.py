import numpy as np
from scipy import ndimage as ndi
from PIL import Image
from gcov_water import read_raster
H5 = r"data\nisar\NISAR_L2_PR_GCOV_033_147_A_169_2005_DHDH_A_20261022T104048_20261022T104115_P05036_N_F_J_001.h5"
db, transform, crs, meta = read_raster(H5, (-72.88,-16.75,-72.55,-16.45), "HHHH", "power", [1])
valid = np.isfinite(db); v = db[valid]
filled = np.where(valid, db, np.nanmedian(v))
mean = ndi.uniform_filter(filled, 9, mode="nearest"); mean2 = ndi.uniform_filter(filled**2, 9, mode="nearest")
std = np.sqrt(np.maximum(mean2-mean**2,0))
for thr_pct, tstd, close in [(5, 3.0, 15), (10, 3.0, 15), (20, 3.0, 15), (5, 2.5, 21)]:
    thr = float(np.percentile(v, thr_pct))
    cand = valid & (db < thr) & (std < tstd)
    if close: cand = ndi.binary_closing(cand, np.ones((close,close)))
    lab, n = ndi.label(cand, np.ones((3,3)))
    sizes = ndi.sum_labels(cand, lab, index=range(1,n+1))
    top = np.argsort(sizes)[::-1][:3]
    print("p",thr_pct,"std",tstd,"close",close,"->", [(int(top[k]+1), int(sizes[top[k]]), round(sizes[top[k]]*400/1e6,1)) for k in range(3)])
