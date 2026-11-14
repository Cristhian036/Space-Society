// Space Society - Main Map & Layer Management
let map;
let currentBasin = 'camana';
let gibsLayer;
let baseDarkLayer;
let sarLayerGroup;
let floodLayerGroup;
let sigridLayerGroup;
let riverLayerGroup;

document.addEventListener('DOMContentLoaded', () => {
  initMap();
  initClock();
  setupEventListeners();
  loadBasinData('camana');

  // Trigger resize recalculation to guarantee Leaflet paints all tiles
  setTimeout(() => {
    if (map) {
      map.invalidateSize();
    }
  }, 200);

  window.addEventListener('resize', () => {
    if (map) {
      map.invalidateSize();
    }
  });
});

// Initialize Leaflet Map
function initMap() {
  const initial = BASINS.camana;
  
  // Layer Groups
  sarLayerGroup = L.layerGroup();
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

  // Base Map: CartoDB Dark Matter for clear radar data contrast
  baseDarkLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    subdomains: 'abcd',
    maxZoom: 19
  }).addTo(map);

  // Streaming Layer 2: NASA GIBS VIIRS True Color
  updateGibsLayer('2024-02-15');

  // Add Layer Groups
  sarLayerGroup.addTo(map);
  floodLayerGroup.addTo(map);
  sigridLayerGroup.addTo(map);
  riverLayerGroup.addTo(map);

  // Map mousemove for coordinates HUD
  map.on('mousemove', (e) => {
    const coordsEl = document.getElementById('coords-display');
    if (coordsEl) {
      coordsEl.textContent = `${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}`;
    }
  });
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
    maxNativeZoom: 9, // Native max zoom from NASA GIBS
    maxZoom: 19,       // Allow stretching at deeper zoom levels
    opacity: 0.85
  });

  const checkbox = document.getElementById('layer-gibs');
  if (checkbox && checkbox.checked) {
    gibsLayer.addTo(map);
    gibsLayer.bringToBack();
    baseDarkLayer.bringToBack();
  }
}

// Load and render basin features
function loadBasinData(basinKey) {
  currentBasin = basinKey;
  const basin = BASINS[basinKey];
  if (!basin || !map) return;

  // Clear previous vector layers
  if (sarLayerGroup) sarLayerGroup.clearLayers();
  if (floodLayerGroup) floodLayerGroup.clearLayers();
  if (sigridLayerGroup) sigridLayerGroup.clearLayers();
  if (riverLayerGroup) riverLayerGroup.clearLayers();

  // 1. Draw River Centerline
  const riverPolyline = L.polyline(basin.riverPath, {
    color: '#38bdf8',
    weight: 4,
    opacity: 0.9,
    dashArray: '6, 6'
  }).bindPopup(`<strong>Cauce Principal</strong><br>${basin.name}`);
  riverLayerGroup.addLayer(riverPolyline);

  // 2. Draw SIGRID / CENEPRED Vulnerability Zones
  basin.sigridZones.forEach(zone => {
    const poly = L.polygon(zone.coordinates, {
      color: '#e11d48',
      fillColor: '#f43f5e',
      fillOpacity: 0.25,
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

  // 3. Draw SAR Flood Detected Polygons (Radar thresholding simulation)
  basin.floodPolygons.forEach(fp => {
    const floodPoly = L.polygon(fp.coordinates, {
      color: '#0284c7',
      fillColor: '#06b6d4',
      fillOpacity: 0.60,
      weight: 2
    }).bindPopup(`
      <div class="text-xs space-y-1">
        <span class="text-cyan-400 font-bold block">🛰️ AGUA DETECTADA POR RADAR SAR</span>
        <strong>Sector:</strong> ${fp.name}<br>
        <strong>Área Afectada:</strong> <span class="text-amber-400 font-bold">${fp.hectares} hectáreas</span><br>
        <strong>Firma Radar:</strong> <code class="bg-slate-800 px-1 py-0.5 rounded text-cyan-300 font-mono">${fp.sarBackscatter}</code><br>
        <p class="text-[10px] text-slate-400 mt-1">Superficie lisa reflectora: Alta constante dieléctrica del agua provoca reflexión especular hacia el exterior.</p>
      </div>
    `);
    floodLayerGroup.addLayer(floodPoly);
  });

  // 4. Update HUD and Sidebar stats
  const basinNameEl = document.getElementById('active-basin-name');
  if (basinNameEl) basinNameEl.textContent = basin.name;

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
  // GIBS layer toggle
  const gibsCheckbox = document.getElementById('layer-gibs');
  if (gibsCheckbox) {
    gibsCheckbox.addEventListener('change', (e) => {
      if (e.target.checked) {
        if (!map.hasLayer(gibsLayer)) gibsLayer.addTo(map);
        gibsLayer.bringToBack();
        baseDarkLayer.bringToBack();
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

  // SAR layer toggle
  const sarCheckbox = document.getElementById('layer-sar');
  if (sarCheckbox) {
    sarCheckbox.addEventListener('change', (e) => {
      if (e.target.checked) {
        map.addLayer(sarLayerGroup);
      } else {
        map.removeLayer(sarLayerGroup);
      }
    });
  }

  // Flood mask toggle
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
          if (layer.setStyle) layer.setStyle({ fillOpacity: val * 0.7 });
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
