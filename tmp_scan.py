import h5py, numpy as np
p = r"data\nisar\NISAR_L2_PR_GCOV_033_147_A_169_2005_DHDH_A_20261022T104048_20261022T104115_P05036_N_F_J_001.h5"
G = "/science/LSAR/GCOV/grids/frequencyA"
with h5py.File(p,"r") as f:
    g = f[G]
    m = g["mask"]
    H, W = m.shape
    step = 200
    print("grid of mask value at stride 200 (rows from top=0)")
    for r in range(0, H, step*2):
        row = []
        for c in range(0, W, step*2):
            v = m[r, c]
            row.append(str(v))
        print(r, " ".join(row))
