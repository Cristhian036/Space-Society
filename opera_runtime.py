"""Run upstream DSWx-NI with one GDAL 3.12 storage compatibility workaround.

GDAL now materializes NBITS=16 Float32 COGs as Float16, which OpenCV Sobel
cannot process. Keep upstream Float32 intermediates in Float32 instead.
No classification thresholds or decision rules are changed here.
"""
import functools
import inspect
from osgeo import gdal
from dswx_sar.common import _dswx_sar_util as util

original = util._save_as_cog
signature = inspect.signature(original)


@functools.wraps(original)
def save_compatible(*args, **kwargs):
    bound = signature.bind_partial(*args, **kwargs)
    dataset = gdal.Open(str(bound.arguments['filename']))
    if dataset.GetRasterBand(1).DataType == gdal.GDT_Float32:
        bound.arguments['nbits'] = None
    dataset = None
    return original(*bound.args, **bound.kwargs)


util._save_as_cog = save_compatible

if __name__ == '__main__':
    from dswx_sar.dswx_ni import main
    main()
