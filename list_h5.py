import json

with open('AREQUIPA_NISAR_H5_ULTIMOS_6_MESES.json', encoding='utf-8') as f:
    data = json.load(f)

print(f"Total general de archivos .h5: {len(data)}\n")

for zone in [
    'Arequipa Centro / Río Chili / Uchumayo / Yura',
    'Camaná / Valle de Majes / Quilca',
    'Majes / La Joya / Siguas / Santa Rita',
    'Arequipa Oriental / Misti / Chiguata / Tambo Alto',
    'Ocoña / Caravelí / Camaná Oeste',
    'Costa Occidental / Atico / Chala / Ocoña',
    'Límite Occidental Caravelí / Nazca'
]:
    subset = [d for d in data if d['zone'] == zone]
    print(f"=== {zone} ({len(subset)} escenas) ===")
    for d in subset:
        print(f"  • {d['date']} | Track {d['track']} Frame {d['frame']} ({d['pass'][0]}) | {d['granule_id']} ({d['size_mb']} MB)")
    print()
