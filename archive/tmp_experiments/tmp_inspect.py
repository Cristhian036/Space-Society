import h5py, numpy as np
p = r"data\nisar\NISAR_L2_PR_GCOV_033_147_A_169_2005_DHDH_A_20261022T104048_20261022T104115_P05036_N_F_J_001.h5"
G = "/science/LSAR/GCOV/grids/frequencyA"
with h5py.File(p,"r") as f:
    g = f[G]
    x = g["xCoordinates"][:]; y = g["yCoordinates"][:]
    print("shape HHHH", g["HHHH"].shape, g["HHHH"].dtype)
    print("x", x.shape, x[0], x[-1], "dx", x[1]-x[0])
    print("y", y.shape, y[0], y[-1], "dy", y[1]-y[0])
    print("projection", g["projection"][()])
    for k in ("trackNumber","frameNumber","orbitPassDirection","zeroDopplerStartTime","productVersion","processingDateTime","spacecraftID"):
        loc = f"/science/LSAR/identification/{k}"
        if loc in f:
            v = f[loc][()]
            print(k, v if isinstance(v,(bytes,str)) else v)
    for k in ("listOfPolarizations","listOfCovarianceTerms","numberOfSubSwaths","rtcGammaToSigmaFactor"):
        print(k, g[k][()])
