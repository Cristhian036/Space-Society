import h5py, numpy as np
p = r"data\nisar\NISAR_L2_PR_GCOV_033_147_A_169_2005_DHDH_A_20261022T104048_20261022T104115_P05036_N_F_J_001.h5"
G = "/science/LSAR/GCOV/grids/frequencyA"
with h5py.File(p,"r") as f:
    def walk(name, obj):
        if isinstance(obj, h5py.Dataset) and "exception" in name.lower():
            print("DS", name, obj.shape, obj.dtype)
            for k,v in obj.attrs.items():
                print("   attr", k, v)
    f.visititems(walk)
    print("---- G attrs")
    g = f[G]
    for k,v in g.attrs.items():
        print(k, v)
    print("---- identification attrs")
    for k,v in f["/science/LSAR/identification"].attrs.items():
        print(k, v)
