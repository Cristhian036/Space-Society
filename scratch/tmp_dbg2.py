import numpy as np, h5py
p = r"data\nisar\NISAR_L2_PR_GCOV_033_147_A_169_2005_DHDH_A_20261022T104048_20261022T104115_P05036_N_F_J_001.h5"
G = "/science/LSAR/GCOV/grids/frequencyA"
rs = slice(4670, 6352); cs = slice(7248, 9029)
with h5py.File(p,"r") as f:
    g = f[G]
    ex = g["inputDataExceptionMask"][rs, cs]
    print("exception uniq", np.unique(ex, return_counts=True))
    lk = g["numberOfLooks"][rs, cs]
    print("looks stats", np.nanmin(lk), np.nanmax(lk), np.isfinite(lk).sum(), lk.size)
    print("looks attrs", dict(g["numberOfLooks"].attrs))
    h = g["HHHH"][rs, cs]
    print("power", np.nanmin(h), np.nanmax(h), np.isfinite(h).sum(), h.size)
    print("HHHH attrs", dict(g["HHHH"].attrs))
