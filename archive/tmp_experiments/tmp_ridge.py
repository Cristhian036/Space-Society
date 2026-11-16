"""Prototipo: detector de crestas multi-escala (vesselness) sobre GCOV."""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi

from gcov_water import read_raster

H5 = r"data\nisar\NISAR_L2_PR_GCOV_033_147_A_169_2005_DHDH_A_20261022T104048_20261022T104115_P05036_N_F_J_001.h5"


def robust_norm(img):
    finite = np.isfinite(img)
    med = float(np.median(img[finite]))
    mad = 1.4826 * float(np.median(np.abs(img[finite] - med)))
    return (img - med) / max(mad, 0.1)


def ridge_response(img, sigmas, dark=False):
    x = robust_norm(img)
    if dark:
        x = -x
    resp = np.zeros(x.shape, np.float32)
    for sigma in sigmas:
        hxx = ndi.gaussian_filter(x, sigma, order=(0, 2), mode="nearest") * sigma ** 2
        hyy = ndi.gaussian_filter(x, sigma, order=(2, 0), mode="nearest") * sigma ** 2
        hxy = ndi.gaussian_filter(x, sigma, order=(1, 1), mode="nearest") * sigma ** 2
        tmp = np.sqrt(((hxx - hyy) / 2) ** 2 + hxy ** 2)
        l1 = (hxx + hyy) / 2 - tmp
        l2 = (hxx + hyy) / 2 + tmp
        lmin, lmax = np.minimum(l1, l2), np.maximum(l1, l2)
        cond = (lmin < 0) & (np.abs(lmin) > np.abs(lmax))
        rb = np.abs(lmax) / np.maximum(np.abs(lmin), 1e-9)
        s = np.sqrt(lmin ** 2 + lmax ** 2)
        v = np.exp(-(rb ** 2) / (2 * 0.5 ** 2)) * (1 - np.exp(-(s ** 2) / (2 * 0.5 ** 2)))
        resp = np.maximum(resp, np.where(cond, v, 0).astype(np.float32))
    resp[~np.isfinite(img)] = 0
    return resp


def sar_rgb(db):
    valid = np.isfinite(db)
    lo, hi = np.percentile(db[valid], [2, 98])
    img = np.zeros(db.shape, np.uint8)
    img[valid] = np.clip((db[valid] - lo) / max(hi - lo, 1e-6) * 255, 0, 255).astype(np.uint8)
    rgba = np.zeros(db.shape + (4,), np.uint8)
    rgba[..., 0] = rgba[..., 1] = rgba[..., 2] = img
    rgba[..., 3] = np.where(valid, 255, 0)
    return Image.fromarray(rgba).convert("RGB")


def ref_pts(bbox):
    net = json.loads(Path("assets/river_reference_network.json").read_text(encoding="utf-8"))
    west, south, east, north = bbox
    out = []
    for p in net["polylines"]:
        cs = p["coords"]
        if not cs:
            continue
        if max(c[0] for c in cs) < south or min(c[0] for c in cs) > north:
            continue
        if max(c[1] for c in cs) < west or min(c[1] for c in cs) > east:
            continue
        out.extend([[c[1], c[0]] for c in cs])
    return np.asarray(out, float)


def km(a, b):
    lat0 = np.radians(a[:, 1])
    ax = a[:, 0] * 111.320 * np.cos(lat0)
    ay = a[:, 1] * 110.574
    bx = b[:, 0] * 111.320 * np.cos(np.radians(b[:, 1]))
    by = b[:, 1] * 110.574
    return np.sqrt((ax[:, None] - bx[None, :]) ** 2 + (ay[:, None] - by[None, :]) ** 2)


def main():
    west, south, east, north = (float(v) for v in sys.argv[1:5])
    sigmas = [float(s) for s in sys.argv[5].split(",")]
    thr = float(sys.argv[6])
    out = sys.argv[7]
    bbox = (west, south, east, north)
    hh, transform, crs, meta = read_raster(H5, bbox, "HHHH", "power", [1])
    hv, _, _, _ = read_raster(H5, bbox, "HVHV", "power", [1])
    pixel_m = abs(transform.a)
    smooth = ndi.median_filter(np.where(np.isfinite(hh), hh, np.nan_to_num(hh, nan=float(np.nanmedian(hh)))), size=3)
    smooth[~np.isfinite(hh)] = np.nan

    bright = ridge_response(smooth, sigmas, dark=False)
    dark = ridge_response(smooth, sigmas, dark=True)

    base = sar_rgb(hh)
    cols = {"bright": (255, 212, 59), "dark": (0, 229, 255)}
    det_pts = []
    for name, resp in (("bright", bright), ("dark", dark)):
        mask = resp >= thr
        lab, n = ndi.label(mask, structure=np.ones((3, 3)))
        print(name, "pixeles", int(mask.sum()), "componentes", n)
        rgba = np.zeros(hh.shape + (4,), np.uint8)
        rgba[mask] = (*cols[name], 140)
        base = Image.alpha_composite(base.convert("RGBA"), Image.fromarray(rgba)).convert("RGB")
        d = ImageDraw.Draw(base)
        # esqueletos
        from skimage.morphology import skeletonize
        for lab_id in range(1, n + 1):
            comp = lab == lab_id
            ys, xs = np.nonzero(comp)
            if len(ys) < 50:
                continue
            skel = skeletonize(comp)
            sy, sx = np.nonzero(skel)
            if len(sy) < 30:
                continue
            lons = transform.c + transform.a * (sx + 0.5)
            lats = transform.f + transform.e * (sy + 0.5)
            from rasterio.warp import transform as warp
            lo, la = warp(crs, "EPSG:4326", list(lons), list(lats))
            pts = np.column_stack([lo, la])
            det_pts.append(pts)
            px = [( (p[0]-west)/(east-west)*hh.shape[1], (north-p[1])/(north-south)*hh.shape[0]) for p in pts]
            d.line(px, fill=cols[name], width=2)
    if det_pts:
        det = np.concatenate(det_pts)
        ref = ref_pts(bbox)
        if len(ref):
            tol = 0.12
            print("acuerdo det->ref %", round(100*float((km(det, ref).min(1) <= tol).mean()), 1))
            print("exhaustividad ref->det %", round(100*float((km(ref, det).min(1) <= tol).mean()), 1))
    d = ImageDraw.Draw(base)
    for lon, lat in ref_pts(bbox):
        cx = (lon - west) / (east - west) * hh.shape[1]
        cy = (north - lat) / (north - south) * hh.shape[0]
        d.ellipse([cx - 1, cy - 1, cx + 1, cy + 1], fill=(255, 0, 0))
    base.save(out)
    print("saved", out)


if __name__ == "__main__":
    main()
