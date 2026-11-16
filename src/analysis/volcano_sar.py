#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
================================================================================
  Módulo de Monitoreo Volcánico y Corredores de Lahares con Radar NISAR
  Zona: Región Arequipa (Misti, Chachani, Sabancaya, Ubinas)
  Propósito:
    - Caracterización de rugosidad de depósitos volcánicos (Banda L GCOV)
    - Mapeo de corredores de lahares hacia torrenteras urbanas y el Río Chili
    - Zonificación de peligro volcánico alineada con estándares INGEMMET / CENEPRED
================================================================================
"""

import json
import math
import os
from pathlib import Path
import numpy as np

BASE_DIR = Path(__file__).resolve().parent.parent.parent
GEOJSON_DIR = BASE_DIR / "data" / "geojson"

# ==============================================================================
# 1. CATÁLOGO DE EDIFICIOS VOLCÁNICOS DE AREQUIPA
# ==============================================================================
VOLCANOES_CATALOG = [
    {
        "id": "misti",
        "name": "Volcán Misti",
        "type": "Estratovolcán activo",
        "elevation_m": 5822,
        "coordinates": [-71.4084, -16.2954], # [Lon, Lat]
        "distance_to_plaza_km": 17.5,
        "crater_diameter_m": 950,
        "status": "Activo en reposo / Emisión fumarólica débil",
        "alert_level": "Verde",
        "last_major_eruption": "Siglo XV (aprox. 1440-1470 d.C.)",
        "risk_population": 1100000,
        "threat_type": "Lahares por lluvias en torrenteras urbanas, caída de tefra y flujos piroclásticos",
        "sar_signature": {
            "hh_mean_db": -9.8,
            "hv_mean_db": -16.4,
            "roughness_class": "Muy alta (bloques de lava y andesita escarpada)",
            "primary_polarization_ratio": 0.22
        }
    },
    {
        "id": "sabancaya",
        "name": "Volcán Sabancaya",
        "type": "Complejo estratovolcánico activo",
        "elevation_m": 5976,
        "coordinates": [-71.8570, -15.7870],
        "distance_to_plaza_km": 72.0,
        "crater_diameter_m": 1200,
        "status": "Erupción explosiva continua (emisión de ceniza y gases)",
        "alert_level": "Naranja",
        "last_major_eruption": "En proceso activo continuo desde 2016",
        "risk_population": 35000,
        "threat_type": "Explosiones diarias, columnas de ceniza (>3.5 km), flujos piroclásticos en valle del Colca",
        "sar_signature": {
            "hh_mean_db": -12.1,
            "hv_mean_db": -19.2,
            "roughness_class": "Variable (manto de ceniza fresca sobre roca rugosa)",
            "primary_polarization_ratio": 0.19
        }
    },
    {
        "id": "chachani",
        "name": "Volcán Chachani",
        "type": "Complejo de domos y estratovolcán",
        "elevation_m": 6057,
        "coordinates": [-71.5303, -16.1911],
        "distance_to_plaza_km": 21.0,
        "crater_diameter_m": 1400,
        "status": "Inactivo / Sin actividad histórica",
        "alert_level": "Verde",
        "last_major_eruption": "Holoceno temprano (>10,000 años)",
        "risk_population": 150000,
        "threat_type": "Flujos de detritos y lahares secundarios por deshielo hacia Yura y Uchumayo",
        "sar_signature": {
            "hh_mean_db": -8.9,
            "hv_mean_db": -15.8,
            "roughness_class": "Alta (derrumbes rocosos, depósitos morrénicos)",
            "primary_polarization_ratio": 0.20
        }
    },
    {
        "id": "ubinas",
        "name": "Volcán Ubinas",
        "type": "Estratovolcán con caldera",
        "elevation_m": 5672,
        "coordinates": [-70.9031, -16.3551],
        "distance_to_plaza_km": 68.0,
        "crater_diameter_m": 1400,
        "status": "Históricamente el más activo del Perú / Explosiones freatomagmáticas periódicas",
        "alert_level": "Amarillo",
        "last_major_eruption": "2023 (explosiones con columnas de 4 km)",
        "risk_population": 15000,
        "threat_type": "Caída de ceniza en valle de Ubinas y cuenca alta del Tambo",
        "sar_signature": {
            "hh_mean_db": -11.4,
            "hv_mean_db": -18.0,
            "roughness_class": "Media-Alta (depósitos de tefra y caldera colapsada)",
            "primary_polarization_ratio": 0.21
        }
    }
]

# ==============================================================================
# 2. CORREDORES DE LAHARES (TORRENTERAS CRÍTICAS DE AREQUIPA)
# Conectan las faldas del Misti directamente con la ciudad y el Río Chili
# ==============================================================================
LAHAR_CORRIDORS = [
    {
        "name": "Torrentera San Lázaro",
        "volcano_origin": "Misti (Flanco Oeste)",
        "discharge_basin": "Río Chili (Zona Urbana / Puente Grau)",
        "length_km": 14.2,
        "slope_pct": 18.5,
        "vulnerability_level": "Crítica",
        "impact_districts": ["Alto Selva Alegre", "Arequipa Cercado", "Yanahuara"],
        "critical_infrastructure": ["Puente Grau", "Torrentera San Lázaro canalizada", "Vía Juan de la Torre"],
        "path": [
            [-71.425, -16.290], # Naciente alta Misti (4,200 m)
            [-71.458, -16.312], # Faldas medias
            [-71.492, -16.340], # Entrada a Alto Selva Alegre
            [-71.518, -16.375], # Tramo urbano
            [-71.534, -16.393]  # Desembocadura en Río Chili
        ]
    },
    {
        "name": "Torrentera Miraflores - Huarangal",
        "volcano_origin": "Misti (Flanco Suroeste)",
        "discharge_basin": "Río Chili (vía drenaje sur)",
        "length_km": 16.8,
        "slope_pct": 15.2,
        "vulnerability_level": "Alta",
        "impact_districts": ["Miraflores", "Mariano Melgar", "Cercado"],
        "critical_infrastructure": ["Av. Mariscal Castilla", "Puentes peatonales", "Canalizaciones urbanas"],
        "path": [
            [-71.415, -16.310],
            [-71.442, -16.345],
            [-71.478, -16.375],
            [-71.512, -16.398],
            [-71.531, -16.408]
        ]
    },
    {
        "name": "Torrentera Agua Salada / Paucarpata",
        "volcano_origin": "Misti (Flanco Sur)",
        "discharge_basin": "Río Socabaya / Cuenca Baja Chili",
        "length_km": 19.5,
        "slope_pct": 12.8,
        "vulnerability_level": "Alta",
        "impact_districts": ["Chiguata", "Paucarpata", "José Luis Bustamante y Rivero", "Socabaya"],
        "critical_infrastructure": ["Av. Avelino Cáceres", "Plataformas de cultivo", "Puente Sabandía"],
        "path": [
            [-71.398, -16.330],
            [-71.420, -16.368],
            [-71.455, -16.405],
            [-71.495, -16.435],
            [-71.528, -16.465]
        ]
    },
    {
        "name": "Quebrada Huayrondo / Yura",
        "volcano_origin": "Misti - Chachani (Silla Norte)",
        "discharge_basin": "Río Yura / Cuenca Alta Chili",
        "length_km": 15.1,
        "slope_pct": 14.0,
        "vulnerability_level": "Moderada",
        "impact_districts": ["Yura", "Cerro Colorado"],
        "critical_infrastructure": ["Carretera Arequipa - Yura", "Vía Férrea", "Planta Cementera"],
        "path": [
            [-71.450, -16.240],
            [-71.490, -16.248],
            [-71.545, -16.255],
            [-71.605, -16.250]
        ]
    }
]


# ==============================================================================
# 3. ZONIFICACIÓN DE PELIGRO VOLCÁNICO (INGEMMET / CENEPRED)
# ==============================================================================
def create_circle_polygon(center_lon, center_lat, radius_km, num_points=36):
    """Genera coordenadas de un anillo circular en proyección esférica aproximada."""
    coords = []
    lat_rad = math.radians(center_lat)
    km_per_deg_lat = 111.132
    km_per_deg_lon = 111.320 * math.cos(lat_rad)
    
    for i in range(num_points + 1):
        angle = 2.0 * math.pi * (i % num_points) / num_points
        dx = radius_km * math.cos(angle)
        dy = radius_km * math.sin(angle)
        lon = center_lon + (dx / km_per_deg_lon)
        lat = center_lat + (dy / km_per_deg_lat)
        coords.append([round(lon, 5), round(lat, 5)])
    return coords


def get_volcano_hazard_zones():
    """Construye las zonas de peligro proximal y distal según lineamientos de INGEMMET."""
    misti_lon, misti_lat = -71.4084, -16.2954
    sab_lon, sab_lat = -71.8570, -15.7870

    zones = [
        # ZONAS MISTI
        {
            "volcano": "Misti",
            "zone_level": "Alto Peligro (Proximal)",
            "radius_km": 7.0,
            "color": "#ef4444", # Rojo
            "opacity": 0.35,
            "description": "Alcance de flujos piroclásticos, proyectiles balísticos y lahares de alta energía.",
            "polygon": create_circle_polygon(misti_lon, misti_lat, 7.0)
        },
        {
            "volcano": "Misti",
            "zone_level": "Peligro Moderado (Torrenteras y Lahares)",
            "radius_km": 15.0,
            "color": "#f97316", # Naranja
            "opacity": 0.25,
            "description": "Laderas medias y corredores de torrenteras que cruzan Alto Selva Alegre, Miraflores y Paucarpata.",
            "polygon": create_circle_polygon(misti_lon, misti_lat, 15.0)
        },
        {
            "volcano": "Misti",
            "zone_level": "Peligro Bajo (Dispersión de Ceniza)",
            "radius_km": 28.0,
            "color": "#eab308", # Amarillo
            "opacity": 0.15,
            "description": "Zona urbana completa de Arequipa y valles agrícolas; riesgo principal por caída de cenizas y tefra fina.",
            "polygon": create_circle_polygon(misti_lon, misti_lat, 28.0)
        },
        # ZONAS SABANCAYA
        {
            "volcano": "Sabancaya",
            "zone_level": "Alto Peligro (Activo en Erupción)",
            "radius_km": 8.0,
            "color": "#dc2626", # Rojo oscuro
            "opacity": 0.40,
            "description": "Área de impacto directo por bombas volcánicas, explosiones y flujos piroclásticos activos.",
            "polygon": create_circle_polygon(sab_lon, sab_lat, 8.0)
        },
        {
            "volcano": "Sabancaya",
            "zone_level": "Peligro Moderado (Valle del Colca)",
            "radius_km": 20.0,
            "color": "#ea580c", # Naranja oscuro
            "opacity": 0.25,
            "description": "Valles de Maca, Achoma, Cabanaconde; riesgo de lahares hacia el Río Colca y contaminación de pastos.",
            "polygon": create_circle_polygon(sab_lon, sab_lat, 20.0)
        }
    ]
    return zones


# ==============================================================================
# 4. EXPORTADORES A GEOJSON (Para el visor web Leaflet)
# ==============================================================================
def export_volcanoes_geojson(output_path=None):
    if output_path is None:
        output_path = GEOJSON_DIR / "volcanoes.geojson"
    output_path.parent.mkdir(parents=True, exist_ok=True)

    features = []
    for v in VOLCANOES_CATALOG:
        feature = {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": v["coordinates"]
            },
            "properties": {
                "id": v["id"],
                "name": v["name"],
                "type": v["type"],
                "elevation_m": v["elevation_m"],
                "status": v["status"],
                "alert_level": v["alert_level"],
                "last_eruption": v["last_major_eruption"],
                "threat": v["threat_type"],
                "distance_km": v["distance_to_plaza_km"],
                "sar_hh_db": v["sar_signature"]["hh_mean_db"],
                "sar_roughness": v["sar_signature"]["roughness_class"]
            }
        }
        features.append(feature)

    data = {
        "type": "FeatureCollection",
        "name": "Volcanes_Arequipa_NISAR",
        "features": features
    }
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"[+] Exportado catálogo de volcanes a: {output_path}")
    return output_path


def export_lahar_corridors_geojson(output_path=None):
    if output_path is None:
        output_path = GEOJSON_DIR / "lahar_corridors.geojson"
    output_path.parent.mkdir(parents=True, exist_ok=True)

    features = []
    for c in LAHAR_CORRIDORS:
        feature = {
            "type": "Feature",
            "geometry": {
                "type": "LineString",
                "coordinates": c["path"]
            },
            "properties": {
                "name": c["name"],
                "volcano": c["volcano_origin"],
                "discharge": c["discharge_basin"],
                "length_km": c["length_km"],
                "slope_pct": c["slope_pct"],
                "vulnerability": c["vulnerability_level"],
                "districts": ", ".join(c["impact_districts"]),
                "infrastructure": ", ".join(c["critical_infrastructure"])
            }
        }
        features.append(feature)

    data = {
        "type": "FeatureCollection",
        "name": "Corredores_Lahares_Arequipa",
        "features": features
    }
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"[+] Exportados corredores de lahares a: {output_path}")
    return output_path


def export_hazard_zones_geojson(output_path=None):
    if output_path is None:
        output_path = GEOJSON_DIR / "hazard_zones.geojson"
    output_path.parent.mkdir(parents=True, exist_ok=True)

    features = []
    zones = get_volcano_hazard_zones()
    for z in zones:
        feature = {
            "type": "Feature",
            "geometry": {
                "type": "Polygon",
                "coordinates": [z["polygon"]]
            },
            "properties": {
                "volcano": z["volcano"],
                "level": z["zone_level"],
                "radius_km": z["radius_km"],
                "color": z["color"],
                "opacity": z["opacity"],
                "description": z["description"]
            }
        }
        features.append(feature)

    data = {
        "type": "FeatureCollection",
        "name": "Zonas_Peligro_Volcanico_INGEMMET",
        "features": features
    }
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"[+] Exportadas zonas de peligro a: {output_path}")
    return output_path


def main():
    print("=" * 75)
    print("  SPACE SOCIETY — MÓDULO VOLCÁNICO Y LAHARES CON NISAR SAR")
    print("=" * 75)
    p1 = export_volcanoes_geojson()
    p2 = export_lahar_corridors_geojson()
    p3 = export_hazard_zones_geojson()
    print("\n[✓] Todas las capas volcánicas y de lahares han sido exportadas exitosamente.")
    print("    Listas para su visualización en el mapa Leaflet de Space Society.")


if __name__ == "__main__":
    main()
