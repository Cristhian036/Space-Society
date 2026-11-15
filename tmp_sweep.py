"""Barrido de parametros: detector de crestas + filtro de forma, con metricas."""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi
from skimage.morphology import skeletonize

from gcov_water import read_raster

H5 = r"data\nisar\NISAR_L2_PR_GCOV_033_147_A_169_2005_DHDH_A_20261022T104048_20261022T104115_P05036_N_F_J_001.h5"


def robust_norm(img):
    f = np.isfinite(img)
    med = float(np.median(img[f]))
    mad = 1.4826 * float(np.median(np.abs(img[f] - med)))
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


def shape_filter(mask, pixel_m, min_len, max_w, min_area, min_elong):
    labels, n = ndi.label(mask, structure=np.ones((3, 3)))
    keep = np.zeros_like(mask)
    stats = []
    for lab in range(1, n + 1):
        comp = labels == lab
        ys, xs = np.nonzero(comp)
        area_px = len(ys)
        skel = skeletonize(comp)
        skel_px = skel.sum()
        length_m = skel_px * pixel_m
        if length_m < min_len:
            continue
        width_m = area_px * pixel_m * pixel_m / length_m
        if width_m > max_w:
            continue
        if area_px * pixel_m * pixel_m < min_area:
            continue
        pts = np.column_stack([xs, ys]).astype(float)
        c = pts.mean(axis=0)
        cov = np.cov((pts - c).T)
        eig = np.linalg.eigvalsh(cov)[::-1] if cov.ndim else np.array([0.0, 0.0])
        elong = float(np.sqrt(eig[0] / max(eig[1], 1e-6)))
        if elong < min_elong:
            continue
        keep |= comp
        stats.append({"lab": lab, "len": length_m, "w": width_m, "e": elong, "px": area_px})
    return keep, labels, stats


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
    min_len = float(sys.argv[7])
    max_w = float(sys.argv[8])
    out = sys.argv[9]
    dark_on = int(sys.argv[10]) if len(sys.argv) > 10 else 0
    bbox = (west, south, east, north)
    db, transform, crs, meta = read_raster(H5, bbox, "HHHH", "power", [1])
    pixel_m = abs(transform.a)
    valid = np.isfinite(db)
    sm = ndi.median_filter(np.where(valid, db, np.nan_to_num(db, nan=float(np.nanmedian(db)))), size=3)
    sm[~valid] = np.nan
    bright = ridge_response(sm, sigmas, dark=False)
    resp = bright
    if dark_on:
        resp = np.maximum(bright, ridge_response(sm, sigmas, dark=True))
    mask = resp >= thr
    keep, labels, stats = shape_filter(mask, pixel_m, min_len, max_w, 6000.0, 3.0)
    # esqueletos de los componentes conservados
    from rasterio.warp import transform as warp
    det = []
    for lab in {s["lab"] for s in stats}:
        skel = skeletonize(labels == lab)
        sy, sx = np.nonzero(skel)
        lo, la = warp(crs, "EPSG:4326", list(transform.c + transform.a * (sx + 0.5)),
                      list(transform.f + transform.e * (sy + 0.5)))
        det.append(np.column_stack([lo, la]))
    det = np.concatenate(det) if det else np.zeros((0, 2))
    ref = ref_pts(bbox)
    agree = exh = 0.0
    if len(det) and len(ref):
        agree = 100 * float((km(det, ref).min(1) <= 0.12).mean())
        exh = 100 * float((km(ref, det).min(1) <= 0.12).mean())
    print(f"sigmas={sigmas} thr={thr} minlen={min_len} maxw={max_w} dark={dark_on} "
          f"-> comps={len(stats)} px={int(keep.sum())} acuerdo={agree:.1f}% exhaustividad={exh:.1f}%")
    # render
    lo, hi = np.percentile(db[valid], [2, 98])
    img = np.zeros(db.shape, np.uint8)
    img[valid] = np.clip((db[valid] - lo) / max(hi - lo, 1e-6) * 255, 0, 255).astype(np.uint8)
    rgba = np.zeros(db.shape + (4,), np.uint8)
    rgba[..., 0] = rgba[..., 1] = rgba[..., 2] = img
    rgba[..., 3] = np.where(valid, 255, 0)
    pil = Image.fromarray(rgba).convert("RGB")
    m = np.zeros(db.shape + (4,), np.uint8)
    m[keep] = (255, 212, 59, 160)
    pil = Image.alpha_composite(pil.convert("RGBA"), Image.fromarray(m)).convert("RGB")
    d = ImageDraw.Draw(pil)
    for lon, lat in ref:
        cx = (lon - west) / (east - west) * db.shape[1]
        cy = (north - lat) / (north - south) * db.shape[0]
        d.ellipse([cx - 1, cy - 1, cx + 1, cy + 1], fill=(255, 0, 0))
    pil.save(out)


if __name__ == "__main__":
    main()
