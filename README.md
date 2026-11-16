# 🛰️ Space Society - RadarSAR Arequipa (NASA Space Apps)
> Plataforma de monitoreo satelital con radar NISAR Banda L (GCOV): dinámica hidrológica de cuencas, detección de cauces urbanos y mapeo de corredores de lahares volcánicos en Arequipa, Perú.

---

## 🎯 Desafío NASA Space Apps
* **Desafío:** *"Dancing with the SARs"* (Radar Remote Sensing / NISAR)
* **Localidad:** Arequipa, Perú (Cuencas del Río Chili, Camaná-Majes y complejo volcánico Misti-Sabancaya)
* **Equipo:** Space Society

---

## 🌋 Módulos Principales del Sistema

### 1. Monitoreo Hidrológico y Detección de Cauces (Ríos Chili y Camaná)
* **NISAR Medido:** Extracción de cauces y superficies de agua en la malla nativa de 20 m de NISAR L2 GCOV (algoritmo top-hat + esqueleto morfológico).
* **Física Banda L (~24 cm):** Detección de superficies de agua por reflexión especular (baja retrodispersión, valores oscuros $<-18\text{ dB}$) y detección de corredores riparios con vegetación por rebote doble (*double bounce*, valores brillantes).
* **Integración DEM / HAND:** Validación topográfica y modelo de elevación para descartar sombras orográficas de radar.

### 2. Monitoreo Volcánico y Corredores de Lahares (Misti, Sabancaya, Chachani, Ubinas)
* **Conexión Hidrológica-Volcánica:** En Arequipa, las lluvias torrenciales en el Misti arrastran ceniza y escombros volcánicos formando **lahares** que descienden por las torrenteras (San Lázaro, Huarangal, Agua Salada) hacia el centro de la ciudad y desembocan en el **Río Chili**.
* **Zonificación de Peligro INGEMMET / CENEPRED:** Integración de zonas de Alto Peligro proximal (7-8 km), Peligro Moderado por lahares en torrenteras (15 km) y Peligro Bajo por dispersión de cenizas (28 km).
* **Caracterización Radar:** Evaluación de rugosidad superficial y constantes dieléctricas en depósitos volcánicos mediante retrodispersión polarimétrica HH/HV.

---

## 📁 Estructura Refactorizada del Proyecto

```text
NASA/V06/
├── index.html                           # Panel de control y visor Leaflet satelital
├── requirements.txt                     # Dependencias Python
├── README.md                            # Documentación general y arquitectura
├── AREQUIPA_DESCARGAS_H5.md             # Catálogo de descargas NISAR GCOV (.h5)
├── AREQUIPA_NISAR_H5_ULTIMOS_6_MESES.json # Metadatos estructurados de 123 escenas
│
├── src/                                 # Código fuente Python modular
│   ├── analysis/
│   │   ├── volcano_sar.py               # Módulo de análisis volcánico y lahares
│   │   ├── gcov_rivers.py               # Detector de cauces sobre malla nativa NISAR
│   │   ├── gcov_water.py                # Clasificador y segmentación de agua SAR
│   │   ├── terrain_water.py             # Integración con HAND y pendientes DEM
│   │   └── validate_nisar.py            # Validación contra redes hidrográficas
│   ├── download/
│   │   └── descargar_nisar_arequipa.py  # Gestor automatizado con NASA Earthdata
│   └── services/
│       ├── hydro_sar_microservice.py    # Microservicio API REST de drenaje
│       └── precalculate_to_sqlite.py    # Motor de cálculo hidrológico offline
│
├── data/                                # Datos y capas geoespaciales
│   ├── geojson/
│   │   ├── volcanoes.geojson            # Catálogo de volcanes de Arequipa
│   │   ├── lahar_corridors.geojson      # Trayectorias de torrenteras hacia el Chili
│   │   └── hazard_zones.geojson         # Zonas de peligro INGEMMET
│   └── nisar/                           # Carpeta de destino de archivos .h5
│
├── js/                                  # Lógica frontend interactiva
│   ├── app.js                           # Controlador de capas y eventos Leaflet
│   ├── volcano-layer.js                 # Capa de volcanes, torrenteras y telemetría
│   ├── nisar-rivers.js                  # Capa de cauces medidos en GCOV
│   ├── gcov-layer.js                    # Renderizador de matrices HDF5 por fecha
│   ├── arequipa-data.js                 # Geometrías y capas de referencia
│   └── sar-math-engine.js               # Motor matemático de cliente
│
├── docs/                                # Documentación técnica e investigación
│   ├── CHILI_CENTRO.md                  # Especificación del recorte Río Chili
│   ├── DIAGNOSTICO_RIOS.md              # Auditoría matemática de continuidad
│   ├── GUIA_GOOGLE_EARTH_ENGINE.md      # Procesamiento en Google Earth Engine
│   └── COMPARATIVA_MOTORES.md           # Comparativa GIBS vs GEE vs Local
│
└── archive/                             # Histórico de experimentos temporales
    └── tmp_experiments/                # Scripts y pruebas temporales archivados
```

---

## 🚀 Cómo Ejecutar la Plataforma

### 1. Instalar dependencias:
```powershell
python -m pip install -r requirements.txt
```

### 2. Generar capas de volcanes y lahares (GeoJSON):
```powershell
python src/analysis/volcano_sar.py
```

### 3. Descargar escenas científicas NISAR L2 GCOV (.h5) de Arequipa:
```powershell
# Ver escenas disponibles (123 gránulos en los últimos 6 meses)
python descargar_nisar_arequipa.py --list

# Descargar escenas del Río Chili / Arequipa Urbana
python descargar_nisar_arequipa.py --zone chili --dest data/nisar
```

### 4. Iniciar el microservicio y el visor web:
En una terminal:
```powershell
python hydro_sar_microservice.py
```

En otra terminal, arrancar el servidor web:
```bash
python -m http.server 8000
```
Abre en tu navegador: [http://localhost:8000](http://localhost:8000)
