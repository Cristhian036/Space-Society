# 🛰️ Space Society — Satellite River & Flood Monitoring (NISAR L-Band)

[![NASA Space Apps](https://img.shields.io/badge/NASA%20Space%20Apps-Dancing%20with%20the%20SARs-blue.svg)](https://www.spaceappschallenge.org/)
[![Instrument](https://img.shields.io/badge/Radar-NISAR%20L--Band%20(24%20cm)-0ea5e9.svg)](https://nisar.jpl.nasa.gov/)
[![Python](https://img.shields.io/badge/Python-3.10%20%7C%203.11%20%7C%203.12%20%7C%203.13-3776AB.svg)](https://www.python.org/)
[![Tests](https://img.shields.io/badge/Tests-26%20PyTest%20%7C%209%20Node.js%20(Passing)-10b981.svg)](tests/)
[![License](https://img.shields.io/badge/License-MIT-lightgrey.svg)](LICENSE)

> **Next-generation satellite monitoring system for Andean and coastal river basins in Southern Peru**, powered by **NASA-ISRO Synthetic Aperture Radar (NISAR) L-Band L2 GCOV** imagery, multitemporal change detection, real-time hydrological risk telemetry, and an automated dual-service architecture.

---

## 📌 Executive Summary

During torrential rainfall and *El Niño* Southern Oscillation (ENSO) anomalies, heavy cloud cover blinds optical satellites (Sentinel-2, Landsat) precisely when emergency responders need visibility most. 

**Space Society** leverages **NISAR L-Band SAR (24 cm wavelength)** to pierce dense cloud layers and monitor 118 vulnerable river reaches across Southern Peru (Camaná-Majes, Chili-Quilca, Ocoña, and Tambo basins). The platform differentiates open-water specular reflection from double-bounce signals beneath flooded riparian vegetation, calculates hydrological risk in real time, and forecasts 12-day orbital cycle crests.

---

## ⚡ Key Highlights & Capabilities

- 🌐 **Full English Interface by Default with Bilingual Switcher (`[ EN | ES ]`)**: Designed for international space agencies and local disaster civil defense alike. Switch seamlessly in the top-right header with instant UI translation and zero reload.
- 📡 **Multi-Swath Orbital Coverage**: National Peru overview (118 SAR scenes) and focused Southern tracks (Tracks 47, 25, 127, and 120; 242 km swath width).
- 🌊 **Radar Polarimetry (NISAR L2 GCOV 20m Mesh)**: Quantitative differential $\Delta\text{dB}$ analysis comparing baseline low-flow (*estiaje*) against peak crest (*crecida*), identifying specular reflection ($-19.5\text{ dB}$) and flooded vegetation ($+1.8\text{ dB}$ double-bounce).
- ⏱️ **Multitemporal 12-Day Orbital Timeline**: Interactive tracking from $+0\text{d}$ to $+72\text{d}$ modeling discharge progression ($540\text{ m}^3/\text{s}$ peak, $385\text{ ha}$ surface inundation, $1,420$ exposed residents).
- 🛠️ **Lightweight Microservice Architecture**: Python microservice on port `8050` querying precalculated SQLite river geometry (`data/hydro_rivers.sqlite`) paired with static web server on port `8000`.
- 📽️ **Automated 30-Second Pitch Deck**: Integrated high-resolution presentation mode (`pitch_deck.html`) for judging and rapid briefing.

---

## 🚀 Quickstart & Execution

The repository includes cross-platform launchers that verify dependencies, run both the hydrological microservice and web server, perform health checks, and launch your default browser automatically.

### Option 1: One-Click on Windows (Recommended)
Simply double-click:
* **`iniciar.bat`**: Bootstraps environment, launches backend (port 8050) & frontend (port 8000), and opens the app in your browser.
* **`detener.bat`**: Gracefully terminates both background processes and frees up ports.

---

### Option 2: Unified Python Launcher (Cross-Platform)
From your terminal, run:
```bash
python run.py
```
*Options:*
- `python run.py --no-browser` (starts servers without opening browser)
- `python run.py --port 8080 --api-port 8055` (custom ports)

Press `Ctrl + C` in the terminal to cleanly terminate both services.

---

### Option 3: Manual Execution (Two Terminals)

1. **Install dependencies and start hydrological microservice:**
   ```bash
   pip install -r requirements.txt
   python backend/hydro_sar_microservice.py
   ```
2. **Start web server in another terminal:**
   ```bash
   python -m http.server 8000
   ```
3. **Open application:**
   Navigate to [http://localhost:8000](http://localhost:8000) (Dashboard) or [http://localhost:8000/pitch_deck.html](http://localhost:8000/pitch_deck.html) (Pitch Deck).

---

## 📁 Repository Structure

```text
├── backend/
│   ├── hydro_sar_microservice.py    # FastAPI/HTTP microservice delivering river reaches & metrics (port 8050)
│   ├── precalculate_to_sqlite.py    # Pipeline populating SQLite database from raw geo-vectors
│   └── __init__.py
├── processing/
│   ├── gcov_rivers.py               # Top-hat morphological filter and river reach extraction
│   ├── gcov_water.py                # Water surface and flooded vegetation classifier (L-Band HHHH)
│   ├── terrain_water.py             # Topographic DEM slope mask to eliminate hillshade radar shadows
│   ├── analyze_gcov_thresholds.py   # Statistical decibel threshold calibration
│   ├── validate_nisar.py            # Scientific verification against ground truth reference rivers
│   └── __init__.py
├── opera/
│   ├── opera_experiment.py          # NASA OPERA DSWx-NI (Dynamic Surface Water Extent) comparison
│   ├── opera_export.py              # Geospatial export utilities for OPERA products
│   ├── opera_runtime.py             # OPERA processing pipeline runner
│   └── opera-environment.yml        # Conda environment definition for OPERA
├── data/
│   ├── hydro_rivers.sqlite          # Spatial SQLite database with 118 precalculated Peruvian river reaches
│   ├── CHILI_DESCARGAS.json         # Scene catalog for Chili-Quilca drainage basin
│   └── NISAR_DESCARGAS.json         # Scene catalog for Southern Peru NISAR swaths
├── docs/                            # In-depth technical documentation & science guides
│   ├── CHILI_CENTRO.md              # Chili urban corridor analysis and radar blind spots
│   ├── COMPARATIVA_MOTORES.md       # Benchmark: Local Python vs. GEE vs. OPERA core
│   ├── DESCARGAR_NISAR.md           # Guide to retrieving raw HDF5 NISAR L2 GCOV products
│   ├── DIAGNOSTICO_RIOS.md          # Continuity diagnosis and gap-filling algorithms
│   ├── GUIA_GOOGLE_EARTH_ENGINE.md  # Earth Engine workflow instructions
│   ├── NISAR_RIOS_DETECTADOS.md     # Mathematical defense of SAR-measured channels
│   ├── OPERA_EXPERIMENTO.md         # OPERA DSWx validation experiment
│   ├── RECALCULAR_GCOV.md           # Step-by-step reprocessing of multitemporal GCOV rasters
│   ├── RESULTADOS_GCOV.md           # Quantitative results from Majes-Camaná pilot valley
│   ├── SAR_TERRENO.md               # Topographic layover and shadow mitigation
│   └── USO_RADAR.md                 # Fundamentals of L-Band radar remote sensing
├── js/
│   ├── app.js                       # Primary UI controller, Leaflet map engine, HUD & event listeners
│   ├── i18n.js                      # Internationalization engine (English default & Spanish dictionaries)
│   ├── arequipa-data.js             # Basin boundaries, checkpoints, and station telemetry
│   ├── nisar-rivers.js              # River reach renderers and SAR intersection shaders
│   ├── river-geometry.js            # Swath clipping and vector boundary topology
│   └── sar-math-engine.js           # Decibel conversion and hydrological risk calculation
├── css/
│   └── styles.css                   # Dark tactical command center aesthetic (#0b0e12 palette)
├── assets/                          # GeoJSON AOIs, satellite matrices, and pitch slide frames
├── scripts/
│   └── generate_frames.js           # Headless screenshot generator for high-res pitch presentation
├── tests/                           # Complete test suite
│   ├── test_gcov.py                 # 9 unit tests for GCOV raster processing & transformations
│   ├── test_gcov_rivers.py          # 7 tests for top-hat reach extraction
│   ├── test_hydro.py                # 5 tests for hydrological microservice & SQLite queries
│   ├── test_opera_diagnostic.py     # 3 tests for OPERA diagnostics
│   ├── test_terrain_water.py        # 2 tests for DEM slope mask algorithms
│   └── river-geometry.test.js       # 9 Node.js tests for topological clipping & geometry
├── index.html                       # Main dashboard web application
├── pitch_deck.html                  # Automated 30s slide pitch deck
├── iniciar.bat                      # Windows double-click startup script
├── detener.bat                      # Windows double-click shutdown script
├── run.py                           # Cross-platform Python launcher
├── pytest.ini                       # PyTest configuration with Python module path definitions
├── requirements.txt                 # Python dependencies
└── package.json                     # Node.js dev dependencies (Playwright)
```

---

## 🔬 Radar Physics & Scientific Foundation

```
                      NISAR L-Band Radar (λ ≈ 24 cm)
                                   │
       ┌───────────────────────────┴───────────────────────────┐
       ▼                                                       ▼
Specular Reflection (Open Water)             Double-Bounce (Flooded Vegetation)
  - Radar pulse bounces away from antenna      - Pulse penetrates canopy and reflects off water
  - Very low return: σ⁰ < -18 dB               - High return to antenna: σ⁰ > -11 dB
  - Visible as dark channel ribbons            - Visible as bright anomalies in river plain
```

### Why NISAR L-Band Outperforms C-Band in River Floods:
1. **Penetration Depth**: C-Band ($\lambda \approx 5.6\text{ cm}$, Sentinel-1) scatters at the top of the plant canopy. L-Band ($\lambda \approx 24\text{ cm}$, NISAR) penetrates through agricultural canopies and riparian thickets, reaching the standing water beneath.
2. **Double-Bounce Mechanism**: When water inundates vegetated riverbanks, the orthogonal angle between tree trunks/stems and the water surface creates a natural corner reflector, yielding a distinctive **bright backscatter signature** ($+1.8\text{ dB}$ to $+3.5\text{ dB}$ increase relative to baseline).
3. **Dual-Sign Top-Hat Extraction**: Standard flood algorithms search only for "dark patches" and miss flooded river corridors completely. Space Society's dual-sign top-hat filter detects both dark specular water and bright double-bounce corridors simultaneously.

---

## 🧪 Automated Testing & Verification

The project includes an end-to-end automated verification suite covering mathematical transforms, geometric swath clipping, and API endpoints:

### Run Python Unit Tests (26 Tests)
```bash
python -m pytest
```
*Tests pass with 100% success across Python 3.10–3.13.*

### Run Node.js Geometry Tests (9 Tests)
```bash
node --test tests/river-geometry.test.js
```
*Validates continuous swath clipping, tangent boundary preservation, and ring classification.*

---

## 👥 Authors & Team

Developed by **Space Society** for the **NASA Space Apps Challenge**:
* **Specialization**: Radar Remote Sensing, GIS Hydrology & Satellite Telemetry.
* **Target Mission**: NASA-ISRO Synthetic Aperture Radar (NISAR).

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
