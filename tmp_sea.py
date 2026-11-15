import numpy as np
from scipy import ndimage as ndi
from PIL import Image
from gcov_water import read_raster
H5 = r"data\nisar\NISAR_L2_PR_GCOV_033_147_A_169_2005_DHDH_A_20261022T104048_20261022T104115_P05036_N_F_J_001.h5"
db, transform, crs, meta = read_raster(H5, (-72.88,-16.75,-72.55,-16.45), "HHHH", "power", [1])
valid = np.isfinite(db); v = db[valid]
filled = np.where(valid, db, np.nanmedian(v))
mean = ndi.uniform_filter(filled, 9, mode="nearest"); mean2 = ndi.uniform_filter(filled**2, 9, mode="nearest")
std = np.sqrt(np.maximum(mean2-mean**2,0))
thr = float(np.percentile(v, 5))
print("thr p5", thr)
cand = valid & (db < thr) & (std < 1.8)
lab, n = ndi.label(cand, np.ones((3,3)))
sizes = ndi.sum_labels(cand, lab, index=range(1,n+1))
order = np.argsort(sizes)[::-1][:5]
print("top:", [(int(order[k]+1), int(sizes[order[k]])) for k in range(5)])
sea = np.isin(lab, [order[k]+1 for k in range(2)])
print("sea km2", sea.sum()*400/1e6)
out = np.zeros(db.shape+(4,), np.uint8)
out[...,0]=255; out[...,1]=255; out[...,2]=255; out[...,3]=0
out[sea]=(0,120,255,255)
Image.fromarray(out).save("tmp_sea.png")
print("saved")
