import math, urllib.request, io
from PIL import Image
west, south, east, north = -72.80, -16.68, -72.70, -16.58
z = 15
def deg2num(lon, lat, z):
    x = int((lon + 180.0) / 360.0 * (2 ** z))
    y = int((1.0 - math.log(math.tan(math.radians(lat)) + 1 / math.cos(math.radians(lat))) / math.pi) / 2.0 * (2 ** z))
    return x, y
x0, y0 = deg2num(west, north, z)
x1, y1 = deg2num(east, south, z)
print("tiles", x0, y0, x1, y1)
cols = x1 - x0 + 1
rows = y1 - y0 + 1
canvas = Image.new("RGB", (cols * 256, rows * 256))
for r in range(rows):
    for c in range(cols):
        url = f"https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y0 + r}/{x0 + c}"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        try:
            data = urllib.request.urlopen(req, timeout=30).read()
            canvas.paste(Image.open(io.BytesIO(data)).convert("RGB"), (c * 256, r * 256))
        except Exception as e:
            print("fail", url, e)
canvas.save("tmp_esri.png")
print("saved", canvas.size)
