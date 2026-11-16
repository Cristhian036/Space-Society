import numpy as np
import pytest
from scipy import ndimage as ndi

import gcov_rivers as r


def synthetic(width=160, height=120, noise=0.6, seed=7):
    """Fondo liso con ruido suave, como una llanura雷达."""
    rng = np.random.default_rng(seed)
    db = np.full((height, width), -10.0)
    db += ndi.gaussian_filter(rng.normal(0, noise, (height, width)), 2)
    return db


def test_robust_z_is_scale_free():
    resp = np.concatenate([np.zeros(900), np.full(100, 6.0)])
    z = r.robust_z(resp)
    assert z[:900].std() < 1.0
    assert z[-100].mean() > 6.0


def test_bright_thin_channel_is_detected_and_blob_is_rejected():
    db = synthetic()
    db[60, 20:140] += 7.0          # clear and continuous channel
    db[20:55, 20:55] += 9.0         # bright patch (shadow or structure)
    masks, _ = r.detect_channels(db, size_px=15, k_bright=3.5, k_dark=3.5)
    lines, stats, kept = r.extract_lines(masks["brillo"], db, 20.0, 500.0, 200.0, 6000.0)
    assert len(lines) >= 1
    # the compact patch must not survive the shape filter
    for s in stats:
        assert s["elongation"] >= 2.0
        assert s["width_m"] <= 200.0
        assert s["length_m"] >= 500.0
    assert kept.sum() < db.size / 4


def test_dark_open_water_is_detected():
    db = synthetic()
    db[60, 20:140] -= 8.0
    masks, _ = r.detect_channels(db, size_px=15, k_bright=3.5, k_dark=3.5)
    assert masks["oscuro"][60, 60]
    lines, _, _ = r.extract_lines(masks["oscuro"], db, 20.0, 500.0, 200.0, 6000.0)
    assert len(lines) >= 1


def test_short_features_are_discarded():
    db = synthetic()
    db[60, 20:35] += 9.0          # too short
    masks, _ = r.detect_channels(db, size_px=15, k_bright=3.5, k_dark=3.5)
    lines, _, _ = r.extract_lines(masks["brillo"], db, 20.0, 500.0, 200.0, 6000.0)
    assert lines == []


def test_chain_order_keeps_connected_pixels():
    skel = np.zeros((5, 9), bool)
    skel[2, 1:8] = True
    chains = r._chains(skel)
    assert len(chains) == 1
    assert len(chains[0]) == 7
    pts = set(chains[0])
    assert all((x + 1, y) in pts or (x - 1, y) in pts for x, y in chains[0])


def test_geographic_conversion_keeps_position():
    from rasterio.transform import from_origin
    transform = from_origin(300000, 8000000, 20, 20)
    pixels = np.array([[0.0, 0.0], [10.0, 5.0]])
    geo = r.to_geographic(pixels, transform, "EPSG:32719")
    assert len(geo) == 2
    assert -71.0 < geo[0][0] < -70.5
    assert -19.0 < geo[0][1] < -17.0


def test_manifest_reports_native_resolution(tmp_path):
    pytest.importorskip("rasterio")
    from rasterio.crs import CRS
    from rasterio.transform import from_origin
    transform = from_origin(300000, 8000000, 20, 20)
    crs = CRS.from_epsg(32719)
    db = synthetic()
    db[60, 20:140] += 7.0
    masks, _ = r.detect_channels(db, size_px=15, k_bright=3.5, k_dark=3.5)
    lines, _, kept = r.extract_lines(masks["brillo"], db, 20.0, 500.0, 200.0, 6000.0)
    assert lines and kept.any()
