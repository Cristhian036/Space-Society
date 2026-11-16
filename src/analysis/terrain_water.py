"""Exploratory SAR + topographic screening. Does not model radar shadow geometry."""
import json
from pathlib import Path

import numpy as np
import rasterio
from rasterio.transform import from_bounds
from rasterio.warp import reproject, Resampling
from scipy import ndimage as ndi

import hydro_sar_microservice as h
import gcov_water as g


def drainage_height(z, receivers, order, drainage):
    """Height above first downstream drainage cell; unresolved outlets stay NaN."""
    base = np.full(z.size, np.nan)
    flat = z.ravel()
    for i in order[::-1]:
        if drainage[i]:
            base[i] = flat[i]
        elif receivers[i] >= 0:
            base[i] = base[receivers[i]]
    return np.maximum(0, flat - base).reshape(z.shape)


def screen(db, hand, slope, threshold, max_hand=15, max_slope=7):
    support = np.isfinite(hand) & np.isfinite(slope) & (hand <= max_hand) & (slope <= max_slope)
    return g.water_candidates(np.where(support, db, np.nan), threshold, 2)


def build(output='output/gcov', bbox=(-72.7578,-16.59663,-72.6922,-16.53337)):
    output = Path(output)
    with rasterio.open(output/'before_db.tif') as src:
        shape, target_transform, target_crs = src.shape, src.transform, src.crs
    # Buffer the AOI so flow routing is not defined by the visible map boundary.
    zoom = 12
    x0, x1 = int(h.lon2tile_x(bbox[0],zoom))-1, int(h.lon2tile_x(bbox[2],zoom))+1
    y0, y1 = int(h.lat2tile_y(bbox[3],zoom))-1, int(h.lat2tile_y(bbox[1],zoom))+1
    z = h.decode_dem(h._mosaic('dem',zoom,x0,x1,y0,y1))
    print('DEM downloaded',z.shape,flush=True)
    lat = np.array([h.tile_y2lat(y0+(r+.5)/256,zoom) for r in range(z.shape[0])])
    metres = 156543.03392*np.cos(np.radians(lat))/2**zoom
    cell = np.repeat((metres**2/1e6)[:,None],z.shape[1],axis=1)
    smooth = ndi.gaussian_filter(z,.8)
    seeds = z<=0
    seeds[0,:]=seeds[-1,:]=True
    seeds[:,0]=seeds[:,-1]=True
    conditioned = h.priority_flood_eps(smooth,seeds,1e-4)
    rec=h.d8_receivers(conditioned,z<=0,float(metres.mean()),metres)
    order=np.argsort(-conditioned.ravel(),kind='stable')
    acc=h.accumulate(order,rec,cell.ravel())
    hand=drainage_height(smooth,rec,order,acc>=1.0)
    sy,sx=np.gradient(smooth,float(metres.mean()))
    slope=np.degrees(np.arctan(np.hypot(sx,sy)))
    size=20037508.342789244
    n=2**zoom
    transform=from_bounds(x0/n*2*size-size,size-(y1+1)/n*2*size,
                          (x1+1)/n*2*size-size,size-y0/n*2*size,z.shape[1],z.shape[0])
    aligned={}
    for name,data in [('hand',hand),('slope',slope)]:
        dst=np.full(shape,np.nan,dtype=np.float32)
        reproject(data,dst,src_transform=transform,src_crs='EPSG:3857',dst_transform=target_transform,
                  dst_crs=target_crs,src_nodata=np.nan,dst_nodata=np.nan,resampling=Resampling.nearest)
        aligned[name]=dst
        g.write_tif(output/f'terrain_{name}.tif',dst,target_transform,target_crs,np.nan)
    manifest=json.loads((output/'web_manifest.json').read_text(encoding='utf-8'))
    variants={}
    for threshold in np.arange(-26,-7.9,.5):
        sub=Path('terrain')/('m'+str(int(-threshold*10)))
        dest=output/sub;dest.mkdir(parents=True,exist_ok=True)
        layers={};areas={}
        for date in ['before','after']:
            with rasterio.open(output/f'{date}_db.tif') as src: db=src.read(1)
            wet=screen(db,aligned['hand'],aligned['slope'],threshold)
            valid=np.isfinite(db)&np.isfinite(aligned['hand'])&np.isfinite(aligned['slope'])
            layers['water_'+date]=np.where(valid,wet,255).astype(np.uint8)
            areas[date]=float(wet.sum()*abs(target_transform.a*target_transform.e)/10000)
        summary=dict(status='terrain_screened_unvalidated',metadata_before=manifest['before'],metadata_after=manifest['after'],
                     threshold_before_db=float(threshold),threshold_after_db=float(threshold),strong_margin_db=2,
                     change_unavailable_reason=manifest['change_unavailable_reason'])
        g.export_web(dest,layers,target_transform,target_crs,summary)
        variants[f'{threshold:.1f}']=dict(layers={name:(sub/(name+'.png')).as_posix() for name in layers},area_ha=areas)
    manifest['terrain_variants']=variants
    manifest['terrain_method']={'dem_source':'AWS Terrarium elevation composite; native provenance not independently verified',
        'dem_zoom':zoom,'approx_pixel_metres':float(metres.mean()),'max_hand_m':15,'max_slope_deg':7,
        'drainage_area_km2':1,'status':'exploratory_not_validated','radar_shadow_mask':False}
    (output/'web_manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
    print('Areas at -14 dB:',variants['-14.0']['area_ha'],flush=True)


if __name__=='__main__':
    import argparse
    parser=argparse.ArgumentParser()
    parser.add_argument('--output',default='output/gcov')
    parser.add_argument('--bbox',nargs=4,type=float,default=[-72.7578,-16.59663,-72.6922,-16.53337])
    args=parser.parse_args()
    build(args.output,args.bbox)
