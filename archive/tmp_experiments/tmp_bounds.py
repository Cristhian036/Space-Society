import numpy as np
from rasterio.warp import transform as wt
x = [581050.0, 911510.0]
y = [8273510.0, 7953130.0]
print(wt("EPSG:32718","EPSG:4326", x, y))
