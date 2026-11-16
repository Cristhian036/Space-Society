import h5py, numpy as np
from rasterio.warp import transform as wt
p = r"data\nisar\NISAR_L2_PR_GCOV_033_147_A_169_2005_DHDH_A_20261022T104048_20261022T104115_P05036_N_F_J_001.h5"
G = "/science/LSAR/GCOV/grids/frequencyA"
with h5py.File(p,"r") as f:
    g = f[G]
    m = g["mask"]
    H, W = m.shape
    # corners
    xs = np.array([581050.0, 911510.0]); ys = np.array([8273510.0, 7953130.0])
    print("corner lonlat", wt("EPSG:32718","EPSG:4326", xs, ys))
    # coarse lon/lat grid of valid mask
    step = 200
    print("legend: '#'=valid(mask>0 & <255), '.'=0, ' '=255")
    for r in range(0, H, step*3):
        y = 8273510.0 - r*20
        row = []
        for c in range(0, W, step*3):
            v = m[r,c]
            row.append('#' if 0 < v < 255 else ('.' if v==0 else ' '))
        lo, la = wt("EPSG:32718","EPSG:4326", [581050.0+c*20], [y])
        print(f"{r:6d} lat={la[0]:8.3f} lon={lo[0]:8.3f} ", "".join(row))
