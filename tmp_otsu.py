import numpy as np
from scipy import ndimage as ndi
from PIL import Image
from gcov_water import read_raster
H5 = r"data\nisar\NISAR_L2_PR_GCOV_033_147_A_169_2005_DHDH_A_20261022T104048_20261022T104115_P05036_N_F_J_001.h5"
db, transform, crs, meta = read_raster(H5, (-72.88,-16.75,-72.55,-16.45), "HHHH", "power", [1])
valid = np.isfinite(db)
v = db[valid]
lo, hi = np.percentile(v, [0.5, 99.5])
hist, edges = np.histogram(np.clip(v, lo, hi), bins=256, range=(lo, hi))
p = hist.astype(float)/hist.sum()
w = np.cumsum(p); m = np.cumsum(p*((edges[:-1]+edges[1:])/2))
mt = m[-1]; wt = w[-1]
between = (mt*w - m)**2 / (w*(1-w) + 1e-12)
k = int(np.argmax(between))
otsu = (edges[k]+edges[k+1])/2
print("otsu dB", otsu, "p50", np.percentile(v,50))
filled = np.where(valid, db, np.nanmedian(v))
mean = ndi.uniform_filter(filled, 9, mode="nearest"); mean2 = ndi.uniform_filter(filled**2, 9, mode="nearest")
std = np.sqrt(np.maximum(mean2-mean**2,0))
for tstd in (1.6, 1.8, 2.0):
    cand = valid & (db < otsu) & (std < tstd)
    lab, n = ndi.label(cand, np.ones((3,3)))
    sizes = ndi.sum_labels(cand, lab, index=range(1,n+1))
    big = [(i+1, int(s)) for i,s in enumerate(sizes) if s*400 > 2_000_000]
    print("tstd", tstd, "frac", round(float(cand.mean()),3), "cuerpos >2km2:", big[:5])
