import numpy as np
from scipy import ndimage as ndi
from gcov_water import read_raster
import gcov_rivers as R
H5 = r"data\nisar\NISAR_L2_PR_GCOV_033_147_A_169_2005_DHDH_A_20261022T104048_20261022T104115_P05036_N_F_J_001.h5"
db, transform, crs, meta = read_raster(H5, (-72.88,-16.75,-72.55,-16.45), "HHHH", "power", [1])
valid = np.isfinite(db)
print("pct dB", np.percentile(db[valid],[1,5,10,20,50,90]))
filled = np.where(valid, db, np.nanmedian(db[valid]))
for size in (9, 15, 25):
    mean = ndi.uniform_filter(filled, size=size, mode="nearest")
    mean_sq = ndi.uniform_filter(filled**2, size=size, mode="nearest")
    std = np.sqrt(np.maximum(mean_sq-mean**2,0))
    print("size",size,"std pct", np.percentile(std[valid],[1,5,10,50]))
