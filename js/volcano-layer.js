/**
 * ==============================================================================
 * SPACE SOCIETY — Capa de Monitoreo Volcánico y Corredores de Lahares
 * Sensores: NISAR L-Band SAR (GCOV) + Modelos Topográficos DEM / CENEPRED
 * Volcanes: Misti, Chachani, Sabancaya, Ubinas
 * ==============================================================================
 */

let volcanoLayerGroup = L.layerGroup();
let laharCorridorsGroup = L.layerGroup();
let hazardZonesGroup = L.layerGroup();
let isVolcanoLayerActive = false;

// Datos nativos integrados para renderizado inmediato (incluso sin servidor backend)
const VOLCANO_DATA = [
  {
    id: "misti",
    name: "Volcán Misti",
    type: "Estratovolcán activo",
    elevation: "5,822 msnm",
    coords: [-16.2954, -71.4084], // [lat, lon]
    distArequipa: "17.5 km",
    status: "Activo en reposo / Emisión fumarólica débil",
    alert: "Verde",
    alertBg: "bg-emerald-500",
    populationRisk: "1,100,000 hab. (Ciudad de Arequipa)",
    threats: "Lahares en torrenteras urbanas hacia el Río Chili, flujos piroclásticos y tefra",
    sarDb: "-9.8 dB (HH) / -16.4 dB (HV)",
    sarRoughness: "Muy alta (bloques de lava y andesita escarpada)",
    craterRadius: 450
  },
  {
    id: "sabancaya",
    name: "Volcán Sabancaya",
    type: "Complejo estratovolcánico activo",
    elevation: "5,976 msnm",
    coords: [-15.7870, -71.8570],
    distArequipa: "72 km al Norte",
    status: "Erupción explosiva continua (emisión de ceniza)",
    alert: "Naranja",
    alertBg: "bg-orange-500",
    populationRisk: "35,000 hab. (Valle del Colca)",
    threats: "Explosiones diarias, columnas de ceniza (>3.5 km), lahares al Río Colca",
    sarDb: "-12.1 dB (HH) / -19.2 dB (HV)",
    sarRoughness: "Manto de ceniza fina sobre roca volcánica rugosa",
    craterRadius: 600
  },
  {
    id: "chachani",
    name: "Volcán Chachani",
    type: "Complejo de domos y estratovolcán",
    elevation: "6,057 msnm",
    coords: [-16.1911, -71.5303],
    distArequipa: "21 km al NO",
    status: "Inactivo histórico",
    alert: "Verde",
    alertBg: "bg-emerald-500",
    populationRisk: "150,000 hab. (Yura / Cerro Colorado)",
    threats: "Flujos de detritos por deshielo hacia Yura y Río Chili",
    sarDb: "-8.9 dB (HH) / -15.8 dB (HV)",
    sarRoughness: "Alta (derrumbes rocosos, depósitos morrénicos)",
    craterRadius: 700
  },
  {
    id: "ubinas",
    name: "Volcán Ubinas",
    type: "Estratovolcán con caldera",
    elevation: "5,672 msnm",
    coords: [-16.3551, -70.9031],
    distArequipa: "68 km al Este",
    status: "Históricamente el más activo del Perú",
    alert: "Amarillo",
    alertBg: "bg-amber-500",
    populationRisk: "15,000 hab. (Valle de Ubinas / Cuenca Tambo)",
    threats: "Explosiones periódicas, caída de cenizas sobre pastizales y fuentes de agua",
    sarDb: "-11.4 dB (HH) / -18.0 dB (HV)",
    sarRoughness: "Media-Alta (depósitos de tefra y caldera)",
    craterRadius: 700
  }
];

const LAHAR_CORRIDORS_DATA = [
  {
    name: "Torrentera San Lázaro",
    origin: "Misti (Flanco Oeste) → Río Chili",
    vulnerability: "Crítica (Cruza centro urbano de Arequipa)",
    length: "14.2 km",
    coords: [
      [-16.290, -71.425],
      [-16.312, -71.458],
      [-16.340, -71.492],
      [-16.375, -71.518],
      [-16.393, -71.534] // Desembocadura en Río Chili (Puente Grau)
    ]
  },
  {
    name: "Torrentera Miraflores - Huarangal",
    origin: "Misti (Flanco Suroeste) → Drenaje Sur Chili",
    vulnerability: "Alta (Miraflores, Mariano Melgar)",
    length: "16.8 km",
    coords: [
      [-16.310, -71.415],
      [-16.345, -71.442],
      [-16.375, -71.478],
      [-16.398, -71.512],
      [-16.408, -71.531]
    ]
  },
  {
    name: "Torrentera Agua Salada / Paucarpata",
    origin: "Misti (Flanco Sur) → Río Socabaya",
    vulnerability: "Alta (Paucarpata / Bustamante)",
    length: "19.5 km",
    coords: [
      [-16.330, -71.398],
      [-16.368, -71.420],
      [-16.405, -71.455],
      [-16.435, -71.495],
      [-16.465, -71.528]
    ]
  },
  {
    name: "Quebrada Huayrondo / Yura",
    origin: "Silla Misti - Chachani → Río Yura",
    vulnerability: "Moderada (Vía Arequipa - Yura)",
    length: "15.1 km",
    coords: [
      [-16.240, -71.450],
      [-16.248, -71.490],
      [-16.255, -71.545],
      [-16.250, -71.605]
    ]
  }
];

function getMapInstance() {
  if (typeof window.map !== 'undefined' && window.map) return window.map;
  if (typeof map !== 'undefined' && map) return map;
  return null;
}

/**
 * Inicializa y renderiza las capas volcánicas en el mapa de Leaflet
 */
function initVolcanoLayer() {
  const currentMap = getMapInstance();
  if (!currentMap) return;

  // 1. Renderizar Zonas de Peligro Volcánico (Círculos concéntricos aproximados)
  // Misti
  const mistiCoords = [-16.2954, -71.4084];
  L.circle(mistiCoords, {
    radius: 7000,
    color: '#ef4444',
    weight: 1.5,
    fillColor: '#ef4444',
    fillOpacity: 0.20,
    dashArray: '4, 4'
  }).bindTooltip("Misti: Zona de Alto Peligro Proximal (7 km)", { sticky: true }).addTo(hazardZonesGroup);

  L.circle(mistiCoords, {
    radius: 15000,
    color: '#f97316',
    weight: 1.5,
    fillColor: '#f97316',
    fillOpacity: 0.12,
    dashArray: '6, 6'
  }).bindTooltip("Misti: Zona de Peligro Moderado por Lahares en Torrenteras (15 km)", { sticky: true }).addTo(hazardZonesGroup);

  // Sabancaya
  const sabCoords = [-15.7870, -71.8570];
  L.circle(sabCoords, {
    radius: 8000,
    color: '#dc2626',
    weight: 2,
    fillColor: '#dc2626',
    fillOpacity: 0.25
  }).bindTooltip("Sabancaya: Zona de Alto Peligro Activo (8 km)", { sticky: true }).addTo(hazardZonesGroup);

  // 2. Renderizar Corredores de Lahares (Líneas discontinuas de alta energía)
  LAHAR_CORRIDORS_DATA.forEach(corridor => {
    const polyline = L.polyline(corridor.coords, {
      color: '#f97316',
      weight: 3.5,
      opacity: 0.85,
      dashArray: '8, 6'
    });

    polyline.bindPopup(`
      <div class="text-xs p-1">
        <div class="font-bold text-orange-400 text-sm flex items-center gap-1">
          <span>⚠️</span> ${corridor.name}
        </div>
        <div class="text-slate-300 mt-1"><strong>Trayectoria:</strong> ${corridor.origin}</div>
        <div class="text-slate-300"><strong>Longitud:</strong> ${corridor.length}</div>
        <div class="text-slate-300"><strong>Vulnerabilidad:</strong> <span class="text-red-400 font-semibold">${corridor.vulnerability}</span></div>
        <div class="text-[10px] text-slate-400 mt-1 italic">Drena aguas torrenciales y lodo volcánico directamente hacia el cauce del Río Chili.</div>
      </div>
    `);

    polyline.addTo(laharCorridorsGroup);
  });

  // 3. Renderizar Edificios Volcánicos (Marcadores con ícono y telemetría)
  VOLCANO_DATA.forEach(v => {
    // Ícono personalizado HTML con estética de centro de control
    const volcanoIcon = L.divIcon({
      className: 'custom-volcano-marker',
      html: `
        <div class="relative flex items-center justify-center">
          <div class="w-8 h-8 rounded-full bg-slate-900 border-2 border-red-500 flex items-center justify-center text-sm shadow-lg shadow-red-500/50 animate-pulse">
            🌋
          </div>
          <span class="absolute -top-1 -right-1 flex h-3 w-3">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full ${v.alertBg} opacity-75"></span>
            <span class="relative inline-flex rounded-full h-3 w-3 ${v.alertBg}"></span>
          </span>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    const marker = L.marker(v.coords, { icon: volcanoIcon });

    marker.bindPopup(`
      <div class="text-xs p-1 min-w-[240px]">
        <div class="flex items-center justify-between border-b border-slate-700 pb-1.5 mb-2">
          <span class="font-bold text-red-400 text-sm">${v.name}</span>
          <span class="px-1.5 py-0.5 rounded text-[10px] font-bold text-white ${v.alertBg}">Alerta ${v.alert}</span>
        </div>
        <div class="space-y-1 text-slate-300 text-[11px]">
          <div><strong>Altitud:</strong> <span class="text-cyan-300 font-mono">${v.elevation}</span></div>
          <div><strong>Tipo:</strong> ${v.type}</div>
          <div><strong>Estado:</strong> <span class="text-amber-300">${v.status}</span></div>
          <div><strong>Distancia a Arequipa:</strong> ${v.distArequipa}</div>
          <div><strong>Población en riesgo:</strong> ${v.populationRisk}</div>
          <div class="border-t border-slate-800 pt-1 mt-1">
            <span class="text-[10px] text-emerald-400 font-semibold uppercase block">Telemetría NISAR Banda L (GCOV):</span>
            <span class="font-mono text-[10px] text-slate-300">Retrodispersión: ${v.sarDb}</span><br>
            <span class="text-[10px] text-slate-400">Rugosidad: ${v.sarRoughness}</span>
          </div>
        </div>
      </div>
    `);

    marker.addTo(volcanoLayerGroup);
  });
}

/**
 * Conmuta la visualización de la capa volcánica en el mapa
 */
function toggleVolcanoLayer() {
  const currentMap = getMapInstance();
  if (!currentMap) return;

  const checkbox = document.getElementById('toggle-volcanoes');
  const shouldShow = checkbox ? checkbox.checked : !isVolcanoLayerActive;

  if (shouldShow) {
    if (volcanoLayerGroup.getLayers().length === 0) {
      initVolcanoLayer();
    }
    currentMap.addLayer(volcanoLayerGroup);
    currentMap.addLayer(laharCorridorsGroup);
    currentMap.addLayer(hazardZonesGroup);
    isVolcanoLayerActive = true;
    updateVolcanoStatusText("Capas de volcanes, zonas de peligro y torrenteras de lahares activas.");
  } else {
    currentMap.removeLayer(volcanoLayerGroup);
    currentMap.removeLayer(laharCorridorsGroup);
    currentMap.removeLayer(hazardZonesGroup);
    isVolcanoLayerActive = false;
    updateVolcanoStatusText("Capa volcánica desactivada.");
  }
}

/**
 * Enfoca la cámara en un volcán específico
 */
function focusVolcano(id) {
  const currentMap = getMapInstance();
  const volcano = VOLCANO_DATA.find(v => v.id === id);
  if (volcano && currentMap) {
    if (!isVolcanoLayerActive) {
      const checkbox = document.getElementById('toggle-volcanoes');
      if (checkbox) checkbox.checked = true;
      toggleVolcanoLayer();
    }
    currentMap.flyTo(volcano.coords, id === 'misti' ? 12 : 11, { duration: 1.5 });
  }
}

function updateVolcanoStatusText(text) {
  const el = document.getElementById('volcano-status-text');
  if (el) el.textContent = text;
}

// Inicialización automática si map ya existe
if (window.map) {
  initVolcanoLayer();
}
