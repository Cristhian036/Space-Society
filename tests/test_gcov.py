import json

import h5py
import numpy as np
import pytest
import rasterio
from PIL import Image
from rasterio.transform import from_origin, array_bounds
from rasterio.warp import transform_bounds

import gcov_water as g


def test_power_log_and_invalid_values():
    db = g.power_to_db(np.array([[1, .01, 0, -1, np.nan, np.inf]]))
    np.testing.assert_allclose(db[0, :2], [0, -20])
    assert np.isnan(db[0, 2:]).all()


def test_thin_water_continues_only_where_evidence_exists():
    db = np.full((7, 9), -5.0)
    db[3, 1:8] = -15
    db[3, 1] = -20
    wet = g.water_candidates(db, -14, margin=2)
    assert wet[3, 1:8].all()
    assert wet.sum() == 7
    db[3, 4] = np.nan
    wet = g.water_candidates(db, -14, margin=2)
    assert wet[3, 1:4].all()
    assert not wet[3, 4:].any()  # NoData is not filled or bridged.
    db[3, 4] = -5
    assert not g.water_candidates(db, -14)[3, 4:].any()


def test_persistent_water_is_not_lost_from_change_product():
    before = np.array([[True, False, True, False, True]])
    after = np.array([[True, True, False, False, True]])
    valid = np.ones_like(before)
    va = valid.copy()
    va[0, 4] = False
    np.testing.assert_array_equal(g.change_classes(before, after, valid, va), [[1, 2, 3, 0, 255]])


def fixture_tif(path, data, transform):
    g.write_tif(path, data.astype(np.float32), transform, rasterio.crs.CRS.from_epsg(32718), np.nan)


def test_full_geotiff_pipeline_realigns_shift_and_writes_georeferencing(tmp_path):
    transform = from_origin(740000, 8168000, 20, 20)
    before = np.full((10, 10), .1, dtype=np.float32)
    before[:, 4] = .001
    after = np.full((10, 10), .1, dtype=np.float32)
    after[:, 3] = .001  # Same channel, second image starts one pixel east.
    after[5:8, 4] = .001  # New candidate water adjacent to existing channel.
    fixture_tif(tmp_path / 'a.tif', before, transform)
    fixture_tif(tmp_path / 'b.tif', after, transform * rasterio.Affine.translation(1, 0))
    bbox = transform_bounds('EPSG:32718', 'EPSG:4326', *array_bounds(10, 10, transform))
    summary = g.run(tmp_path/'a.tif', tmp_path/'b.tif', tmp_path/'out', bbox, -14, -14)
    with rasterio.open(tmp_path/'out/change.tif') as src:
        result = src.read(1)
        assert src.crs.to_epsg() == 32718
        assert src.transform == transform
        assert (result[:, 4] == 1).all()
        assert (result[5:8, 5] == 2).all()
        assert (result[:, 0] == 255).all()
        assert not (result == 3).any()
    assert summary['area_ha_common_coverage']['2'] == pytest.approx(.12)
    assert (tmp_path/'out/summary.json').exists()
    manifest = json.loads((tmp_path/'out/web_manifest.json').read_text(encoding='utf-8'))
    assert set(manifest['layers']) == {'water_before', 'water_after', 'change'}
    assert manifest['bounds'][0][0] < manifest['bounds'][1][0]
    for name in manifest['layers'].values():
        image = np.asarray(Image.open(tmp_path/'out'/name))
        assert image.shape[2] == 4
        assert (image[..., 3] == 0).any()


def fixture_h5(path, ascending=False):
    with h5py.File(path, 'w') as f:
        grp = f.create_group(g.GRID)
        grp['xCoordinates'] = np.arange(6) * 20.0 + 740010
        ys = 8167990 - np.arange(6) * 20.0
        grp['yCoordinates'] = ys[::-1] if ascending else ys
        grp['projection'] = 32718
        power = np.full((6, 6), .01, dtype=np.float32)
        power[2, 2] = 999
        grp['HHHH'] = power
        grp['HHHH'].attrs['_FillValue'] = 999
        quality = np.zeros((6, 6), dtype=np.uint8)
        quality[1, 1] = 3
        grp['mask'] = quality
        looks = np.ones((6, 6))
        looks[3, 3] = 0
        grp['numberOfLooks'] = looks
        ident = f.create_group('/science/LSAR/identification')
        ident['trackNumber'] = 147
        ident['frameNumber'] = 169
        ident['orbitPassDirection'] = np.bytes_('Ascending')


@pytest.mark.parametrize('ascending', [False, True])
def test_hdf5_masks_fill_looks_and_axis_orientation(tmp_path, ascending):
    path = tmp_path/'sample.h5'
    fixture_h5(path, ascending)
    bbox = transform_bounds('EPSG:32718','EPSG:4326',740000,8167880,740120,8168000)
    db, transform, crs, meta = g.read_raster(path,bbox,mask_values=[0])
    assert transform.e < 0
    assert crs.to_epsg() == 32718
    assert np.isnan(db).sum() == 3
    assert np.allclose(db[np.isfinite(db)], -20)
    assert meta['trackNumber'] == '147'
    with pytest.raises(ValueError, match='mask-values'):
        g.read_raster(path,bbox)


def test_different_processing_releases_are_rejected(tmp_path):
    a, b = tmp_path/'NISAR_P05023_a.h5', tmp_path/'NISAR_X05010_b.h5'
    fixture_h5(a)
    fixture_h5(b)
    bbox = transform_bounds('EPSG:32718','EPSG:4326',740000,8167880,740120,8168000)
    with pytest.raises(ValueError,match='compositeReleaseId'):
        g.run(a,b,tmp_path/'out',bbox,-14,-14,mask_values=[0])


def test_independent_dates_publish_water_without_cross_version_change(tmp_path):
    a, b = tmp_path/'NISAR_X05010_a.h5', tmp_path/'NISAR_P05023_b.h5'
    fixture_h5(a)
    fixture_h5(b)
    bbox = transform_bounds('EPSG:32718','EPSG:4326',740000,8167880,740120,8168000)
    summary = g.run(a,b,tmp_path/'out',bbox,-14,-14,mask_values=[0],independent_dates=True)
    assert summary['status'] == 'independent_water_candidates_unvalidated'
    assert 'area_ha_common_coverage' not in summary
    assert not (tmp_path/'out/change.tif').exists()
    assert not (tmp_path/'out/delta_db.tif').exists()
    manifest = json.loads((tmp_path/'out/web_manifest.json').read_text(encoding='utf-8'))
    assert set(manifest['layers']) == {'water_before','water_after'}
    assert manifest['threshold_before_db'] == -14
    assert manifest['strong_margin_db'] == 2
    (tmp_path/'out/change.tif').write_bytes(b'stale change')
    with pytest.raises(ValueError,match='carpeta nueva'):
        g.run(a,b,tmp_path/'out',bbox,-14,-14,mask_values=[0],independent_dates=True)


def test_input_exception_mask_excludes_anomalous_radar_samples(tmp_path):
    path = tmp_path/'sample.h5'
    fixture_h5(path)
    with h5py.File(path,'a') as f:
        exceptions = np.zeros((6,6), dtype=np.uint8)
        exceptions[4,4] = 2
        f[g.GRID]['inputDataExceptionMask'] = exceptions
    bbox = transform_bounds('EPSG:32718','EPSG:4326',740000,8167880,740120,8168000)
    db,_,_,_ = g.read_raster(path,bbox,mask_values=[0])
    assert np.isnan(db[4,4])
    assert np.isnan(db).sum() == 4
