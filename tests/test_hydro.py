import json
from unittest.mock import patch

import numpy as np
import pytest

import hydro_sar_microservice as h


def test_adjacent_confluences_keep_every_link():
    rec = np.array([2, 2, 4, 4, 5, -1], dtype=np.int64)
    stream = np.ones(6, dtype=bool)
    so, nup = h.strahler(np.arange(6), rec, stream)
    paths = [p.tolist() for p in h.stream_paths(rec, stream, nup)]
    assert paths == [[0, 2], [1, 2], [2, 4], [3, 4], [4, 5]]
    edges = {(a, b) for p in paths for a, b in zip(p, p[1:])}
    assert edges == {(i, int(r)) for i, r in enumerate(rec) if r >= 0}


def test_paths_stop_at_non_stream_receiver():
    rec = np.array([1, 2, 3, -1])
    paths = list(h.stream_paths(rec, np.array([True, True, False, True]), np.array([0, 1, 0, 0])))
    assert [p.tolist() for p in paths] == [[0, 1, 2]]


def test_missing_dem_is_not_ocean():
    rgb = np.zeros((4, 4, 3), dtype=np.float32)
    rgb[:] = [128, 12, 0]
    assert (h.decode_dem(rgb) == 12).all()
    rgb[1, 1, 0] = np.nan
    with pytest.raises(ValueError, match="DEM incompleto"):
        h.decode_dem(rgb)


def test_complete_cache_keys_cover_settings_and_empty_results(tmp_path):
    fixture = {"status": "ok", "metrics": {}, "polylines": []}
    with patch.object(h, "RESULT_CACHE_PATH", str(tmp_path / "cache.sqlite")), patch.object(h, "extract_rivers", return_value=fixture) as compute:
        h.compute_cached_rivers(-17, -16, -73, -72)
        cached = h.compute_cached_rivers(-17, -16, -73, -72)
        assert cached["source"] == "complete_result_cache"
        assert cached["polylines"] == []
        assert compute.call_count == 1
        h.compute_cached_rivers(-17, -16, -73, -72, burn=False)
        h.compute_cached_rivers(-17, -16, -73, -72, sens=2)
        h.compute_cached_rivers(-17, -16, -73, -72, res="standard")
        h.compute_cached_rivers(-17, -15, -73, -72)
        h.compute_cached_rivers(-17, -16, -73, -72, force=True)
        assert compute.call_count == 6


def test_invalid_view_never_downloads():
    with patch.object(h, "extract_rivers") as compute:
        with pytest.raises(ValueError):
            h.compute_cached_rivers(-16, -17, -73, -72)
        assert not compute.called
