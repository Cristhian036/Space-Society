"""Perfil perpendicular del cauce: firma radar del rio en banda L."""
import json
import sys
from pathlib import Path

import numpy as np
from scipy import ndimage as ndi

from gcov_water import read_raster

H5 = r"data\nisar\NISAR_L2_PR_GCOV_033_147_A_169_2005_DHDH_A_20261022T104048_20261022T104115_P05036_N_F_J_001.h5"


def sample(img, transform, crs, lons, lats):
    from rasterio.warp import transform as warp
    xs = transform.c + transform.a * 0.5
    ys = transform.f + transform.e * 0.5
    xx, yy = warp("EPSG:4326", crs, list(lons), list(lats))
    cols = (np.asarray(xx) - xs) / transform.a
    rows = (np.asarray(yy) - ys) / transform.e
    r = np.round(rows).astype(int)
    c = np.round(cols).astype(int)
    out = np.full(len(lons), np.nan)
    ok = (r >= 0) & (r < img.shape[0]) & (c >= 0) & (c < img.shape[1])
    out[ok] = img[r[ok], c[ok]]
    return out


def main():
    west, south, east, north = (float(v) for v in sys.argv[1:5])
    region = sys.argv[5] if len(sys.argv) > 5 else "majes_camana_canyon"
    bbox = (west, south, east, north)
    hh, transform, crs, meta = read_raster(H5, bbox, "HHHH", "power", [1])
    hv, _, _, _ = read_raster(H5, bbox, "HVHV", "power", [1])
    net = json.loads(Path("assets/river_reference_network.json").read_text(encoding="utf-8"))
    offsets = np.arange(-800, 801, 20.0)
    acc_hh = np.zeros(len(offsets))
    acc_hv = np.zeros(len(offsets))
    n = 0
    for p in net["polylines"]:
        if region and p.get("region") != region:
            continue
        cs = p["coords"]
        if len(cs) < 5:
            continue
        arr = np.asarray(cs, float)  # [lat, lon]
        for i in range(1, len(arr) - 1):
            lat, lon = arr[i]
            if not (south <= lat <= north and west <= lon <= east):
                continue
            d = arr[i + 1] - arr[i - 1]
            nrm = np.hypot(d[0], d[1])
            if nrm < 1e-9:
                continue
            # normal en grados
            nl = np.array([-d[0], d[1]]) / nrm
            m_per_deg = 111320.0
            latm = np.cos(np.radians(lat))
            ox = nl[1] * m_per_deg * latm
            oy = nl[0] * 110574.0
            norm = np.hypot(ox, oy)
            ox, oy = ox / norm, oy / norm
            lons = lon + offsets * ox / (m_per_deg * latm)
            lats = lat + offsets * oy / 110574.0
            a = sample(hh, transform, crs, lons, lats)
            b = sample(hv, transform, crs, lons, lats)
            if np.isnan(a).any() or np.isnan(b).any():
                continue
            acc_hh += a
            acc_hv += b
            n += 1
    print("muestras", n)
    prof_hh = acc_hh / max(n, 1)
    prof_hv = acc_hv / max(n, 1)
    for o, a, b in zip(offsets, prof_hh, prof_hv):
        bar = "#" * max(0, int((a + 26) * 3))
        print(f"{o:+6.0f} m  HH {a:7.2f}  HV {b:7.2f}  {bar}")


if __name__ == "__main__":
    main()
