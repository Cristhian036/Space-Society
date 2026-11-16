import json, numpy as np
net = json.loads(open("assets/river_reference_network.json", encoding="utf-8").read())
print(net.keys())
polys = net.get("polylines", [])
print("n polylines", len(polys))
regions = {}
for p in polys:
    regions.setdefault(p.get("region"), 0)
    regions[p.get("region")] += 1
print(regions)
