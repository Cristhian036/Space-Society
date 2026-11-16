/**
 * SPACE SOCIETY - Internationalization (i18n) Engine
 * Default Language: English ('en') with seamless runtime switching to Spanish ('es').
 */

let currentLang = localStorage.getItem('nisar_lang') || 'en';

const I18N_DICT = {
  en: {
    // Header & Meta
    app_title: "SPACE SOCIETY — Satellite River & Flood Monitoring (NISAR L-Band)",
    brand_sub: "NISAR L-BAND",
    header_status: "NISAR L2 GCOV · 20m NATIVE MESH",
    btn_peru_all: "🇵🇪 All Peru (118 SAR)",
    btn_camana: "Camaná-Majes",
    btn_chili: "Chili-Quilca",
    btn_ocona: "Ocoña",
    btn_tambo: "Tambo",
    btn_all_tracks: "Southern Tracks",
    btn_how_to_read: "How to read?",
    btn_panel: "Panel",
    close: "Close",

    // Guide Popover
    guide_title: "Technical Reading Guide",
    guide_1_num: "01",
    guide_1_text: "L-Band Radar (~24 cm): Penetrates clouds and torrential precipitation to detect ground water and soil moisture changes every 12 days.",
    guide_2_num: "02",
    guide_2_text: "Color Codes: Cyan indicates open surface water (specular reflection); Amber highlights flooded vegetation/crops (double bounce); Red marks critical overflow checkpoints.",
    guide_3_num: "03",
    guide_3_text: "Scientific Validation: Measured NISAR river channels derive directly from raw L2 GCOV HDF5 (native 20m grid). The reference network provides hydrological baseline context.",

    // Sidebar Header
    coords_display_default: "-16.250° S, -72.520° W",
    risk_level_red: "RED FLOOD ALERT",
    risk_level_moderate: "MODERATE ALERT",
    risk_level_normal: "NORMAL (BASELINE)",
    pass_badge_prefix: "🛰️ ORBITAL CYCLE ",

    // Sidebar Tabs
    tab_summary: "Summary",
    tab_layers: "Layers",
    tab_radar: "Radar & Data",

    // Tab 1: Summary
    metric_water_title: "Surface Water / Channel",
    metric_width_prefix: "Width: ",
    metric_water_unit: "ha",
    metric_pop_title: "Discharge & Exposed Pop.",
    ref_rivers_count_suffix: " REFERENCE RIVERS",
    backscatter_chart_title: "σ⁰ Signature (12-Day Cycles)",
    chart_threshold_label: "Threshold: -14 dB",
    export_products_title: "Product Exports",
    export_csv: "CSV Report",
    export_geojson: "GIS Vectors",

    // Tab 2: Layers
    section_nisar_measured: "MEASURED NISAR (20M RADAR)",
    desc_nisar_measured: "River channels extracted directly from raw L2 GCOV HDF5 (native 20m grid) with morphological top-hat detector.",
    label_study_area: "Study Area:",
    opt_chili_reach: "Chili Valley (9 & 21 Sep 2026)",
    label_display_layer: "Display Layer:",
    opt_channels_sar: "Channels over radar",
    opt_pure_sar: "SAR Backscatter",
    opt_change_sar: "Multitemporal change",
    label_acquisition: "Acquisition:",
    btn_focus_nisar: "Focus NISAR Observed Reach",
    loading: "Loading…",
    section_volcanoes: "VOLCANOES & LAHAR CORRIDORS",
    desc_volcanoes: "Hazard zoning and lahar drainage pathways from Misti and Sabancaya toward urban Arequipa and the Chili River.",
    btn_focus_misti: "Focus Misti (5,822m)",
    btn_focus_sabancaya: "Sabancaya (Active)",
    label_telemetry: "Radar Telemetry:",
    label_high_hazard: "High (7 km)",
    label_lahar_hazard: "Lahar (15 km)",
    label_ash_hazard: "Ash (28 km)",
    volcano_status_default: "Click 'Focus Misti' or toggle checkbox to visualize cones and lahar channels.",


    section_gcov_water: "GCOV: SURFACE WATER BY DATE",
    label_zone: "Zone:",
    opt_gcov_majes: "Majes-Camaná",
    opt_gcov_chili_legacy: "Chili (legacy export)",
    opt_gcov_camana_legacy: "Camaná (legacy export)",
    label_method: "Method:",
    opt_method_sar: "Pure SAR Threshold",
    opt_method_terrain: "SAR + Terrain Filter (HAND)",
    opt_method_opera: "NASA/JPL OPERA DSWx-NI",
    opt_water_before: "Candidate Water: Date 1",
    opt_water_after: "Candidate Water: Date 2",
    opt_change_persist: "Change: Persistent / New / Receded",
    label_gcov_db: "GCOV dB Threshold:",
    status_gcov_ready: "Toggle to load HDF5 products.",

    section_dem_drainage: "DEM DRAINAGE + D8 (LIVE)",
    desc_dem_drainage: "Hydrological flow network derived from Terrarium/NASADEM without pre-existing vectors.",
    btn_load_reference: "Load Reference Network",
    btn_recalculate_drainage: "Recalculate Drainage in Current View",
    status_dem_ready: "Ready to infer drainage network.",

    section_aux_layers: "Auxiliary Layers & Basemap",
    layer_rivers_peru: "National Rivers of Peru (33 GPS basins)",
    layer_rivers_sar_flood: "SAR river detection highlight",
    label_sar_opacity: "SAR highlight opacity",
    layer_ana_wms: "Official ANA WMS (National Rivers)",
    layer_gibs_clouds: "NASA GIBS Cloud Cover (VIIRS)",
    label_basemap: "Basemap:",
    opt_esri_satellite: "Esri Satellite (High Resolution)",
    opt_esri_dark: "Esri Dark Canvas (SAR Contrast)",
    opt_carto_dark: "CartoDB Dark (Stadia Maps)",
    opt_osm: "Standard OpenStreetMap",
    placeholder_carto_key: "Stadia API Key...",
    btn_apply_key: "Apply Key",

    // Tab 3: Radar & Data
    section_sar_swaths: "ORBITAL SAR SWATHS (ASF)",
    label_track_filter: "Track Filter:",
    opt_track_all_peru: "🇵🇪 National Peru (118 Active Scenes)",
    opt_track_all_south: "Southern Tracks (Tracks 47, 25, 127, 120)",
    opt_track_basin_auto: "Selected Basin Track",
    opt_track_47: "↗ Track 47 (Ascending - Camaná/Majes/Chili)",
    opt_track_25: "↙ Track 25 (Descending - Ocoña/Camaná)",
    opt_track_127: "↙ Track 127 (Descending - Chili/Tambo)",
    opt_track_120: "↗ Track 120 (Ascending - Ocoña)",
    btn_project_raster: "Project Radar Raster on Swaths",
    btn_query_asf: "Query Live NASA ASF API",
    asf_track_default: "4 Active Tracks",
    asf_date_default: "12d Cycle",
    asf_granule_default: "Loading satellite catalog...",

    label_sim_threshold: "Simulation Threshold:",
    sim_threshold_demo_note: "Demo visualization values",
    label_inter_mode: "Intersection Mode:",
    opt_inter_strict: "Within Active SAR Swaths Only",
    opt_inter_global: "Force Entire National Network",

    section_dem_params: "DEM & Topography Parameters",
    label_dem_res: "DEM Resolution:",
    opt_dem_fast: "Fast (z10)",
    opt_dem_high: "High Res (z11)",
    opt_dem_ultra: "Ultra Detail (z12)",
    label_drainage_density: "Drainage Density:",
    chk_optical_burn: "Guide channels with optical indices",
    chk_show_dry: "Show modeled dry routes (dashed)",
    chk_hide_preexisting: "Hide baseline simulation layers",

    section_colab_matrices: "GCOV COLAB MATRICES",
    desc_colab_matrices: "Historical exports of Majes-Camaná Valley (350×350 px).",
    opt_colab_water_mask: "Candidate signal changes",
    opt_colab_delta_db: "Pure Differential Map ΔdB",
    opt_colab_crecida: "Flood Peak 19-Jan-2026 (HHHH)",
    opt_colab_estiaje: "Dry Season 04-Sep-2026 (HHHH)",
    btn_fly_colab: "Fly to Swath",
    btn_view_colab: "View 3 Colab Matrices",

    // HUD & Overlays
    hud_view_prefix: "View: ",
    hud_swaths_suffix: " Active Swaths",
    legend_title: "SAR SYMBOLOGY",
    legend_detected_channel: "Detected channel in SAR swath",
    legend_baseline: "Baseline hydrological network",
    legend_checkpoint: "Critical flood checkpoint",
    legend_swath: "NISAR orbital swath (242 km)",

    // Timeline Bar
    btn_cycle_play: "12d Cycle",
    timeline_title: "MULTITEMPORAL L-BAND MONITORING",
    timeline_phase_default: "CRITICAL FLOOD PEAK",

    // Colab Modal
    modal_title: "NISAR L2 GCOV Multitemporal Polarimetric Analysis",
    modal_subtitle: "Majes-Camaná Valley (EPSG:32718) · Dry (04-Sep-2026) vs Flood (19-Jan-2026) · Expansion: 158.7 ha | Floodplain: 618.9 ha",
    modal_card_1_title: "1. Decibels + Speckle Formula:",
    modal_card_2_title: "2. New Open Water (158.7 ha):",
    modal_card_2_note: "(Specular reflection)",
    modal_card_3_title: "3. Flooded Plain (618.9 ha):",
    modal_card_3_note: "(L-Band double bounce in crops)",

    // Map Popups & SAR Tooltips
    popup_cp_title: "📍 Critical Flood Checkpoint",
    popup_basin: "Basin:",
    popup_sar_status: "SAR Detection Status:",
    popup_inside_swath: "DENTRO DE BLOQUE SAR ACTIVO",
    popup_inside_swath_en: "INSIDE ACTIVE SAR SWATH",
    popup_outside_swath: "Outside Threshold / Swath",
    popup_vulnerability: "Vulnerability:",
    popup_channel_base: "HYDROGRAPHIC CHANNEL",
    popup_ana_code: "ANA Code:",
    popup_sim_value: "Simulation Value:",
    popup_detected_river: "🛰️ SAR RADAR DETECTED RIVER",
    popup_orbital_phase: "Orbital Phase:",
    popup_backscatter: "Measured Backscatter (σ⁰):",
    popup_water_width: "Water Surface Width:",
    popup_flooded_crop: "Flooded Agricultural Area:",
    popup_national_network: "🇵🇪 PERU HYDROGRAPHIC NETWORK:",
    popup_national_detected: "🛰️ NATIONAL RIVER DETECTED BY SAR:",
    popup_region: "Hydrographic Region:",
    popup_slope_zone: "Slope / Zone:",
    popup_radar_signature: "Radar Signature (σ⁰):",
    popup_extracted_pts: "Extracted GPS Points:",
    popup_pts_inside_suffix: "vertices inside SAR swath",
    popup_swath_title: "🛰️ ACTIVE SAR SWATH (NASA ASF)",
    popup_track_label: "Orbital Track",
    dir_ascending: "↗ ASCENDING (South → North)",
    dir_descending: "↙ DESCENDING (North → South)",
    popup_acq_date: "Acquisition Date:",
    popup_mode_pol: "Mode / Polarization:",
    btn_project_single: "Project this Swath",
    btn_project_all: "Project All",
    reader_view: "📡 View",
    btn_hide_radar_images: "Hide Radar Images",
    btn_project_radar_images: "Project Radar Raster on Swaths",
    btn_querying_asf: "Querying NASA ASF API live...",
    btn_asf_success: "NASA ASF Scenes Loaded in View",
    btn_asf_cached: "Using Preloaded National Catalog (166 scenes)"
  },

  es: {
    // Header & Meta
    app_title: "SPACE SOCIETY — Monitoreo Satelital de Ríos e Inundaciones (NISAR Banda L)",
    brand_sub: "NISAR L-BAND",
    header_status: "NISAR L2 GCOV · 20m NATIVO",
    btn_peru_all: "🇵🇪 Perú Completo (118 SAR)",
    btn_camana: "Camaná-Majes",
    btn_chili: "Chili-Quilca",
    btn_ocona: "Ocoña",
    btn_tambo: "Tambo",
    btn_all_tracks: "Tramos Sur",
    btn_how_to_read: "¿Cómo leer?",
    btn_panel: "Panel",
    close: "Cerrar",

    // Guide Popover
    guide_title: "Guía de lectura técnica",
    guide_1_num: "01",
    guide_1_text: "Radar Banda L (~24 cm): Atraviesa nubes y lluvia torrencial para captar cambios de agua y humedad en el terreno cada 12 días.",
    guide_2_num: "02",
    guide_2_text: "Código cromático: Cian indica agua libre en superficie (reflexión especular); Ámbar señala vegetación inundada (doble rebote); Rojo marca puntos de desborde crítico.",
    guide_3_num: "03",
    guide_3_text: "Validación científica: Los cauces NISAR medidos provienen directamente de los HDF5 originales (malla nativa de 20 m). La red de referencia complementa el contexto hidrográfico.",

    // Sidebar Header
    coords_display_default: "-16.250° S, -72.520° O",
    risk_level_red: "ALERTA ROJA",
    risk_level_moderate: "ALERTA MODERADA",
    risk_level_normal: "NORMAL (LÍNEA BASE)",
    pass_badge_prefix: "🛰️ CICLO ORBITAL ",

    // Sidebar Tabs
    tab_summary: "Resumen",
    tab_layers: "Capas",
    tab_radar: "Radar & Datos",

    // Tab 1: Summary
    metric_water_title: "Agua en superficie / Cauce",
    metric_width_prefix: "Ancho: ",
    metric_water_unit: "ha",
    metric_pop_title: "Caudal & Población expuesta",
    ref_rivers_count_suffix: " RÍOS DE REFERENCIA",
    backscatter_chart_title: "Firma σ⁰ (Ciclos 12 días)",
    chart_threshold_label: "Umbral: -14 dB",
    export_products_title: "Exportación de productos",
    export_csv: "Reporte CSV",
    export_geojson: "Vectores GIS",

    // Tab 2: Layers
    section_nisar_measured: "NISAR MEDIDO (RADAR 20M)",
    desc_nisar_measured: "Cauces extraídos directamente de HDF5 L2 GCOV (malla nativa de 20 m) con detector top-hat morfológico.",
    label_study_area: "Zona de Estudio:",
    opt_chili_reach: "Valle del Chili (9 & 21 Sep 2026)",
    label_display_layer: "Visualización:",
    opt_channels_sar: "Cauces sobre radar",
    opt_pure_sar: "Retrodispersión SAR",
    opt_change_sar: "Cambio multitemporal",
    label_acquisition: "Adquisición:",
    btn_focus_nisar: "Enfocar tramo observado NISAR",
    loading: "Cargando…",
    section_volcanoes: "MONITOREO VOLCÁNICO Y LAHARES",
    desc_volcanoes: "Zonificación de peligro y corredores de lahares desde el Misti y Sabancaya hacia Arequipa urbana y el Río Chili.",
    btn_focus_misti: "Enfocar Misti (5,822m)",
    btn_focus_sabancaya: "Sabancaya (Activo)",
    label_telemetry: "Telemetría Radar:",
    label_high_hazard: "Alto (7 km)",
    label_lahar_hazard: "Lahar (15 km)",
    label_ash_hazard: "Ceniza (28 km)",
    volcano_status_default: "Haz clic en 'Enfocar Misti' o activa la casilla para ver conos y torrenteras.",


    section_gcov_water: "GCOV: AGUA POR FECHA",
    label_zone: "Zona:",
    opt_gcov_majes: "Majes-Camaná",
    opt_gcov_chili_legacy: "Chili (anterior)",
    opt_gcov_camana_legacy: "Camaná (anterior)",
    label_method: "Método:",
    opt_method_sar: "Umbral SAR puro",
    opt_method_terrain: "SAR + Filtro terreno (HAND)",
    opt_method_opera: "NASA/JPL OPERA DSWx-NI",
    opt_water_before: "Candidatos a agua: Fecha 1",
    opt_water_after: "Candidatos a agua: Fecha 2",
    opt_change_persist: "Cambio: Persistente / Nuevo / Retirado",
    label_gcov_db: "Umbral dB GCOV:",
    status_gcov_ready: "Cargando capas GCOV…",

    section_dem_drainage: "DRENAJE DEM + D8 (VIVO)",
    desc_dem_drainage: "Extracción hidrológica basada en DEM Terrarium/NASADEM sin geometrías preexistentes.",
    btn_load_reference: "Cargar Red de Referencia",
    btn_recalculate_drainage: "Recalcular Drenaje en Vista Actual",
    status_dem_ready: "Listo para inferir red.",

    section_aux_layers: "Capas Auxiliares & Visor",
    layer_rivers_peru: "Red de Ríos del Perú (33 cuencas)",
    layer_rivers_sar_flood: "Remarcado SAR de ríos detectados",
    label_sar_opacity: "Opacidad de remarcado SAR",
    layer_ana_wms: "WMS Oficial ANA (Ríos Nacionales)",
    layer_gibs_clouds: "Nubosidad NASA GIBS (VIIRS)",
    label_basemap: "Mapa Base:",
    opt_esri_satellite: "Esri Satelital (Alta Resolución)",
    opt_esri_dark: "Esri Modo Oscuro (Contraste SAR)",
    opt_carto_dark: "CartoDB Dark (Stadia Maps)",
    opt_osm: "OpenStreetMap Estándar",
    placeholder_carto_key: "API Key Stadia...",
    btn_apply_key: "Aplicar Clave",

    // Tab 3: Radar & Data
    section_sar_swaths: "BLOQUES ORBITALES SAR (ASF)",
    label_track_filter: "Filtro de Tracks:",
    opt_track_all_peru: "🇵🇪 Perú Completo (118 Escenas Activas)",
    opt_track_all_south: "Tramos Sur / Arequipa (Tracks 47, 25, 127, 120)",
    opt_track_basin_auto: "Tramo de Cuenca Seleccionada",
    opt_track_47: "↗ Track 47 (Ascendente - Camaná/Majes/Chili)",
    opt_track_25: "↙ Track 25 (Descendente - Ocoña/Camaná)",
    opt_track_127: "↙ Track 127 (Descendente - Chili/Tambo)",
    opt_track_120: "↗ Track 120 (Ascendente - Ocoña)",
    btn_project_raster: "Proyectar Ráster Radar en Bloques",
    btn_query_asf: "Consultar API NASA ASF en Vivo",
    asf_track_default: "4 Tramos Activos",
    asf_date_default: "Ciclo 12d",
    asf_granule_default: "Cargando catálogo satelital...",

    label_sim_threshold: "Umbral Simulación:",
    sim_threshold_demo_note: "Demostración de contraste",
    label_inter_mode: "Modo de Intersección:",
    opt_inter_strict: "Solo dentro de Bloques SAR Activos",
    opt_inter_global: "Forzar en Toda la Red Nacional",

    section_dem_params: "Parámetros DEM y Topografía",
    label_dem_res: "Resolución DEM:",
    opt_dem_fast: "Rápida (z10)",
    opt_dem_high: "Alta Res (z11)",
    opt_dem_ultra: "Ultra Detalle (z12)",
    label_drainage_density: "Densidad de Drenaje:",
    chk_optical_burn: "Guiar cauces con índices ópticos",
    chk_show_dry: "Mostrar rutas secas modeladas (trazos)",
    chk_hide_preexisting: "Ocultar capas de simulación previas",

    section_colab_matrices: "MATRICES COLAB GCOV",
    desc_colab_matrices: "Exportaciones previas del Valle Majes-Camaná (350×350 px).",
    opt_colab_water_mask: "Cambios candidatos de señal",
    opt_colab_delta_db: "Mapa Diferencial Puro ΔdB",
    opt_colab_crecida: "Crecida 19-Ene-2026 (HHHH)",
    opt_colab_estiaje: "Estiaje 04-Sep-2026 (HHHH)",
    btn_fly_colab: "Volar a Recorte",
    btn_view_colab: "Ver 3 Matrices Colab",

    // HUD & Overlays
    hud_view_prefix: "Vista: ",
    hud_swaths_suffix: " Tramos Activos",
    legend_title: "SIMBOLOGÍA SAR",
    legend_detected_channel: "Cauce detectado en órbita SAR",
    legend_baseline: "Red base hidrográfica",
    legend_checkpoint: "Punto crítico de desborde",
    legend_swath: "Bloque orbital NISAR (242 km)",

    // Timeline Bar
    btn_cycle_play: "Ciclo 12d",
    timeline_title: "MONITOREO MULTITEMPORAL BANDA L",
    timeline_phase_default: "ALERTA ROJA",

    // Colab Modal
    modal_title: "Análisis Polarimétrico Multitemporal NISAR L2 GCOV",
    modal_subtitle: "Valle Majes-Camaná (EPSG:32718) · Estiaje (04-Sep-2026) vs Crecida (19-Ene-2026) · Expansión: 158.7 ha | Llanura: 618.9 ha",
    modal_card_1_title: "1. Fórmula Decibelios + Speckle:",
    modal_card_2_title: "2. Agua Libre Nueva (158.7 ha):",
    modal_card_2_note: "(Reflexión especular)",
    modal_card_3_title: "3. Llanura Inundada (618.9 ha):",
    modal_card_3_note: "(Doble rebote Banda L en cultivos)",

    // Map Popups & SAR Tooltips
    popup_cp_title: "📍 Punto Crítico de Inundación",
    popup_basin: "Cuenca:",
    popup_sar_status: "Estado Detección SAR:",
    popup_inside_swath: "DENTRO DE BLOQUE SAR ACTIVO",
    popup_inside_swath_en: "DENTRO DE BLOQUE SAR ACTIVO",
    popup_outside_swath: "Fuera de Umbral / Bloque",
    popup_vulnerability: "Vulnerabilidad:",
    popup_channel_base: "CAUCE HIDROGRÁFICO",
    popup_ana_code: "Código ANA:",
    popup_sim_value: "Valor de simulación:",
    popup_detected_river: "🛰️ RÍO DETECTADO POR RADAR SAR",
    popup_orbital_phase: "Fase Orbital:",
    popup_backscatter: "Retrodispersión Medida (σ⁰):",
    popup_water_width: "Ancho Lámina Agua:",
    popup_flooded_crop: "Área Agrícola Inundada:",
    popup_national_network: "🇵🇪 RED HIDROGRÁFICA DEL PERÚ:",
    popup_national_detected: "🛰️ RÍO NACIONAL DETECTADO POR SAR:",
    popup_region: "Región Hidrográfica:",
    popup_slope_zone: "Vertiente / Zona:",
    popup_radar_signature: "Firma Radar (σ⁰):",
    popup_extracted_pts: "Puntos GPS Extraídos:",
    popup_pts_inside_suffix: "vértices dentro del bloque SAR",
    popup_swath_title: "🛰️ BLOQUE SAR ACTIVO (NASA ASF)",
    popup_track_label: "Track Orbital",
    dir_ascending: "↗ ASCENDENTE (Sur → Norte)",
    dir_descending: "↙ DESCENDENTE (Norte → Sur)",
    popup_acq_date: "Fecha Adquisición:",
    popup_mode_pol: "Modo / Polarización:",
    btn_project_single: "Proyectar este Bloque",
    btn_project_all: "Proyectar Todos",
    reader_view: "📡 Ver",
    btn_hide_radar_images: "Ocultar Imágenes Radar",
    btn_project_radar_images: "Proyectar Raster Radar en Bloques",
    btn_querying_asf: "Consultando NASA ASF API en vivo...",
    btn_asf_success: "Escenas NASA ASF Leídas en Vista",
    btn_asf_cached: "Usando Catálogo Nacional Pre-cargado (166 escenas)"
  }
};

const BASIN_NAMES = {
  en: {
    camana: "Camaná - Majes - Colca Basin",
    chili: "Chili - Quilca - Arequipa Basin",
    ocona: "Ocoña - Cotahuasi Basin",
    tambo: "Tambo Valley Basin",
    peru_all: "National Peru (118 SAR Swaths)"
  },
  es: {
    camana: "Cuenca Camaná - Majes - Colca",
    chili: "Cuenca Chili - Quilca - Arequipa",
    ocona: "Cuenca Río Ocoña - Cotahuasi",
    tambo: "Cuenca Valle del Tambo",
    peru_all: "Perú Completo (118 Bloques SAR)"
  }
};

const CYCLE_TEXTS = {
  en: [
    {
      phase: "DRY SEASON / BASELINE",
      riskLevel: "GREEN LEVEL (BASE)",
      summary: "Baseline dry-season orbital pass. SAR radar shows normal backscatter (-9.4 dB) over agricultural soils with water strictly confined to the low-flow channel."
    },
    {
      phase: "EARLY RAINY SEASON",
      riskLevel: "NORMAL (MONITORING)",
      summary: "Early precipitations in the high Andean headwaters. Runoff increases discharge without exceeding bankfull river capacity."
    },
    {
      phase: "ACTIVE FLUVIAL RISE",
      riskLevel: "MODERATE ALERT",
      summary: "Continuous mountain rainfall saturates the upper basin. Main river channel widens significantly with initial low-lying bank inundation."
    },
    {
      phase: "PEAK DISCHARGE / CREST",
      riskLevel: "CRITICAL FLOOD ALERT",
      summary: "Maximum discharge peak recorded in the valley. Specular reflection expands over agricultural fields and riparian corridors."
    },
    {
      phase: "RECEDING WATER / DRAINAGE",
      riskLevel: "RECEDING ALERT",
      summary: "Fluvial floodwaters gradually recede towards the thalweg. Residual standing water patches detected via reduced backscatter in low zones."
    },
    {
      phase: "POST-CREST STABILIZATION",
      riskLevel: "RECOVERY STAGE",
      summary: "Stabilization pass. River discharge returns to seasonal median. Sediment deposits and saturated crop parcels visible in dual-date delta-dB."
    },
    {
      phase: "SEASONAL BASELINE RETURN",
      riskLevel: "NORMAL (STABLE)",
      summary: "End of seasonal cycle. Radar signature stabilizes to pre-event levels (-10.8 dB) across the entire coastal valley."
    }
  ],
  es: [
    {
      phase: "ESTIAJE / LÍNEA BASE",
      riskLevel: "NIVEL VERDE (BASE)",
      summary: "Pasada orbital de referencia en época seca. El radar SAR muestra retrodispersión normal (-9.4 dB) en suelos agrícolas y agua confinada estrictamente al canal estiaje."
    },
    {
      phase: "INICIO TEMPORADA LLUVIAS",
      riskLevel: "NORMAL (MONITOREO)",
      summary: "Primeras precipitaciones en cabeceras de cuenca andinas. Escorrentía superficial incrementa caudal sin superar márgenes naturales."
    },
    {
      phase: "CRECIDA FLUVIAL ACTIVA",
      riskLevel: "ALERTA MODERADA",
      summary: "Lluvias continuas saturan la cuenca alta. El cauce principal del río incrementa su sección transversal con anegamiento incipiente."
    },
    {
      phase: "PICO MÁXIMO DE CRECIDA",
      riskLevel: "ALERTA ROJA (DESBORDE)",
      summary: "Pico de avenida torrencial en el valle. Reflexión especular sobre parcelas de cultivo y corredor ripario con desborde en puntos críticos."
    },
    {
      phase: "RECESIÓN / DRENAJE",
      riskLevel: "ALERTA DE RECESIÓN",
      summary: "Descenso gradual de niveles hacia el talweg. Presencia de charcas y saturación de suelo identificadas por contraste radiométrico."
    },
    {
      phase: "ESTABILIZACIÓN POST-AVENIDA",
      riskLevel: "ETAPA DE RECUPERACIÓN",
      summary: "Pasada de estabilización. Caudal retorna a la media estacional. Depósitos aluviales y suelo húmedo detectados en mapa diferencial ΔdB."
    },
    {
      phase: "RETORNO A LÍNEA BASE",
      riskLevel: "NORMAL (ESTABLE)",
      summary: "Cierre de ciclo hidrológico. La firma de radar se estabiliza en niveles previos (-10.8 dB) en todo el valle costero."
    }
  ]
};

function t(key) {
  const dict = I18N_DICT[currentLang] || I18N_DICT.en;
  return dict[key] || I18N_DICT.en[key] || key;
}

function getBasinName(key) {
  const dict = BASIN_NAMES[currentLang] || BASIN_NAMES.en;
  return dict[key] || key;
}

function getCycleText(index) {
  const arr = CYCLE_TEXTS[currentLang] || CYCLE_TEXTS.en;
  return arr[index] || arr[0];
}

const CHECKPOINT_TRANSLATIONS = {
  // Camaná - Majes - Colca
  "Cañón del Colca - Aplao (Cuenca Media)": {
    name: { en: "Colca Canyon - Aplao (Middle Basin)", es: "Cañón del Colca - Aplao (Cuenca Media)" },
    sector: { en: "Castilla / Aplao", es: "Castilla / Aplao" },
    vulnerability: {
      en: "High (Torrential discharge surge and riverbank erosion)",
      es: "Alta (Aumento de caudal torrencial y erosión de riberas)"
    }
  },
  "Bocatoma y Defensas El Monte": {
    name: { en: "El Monte Water Intake and Defenses", es: "Bocatoma y Defensas El Monte" },
    sector: { en: "El Monte - Camaná", es: "El Monte - Camaná" },
    vulnerability: {
      en: "Very High (Levee breach at discharges > 400 m³/s)",
      es: "Muy Alta (Ruptura de dique en crecidas > 400 m³/s)"
    }
  },
  "Llanura Agrícola San Gregorio": {
    name: { en: "San Gregorio Agricultural Plain", es: "Llanura Agrícola San Gregorio" },
    sector: { en: "San Gregorio", es: "San Gregorio" },
    vulnerability: {
      en: "Critical (Floodplain rice paddies detected by SAR double bounce)",
      es: "Crítica (Arrozales inundables detectados por doble rebote SAR)"
    }
  },
  "Delta y Estuario Pucchún - Camaná": {
    name: { en: "Pucchún Delta & Estuary - Camaná", es: "Delta y Estuario Pucchún - Camaná" },
    sector: { en: "Pacific River Mouth", es: "Desembocadura Pacífico" },
    vulnerability: {
      en: "High (Coastal ponding and backwater drainage failure)",
      es: "Alta (Anegamiento costero y retroceso de drenaje)"
    }
  },

  // Quilca - Chili - Sihuas - Sumbay
  "Cuenca Alta Sumbay - Aguada Blanca": {
    name: { en: "Upper Sumbay Basin - Aguada Blanca", es: "Cuenca Alta Sumbay - Aguada Blanca" },
    sector: { en: "Reservoir / Dams", es: "Reserva / Represas" },
    vulnerability: {
      en: "Medium-High (Andean rainfall accumulation and reservoir spill)",
      es: "Media-Alta (Acumulación pluvial andina y descarga de embalses)"
    }
  },
  "Sector Puente Grau - Valle Chilina": {
    name: { en: "Grau Bridge Sector - Chilina Valley", es: "Sector Puente Grau - Valle Chilina" },
    sector: { en: "Arequipa City", es: "Arequipa Ciudad" },
    vulnerability: {
      en: "High (Urban flow velocity surge)",
      es: "Alta (Incremento de velocidad de flujo urbano)"
    }
  },
  "Meandro Arancota - Tiabaya": {
    name: { en: "Arancota - Tiabaya Meander", es: "Meandro Arancota - Tiabaya" },
    sector: { en: "Arancota / Tiabaya", es: "Arancota / Tiabaya" },
    vulnerability: {
      en: "Very High (Urban riparian flooding and agricultural plot inundation)",
      es: "Muy Alta (Inundación de ribera urbana y parcelas agrícolas)"
    }
  },
  "Cañón de Uchumayo - Valle de Vítor": {
    name: { en: "Uchumayo Canyon - Vítor Valley", es: "Cañón de Uchumayo - Valle de Vítor" },
    sector: { en: "Uchumayo / Vítor", es: "Uchumayo / Vítor" },
    vulnerability: {
      en: "High (Hydraulic constriction and agricultural ponding)",
      es: "Alta (Estrangulamiento hidráulico y anegamiento agrícola)"
    }
  },
  "Desembocadura Río Quilca": {
    name: { en: "Quilca River Mouth", es: "Desembocadura Río Quilca" },
    sector: { en: "Quilca Coast", es: "Quilca - Costa" },
    vulnerability: {
      en: "High (Estuary overflow and lower valley flood)",
      es: "Alta (Desborde en estuario y valle bajo)"
    }
  },

  // Ocoña - Cotahuasi - Marán
  "Confluencia Cotahuasi - Marán": {
    name: { en: "Cotahuasi - Marán Confluence", es: "Confluencia Cotahuasi - Marán" },
    sector: { en: "Upper Ocoña Basin", es: "Cuenca Alta Ocoña" },
    vulnerability: {
      en: "High (Extreme rainfall runoff in deep canyon)",
      es: "Alta (Aporte pluvial extremo en cañón profundo)"
    }
  },
  "Valle Bajo Santa Rita": {
    name: { en: "Lower Santa Rita Valley", es: "Valle Bajo Santa Rita" },
    sector: { en: "Santa Rita", es: "Santa Rita" },
    vulnerability: {
      en: "Very High (Failure of riverbank defenses and rice crops)",
      es: "Muy Alta (Pérdida de defensas ribereñas y arrozales)"
    }
  },
  "Puente Ocoña - Panamericana Sur": {
    name: { en: "Ocoña Bridge - South Pan-American", es: "Puente Ocoña - Panamericana Sur" },
    sector: { en: "Ocoña Bridge", es: "Puente Ocoña" },
    vulnerability: {
      en: "Critical (Risk to national highway infrastructure and crops)",
      es: "Crítica (Riesgo a infraestructura vial nacional y cultivos)"
    }
  },

  // Tambo - Coralaque
  "Cañón Medio Río Tambo - Omate": {
    name: { en: "Middle Tambo River Canyon - Omate", es: "Cañón Medio Río Tambo - Omate" },
    sector: { en: "Middle Tambo Basin", es: "Cuenca Media Tambo" },
    vulnerability: {
      en: "High (Flood surge transit and lateral debris flows/huaicos)",
      es: "Alta (Tránsito de avenidas y huaicos laterales)"
    }
  },
  "Sector Cocachacra - Puente Santa Rosa": {
    name: { en: "Cocachacra Sector - Santa Rosa Bridge", es: "Sector Cocachacra - Puente Santa Rosa" },
    sector: { en: "Cocachacra", es: "Cocachacra" },
    vulnerability: {
      en: "Very High (Overflow across rice paddies and sugarcane fields)",
      es: "Muy Alta (Desborde sobre campos de arroz y caña)"
    }
  },
  "Llanura La Curva - Punta de Bombón": {
    name: { en: "La Curva Plain - Punta de Bombón", es: "Llanura La Curva - Punta de Bombón" },
    sector: { en: "Punta de Bombón", es: "Punta de Bombón" },
    vulnerability: {
      en: "High (Extensive inundation on deltaic coastal plain)",
      es: "Alta (Inundación extensa en llanura deltaica)"
    }
  }
};

function getCheckpointTranslation(cp) {
  if (!cp) return cp;
  const lang = currentLang === 'es' ? 'es' : 'en';
  const entry = CHECKPOINT_TRANSLATIONS[cp.name];
  if (entry) {
    return {
      name: entry.name[lang] || cp.name,
      sector: entry.sector[lang] || cp.sector,
      vulnerability: entry.vulnerability[lang] || cp.vulnerability
    };
  }
  for (const [k, val] of Object.entries(CHECKPOINT_TRANSLATIONS)) {
    if (cp.name && (cp.name.includes(k) || k.includes(cp.name))) {
      return {
        name: val.name[lang] || cp.name,
        sector: val.sector[lang] || cp.sector,
        vulnerability: val.vulnerability[lang] || cp.vulnerability
      };
    }
  }
  return {
    name: cp.name,
    sector: cp.sector,
    vulnerability: cp.vulnerability
  };
}

function getFlightDirectionLabel(dir) {
  const isAsc = (dir === 'ASCENDING' || (typeof dir === 'string' && dir.toUpperCase().includes('ASC')));
  if (currentLang === 'es') {
    return isAsc ? '↗ ASCENDENTE (Sur → Norte)' : '↙ DESCENDENTE (Norte → Sur)';
  }
  return isAsc ? '↗ ASCENDING (South → North)' : '↙ DESCENDING (North → South)';
}

function setLanguage(lang) {
  if (lang !== 'en' && lang !== 'es') lang = 'en';
  currentLang = lang;
  localStorage.setItem('nisar_lang', lang);
  document.documentElement.lang = lang;

  // Update language selector buttons
  const btnEn = document.getElementById('lang-btn-en');
  const btnEs = document.getElementById('lang-btn-es');
  if (btnEn && btnEs) {
    if (lang === 'en') {
      btnEn.className = 'px-2 py-0.5 rounded transition font-semibold cursor-pointer text-water bg-borderline/60';
      btnEs.className = 'px-2 py-0.5 rounded transition font-semibold cursor-pointer text-[#94a3b8] hover:text-[#f1f5f9]';
    } else {
      btnEs.className = 'px-2 py-0.5 rounded transition font-semibold cursor-pointer text-water bg-borderline/60';
      btnEn.className = 'px-2 py-0.5 rounded transition font-semibold cursor-pointer text-[#94a3b8] hover:text-[#f1f5f9]';
    }
  }

  // Translate all elements marked with data-i18n
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const val = t(key);
    if (val) el.textContent = val;
  });

  // Translate placeholder or title attributes
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    const val = t(key);
    if (val) el.setAttribute('title', val);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    const val = t(key);
    if (val) el.setAttribute('placeholder', val);
  });

  // Close any active popup to force re-rendering in the new language
  if (typeof map !== 'undefined' && map && typeof map.closePopup === 'function') {
    map.closePopup();
  }

  // Update map visuals and active telemetry
  if (typeof updateAllVisuals === 'function') {
    updateAllVisuals(false);
  }
  if (typeof renderTimelineControls === 'function') {
    renderTimelineControls();
  }
  if (typeof renderCalculatedRivers === 'function') {
    const streamOrderInput = document.getElementById('dem-drainage-stream-order');
    if (streamOrderInput) renderCalculatedRivers();
  }
}

// Initialize language on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  setLanguage(currentLang);
});
