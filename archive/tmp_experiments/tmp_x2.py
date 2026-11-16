import h5py, numpy as np
from rasterio.warp import transform as wt
p = r"data\nisar\NISAR_L2_PR_GCOV_033_147_A_169_2005_DHDH_A_20261022T104048_20261022T104115_P05036_N_F_J_001.h5"
G = "/science/LSAR/GCOV/grids/frequencyA"
with h5py.File(p,"r") as f:
    g = f[G]
    m = g["mask"]
    H, W = m.shape
    for r in [2000, 3000, 4000, 4800, 6000, 7200, 8400, 9600, 10800, 12000]:
        row = m[r]
        idx = np.flatnonzero((row > 0) & (row < 255))
        if not len(idx):
            print(r, "no valid"); continue
        c0, c1 = idx[0], idx[-1]
        y = 8273510.0 - r*20
        lon0, lat0 = wt("EPSG:32718","EPSG:4326", [581050.0+c0*20], [y])
        lon1, lat1 = wt("EPSG:32718","EPSG:4326", [581050.0+c1*20], [y])
        print(f"row {r:6d} lat {lat0[0]:7.3f}  lon {lon0[0]:8.3f} .. {lon1[0]:8.3f}")
