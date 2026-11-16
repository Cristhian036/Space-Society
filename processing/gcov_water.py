"""Reproducible GCOV water candidates per date, with no geometric gap filling.

Requires original GCOV HDF5 or single-band georeferenced power/dB GeoTIFFs.
Thresholds and accepted HDF5 quality codes must be chosen explicitly.
"""
import argparse
import json
import re
from pathlib import Path

import h5py
import numpy as np
import rasterio
from rasterio.transform import Affine
from rasterio.warp import reproject, Resampling, transform_bounds, calculate_default_transform
from rasterio.windows import from_bounds, Window
from scipy import ndimage as ndi
from PIL import Image

GRID = "/science/LSAR/GCOV/grids/frequencyA"
MAX_PIXELS = 4_000_000


def power_to_db(power):
    valid = np.isfinite(power) & (power > 0)
    db = np.full(power.shape, np.nan, dtype=np.float32)
    db[valid] = 10 * np.log10(power[valid])
    return db


# Anomalias y enfoque del radar en `inputDataExceptionMask` de GCOV.
#
# El atributo `description` del producto define el bitset: "Bitwise OR of input
# data exception codes for each image pixel (0: no anomaly, 2: NISAR LSAR
# qFSP-H1 sample slip). Also includes OR of validity mask bits, where each bit is
# set on for fully-focused data or off for partially focused or missing data
# (256:HH, 512:HV, 1024:VH, 2048:VV, 4096:LH, 8192:LV, 16384:RH, 32768:RV)".
#
# Por tanto el valor NO es cero en una escena valida: es un bitset. La version
# P05036 escribe 768 = 256 + 512 (HH y HV enfocados, sin anomalias) en todo el
# pie valido. Exigir `== 0` descartaba la escena completa.
ANOMALY_BITS = 0b10  # 2: sample slip (anomalia real de los datos de entrada)
FOCUS_BITS = {"HHHH": 256, "HVHV": 512, "VVVV": 1024, "VHVH": 2048}


def exception_mask_keep(exceptions, polarization="HHHH"):
    """Pixels sin anomalias de entrada y con la polarizacion enfocada."""
    ex = np.asarray(exceptions, dtype=np.uint32)
    fill = np.iinfo(ex.dtype).max
    ex = np.where(ex == fill, 0, ex)
    keep = (ex & ANOMALY_BITS) == 0
    bit = FOCUS_BITS.get(polarization)
    if bit and np.any((ex & bit) != 0):
        # Solo si el granulo codifica el bit de enfoque hay que exigirlo.
        keep &= (ex & bit) != 0
    return keep


def water_candidates(db, threshold, margin=2.0):
    """Grow strong seeds only through valid, low-backscatter evidence.

    Does not cross bright pixels or NoData. No closing, dilation or deletion of
    small components: a narrow channel is not removed just for its width/size.
    """
    valid = np.isfinite(db)
    weak = valid & (db <= threshold)
    strong = valid & (db <= threshold - margin)
    return ndi.binary_propagation(strong, structure=np.ones((3, 3)), mask=weak)


def change_classes(before, after, valid_before, valid_after):
    result = np.full(before.shape, 255, dtype=np.uint8)
    valid = valid_before & valid_after
    result[valid] = 0
    result[valid & before & after] = 1
    result[valid & ~before & after] = 2
    result[valid & before & ~after] = 3
    return result


def _text(value):
    return value.decode() if isinstance(value, bytes) else str(value)


def inspect_h5(path):
    with h5py.File(path, "r") as f:
        g = f[GRID]
        info = {"file": str(path), "layers": list(g.keys()), "quality_attributes": {}}
        if "mask" in g:
            info["quality_attributes"] = {k: np.asarray(v).tolist() if np.asarray(v).dtype.kind not in "SO" else _text(v)
                                            for k, v in g["mask"].attrs.items()}
        print(json.dumps(info, indent=2, default=_text))


def read_raster(path, bbox, polarization="HHHH", units="power", mask_values=None):
    path = Path(path)
    if path.suffix.lower() in (".h5", ".hdf5"):
        if mask_values is None:
            raise ValueError("HDF5: especifica --mask-values tras revisar --inspect y los códigos de calidad del producto.")
        with h5py.File(path, "r") as f:
            g = f[GRID]
            ds = g[polarization]
            if np.issubdtype(ds.dtype, np.complexfloating):
                raise ValueError("Selecciona un término diagonal de potencia, p. ej. HHHH.")
            x, y = g["xCoordinates"][:], g["yCoordinates"][:]
            crs = rasterio.crs.CRS.from_epsg(int(g["projection"][()]))
            dx, dy = float(x[1] - x[0]), float(y[1] - y[0])
            if not (np.allclose(np.diff(x), dx) and np.allclose(np.diff(y), dy)):
                raise ValueError("GCOV requiere una malla regular")
            left, bottom, right, top = transform_bounds("EPSG:4326", crs, *bbox, densify_pts=21)
            cols = np.flatnonzero((x >= left - abs(dx) / 2) & (x <= right + abs(dx) / 2))
            rows = np.flatnonzero((y >= bottom - abs(dy) / 2) & (y <= top + abs(dy) / 2))
            if not len(cols) or not len(rows):
                raise ValueError(f"El área no intersecta {path.name}")
            cs, rs = slice(cols[0], cols[-1] + 1), slice(rows[0], rows[-1] + 1)
            if len(rows) * len(cols) > MAX_PIXELS:
                raise ValueError("Recorta una zona menor: máximo 4 millones de píxeles")
            data = ds[rs, cs].astype(np.float32)
            valid = np.isfinite(data) & (data > 0)
            for key in ("_FillValue", "missing_value"):
                if key in ds.attrs:
                    valid &= ~np.isin(data, np.atleast_1d(ds.attrs[key]))
            quality = g["mask"][rs, cs]
            valid &= np.isin(quality, mask_values)
            for key in ("_FillValue", "missing_value"):
                if key in g["mask"].attrs:
                    valid &= ~np.isin(quality, np.atleast_1d(g["mask"].attrs[key]))
            if "inputDataExceptionMask" in g:
                # Bitset: bit 2 = anomalias de entrada (sample slip);
                # bit 256/512 = polarizacion enfocada. Un valor no nulo no
                # significa por si solo que el pixel sea invalido.
                valid &= exception_mask_keep(g["inputDataExceptionMask"][rs, cs], polarization)
            if "numberOfLooks" in g:
                looks = g["numberOfLooks"][rs, cs]
                valid &= np.isfinite(looks) & (looks > 0)
                for key in ("_FillValue", "missing_value"):
                    if key in g["numberOfLooks"].attrs:
                        valid &= ~np.isin(looks, np.atleast_1d(g["numberOfLooks"].attrs[key]))
            transform = Affine(dx, 0, x[cols[0]] - dx / 2, 0, dy, y[rows[0]] - dy / 2)
            if dx < 0:
                data, valid = data[:, ::-1], valid[:, ::-1]
                transform = transform * Affine.translation(data.shape[1], 0) * Affine.scale(-1, 1)
            if dy > 0:
                data, valid = data[::-1], valid[::-1]
                transform = transform * Affine.translation(0, data.shape[0]) * Affine.scale(1, -1)
            # Preserve available acquisition metadata for compatibility checks.
            meta = {}
            for key in ("trackNumber", "frameNumber", "orbitPassDirection", "zeroDopplerStartTime", "productVersion", "processingDateTime"):
                loc = f"/science/LSAR/identification/{key}"
                if loc in f:
                    meta[key] = _text(f[loc][()])
            meta["inputUnits"] = "gamma0_power"
    else:
        with rasterio.open(path) as src:
            if src.crs is None or src.count != 1:
                raise ValueError("Se requiere GeoTIFF georreferenciado de una banda")
            bounds = transform_bounds("EPSG:4326", src.crs, *bbox, densify_pts=21)
            win = from_bounds(*bounds, transform=src.transform).round_offsets().round_lengths()
            win = win.intersection(Window(0, 0, src.width, src.height))
            if win.width * win.height > MAX_PIXELS:
                raise ValueError("Recorta una zona menor: máximo 4 millones de píxeles")
            arr = src.read(1, window=win, masked=True).astype(np.float32)
            data = arr.filled(np.nan).astype(np.float32)
            valid = ~np.ma.getmaskarray(arr) & np.isfinite(data)
            transform, crs, meta = src.window_transform(win), src.crs, {"inputUnits": units}
    if path.suffix.lower() in (".h5", ".hdf5") or units == "power":
        data = power_to_db(data)
    data[~valid] = np.nan
    match = re.search(r"_([A-Z]\d{5})_", path.name)
    if match:
        meta["compositeReleaseId"] = match.group(1)
    return data, transform, crs, meta


def align_to_reference(data, transform, crs, shape, ref_transform, ref_crs):
    aligned = np.full(shape, np.nan, dtype=np.float32)
    reproject(data, aligned, src_transform=transform, src_crs=crs,
              dst_transform=ref_transform, dst_crs=ref_crs,
              src_nodata=np.nan, dst_nodata=np.nan, resampling=Resampling.nearest)
    return aligned


def write_tif(path, data, transform, crs, nodata):
    with rasterio.open(path, "w", driver="GTiff", height=data.shape[0], width=data.shape[1],
                       count=1, dtype=data.dtype, crs=crs, transform=transform,
                       nodata=nodata, compress="deflate") as dst:
        dst.write(data, 1)


def write_web_png(path, data, transform, crs, colors):
    """Reproyecta una imagen categorica a Web Mercator y la guarda como PNG."""
    from rasterio.transform import array_bounds
    shape = data.shape
    bounds = array_bounds(*shape, transform)
    wt, width, height = calculate_default_transform(crs, "EPSG:3857", shape[1], shape[0], *bounds)
    west, south, east, north = transform_bounds("EPSG:3857", "EPSG:4326", *array_bounds(height, width, wt))
    warped = np.full((height, width), 255, dtype=np.uint8)
    reproject(data, warped, src_transform=transform, src_crs=crs,
              dst_transform=wt, dst_crs="EPSG:3857", src_nodata=255, dst_nodata=255,
              resampling=Resampling.nearest)
    rgba = np.zeros((height, width, 4), dtype=np.uint8)
    for value, color in colors.items():
        rgba[warped == value] = color
    path.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(rgba).save(path)
    return [[south, west], [north, east]]


def export_web(output, layers, transform, crs, summary):
    """Reproject categorical images to Web Mercator before making Leaflet PNGs."""
    colors = {"water_before": {1: (0, 215, 255, 210)}, "water_after": {1: (0, 215, 255, 210)},
              "change": {1: (0, 215, 255, 210), 2: (255, 70, 110, 220), 3: (255, 185, 45, 210)}}
    web_bounds = None
    for name, data in layers.items():
        web_bounds = write_web_png(output / f"{name}.png", data, transform, crs, colors[name]) or web_bounds
    manifest = {"bounds": web_bounds,
                "layers": {name: f"{name}.png" for name in layers},
                "status": summary["status"], "before": summary["metadata_before"], "after": summary["metadata_after"],
                "legend": "Cian: agua candidata persistente; rojo: nueva; ámbar: retroceso. Sin validación local.",
                "threshold_before_db": summary["threshold_before_db"],
                "threshold_after_db": summary["threshold_after_db"],
                "strong_margin_db": summary["strong_margin_db"],
                "change_unavailable_reason": summary.get("change_unavailable_reason")}
    (output / "web_manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")


def run_single(path, output, bbox, thresholds, margin=2.0, polarization="HHHH", units="power", mask_values=None):
    """Agua candidata de una sola adquisicion, con variantes por umbral.

    Sin una segunda fecha comparable no se puede publicar un producto de
    cambio, pero si el agua candidata de esa fecha para varios umbrales.
    """
    if not thresholds or not all(np.isfinite(v) for v in (*bbox, *thresholds, margin)) or margin < 0:
        raise ValueError("Parametros numericos invalidos")
    if not (-180 <= bbox[0] < bbox[2] <= 180 and -85 <= bbox[1] < bbox[3] <= 85):
        raise ValueError("BBox invalido: oeste sur este norte")
    db, transform, crs, meta = read_raster(path, bbox, polarization, units, mask_values)
    if not crs.is_projected or crs.linear_units != "metre":
        raise ValueError("La malla de referencia debe usar coordenadas proyectadas en metros")
    valid = np.isfinite(db)
    if not valid.any():
        raise ValueError("No hay pixeles validos en esta zona")
    ha = abs(transform.a * transform.e - transform.b * transform.d) / 10000
    output = Path(output)
    output.mkdir(parents=True, exist_ok=True)
    variants = {}
    for index, threshold in enumerate(sorted(thresholds)):
        wet = water_candidates(db, threshold, margin) & valid
        layer = np.where(valid, wet, 255).astype(np.uint8)
        name = f"water_before"
        relative = f"thresholds/m{index}/{name}.png"
        web_bounds = write_web_png(output / relative, layer, transform, crs, {1: (0, 215, 255, 210)})
        variants[f"{threshold:.1f}"] = {"layers": {name: relative},
                                        "area_ha": {"before": float(wet.sum() * ha)}}
    default = sorted(thresholds)[len(thresholds) // 2]
    default_rel = f"thresholds/m{sorted(thresholds).index(default)}/water_before.png"
    summary = {"status": "single_date_water_candidates_unvalidated",
               "source": str(Path(path).resolve()),
               "metadata_before": meta, "metadata_after": None,
               "crs": crs.to_string(), "threshold_before_db": default,
               "threshold_after_db": default, "strong_margin_db": margin,
               "polarization": polarization, "accepted_mask_values": mask_values,
               "valid_pixels": int(valid.sum()),
               "thresholds_db": sorted(thresholds),
               "warning": "Umbrales pendientes de validacion local. Una sola adquisicion no permite cambio."}
    (output / "summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    manifest = {"bounds": web_bounds,
                "layers": {"water_before": default_rel},
                "threshold_variants": variants,
                "status": summary["status"], "before": meta, "after": None,
                "legend": "Cian: agua candidata en la imagen NISAR GCOV del dia indicado. Sin validacion local.",
                "threshold_before_db": default, "threshold_after_db": default,
                "strong_margin_db": margin,
                "change_unavailable_reason": "Solo hay una adquisicion en esta zona: no se puede calcular cambio entre fechas.",
                "adquisiciones": 1}
    (output / "web_manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    return summary


def run(before_path, after_path, output, bbox, threshold_before, threshold_after,
        margin=2.0, polarization="HHHH", units="power", mask_values=None, independent_dates=False):
    if not all(np.isfinite(v) for v in (*bbox, threshold_before, threshold_after, margin)) or margin < 0:
        raise ValueError("Parámetros numéricos inválidos")
    if not (-180 <= bbox[0] < bbox[2] <= 180 and -85 <= bbox[1] < bbox[3] <= 85):
        raise ValueError("BBox inválido: oeste sur este norte")
    before, transform, crs, meta_before = read_raster(before_path, bbox, polarization, units, mask_values)
    after, at, ac, meta_after = read_raster(after_path, bbox, polarization, units, mask_values)
    # Area totals require a metre-based projected grid; do not count degrees².
    if not crs.is_projected or crs.linear_units != "metre":
        raise ValueError("La malla de referencia debe usar coordenadas proyectadas en metros")
    for key in ("trackNumber", "frameNumber", "orbitPassDirection", "compositeReleaseId", "productVersion"):
        if independent_dates and key in ("compositeReleaseId", "productVersion"):
            continue
        if key in meta_before and key in meta_after and meta_before[key] != meta_after[key]:
            raise ValueError(f"Las escenas no son comparables: {key}")
    if ("zeroDopplerStartTime" in meta_before and "zeroDopplerStartTime" in meta_after
            and meta_after["zeroDopplerStartTime"] <= meta_before["zeroDopplerStartTime"]):
        raise ValueError("La fecha after debe ser posterior a before")
    after = align_to_reference(after, at, ac, before.shape, transform, crs)
    vb, va = np.isfinite(before), np.isfinite(after)
    common = vb & va
    if not common.any():
        raise ValueError("Las escenas no tienen píxeles válidos comunes en esta zona")
    wb, wa = water_candidates(before, threshold_before, margin), water_candidates(after, threshold_after, margin)
    output = Path(output)
    output.mkdir(parents=True, exist_ok=True)
    if independent_dates and any((output / name).exists() for name in ("change.tif", "change.png", "delta_db.tif")):
        raise ValueError("Usa una carpeta nueva: la salida contiene cambios de un procesamiento anterior")
    layers = {"water_before": np.where(vb, wb, 255).astype(np.uint8),
              "water_after": np.where(va, wa, 255).astype(np.uint8)}
    products = [
        ("before_db", before, np.nan), ("after_db", after, np.nan),
        ("water_before", np.where(vb, wb, 255).astype(np.uint8), 255),
        ("water_after", np.where(va, wa, 255).astype(np.uint8), 255),
    ]
    if not independent_dates:
        change = change_classes(wb, wa, vb, va)
        delta = np.where(common, after - before, np.nan).astype(np.float32)
        products.extend([("change", change, 255), ("delta_db", delta, np.nan)])
        layers["change"] = change
    for name, data, nodata in products:
        write_tif(output / f"{name}.tif", data, transform, crs, nodata)
    ha = abs(transform.a * transform.e - transform.b * transform.d) / 10000
    summary = {"status": "independent_water_candidates_unvalidated" if independent_dates else "water_candidates_unvalidated", "before": str(Path(before_path).resolve()),
               "after": str(Path(after_path).resolve()), "metadata_before": meta_before, "metadata_after": meta_after,
               "crs": crs.to_string(), "threshold_before_db": threshold_before,
               "threshold_after_db": threshold_after, "strong_margin_db": margin,
               "polarization": polarization, "accepted_mask_values": mask_values,
               "common_valid_pixels": int(common.sum()),
               "class_legend": {"0": "no water candidate", "1": "persistent water candidate",
                                "2": "new water candidate", "3": "lost water candidate", "255": "NoData"},
               "warning": "Umbrales pendientes de validación local. El cambio no confirma inundación."}
    if independent_dates:
        summary.pop("class_legend")
        summary["change_unavailable_reason"] = "Fechas analizadas por separado; no se ha calculado cambio entre versiones de procesamiento distintas."
        summary["area_ha_by_date"] = {"before": float(wb.sum() * ha), "after": float(wa.sum() * ha)}
    else:
        summary["area_ha_common_coverage"] = {str(i): float(np.sum(change == i) * ha) for i in range(4)}
    (output / "summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    export_web(output, layers, transform, crs, summary)
    return summary


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--inspect", help="Inspeccionar capas y códigos de calidad de un HDF5")
    p.add_argument("--before")
    p.add_argument("--after")
    p.add_argument("--output", default="output/gcov")
    p.add_argument("--bbox", nargs=4, type=float, metavar=("WEST", "SOUTH", "EAST", "NORTH"))
    p.add_argument("--threshold-before", type=float)
    p.add_argument("--threshold-after", type=float)
    p.add_argument("--margin", type=float, default=2.0)
    p.add_argument("--polarization", choices=["HHHH", "HVHV", "VVVV", "VHVH"], default="HHHH")
    p.add_argument("--units", choices=["power", "db"], default="power", help="Solo para GeoTIFF; HDF5 siempre potencia")
    p.add_argument("--mask-values", nargs="+", type=int)
    p.add_argument("--independent-dates", action="store_true", help="Exportar agua por fecha sin calcular cambio ni delta entre versiones diferentes")
    p.add_argument("--single", action="store_true", help="Procesar una sola adquisicion y publicar agua por umbral")
    p.add_argument("--thresholds", nargs="+", type=float, help="Umbrales de agua para --single")
    a = p.parse_args()
    if a.inspect:
        inspect_h5(a.inspect)
        return
    if a.single:
        if not a.before or not a.bbox or not a.thresholds:
            p.error("Indica --before, --bbox y --thresholds para --single")
        try:
            print(json.dumps(run_single(a.before, a.output, a.bbox, a.thresholds, a.margin,
                                        a.polarization, a.units, a.mask_values), indent=2))
        except (ValueError, KeyError, OSError) as exc:
            p.exit(1, f"No se pudo procesar GCOV: {exc}\n")
        return
    if not all([a.before, a.after, a.bbox]) or a.threshold_before is None or a.threshold_after is None:
        p.error("Indica --before, --after, --bbox y ambos umbrales de agua")
    try:
        print(json.dumps(run(a.before, a.after, a.output, a.bbox, a.threshold_before,
                             a.threshold_after, a.margin, a.polarization, a.units, a.mask_values, a.independent_dates), indent=2))
    except (ValueError, KeyError, OSError) as exc:
        p.exit(1, f"No se pudo procesar GCOV: {exc}\n")


if __name__ == "__main__":
    main()
