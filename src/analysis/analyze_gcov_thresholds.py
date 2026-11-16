"""Compare water-candidate thresholds per date without making change claims."""
import argparse
import json
from pathlib import Path

import numpy as np

import gcov_water as g


def analyze(paths, bbox, output, mask_values, thresholds=(-20, -18, -16, -14), margin=2):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    output = Path(output)
    output.mkdir(parents=True, exist_ok=True)
    fig, axes = plt.subplots(len(paths), 1 + len(thresholds), figsize=(17, 3.5 * len(paths)), squeeze=False)
    results = []
    for row, path in enumerate(paths):
        db, transform, crs, meta = g.read_raster(path, bbox, mask_values=mask_values)
        valid = np.isfinite(db)
        ha = abs(transform.a * transform.e - transform.b * transform.d) / 10000
        date = meta.get("zeroDopplerStartTime", Path(path).name)[:10]
        ax = axes[row, 0]
        ax.imshow(db, cmap="gray", vmin=-25, vmax=-5)
        ax.set_title(f"{date} HH (dB)")
        record = {"file": str(Path(path).resolve()), "metadata": meta, "crs": crs.to_string(),
                  "valid_pixels": int(valid.sum()), "pixel_area_ha": ha, "sensitivity": [],
                  "valid_db_percentiles": dict(zip(["min", "p05", "median", "p95", "max"],
                      np.percentile(db[valid], [0, 5, 50, 95, 100]).astype(float).tolist()))}
        for col, threshold in enumerate(thresholds, 1):
            wet = g.water_candidates(db, threshold, margin)
            record["sensitivity"].append({"threshold_db": threshold, "seed_db": threshold - margin,
                "candidate_pixels": int(wet.sum()), "candidate_area_ha": float(wet.sum() * ha),
                "percent_valid_area": float(wet.sum() / valid.sum() * 100)})
            ax = axes[row, col]
            ax.imshow(db, cmap="gray", vmin=-25, vmax=-5)
            rgba = np.zeros((*db.shape, 4))
            rgba[wet] = [0, 1, 1, .7]
            ax.imshow(rgba)
            ax.set_title(f"{threshold} dB; semillas {threshold-margin} dB\n{wet.sum()*ha:.1f} ha candidatas")
        for ax in axes[row]:
            ax.axis("off")
        results.append(record)
    fig.suptitle("Candidatos por umbral: no equivalen a agua confirmada. Analisis independiente por fecha.")
    fig.tight_layout()
    fig.savefig(output / "sensibilidad_umbrales.png", dpi=130)
    plt.close(fig)
    (output / "sensibilidad_umbrales.json").write_text(json.dumps({"bbox_wgs84": bbox,
        "accepted_mask_values": mask_values, "strong_margin_db": margin, "dates": results,
        "warning": "Sin validacion local. Las areas son candidatos por retrodispersion, no inundaciones confirmadas."},
        ensure_ascii=False, indent=2), encoding="utf-8")
    return results


if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("files", nargs="+")
    p.add_argument("--bbox", nargs=4, required=True, type=float)
    p.add_argument("--output", default="output/gcov_diagnostico")
    p.add_argument("--mask-values", nargs="+", required=True, type=int)
    a = p.parse_args()
    analyze(a.files, a.bbox, a.output, a.mask_values)
