import numpy as np, h5py
from rasterio.warp import transform_bounds
from rasterio.crs import CRS
p = r"data\nisar\NISAR_L2_PR_GCOV_033_147_A_169_2005_DHDH_A_20261022T104048_20261022T104115_P05036_N_F_J_001.h5"
G = "/science/LSAR/GCOV/grids/frequencyA"
bbox = (-72.88, -16.75, -72.55, -16.45)
with h5py.File(p,"r") as f:
    g = f[G]
    x = g["xCoordinates"][:]; y = g["yCoordinates"][:]
    crs = CRS.from_epsg(int(g["projection"][()]))
    dx, dy = float(x[1]-x[0]), float(y[1]-y[0])
    left,bottom,right,top = transform_bounds("EPSG:4326", crs, *bbox, densify_pts=21)
    print("utm bbox", left,bottom,right,top)
    cols = np.flatnonzero((x >= left-abs(dx)/2)&(x<=right+abs(dx)/2))
    rows = np.flatnonzero((y >= bottom-abs(dy)/2)&(y<=top+abs(dy)/2))
    print("cols", cols[0], cols[-1], "rows", rows[0], rows[-1])
    sub = g["mask"][rows[0]:rows[-1]+1, cols[0]:cols[-1]+1]
    print("mask uniq", np.unique(sub, return_counts=True))
    print("y rows range", y[rows[0]], y[rows[-1]])
    print("x cols range", x[cols[0]], x[cols[-1]])
