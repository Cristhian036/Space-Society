import h5py, numpy as np
p = r"data\nisar\NISAR_L2_PR_GCOV_033_147_A_169_2005_DHDH_A_20261022T104048_20261022T104115_P05036_N_F_J_001.h5"
G = "/science/LSAR/GCOV/grids/frequencyA"
with h5py.File(p,"r") as f:
    g = f[G]
    m = g["mask"]
    print("mask attrs:", dict((k, v) for k,v in m.attrs.items() if k!="DIMENSION_LIST"))
    sub = m[0:2000, 0:2000]
    print("mask dtype", m.dtype, "uniq sample", np.unique(sub, return_counts=True))
    h = g["HHHH"][0:2000,0:2000]
    print("power stats", np.nanmin(h), np.nanmax(h), np.nanmedian(h))
    print("looks sample", np.unique(g["numberOfLooks"][0:500,0:500], return_counts=True)[0][:10])
    ex = g["inputDataExceptionMask"][0:2000,0:2000]
    print("exception uniq", np.unique(ex, return_counts=True))
    print("mask min/max", np.nanmin(h), h.dtype)
