# 👥 Space Society — Team Structure & Roles
### NASA Space Apps Challenge 2026 | Project: NISAR Hydro-Lens

---

## 🧭 Workflow Diagram (Mermaid - Horizontal)

```mermaid
flowchart LR
    %% Fila Superior
    FS["<b>FULL STACK DEVELOPER</b><br/>(Diego Sebastian Gonzales Gomez)<br/><br/>• Backend & Microservice Architecture<br/>• Develop Python FastAPI server on port 8050<br/>• Implement live geometry streaming with SQLite<br/>• Automated launchers (iniciar.bat, run.py)<br/>• Unit test suite with 26 PyTest validations<br/>• Performance optimization for mobile devices"]

    DE["<b>LEAD DATA ENGINEER</b><br/>(Cristhian Diego Huaracha Ventura)<br/><br/>• Mathematical top-hat filter for river ribbons<br/>• Dual-sign radar physics calibration (-19.5 dB / +1.8 dB)<br/>• Distinguish open water from flooded vegetation<br/>• Eliminate hillshade radar shadows with DEM slope<br/>• Spatial SQLite database architecture (118 reaches)<br/>• Centerline skeleton extraction for GIS early warning"]

    UX["<b>UX WRITER & DOCUMENTATION</b><br/>(Lucia Fernanda Cayo Cayo)<br/><br/>• Interactive 30-second pitch deck (pitch_deck.html)<br/>• Bilingual switcher engine (EN/ES) without reload<br/>• In-depth technical documentation in docs/ and README<br/>• NASA Space Apps Challenge official submission dossier<br/>• Synthesize radar physics for general audience<br/>• Review and editing of all UI copy and telemetry alerts"]

    %% Conexiones Superiores y Descendente
    FS --> DE
    DE --> UX
    UX --> SAT

    %% Fila Inferior
    SAT["<b>SPECIALIST IN SATELLITE RADAR & DATA PROCESSING</b><br/>(Michael Rudy Villafuerte Cjuno)<br/><br/>• Ingestion of raw NISAR L2 GCOV HDF5 (20m grid)<br/>• Radiometric terrain correction and bitmask filtering<br/>• Cross-polarization analysis (HV/HH gamma0 power)<br/>• Audit NASA/JPL OPERA DSWx-SAR bimodal limits<br/>• Orbital swath mapping (Tracks 47, 25, 127)<br/>• Validation against ground truth hydrology (62.5%)"]

    DA["<b>DATA ACQUISITION & HYDROLOGICAL RESEARCH</b><br/>(Yinyer Alejandra Quispe Rodriguez)<br/><br/>• Cataloged 123 NISAR L2 scenes in Arequipa (6 months)<br/>• Download and parse ANA & IGN national river vectors<br/>• Compilation of INGEMMET volcanic hazard zones<br/>• Lahar corridor mapping from Misti to Chili River<br/>• Assemble 12-day orbital repeat progression data<br/>• GeoJSON conversion for rapid microservice ingestion"]

    FE["<b>FRONTEND & GIS UI DEVELOPER</b><br/>(Neftaly Pacco Moscoso)<br/><br/>• Command center interface with Leaflet & TailwindCSS<br/>• Dark tactical UI design (#0b0e12 color palette)<br/>• Dynamic channel telemetry popups with backscatter<br/>• Interactive volcano and lahar drainage layers<br/>• Multi-layer switcher (NISAR, GCOV, DEM drainage)<br/>• Mobile-first responsiveness and smooth zoom control"]

    %% Conexiones Inferiores y Retorno
    SAT --> DA
    DA --> FE
    FE --> FS

    %% Estilos de Nodos
    style FS fill:#0f172a,stroke:#38bdf8,stroke-width:2px,color:#f8fafc
    style DE fill:#0f172a,stroke:#34d399,stroke-width:2px,color:#f8fafc
    style UX fill:#0f172a,stroke:#fbbf24,stroke-width:2px,color:#f8fafc
    style SAT fill:#0f172a,stroke:#818cf8,stroke-width:2px,color:#f8fafc
    style DA fill:#0f172a,stroke:#f472b6,stroke-width:2px,color:#f8fafc
    style FE fill:#0f172a,stroke:#22d3ee,stroke-width:2px,color:#f8fafc
```

---

## 📊 Linear Workflow Diagram (Mermaid - Vertical)

```mermaid
flowchart TD
    subgraph G1["1. Full Stack Architecture & Microservice"]
        FS["<b>FULL STACK DEVELOPER</b>
        Diego Sebastian Gonzales Gomez
        • FastAPI / Python microservice on port 8050
        • Precalculated SQLite vector streaming
        • Cross-platform automation scripts (iniciar.bat, run.py)
        • 26 automated unit tests passing in PyTest"]
    end

    subgraph G2["2. Data Engineering & Mathematical Radar Kernels"]
        DE["<b>LEAD DATA ENGINEER</b>
        Cristhian Diego Huaracha Ventura
        • Multi-scale directional top-hat morphological filter (600m)
        • Radar backscatter threshold calibration (-19.5 dB / +1.8 dB)
        • DEM slope & HAND topographic radar shadow mitigation
        • Spatial SQLite database architecture (118 reaches)"]
    end

    subgraph G3["3. Remote Sensing & Satellite Ingestion"]
        SAT["<b>SPECIALIST IN SATELLITE RADAR & DATA PROCESSING</b>
        Michael Rudy Villafuerte Cjuno
        • Raw NISAR L2 GCOV HDF5 ingestion on native 20m UTM grid
        • Dual-polarization radar power analysis (HHHH and HVHV)
        • NASA/JPL OPERA DSWx-SAR algorithm audit and diagnostics
        • Orbital satellite swath mapping (Tracks 47, 25, 127)"]
    end

    subgraph G4["4. Data Acquisition & Hydrological Ground Truth"]
        DA["<b>DATA ACQUISITION & HYDROLOGICAL RESEARCH</b>
        Yinyer Alejandra Quispe Rodriguez
        • Complete catalog of 123 NISAR L2 GCOV scenes in Arequipa
        • Ground-truth baseline vectors from ANA and IGN Peru
        • Volcanic hazard zoning compilation from INGEMMET
        • Multitemporal orbital timeline records (+0d to +72d)"]
    end

    subgraph G5["5. Frontend & Tactical Command Center"]
        FE["<b>FRONTEND & GIS UI DEVELOPER</b>
        Neftaly Pacco Moscoso
        • Interactive Leaflet.js dashboard with dark tactical UI
        • Dynamic reach telemetry popups (length, width, decibels)
        • Volcano & Lahar Corridor hazard layer visualization
        • Performance optimization for mobile devices in field emergencies"]
    end

    subgraph G6["6. Scientific Technical Writing & UX"]
        UX["<b>UX WRITER & TECHNICAL DOCUMENTATION</b>
        Lucia Fernanda Cayo Cayo
        • High-resolution 30-second automated pitch deck (pitch_deck.html)
        • Zero-reload bilingual internationalization engine (EN/ES)
        • Comprehensive scientific documentation in docs/ and README
        • Official NASA Space Apps Challenge submission dossier"]
    end

    FS --> DE --> SAT --> DA --> FE --> UX --> FS
```

---

## 📋 Detailed Team Member Profiles

### 1. Diego Sebastian Gonzales Gomez
* **Role:** Full Stack Developer & Systems Architect
* **Key Contributions:**
  * Engineered the dual-service application architecture: asynchronous FastAPI/Python microservice on port `8050` paired with the local static server on port `8000`.
  * Designed lightweight geospatial vector streaming querying precalculated geometries in `data/hydro_rivers.sqlite`, enabling operation under low-bandwidth disaster conditions.
  * Automated system deployment with one-click scripts (`iniciar.bat`, `detener.bat`) and cross-platform launcher (`run.py`).
  * Implemented and maintained continuous verification suites with 26 automated unit tests passing across Python 3.10–3.13.

### 2. Cristhian Diego Huaracha Ventura
* **Role:** Lead Data Engineer & Geospatial Processing Specialist
* **Key Contributions:**
  * Developed the core mathematical top-hat morphological filter (`processing/gcov_rivers.py`) with a 600m directional structuring element to extract linear river channels.
  * Calibrated physical radar backscatter decibel thresholds to distinguish open-water specular reflection ($-19.5\text{ dB}$) from flooded canopy double-bounce ($+1.8\text{ dB}$).
  * Mitigated false positives from terrain radar shadows by integrating DEM slope and Height Above Nearest Drainage (HAND) topographic masks.
  * Structured spatial tables and indexes for 118 Peruvian river reaches across Southern Peru basins.

### 3. Michael Rudy Villafuerte Cjuno
* **Role:** Specialist in Satellite Radar & Data Processing (NISAR / SAR)
* **Key Contributions:**
  * Ingested and preprocessed raw NASA-ISRO NISAR L2 GCOV HDF5 scientific granules on their native 20m UTM grid (EPSG:32719).
  * Executed radiometrically terrain-corrected radar polarimetry, calibrating co-polarized (HHHH) and cross-polarized (HVHV) gamma-naught ($\gamma^0$) power.
  * Conducted an in-depth audit of the official NASA/JPL OPERA DSWx-SAR pipeline, diagnosing and documenting bimodal threshold failures over narrow Andean gorges.
  * Georeferenced satellite ground swaths (Tracks 47, 25, 127) for accurate spatial clipping and analysis.

### 4. Yinyer Alejandra Quispe Rodriguez
* **Role:** Data Acquisition & Hydrological Research Specialist
* **Key Contributions:**
  * Cataloged, verified, and structured 123 NASA NISAR L2 GCOV scenes covering the Arequipa department over the past 6 months (May–November 2026).
  * Downloaded, cleaned, and integrated official reference hydrology datasets from the National Water Authority (ANA) and National Geographic Institute (IGN).
  * Compiled geological hazard maps from INGEMMET and CENEPRED for Misti and Sabancaya volcanoes, delineating lahar corridors into the Chili River.
  * Structured multitemporal scenario datasets simulating 12-day orbital repeat cycles ($+0\text{d}$ to $+72\text{d}$) with discharge metrics.

### 5. Neftaly Pacco Moscoso
* **Role:** Frontend Developer & Tactical GIS UI Specialist
* **Key Contributions:**
  * Designed and built the tactical dark command center interface using Leaflet.js, ES6+, and TailwindCSS (`#0b0e12` palette).
  * Created dynamic telemetry HUDs and interactive popups presenting reach-by-reach channel properties: length, width, elongation ratio, and backscatter profile.
  * Integrated dedicated visual layers for Volcano & Lahar hazard corridors, enabling instant focus on active volcanic cones.
  * Optimized rendering pipelines and touch interactions for mobile devices and emergency field tablets.

### 6. Lucia Fernanda Cayo Cayo
* **Role:** UX Writer & Scientific Technical Documentation Lead
* **Key Contributions:**
  * Developed the zero-reload bilingual internationalization engine (`js/i18n.js`) providing seamless instant switching between English and Spanish.
  * Authored comprehensive scientific documentation, radar physics explanations, and OPERA diagnostic reports in `docs/` and `README.md`.
  * Designed the interactive 30-second automated pitch presentation (`pitch_deck.html`) complete with synchronized slide voiceover subtitles.
  * Structured and formatted the official submission dossier for the NASA Space Apps Challenge judging panel.
