"""Vista previa de la exportacion tal como la pinta el visor."""
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw

root = Path(sys.argv[1] if len(sys.argv) > 1 else "output/nisar_majes")
out = sys.argv[2] if len(sys.argv) > 2 else "tmp_preview.png"
man = json.loads((root / "web_manifest.json").read_text(encoding="utf-8"))
sar = Image.open(root / man["layers"]["sar_before"]).convert("RGBA")
mask = Image.open(root / man["layers"]["channels_before"]).convert("RGBA")
geo = json.loads((root / man["channels"]).read_text(encoding="utf-8"))

base = sar.convert("RGB")
base = Image.alpha_composite(base.convert("RGBA"), mask).convert("RGB")
d = ImageDraw.Draw(base)
w, h = base.size
west, south = man["bounds"][0]
east, north = man["bounds"][1]
colors = {"corredor_ripario_claro": (255, 212, 59), "agua_abierta_oscura": (0, 229, 255)}
for f in geo["features"]:
    pts = [( (p[0]-west)/(east-west)*w, (north-p[1])/(north-south)*h ) for p in f["geometry"]["coordinates"]]
    if len(pts) > 1:
        d.line(pts, fill=colors.get(f["properties"]["tipo"], (255, 0, 0)), width=3)
base.save(out)
print("saved", out, base.size, "features", len(geo["features"]))
for f in geo["features"][:8]:
    p = f["properties"]
    print(" ", p["tipo"], p["largo_m"], "m", p["elongacion"], p["db_medio"])
