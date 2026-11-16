"""Validación: líneas detectadas por NISAR frente a la red de referencia.

Mide acuerdo geométrico en ambos sentidos (precisión y exhaustividad) con
la distancia perpendicular a la red de referencia, sin usar esa red para
detectar: la red solo valida.
"""
import argparse
import json
from pathlib import Path

import numpy as np
import rasterio
from rasterio.warp import transform as warp_transform


def _densify(coords, step_m=60.0):
    """Puntos cada `step_m` a lo largo de una polilínea en grados."""
    out = []
    pts = np.asarray(coords, dtype=float)
    for a, b in zip(pts[:-1], pts[1:]):
        d = np.hypot((b[0] - a[0]) * 111320 * np.cos(np.radians((a[1] + b[1]) / 2)),
                     (b[1] - a[1]) * 111320)
        n = max(int(d / step_m), 1)
        for i in range(n):
            t = i / n
            out.append([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t])
    out.append(list(pts[-1]))
    return out


def reference_points(bbox, regions=None):
    net = json.loads(Path("assets/river_reference_network.json").read_text(encoding="utf-8"))
    west, south, east, north = bbox
    pts = []
    for p in net["polylines"]:
        if regions and p["region"] not in regions:
            continue
        line = [q for q in p["coords"] if south <= q[0] <= north and west <= q[1] <= east]
        if len(line) >= 2:
            pts.extend(_densify([[q[1], q[0]] for q in line]))
    return np.asarray(pts, dtype=float) if pts else np.zeros((0, 2))


def distances_to_points(points, targets):
    """Distancia mínima de cada punto a la nube de destinos (km)."""
    if len(targets) == 0:
        return np.full(len(points), np.inf)
    lat0 = np.radians(points[:, 1])
    x = points[:, 0] * 111.320 * np.cos(lat0)
    y = points[:, 1] * 110.574
    tx = targets[:, 0] * 111.320 * np.cos(np.radians(targets[:, 1]))
    ty = targets[:, 1] * 110.574
    out = np.empty(len(points))
    for i in range(0, len(points), 20000):
        block = x[i:i + 20000, None]
        by = y[i:i + 20000, None]
        out[i:i + 20000] = np.sqrt(np.min((block - tx[None, :]) ** 2 + (by - ty[None, :]) ** 2, axis=1))
    return out


def evaluate(channels_geojson, bbox, tolerance_m=120.0, regions=None):
    data = json.loads(Path(channels_geojson).read_text(encoding="utf-8"))
    feats = data.get("features", [])
    ref = reference_points(bbox, regions)
    tol_km = tolerance_m / 1000.0

    report = {"tolerancia_m": tolerance_m, "referencia_puntos": int(len(ref)), "fechas": {}}
    for fecha in sorted({f["properties"].get("fecha", "") for f in feats}):
        sub = [f for f in feats if f["properties"].get("fecha", "") == fecha]
        pts = []
        per_kind = {}
        for f in sub:
            line = f["geometry"]["coordinates"]
            lp = np.asarray(_densify(line), dtype=float)
            pts.append(lp)
            kind = f["properties"].get("tipo", "?")
            d = per_kind.setdefault(kind, {"lineas": 0, "largo_m": 0.0, "aciertos": 0, "puntos": 0})
            d["lineas"] += 1
            d["largo_m"] += f["properties"].get("largo_m", 0.0)
            d["puntos"] += len(lp)
            if len(ref):
                d["aciertos"] += int((distances_to_points(lp, ref) <= tol_km).sum())
        pts = np.concatenate(pts) if pts else np.zeros((0, 2))
        if len(pts) and len(ref):
            d_ref = distances_to_points(pts, ref)
            frac = float((d_ref <= tol_km).mean())
        else:
            frac = 0.0
        if len(ref):
            d_det = distances_to_points(ref, pts) if len(pts) else np.full(len(ref), np.inf)
            exhaustividad = float((d_det <= tol_km).mean())
        else:
            exhaustividad = 0.0
        report["fechas"][fecha] = {
            "lineas": len(sub),
            "puntos_densificados": int(len(pts)),
            "acuerdo_porcentaje": round(frac * 100, 1),
            "exhaustividad_referencia_porcentaje": round(exhaustividad * 100, 1),
            "por_tipo": {k: {"lineas": v["lineas"], "largo_m": round(v["largo_m"], 1),
                             "acuerdo_porcentaje": round(100.0 * v["aciertos"] / max(v["puntos"], 1), 1)}
                         for k, v in per_kind.items()},
        }
    return report


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--channels", required=True)
    p.add_argument("--bbox", nargs=4, type=float, metavar=("WEST", "SOUTH", "EAST", "NORTH"), required=True)
    p.add_argument("--tolerance", type=float, default=120.0)
    p.add_argument("--regions", nargs="*")
    p.add_argument("--output")
    a = p.parse_args()
    report = evaluate(a.channels, a.bbox, a.tolerance, a.regions)
    text = json.dumps(report, ensure_ascii=False, indent=2)
    print(text)
    if a.output:
        Path(a.output).write_text(text, encoding="utf-8")


if __name__ == "__main__":
    main()
