// Space Society - Main Map & Layer Management
let map;
let currentBasin = 'camana';
let currentBasemapKey = 'esri_satellite';
let activeBasemapLayer;
let gibsLayer;
let floodLayerGroup;
let sigridLayerGroup;
let riverLayerGroup;

// Basemaps definition
function getBasemapConfig(key) {
  const savedKey = localStorage.getItem('carto_api_key') || '';
  const configs = {
    esri_satellite: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      options: {
        attribution: 'Tiles &copy; Esri &mdash; Earthstar Geographics',
        maxZoom: 19
      }
    },
    esri_dark: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      options: {
        attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
        maxZoom: 16
      }
    },
    carto_dark: {
      url: savedKey 
        ? `https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png?api_key=${savedKey}`
        : 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      options: {
        attribution: '&copy; Stadia Maps &copy; OpenMapTiles &copy; OpenStreetMap contributors',
        maxZoom: 19
      }
    },
    osm: {
      url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      options: {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19
      }
    }
  };
  return configs[key];
}

document.addEventListener('DOMContentLoaded', () => {
  initMap();
  initClock();
  setupEventListeners();
  loadBasinData('camana');

  // Trigger resize recalculation
  setTimeout(() => {
    if (map) map.invalidateSize();
  }, 200);

  window.addEventListener('resize', () => {
    if (map) map.invalidateSize();
  });
});

// Initialize Leaflet Map
function initMap() {
  const initial = BASINS.camana;
  
  // Layer Groups
  floodLayerGroup = L.layerGroup();
  sigridLayerGroup = L.layerGroup();
  riverLayerGroup = L.layerGroup();

  map = L.map('map', {
    center: initial.center,
    zoom: initial.zoom,
    zoomControl: false,
    preferCanvas: true
  });

  // Zoom control top-left
  L.control.zoom({ position: 'topleft' }).addTo(map);

  // Set default basemap: Esri World Imagery
  switchBasemap('esri_satellite');

  // Streaming Layer 2: NASA GIBS VIIRS True Color
  updateGibsLayer('2024-02-15');

  // Add Layer Groups to map
  riverLayerGroup.addTo(map);
  floodLayerGroup.addTo(map);
  sigridLayerGroup.addTo(map);

  // Map mousemove for coordinates HUD
  map.on('mousemove', (e) => {
    const coordsEl = document.getElementById('coords-display');
    if (coordsEl) {
      coordsEl.textContent = `${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}`;
    }
  });
}

// Switch Basemap dynamically
function switchBasemap(key) {
  const config = getBasemapConfig(key);
  if (!config) return;

  if (activeBasemapLayer && map.hasLayer(activeBasemapLayer)) {
    map.removeLayer(activeBasemapLayer);
  }

  activeBasemapLayer = L.tileLayer(config.url, config.options).addTo(map);
  activeBasemapLayer.bringToBack();
  currentBasemapKey = key;

  if (gibsLayer && map.hasLayer(gibsLayer)) {
    gibsLayer.bringToBack();
    activeBasemapLayer.bringToBack();
  }
}

// Update NASA GIBS Tile Layer
function updateGibsLayer(dateStr) {
  if (gibsLayer && map.hasLayer(gibsLayer)) {
    map.removeLayer(gibsLayer);
  }

  // NASA GIBS WMTS Endpoint
  const gibsUrl = `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_SNPP_CorrectedReflectance_TrueColor/default/${dateStr}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`;

  gibsLayer = L.tileLayer(gibsUrl, {
    attribution: '&copy; NASA EOSDIS GIBS',
    maxNativeZoom: 9,
    maxZoom: 19,
    opacity: 0.70
  });

  const checkbox = document.getElementById('layer-gibs');
  if (checkbox && checkbox.checked) {
    gibsLayer.addTo(map);
    if (activeBasemapLayer) {
      activeBasemapLayer.bringToBack();
    }
  }
}

// Load and render basin features
function loadBasinData(basinKey) {
  currentBasin = basinKey;
  const basin = BASINS[basinKey];
  if (!basin || !map) return;

  // Clear previous vector layers
  if (floodLayerGroup) floodLayerGroup.clearLayers();
  if (sigridLayerGroup) sigridLayerGroup.clearLayers();
  if (riverLayerGroup) riverLayerGroup.clearLayers();

  // 1. Draw River Centerline (Red Hidrográfica Oficial ANA / IGN)
  const riverPolyline = L.polyline(basin.riverPath, {
    color: '#38bdf8',
    weight: 4,
    opacity: 0.95,
    dashArray: '6, 6'
  }).bindPopup(`
    <div class="text-xs space-y-1">
      <span class="text-sky-400 font-bold block">💧 CAUCE NOMINAL OFICIAL</span>
      <strong>Río:</strong> ${basin.name}<br>
      <strong>Código ANA:</strong> ${basin.anaCode}<br>
      <strong>Ancho Promedio en Estiaje:</strong> <span class="font-mono text-cyan-300">${basin.nominalWidth}</span><br>
      <p class="text-[10px] text-slate-400 mt-1">Fuente: Autoridad Nacional del Agua (ANA - GeoSNIRH) e Instituto Geográfico Nacional (IGN).</p>
    </div>
  `);
  riverLayerGroup.addLayer(riverPolyline);

  // 2. Draw SIGRID / CENEPRED Vulnerability Zones
  basin.sigridZones.forEach(zone => {
    const poly = L.polygon(zone.coordinates, {
      color: '#e11d48',
      fillColor: '#f43f5e',
      fillOpacity: 0.30,
      weight: 2,
      dashArray: '4, 4'
    }).bindPopup(`
      <div class="text-xs">
        <span class="text-rose-400 font-bold block mb-1">🛡️ CENEPRED - SIGRID</span>
        <strong>Nivel de Susceptibilidad:</strong> ${zone.level}<br>
        <strong>Fuente:</strong> ${zone.source}
      </div>
    `);
    sigridLayerGroup.addLayer(poly);
  });

  // 3. Draw SAR Flood Detected Polygons (Radar thresholding & flood extent)
  basin.floodPolygons.forEach(fp => {
    const floodPoly = L.polygon(fp.coordinates, {
      color: '#0284c7',
      fillColor: '#00f5ff',
      fillOpacity: 0.65,
      weight: 2.5
    }).bindPopup(`
      <div class="text-xs space-y-1">
        <span class="text-cyan-400 font-bold block">🛰️ AGUA DETECTADA POR RADAR SAR</span>
        <strong>Sector:</strong> ${fp.name}<br>
        <strong>Área Afectada:</strong> <span class="text-amber-400 font-bold">${fp.hectares} hectáreas</span><br>
        <strong>Firma Radar (&sigma;<sup>0</sup>):</strong> <code class="bg-slate-800 px-1 py-0.5 rounded text-cyan-300 font-mono">${fp.sarBackscatter}</code><br>
        <strong>Capacidad de Penetración:</strong> <span class="text-emerald-400 font-mono text-[11px]">${fp.penetrationType}</span><br>
        <p class="text-[10px] text-slate-300 mt-1">Superficie lisa reflectora: La alta constante dieléctrica del agua provoca reflexión especular hacia el exterior.</p>
      </div>
    `);
    floodLayerGroup.addLayer(floodPoly);
  });

  // 4. Update HUD and Sidebar stats
  const basinNameEl = document.getElementById('active-basin-name');
  if (basinNameEl) basinNameEl.textContent = basin.name;

  const anaCodeEl = document.getElementById('ana-code');
  if (anaCodeEl) anaCodeEl.textContent = basin.anaCode;

  const nominalWidthEl = document.getElementById('nominal-width');
  if (nominalWidthEl) nominalWidthEl.textContent = basin.nominalWidth;

  const sarWidthEl = document.getElementById('sar-width');
  if (sarWidthEl) sarWidthEl.textContent = basin.sarExpandedWidth;

  const riskLevelEl = document.getElementById('risk-level');
  if (riskLevelEl) {
    riskLevelEl.textContent = basin.riskLevel;
    riskLevelEl.className = `text-xs font-mono px-2 py-0.5 rounded border ${basin.riskClass}`;
  }

  const riskDescEl = document.getElementById('risk-desc');
  if (riskDescEl) riskDescEl.innerHTML = basin.description;

  const statHectaresEl = document.getElementById('stat-hectares');
  if (statHectaresEl) statHectaresEl.textContent = basin.cropsHectares;

  const statPopEl = document.getElementById('stat-pop');
  if (statPopEl) statPopEl.textContent = basin.populationRisk;

  // Fly smoothly to basin and ensure layout invalidation
  map.flyTo(basin.center, basin.zoom, { duration: 1.2 });
  setTimeout(() => {
    map.invalidateSize();
  }, 300);
}

// Basin switcher button handler
function zoomToBasin(basinKey) {
  document.querySelectorAll('.basin-btn').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.getElementById(`btn-${basinKey}`);
  if (activeBtn) activeBtn.classList.add('active');
  loadBasinData(basinKey);
}

// UI and Layer Checkbox Event Listeners
function setupEventListeners() {
  // Basemap selector
  const basemapSelect = document.getElementById('basemap-selector');
  const cartoKeyContainer = document.getElementById('carto-key-container');
  const cartoApiKeyInput = document.getElementById('carto-api-key');
  const btnApplyKey = document.getElementById('btn-apply-key');

  // Load saved key if any
  const savedKey = localStorage.getItem('carto_api_key');
  if (savedKey && cartoApiKeyInput) {
    cartoApiKeyInput.value = savedKey;
  }

  if (basemapSelect) {
    basemapSelect.addEventListener('change', (e) => {
      const selected = e.target.value;
      if (selected === 'carto_dark') {
        if (cartoKeyContainer) cartoKeyContainer.classList.remove('hidden');
      } else {
        if (cartoKeyContainer) cartoKeyContainer.classList.add('hidden');
      }
      switchBasemap(selected);
    });
  }

  if (btnApplyKey && cartoApiKeyInput) {
    btnApplyKey.addEventListener('click', () => {
      const key = cartoApiKeyInput.value.trim();
      localStorage.setItem('carto_api_key', key);
      switchBasemap('carto_dark');
      alert(key ? 'API Key aplicada a CartoDB/Stadia Maps.' : 'API Key limpiada.');
    });
  }

  // Official River Layer toggle
  const riverCheckbox = document.getElementById('layer-river');
  if (riverCheckbox) {
    riverCheckbox.addEventListener('change', (e) => {
      if (e.target.checked) {
        map.addLayer(riverLayerGroup);
      } else {
        map.removeLayer(riverLayerGroup);
      }
    });
  }

  // GIBS layer toggle
  const gibsCheckbox = document.getElementById('layer-gibs');
  if (gibsCheckbox) {
    gibsCheckbox.addEventListener('change', (e) => {
      if (e.target.checked) {
        if (!map.hasLayer(gibsLayer)) gibsLayer.addTo(map);
        if (activeBasemapLayer) activeBasemapLayer.bringToBack();
      } else {
        if (map.hasLayer(gibsLayer)) map.removeLayer(gibsLayer);
      }
    });
  }

  // Date picker change for NASA GIBS
  const datePicker = document.getElementById('date-picker');
  if (datePicker) {
    datePicker.addEventListener('change', (e) => {
      updateGibsLayer(e.target.value);
    });
  }

  // Flood mask toggle (SAR)
  const floodCheckbox = document.getElementById('layer-flood');
  if (floodCheckbox) {
    floodCheckbox.addEventListener('change', (e) => {
      if (e.target.checked) {
        map.addLayer(floodLayerGroup);
      } else {
        map.removeLayer(floodLayerGroup);
      }
    });
  }

  // SIGRID layer toggle
  const sigridCheckbox = document.getElementById('layer-sigrid');
  if (sigridCheckbox) {
    sigridCheckbox.addEventListener('change', (e) => {
      if (e.target.checked) {
        map.addLayer(sigridLayerGroup);
      } else {
        map.removeLayer(sigridLayerGroup);
      }
    });
  }

  // SAR Opacity slider
  const sarOpacity = document.getElementById('sar-opacity');
  if (sarOpacity) {
    sarOpacity.addEventListener('input', (e) => {
      const val = e.target.value / 100;
      if (floodLayerGroup) {
        floodLayerGroup.eachLayer(layer => {
          if (layer.setStyle) layer.setStyle({ fillOpacity: val * 0.75 });
        });
      }
    });
  }
}

// Clock
function initClock() {
  const clockEl = document.getElementById('clock');
  function update() {
    if (!clockEl) return;
    const now = new Date();
    clockEl.textContent = now.toISOString().substring(11, 19) + ' UTC';
  }
  update();
  setInterval(update, 1000);
}
