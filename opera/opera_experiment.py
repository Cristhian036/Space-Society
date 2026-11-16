"""Prepare and run the pinned upstream DSWx-NI implementation on a Chili crop.

No substitute classifier is called OPERA. Results are experimental, not an
official OPERA-distributed product. Original HDF5 files remain unchanged.
"""
import argparse
import json
import os
from pathlib import Path
import subprocess

import h5py
import numpy as np
import rasterio
from rasterio.warp import transform_bounds, reproject, Resampling, calculate_default_transform
from rasterio.transform import from_bounds
import yaml

ROOT = Path(__file__).resolve().parent
UPSTREAM = ROOT / '.dem_cache/DSWX-SAR'
REVISION = 'd9ae8ed5178417dec22a6fc549c4368cfd51ebe9'
OUT = ROOT / 'output/opera_chili'
GRID = '/science/LSAR/GCOV/grids/frequencyA'
BBOX = (-71.555, -16.425, -71.515, -16.37)
REGION='chili'
CONTEXT=ROOT/'output/chili'


def prepare():
    import hydro_sar_microservice as hydro
    revision = subprocess.check_output(['git', '-C', str(UPSTREAM), 'rev-parse', 'HEAD'], text=True).strip()
    if revision != REVISION:
        raise ValueError('Upstream revision differs from the audited experiment')
    OUT.mkdir(parents=True, exist_ok=True)
    pattern='*20260909*_P05023*.h5' if REGION=='chili' else '*20260904*_P05023*.h5'
    original = next(Path(r'C:\Users\estro\Downloads\nasa').glob(pattern))
    cropped = OUT / original.name
    with h5py.File(original, 'r') as src, h5py.File(cropped, 'w') as dst:
        group = src[GRID]
        x, y = group['xCoordinates'][:], group['yCoordinates'][:]
        bounds = transform_bounds('EPSG:4326', f"EPSG:{int(group['projection'][()])}", *BBOX)
        cols = np.flatnonzero((x >= bounds[0]-10) & (x <= bounds[2]+10))
        rows = np.flatnonzero((y >= bounds[1]-10) & (y <= bounds[3]+10))
        rs, cs = slice(rows[0], rows[-1]+1), slice(cols[0], cols[-1]+1)
        dst.require_group('/science/LSAR/GCOV')
        src.copy('/science/LSAR/identification', dst['/science/LSAR'])
        src.copy('/science/LSAR/GCOV/metadata', dst['/science/LSAR/GCOV'])
        target = dst.require_group(GRID)
        for name, ds in group.items():
            data = ds[rs,cs] if ds.shape == group['HHHH'].shape else ds[cs] if name == 'xCoordinates' else ds[rs] if name == 'yCoordinates' else ds[()]
            new = target.create_dataset(name, data=data)
            for key, value in ds.attrs.items():
                if key not in ('DIMENSION_LIST', 'REFERENCE_LIST'):
                    new.attrs[key] = value
        ident = dst['/science/LSAR/identification']
        if 'listOfFrequencies' in ident:
            del ident['listOfFrequencies']
            ident['listOfFrequencies'] = np.array([b'A'])
    # Use the measured-terrain context already prepared for this same AOI.
    with rasterio.open(CONTEXT/'before_db.tif') as ref:
        shape, transform, crs = ref.shape, ref.transform, ref.crs
    z=12
    x0,x1=int(hydro.lon2tile_x(BBOX[0],z)),int(hydro.lon2tile_x(BBOX[2],z))
    y0,y1=int(hydro.lat2tile_y(BBOX[3],z)),int(hydro.lat2tile_y(BBOX[1],z))
    dem=hydro.decode_dem(hydro._mosaic('dem',z,x0,x1,y0,y1))
    size=20037508.342789244;n=2**z
    source_transform=from_bounds(x0/n*2*size-size,size-(y1+1)/n*2*size,(x1+1)/n*2*size-size,size-y0/n*2*size,dem.shape[1],dem.shape[0])
    aligned=np.full(shape,np.nan,dtype=np.float32)
    reproject(dem,aligned,src_transform=source_transform,src_crs='EPSG:3857',dst_transform=transform,dst_crs=crs,resampling=Resampling.bilinear)
    import gcov_water
    dem_path=OUT/'dem.tif'
    gcov_water.write_tif(dem_path,aligned,transform,crs,np.nan)
    # The upstream ancillary relocation assumes geographic coordinates when
    # checking the antimeridian; supply geographic ancillary rasters.
    geographic={}
    for name,path in [('dem',dem_path),('hand',CONTEXT/'terrain_hand.tif')]:
        with rasterio.open(path) as src:
            gt,width,height=calculate_default_transform(src.crs,'EPSG:4326',src.width,src.height,*src.bounds)
            data=np.full((height,width),np.nan,dtype=np.float32)
            reproject(src.read(1),data,src_transform=src.transform,src_crs=src.crs,
                      dst_transform=gt,dst_crs='EPSG:4326',src_nodata=np.nan,dst_nodata=np.nan,resampling=Resampling.nearest)
        dest=OUT/f'{name}_geographic.tif'
        gcov_water.write_tif(dest,data,gt,'EPSG:4326',np.nan)
        geographic[name]=dest
    aux=ROOT/'.dem_cache'/('opera_ancillary' if REGION=='chili' else 'opera_ancillary_camana')
    aux.mkdir(exist_ok=True)
    if REGION=='camana':
        from rasterio.windows import from_bounds as window_bounds
        urls={
          'worldcover':'https://esa-worldcover.s3.eu-central-1.amazonaws.com/v200/2021/map/ESA_WorldCover_10m_2021_v200_S18W075_Map.tif',
          'reference_water':'https://storage.googleapis.com/global-surface-water/downloads2021/occurrence/occurrence_80W_10Sv1_4_2021.tif',
          'glad':'https://storage.googleapis.com/earthenginepartners-hansen/GLCLU2000-2020/2020/10S_080W.tif'}
        with rasterio.Env(GDAL_DISABLE_READDIR_ON_OPEN='EMPTY_DIR',GDAL_HTTP_TIMEOUT='30'):
            for name,url in urls.items():
                dest=aux/(name+'.tif')
                if dest.exists(): continue
                with rasterio.open(url) as source:
                    bounds=transform_bounds('EPSG:4326',source.crs,BBOX[0]-.02,BBOX[1]-.02,BBOX[2]+.02,BBOX[3]+.02)
                    win=window_bounds(*bounds,transform=source.transform).round_offsets().round_lengths()
                    data=source.read(window=win);profile=source.profile
                    profile.update(driver='GTiff',width=data.shape[2],height=data.shape[1],transform=source.window_transform(win))
                    with rasterio.open(dest,'w',**profile) as target: target.write(data)
                print('Downloaded',name,flush=True)
    cfg=yaml.safe_load((UPSTREAM/'src/dswx_sar/defaults/dswx_ni.yaml').read_text())
    groups=cfg['runconfig']['groups']
    groups['log_file']=str(OUT/'upstream.log')
    groups['primary_executable']['product_type']='dswx_ni'
    groups['input_file_group']['input_file_path']=[str(cropped)]
    ancillary=groups['dynamic_ancillary_file_group']
    for key,path in {'dem_file':geographic['dem'],'hand_file':geographic['hand'],
                     'worldcover_file':aux/'worldcover.tif',
                     'glad_classification_file':aux/'glad.tif',
                     'reference_water_file':aux/'reference_water.tif'}.items():
        if not path.exists():
            raise FileNotFoundError(path)
        ancillary[key]=str(path)
    groups['static_ancillary_file_group']['static_ancillary_inputs_flag']=False
    paths=groups['product_path_group']
    for key,folder in [('product_path','products'),('sas_output_path','products'),('scratch_path','scratch')]:
        (OUT/folder).mkdir(exist_ok=True);paths[key]=str(OUT/folder)
    paths['product_version']=0.1
    algorithm=yaml.safe_load((UPSTREAM/'src/dswx_sar/defaults/algorithm_parameter_ni.yaml').read_text())
    processing=algorithm['runconfig']['processing']
    processing['polarizations']=['HH','HV']
    processing['filter']['n_cpus']=1
    processing['initial_threshold']['number_cpu']=1
    algo_path=OUT/'algorithm.yaml';algo_path.write_text(yaml.safe_dump(algorithm),encoding='utf-8')
    ancillary['algorithm_parameters']=str(algo_path)
    config_path=OUT/'runconfig.yaml';config_path.write_text(yaml.safe_dump(cfg),encoding='utf-8')
    (OUT/'provenance.json').write_text(json.dumps({'upstream_revision':revision,'original':str(original),
        'region':REGION,'date':'2026-09-09' if REGION=='chili' else '2026-09-04','bbox':BBOX,'input_crop':str(cropped),'dem':'Terrarium composite, native provenance not independently verified',
        'hand':'local modeled HAND, experimental','worldcover':'ESA WorldCover 2021 v200',
        'reference_water':'JRC GSW occurrence 1984-2021 v1.4','status':'prepared_not_executed'},indent=2),encoding='utf-8')
    print(config_path)


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--run',action='store_true')
    parser.add_argument('--region',choices=['chili','camana'],default='chili')
    args=parser.parse_args()
    REGION=args.region
    if REGION=='camana':
        OUT=ROOT/'output/opera_camana'
        BBOX=(-72.7578,-16.59663,-72.6922,-16.53337)
        CONTEXT=ROOT/'output/gcov'
    prepare()
    if args.run:
        # Recreate only derived ancillary rasters left by earlier incompatible
        # Float16 COG attempts. Original data and other outputs are preserved.
        for name in ['interpolated_DEM.tif','interpolated_hand.tif']:
            path=OUT/'scratch'/name
            if path.exists():
                path.unlink()
        env=os.environ.copy();env['PYTHONPATH']=str(UPSTREAM/'src')
        cmd=[str(ROOT/'.dem_cache/micromamba/micromamba.exe'),'run','-p',str(ROOT/'.dem_cache/dswx-lite'),
             'python','-u',str(ROOT/'opera_runtime.py'),str(OUT/'runconfig.yaml')]
        with (OUT/'execution.log').open('w',encoding='utf-8') as log:
            result=subprocess.run(cmd,env=env,stdout=log,stderr=subprocess.STDOUT)
        print('Upstream exit code:',result.returncode,'Log:',OUT/'execution.log')
        if result.returncode == 0:
            from opera_export import export
            export(OUT)
        else:
            provenance=json.loads((OUT/'provenance.json').read_text(encoding='utf-8'))
            provenance.update(status='execution_failed',exit_code=result.returncode)
            (OUT/'provenance.json').write_text(json.dumps(provenance,indent=2),encoding='utf-8')
            (OUT/'web_manifest.json').write_text(json.dumps({'status':'failed','warning':'La última ejecución OPERA falló. Revisa output/opera_chili/execution.log.'}),encoding='utf-8')
        raise SystemExit(result.returncode)
