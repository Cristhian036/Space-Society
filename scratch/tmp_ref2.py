import json
net = json.loads(open("assets/river_reference_network.json", encoding="utf-8").read())
print("source:", net.get("source"))
print("status:", net.get("status"))
print("metrics:", json.dumps(net.get("metrics"), ensure_ascii=False)[:800])
for p in net["polylines"]:
    if p.get("region") == "majes_camana_canyon":
        print({k: v for k, v in p.items() if k != "coords"})
        print("first coords", p["coords"][:4])
        break
# buscar el tramo mas cercano al punto medio del cauce visible (-72.745,-16.625)
best=None
for p in net["polylines"]:
    for c in p["coords"]:
        d=(c[1]+72.745)**2+(c[0]+16.625)**2
        if best is None or d<best[0]:
            best=(d,p,c)
print("nearest ref point", best[2], {k:v for k,v in best[1].items() if k!="coords"})
