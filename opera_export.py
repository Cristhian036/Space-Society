"""Export upstream WTR as a diagnostic layer, with explicit plausibility checks."""
import json
from pathlib import Path
import numpy as np
import rasterio
from rasterio.warp import reproject, calculate_default_transform, Resampling, transform_bounds
from rasterio.transform import array_bounds
from PIL import Image

ROOT=Path(__file__).resolve().parent
OUT=ROOT/'output/opera_chili'


def assess(data, log):
    valid=~np.isin(data,[250,251,254,255])
    fraction=float(np.isin(data[valid],[1,2,8]).mean()) if valid.any() else 0.0
    usable=bool(valid.any()) and fraction<.9 and 'threshold array is empty' not in log
    return fraction,usable


def export(output=None):
    OUT=Path(output) if output else ROOT/'output/opera_chili'
    provenance=json.loads((OUT/'provenance.json').read_text(encoding='utf-8'))
    path=OUT/'scratch/full_water_binary_WTR_set.tif'
    with rasterio.open(path) as src:
        data=src.read(1)
        transform,width,height=calculate_default_transform(src.crs,'EPSG:3857',src.width,src.height,*src.bounds)
        dst=np.full((height,width),255,dtype=np.uint8)
        reproject(data,dst,src_transform=src.transform,src_crs=src.crs,dst_transform=transform,dst_crs='EPSG:3857',src_nodata=255,dst_nodata=255,resampling=Resampling.nearest)
    rgba=np.zeros((*dst.shape,4),dtype=np.uint8)
    rgba[dst==1]=[255,130,30,170]
    rgba[dst==8]=[255,220,40,170]
    rgba[dst==3]=[200,70,255,200]
    Image.fromarray(rgba).save(OUT/'diagnostic.png')
    west,south,east,north=transform_bounds('EPSG:3857','EPSG:4326',*array_bounds(height,width,transform))
    unique,counts=np.unique(data,return_counts=True)
    log=(OUT/'execution.log').read_text(encoding='utf-8',errors='replace')
    fraction,usable=assess(data,log)
    manifest={'bounds':[[south,west],[north,east]],'image':'diagnostic.png','status':'experimental' if usable else 'not_usable',
        'source':'upstream DSWx-NI 0.3.0 with Float32 COG compatibility workaround',
        'date':provenance.get('date','2026-09-09'),'classes':dict(zip(map(str,unique.tolist()),counts.tolist())),
        'water_fraction':fraction,'empty_threshold_warning':'threshold array is empty' in log,
        'warning':('DIAGNÓSTICO NO UTILIZABLE: '+('no se estimaron umbrales locales fiables. ' if 'threshold array is empty' in log else '')+
                   ('Casi todo el recorte fue clasificado como agua. ' if fraction>=.9 else 'No se detectó agua abierta. ' if fraction==0 else '')+
                   'No interpretar como inundación ni como río seco.') if not usable else 'Resultado experimental sin validación local.'}
    (OUT/'web_manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
    provenance=json.loads((OUT/'provenance.json').read_text(encoding='utf-8'))
    provenance.update(status='executed_but_not_usable' if not usable else 'executed_experimental',exit_code=0,
                      compatibility_workaround='Float32 COG intermediates retained to avoid unsupported Float16 Sobel inputs',
                      glad='GLAD GLCLU2020 land cover 2020',diagnostic=manifest)
    (OUT/'provenance.json').write_text(json.dumps(provenance,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(manifest,ensure_ascii=False,indent=2))


if __name__=='__main__':
    export()
