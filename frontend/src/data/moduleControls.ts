export interface ModuleField {
  id: string;
  label: string;
  type: "checkbox" | "select" | "range" | "password";
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}
export interface ModuleGroup {
  title: string;
  fields: ModuleField[];
  actions?: { id: ModuleAction; label: string }[];
}
export const moduleActions = {
  loadRivers: 'aside button[onclick*="toggleMathRiverEngine();"]',
  recalculate: 'aside button[onclick*="runMathematicalRiverExtraction(true)"]',
  nisarZone: 'aside button[onclick="flyToNisarColabZone()"]',
  nisarMatrices: 'aside button[onclick="openNisarColabModal()"]',
  radarImages: "#btn-toggle-real-sar",
  fetchScenes: "#btn-fetch-live-asf",
  applyKey: "#btn-apply-key",
} as const;
export type ModuleAction = keyof typeof moduleActions;
export const moduleBasins = [
  { id: "btn-peru-all", label: "Todo el Perú" },
  { id: "btn-camana", label: "Camaná-Majes" },
  { id: "btn-chili", label: "Chili-Quilca" },
  { id: "btn-ocona", label: "Ocoña" },
  { id: "btn-tambo", label: "Tambo" },
  { id: "btn-all-tracks", label: "Bloques sur" },
] as const;
export const moduleGroups: ModuleGroup[] = [
  {
    title: "Motor matemático",
    fields: [
      {
        id: "toggle-math-engine",
        label: "Activar extracción de ríos",
        type: "checkbox",
      },
      {
        id: "math-res-select",
        label: "Modo de consulta / DEM",
        type: "select",
        options: [
          { value: "standard", label: "Rápido SQLite" },
          { value: "high", label: "Alta fidelidad SQLite" },
          { value: "ultra", label: "Ultra detalle (z11/z12)" },
        ],
      },
      {
        id: "math-sens-slider",
        label: "Densidad de drenaje",
        type: "range",
        min: 0.4,
        max: 3,
        step: 0.2,
      },
      {
        id: "math-burn-optical",
        label: "Filtro de valle TPI + stream burning",
        type: "checkbox",
      },
      {
        id: "math-show-dry",
        label: "Mostrar quebradas secas secundarias",
        type: "checkbox",
      },
      {
        id: "math-hide-preexisting",
        label: "Ocultar capas base",
        type: "checkbox",
      },
    ],
    actions: [
      { id: "loadRivers", label: "Cargar ríos desde SQLite" },
      { id: "recalculate", label: "Recalcular DEM y guardar" },
    ],
  },
  {
    title: "NISAR L2 GCOV · Colab",
    fields: [
      {
        id: "toggle-nisar-colab",
        label: "Mostrar capa NISAR",
        type: "checkbox",
      },
      {
        id: "nisar-colab-mode",
        label: "Capa raster NISAR",
        type: "select",
        options: [
          { value: "water_mask", label: "Agua nueva + llanura inundada" },
          { value: "delta_db", label: "Diferencia ΔdB" },
          { value: "crecida", label: "Crecida · 19 ene 2026" },
          { value: "estiaje", label: "Estiaje · 04 sep 2026" },
        ],
      },
    ],
    actions: [
      { id: "nisarZone", label: "Ir al recorte NISAR" },
      { id: "nisarMatrices", label: "Ver matrices de comparación" },
    ],
  },
  {
    title: "Detección de ríos · SAR",
    fields: [
      {
        id: "sar-threshold-slider",
        label: "Umbral de detección de agua σ⁰",
        type: "range",
        min: -21,
        max: -10,
        step: 0.5,
        unit: "dB",
      },
      {
        id: "detection-mode-select",
        label: "Modo de detección",
        type: "select",
        options: [
          {
            value: "strict_sar_intersect",
            label: "Dentro de bloques SAR activos",
          },
          { value: "global_all", label: "Toda la red nacional" },
        ],
      },
    ],
  },
  {
    title: "Cobertura SAR · NASA ASF",
    fields: [
      { id: "layer-swaths", label: "Mostrar bloques SAR", type: "checkbox" },
      {
        id: "track-selector",
        label: "Bloques activos",
        type: "select",
        options: [
          { value: "peru_all", label: "Todos los bloques del Perú" },
          { value: "all", label: "Tramos sur / Arequipa" },
          { value: "basin_auto", label: "Cuenca seleccionada" },
          { value: "47", label: "Track 47 · Camaná / Majes / Chili" },
          { value: "25", label: "Track 25 · Ocoña / Camaná" },
          { value: "127", label: "Track 127 · Chili / Tambo" },
          { value: "120", label: "Track 120 · Ocoña / Caravelí" },
        ],
      },
    ],
    actions: [
      { id: "radarImages", label: "Proyectar imágenes radar" },
      { id: "fetchScenes", label: "Consultar NASA ASF en vivo" },
    ],
  },
  {
    title: "Capas y mapa base",
    fields: [
      {
        id: "basemap-selector",
        label: "Mapa base",
        type: "select",
        options: [
          {
            value: "esri_satellite",
            label: "Esri satelital · alta resolución",
          },
          { value: "esri_dark", label: "Esri modo oscuro" },
          { value: "carto_dark", label: "CartoDB / Stadia Maps" },
          { value: "osm", label: "OpenStreetMap" },
        ],
      },
      { id: "layer-river", label: "Red de ríos del Perú", type: "checkbox" },
      {
        id: "layer-flood",
        label: "Remarcado SAR de ríos detectados",
        type: "checkbox",
      },
      {
        id: "sar-opacity",
        label: "Intensidad del remarcado SAR",
        type: "range",
        min: 15,
        max: 100,
        step: 1,
        unit: "%",
      },
      {
        id: "layer-ana-wms",
        label: "WMS oficial ANA · GeoSNIRH",
        type: "checkbox",
      },
      {
        id: "layer-gibs",
        label: "NASA GIBS · nubosidad VIIRS",
        type: "checkbox",
      },
      {
        id: "carto-api-key",
        label: "API key de Stadia Maps",
        type: "password",
      },
    ],
    actions: [{ id: "applyKey", label: "Aplicar API key" }],
  },
];
export const moduleTextIds = [
  "header-active-stats",
  "clock",
  "pass-badge",
  "detected-rivers-count",
  "math-engine-status",
  "asf-track-label",
  "asf-date-label",
  "risk-level",
  "ana-code",
  "stat-flow",
  "sar-width",
  "stat-hectares",
  "stat-pop",
  "risk-desc",
] as const;
