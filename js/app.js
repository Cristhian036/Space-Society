// Space Society - Motor Principal de Ríos Completos (7,334 Puntos GPS), Ciclos Orbitales (12 Días) y Bloques SAR de NASA ASF
let map;
let currentBasin = 'camana';
let currentCycleIndex = 3; // Ciclo 4 (+36d: 06-17 Feb - Pico de Crecida) por defecto
let currentTrackFilter = 'basin_auto';
let activeBasemapLayer;
let gibsLayer;
let anaWmsLayer;
let realSarOverlayGroup;
let isRealSarOverlayActive = false;
let playInterval = null;
let currentMatchedScenes = [];

// Grupos de Capas en Leaflet
let riverLayerGroup;
let floodLayerGroup;
let swathLayerGroup;
let criticalPointsGroup;

// Configuración de Mapas Base
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
        attribution: '&copy; Stadia Maps &copy; OpenMapTiles &copy; OpenStreetMap',
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
  renderTimelineControls();
  renderBackscatterChart();
  setupEventListeners();
  updateAllVisuals(true);

  setTimeout(() => {
    if (map) map.invalidateSize();
  }, 250);

  window.addEventListener('resize', () => {
    if (map) map.invalidateSize();
  });
});

function initMap() {
  const initial = BASINS[currentBasin];

  map = L.map('map', {
    center: initial.center,
    zoom: initial.zoom,
    zoomControl: false,
    preferCanvas: false
  });

  // Crear Panes con Z-Index explícitos para que el río y su remarcado SIEMPRE estén encima del bloque SAR
  map.createPane('swathPane');
  map.getPane('swathPane').style.zIndex = 380;

  map.createPane('floodPane');
  map.getPane('floodPane').style.zIndex = 610;
  map.getPane('floodPane').style.pointerEvents = 'auto';

  map.createPane('riversTopPane');
  map.getPane('riversTopPane').style.zIndex = 630;
  map.getPane('riversTopPane').style.pointerEvents = 'auto';

  map.createPane('criticalPane');
  map.getPane('criticalPane').style.zIndex = 660;

  swathLayerGroup = L.layerGroup();
  realSarOverlayGroup = L.layerGroup();
  floodLayerGroup = L.layerGroup();
  riverLayerGroup = L.layerGroup();
  criticalPointsGroup = L.layerGroup();

  L.control.zoom({ position: 'topleft' }).addTo(map);

  // Mapa Base Inicial: Esri Satelital
  switchBasemap('esri_satellite');

  // Capa Oficial WMS de la Autoridad Nacional del Agua (ANA - GeoSNIRH)
  anaWmsLayer = L.tileLayer.wms('https://geosnirh.ana.gob.pe/server/services/RecursosHidricosANA_MIL1/MapServer/WMSServer', {
    layers: '0,1,2,3,4,5',
    format: 'image/png',
    transparent: true,
    pane: 'riversTopPane',
    attribution: '&copy; ANA Perú - GeoSNIRH'
  });

  // Agregar grupos al mapa
  swathLayerGroup.addTo(map);
  realSarOverlayGroup.addTo(map);
  floodLayerGroup.addTo(map);
  riverLayerGroup.addTo(map);
  criticalPointsGroup.addTo(map);

  map.on('mousemove', (e) => {
    const coordsEl = document.getElementById('coords-display');
    if (coordsEl) {
      coordsEl.textContent = `${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}`;
    }
  });

  // Re-escalar el grosor del remarcado del río según el nivel de zoom para que nunca se vea deforme ni cortado
  map.on('zoomend', () => {
    updateAllVisuals(false);
  });
}

function switchBasemap(key) {
  const config = getBasemapConfig(key);
  if (!config) return;

  if (activeBasemapLayer && map.hasLayer(activeBasemapLayer)) {
    map.removeLayer(activeBasemapLayer);
  }

  activeBasemapLayer = L.tileLayer(config.url, config.options).addTo(map);
  activeBasemapLayer.bringToBack();
}

function updateGibsLayer(dateStr) {
  if (gibsLayer && map.hasLayer(gibsLayer)) {
    map.removeLayer(gibsLayer);
  }

  const gibsUrl = `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_SNPP_CorrectedReflectance_TrueColor/default/${dateStr}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`;

  gibsLayer = L.tileLayer(gibsUrl, {
    attribution: '&copy; NASA EOSDIS GIBS',
    maxNativeZoom: 9,
    maxZoom: 19,
    opacity: 0.65
  });

  const checkbox = document.getElementById('layer-gibs');
  if (checkbox && checkbox.checked) {
    gibsLayer.addTo(map);
    if (activeBasemapLayer) activeBasemapLayer.bringToBack();
  }
}

function renderTimelineControls() {
  const container = document.getElementById('orbital-timeline-steps');
  if (!container) return;

  container.innerHTML = '';
  ORBITAL_CYCLES.forEach((cyc, idx) => {
    const isActive = idx === currentCycleIndex;
    const btn = document.createElement('button');
    btn.className = `px-2 py-1.5 rounded-lg border text-left transition flex flex-col justify-between ${
      isActive
        ? 'bg-cyan-950/90 border-cyan-400 text-white shadow-md shadow-cyan-500/20'
        : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:bg-slate-800/70 hover:text-slate-200'
    }`;
    btn.onclick = () => selectOrbitalCycle(idx);

    let dotColor = 'bg-emerald-400';
    if (cyc.floodIntensity >= 0.8) dotColor = 'bg-rose-500';
    else if (cyc.floodIntensity >= 0.5) dotColor = 'bg-amber-400';
    else if (cyc.floodIntensity >= 0.15) dotColor = 'bg-yellow-400';

    btn.innerHTML = `
      <div class="flex items-center justify-between w-full">
        <span class="text-[10px] font-mono font-bold ${isActive ? 'text-cyan-300' : 'text-slate-400'}">+${cyc.dayOffset}d</span>
        <span class="w-2 h-2 rounded-full ${dotColor}"></span>
      </div>
      <div class="text-[10px] font-medium truncate mt-0.5">${cyc.shortDate.split(' ')[0]} ${cyc.shortDate.split(' ')[1] || ''}</div>
      <div class="text-[9px] font-mono text-slate-400">${cyc.sarBackscatterDb} dB</div>
    `;
    container.appendChild(btn);
  });
}

function renderBackscatterChart() {
  const chart = document.getElementById('backscatter-chart');
  if (!chart) return;

  chart.innerHTML = '';
  ORBITAL_CYCLES.forEach((cyc, idx) => {
    const isActive = idx === currentCycleIndex;
    const pct = Math.min(100, Math.max(20, Math.round(((Math.abs(cyc.sarBackscatterDb) - 7) / 13) * 100)));
    const isFlooded = cyc.sarBackscatterDb <= -15.0;

    const col = document.createElement('div');
    col.className = 'flex-1 flex flex-col items-center cursor-pointer group h-full justify-end';
    col.onclick = () => selectOrbitalCycle(idx);

    const barColor = isActive
      ? (isFlooded ? 'bg-cyan-400 border-2 border-white' : 'bg-emerald-400 border-2 border-white')
      : (isFlooded ? 'bg-cyan-600/70 group-hover:bg-cyan-400' : 'bg-slate-700 group-hover:bg-slate-500');

    col.innerHTML = `
      <span class="text-[9px] font-mono ${isActive ? 'text-cyan-300 font-bold' : 'text-slate-500'} mb-0.5">${cyc.sarBackscatterDb}</span>
      <div class="w-full rounded-t transition-all ${barColor}" style="height: ${pct}%"></div>
      <span class="text-[9px] font-mono text-slate-400 mt-1">+${cyc.dayOffset}d</span>
    `;
    chart.appendChild(col);
  });
}

function selectOrbitalCycle(index) {
  currentCycleIndex = index;
  renderTimelineControls();
  renderBackscatterChart();
  updateAllVisuals(false);
}

function togglePlayCycles() {
  const playIcon = document.getElementById('play-icon');
  const playText = document.getElementById('play-text');
  if (playInterval) {
    clearInterval(playInterval);
    playInterval = null;
    if (playIcon) playIcon.textContent = '▶';
    if (playText) playText.textContent = 'Simular Ciclo 12 Días';
  } else {
    if (playIcon) playIcon.textContent = '⏸';
    if (playText) playText.textContent = 'Pausar Simulación';
    playInterval = setInterval(() => {
      const next = (currentCycleIndex + 1) % ORBITAL_CYCLES.length;
      selectOrbitalCycle(next);
    }, 1800);
  }
}

// Factor de escala según el zoom actual del mapa para que el remarcado del río sea nítido en cualquier escala
function getZoomScaleFactor() {
  if (!map) return 1.0;
  const z = map.getZoom();
  if (z <= 8) return 0.35;
  if (z === 9) return 0.50;
  if (z === 10) return 0.70;
  if (z === 11) return 0.90;
  if (z === 12) return 1.15;
  return 1.45;
}

// Función Maestra: Dibuja TODOS los Ríos Completos (Cordillera a Océano), su Remarcado SAR Completo y los Bloques SAR
function updateAllVisuals(flyToBasin = false) {
  const basin = BASINS[currentBasin];
  const cycle = ORBITAL_CYCLES[currentCycleIndex];
  if (!basin || !cycle || !map) return;

  riverLayerGroup.clearLayers();
  floodLayerGroup.clearLayers();
  swathLayerGroup.clearLayers();
  criticalPointsGroup.clearLayers();

  const opacitySlider = document.getElementById('sar-opacity');
  const userOpacity = opacitySlider ? (opacitySlider.value / 100) : 0.85;
  const zScale = getZoomScaleFactor();

  // 1. DIBUJAR EL REMARCADO DE AGUA SAR Y EL CAUCE COMPLETO EN TODAS LAS CUENCAS
  // Así, cualquier bloque SAR de 250 km mostrará TODOS los ríos que pasan por su interior de principio a fin sin cortarse
  Object.keys(BASINS).forEach(bKey => {
    const bData = BASINS[bKey];
    const isCurrent = bKey === currentBasin;
    const basinBoost = isCurrent ? 1.0 : 0.80;

    // A) Remarcado de Desborde / Agua SAR a lo largo de TODO el curso del río (de cordillera al mar)
    if (cycle.waterExpansionFactor > 1.02) {
      const outerW = Math.max(4, Math.round(cycle.waterExpansionFactor * 6.5 * zScale * basinBoost));
      const midW = Math.max(2.5, Math.round(cycle.waterExpansionFactor * 4.0 * zScale * basinBoost));
      const coreW = Math.max(1.5, Math.round(cycle.waterExpansionFactor * 2.2 * zScale * basinBoost));

      bData.valleyFloodSegments.forEach(vSeg => {
        // Halo externo de humedad / inundación lateral SAR
        L.polyline(vSeg, {
          pane: 'floodPane',
          color: '#0284c7',
          weight: outerW,
          opacity: userOpacity * 0.42 * basinBoost,
          lineCap: 'butt',
          lineJoin: 'round'
        }).addTo(floodLayerGroup);

        // Mancha media de desborde fluvial activa
        L.polyline(vSeg, {
          pane: 'floodPane',
          color: '#00f5ff',
          weight: midW,
          opacity: userOpacity * 0.65 * basinBoost,
          lineCap: 'butt',
          lineJoin: 'round'
        }).bindPopup(`
          <div class="text-xs space-y-1">
            <span class="text-cyan-400 font-bold block">🌊 REMARCADO DE AGUA SAR (${bData.name})</span>
            <strong>Fase Orbital:</strong> ${cycle.label} (${cycle.phase})<br>
            <strong>Firma Radar (&sigma;<sup>0</sup>):</strong> <code class="bg-slate-800 px-1 py-0.5 rounded text-cyan-300 font-mono">${cycle.sarBackscatterDb} dB</code><br>
            <strong>Ancho Espejo de Agua:</strong> <span class="text-amber-400 font-bold">${cycle.metrics[bKey].width}</span><br>
            <strong>Superficie Inundada:</strong> <span class="text-rose-400 font-bold">${cycle.metrics[bKey].ha}</span>
          </div>
        `).addTo(floodLayerGroup);

        // Núcleo de reflexión especular intensa en picos de crecida
        if (cycle.floodIntensity >= 0.45) {
          L.polyline(vSeg, {
            pane: 'floodPane',
            color: '#e0f2fe',
            weight: coreW,
            opacity: userOpacity * 0.85 * basinBoost,
            lineCap: 'butt',
            lineJoin: 'round'
          }).addTo(floodLayerGroup);
        }
      });
    }

    // B) Línea central continua de alta precisión del río (ENCIMA del bloque SAR)
    bData.riverSegments.forEach(seg => {
      const line = L.polyline(seg, {
        pane: 'riversTopPane',
        color: isCurrent ? '#38bdf8' : '#22d3ee',
        weight: isCurrent ? Math.max(2, 2.5 * zScale) : Math.max(1.5, 2.0 * zScale),
        opacity: isCurrent ? 1.0 : 0.85,
        lineCap: 'butt',
        lineJoin: 'round'
      }).bindPopup(`
        <div class="text-xs space-y-1 font-sans">
          <span class="text-sky-400 font-bold block">💧 RED HIDROGRÁFICA COMPLETA (GPS REAL)</span>
          <strong>Cuenca:</strong> ${bData.name}<br>
          <strong>Código Oficial:</strong> ${bData.anaCode}<br>
          <strong>Caudal en ${cycle.shortDate}:</strong> <span class="text-amber-400 font-bold">${cycle.metrics[bKey].flow}</span>
        </div>
      `);
      line.addTo(riverLayerGroup);
    });

    // C) Puntos críticos de monitoreo a lo largo del río (alta, media y baja cuenca)
    bData.criticalPoints.forEach(cp => {
      if (!isCurrent && map.getZoom() > 10) return; // En zoom cercano mostrar los de la cuenca activa
      const radius = Math.max(4, Math.round((5 + cycle.floodIntensity * 6) * Math.min(1.1, zScale)));
      const isCritical = cycle.floodIntensity >= 0.5;
      const color = isCritical ? '#f43f5e' : (cycle.floodIntensity >= 0.2 ? '#f59e0b' : '#10b981');

      if (cycle.floodIntensity >= 0.25 && isCurrent) {
        L.circleMarker(cp.coords, {
          pane: 'criticalPane',
          radius: radius + 5,
          color: color,
          fillColor: color,
          fillOpacity: 0.22,
          weight: 1,
          dashArray: '3, 3'
        }).addTo(criticalPointsGroup);
      }

      L.circleMarker(cp.coords, {
        pane: 'criticalPane',
        radius: isCurrent ? 5.5 : 4,
        color: '#ffffff',
        fillColor: color,
        fillOpacity: 0.95,
        weight: 1.5
      }).bindPopup(`
        <div class="text-xs space-y-1">
          <span class="font-bold text-rose-400 block">📍 ${cp.name}</span>
          <strong>Cuenca:</strong> ${bData.name}<br>
          <strong>Sector:</strong> ${cp.sector}<br>
          <strong>Vulnerabilidad:</strong> ${cp.vulnerability}<br>
          <strong>Estado (${cycle.shortDate}):</strong> <span class="font-bold text-cyan-300">${cycle.phase}</span>
        </div>
      `).addTo(criticalPointsGroup);
    });
  });

  // 2. DIBUJAR TRAMOS ORBITALES REALES (SWATHS DE 250 KM DE NASA ASF)
  renderOrbitalSwaths(basin, cycle);

  // 3. ACTUALIZAR TARJETAS DE TELEMETRÍA Y SIDEBAR
  const bMetrics = cycle.metrics[currentBasin];
  document.getElementById('pass-badge').textContent = `🛰️ ${cycle.label.toUpperCase()}`;
  const riskEl = document.getElementById('risk-level');
  riskEl.textContent = cycle.riskLevel;
  riskEl.className = `text-[11px] font-mono px-2 py-0.5 rounded border font-bold ${cycle.riskClass}`;

  document.getElementById('ana-code').textContent = basin.anaCode;
  document.getElementById('stat-flow').textContent = `Caudal: ${bMetrics.flow}`;
  document.getElementById('risk-desc').textContent = cycle.summary;
  document.getElementById('sar-width').textContent = bMetrics.width;
  document.getElementById('sar-db').textContent = `${cycle.sarBackscatterDb} dB (${cycle.sarBackscatterDb <= -15 ? 'Agua Detectada' : 'Suelo/Vegetación'})`;
  document.getElementById('stat-hectares').textContent = bMetrics.ha;
  document.getElementById('stat-pop').textContent = bMetrics.pop;
  document.getElementById('active-basin-name').textContent = basin.name;
  document.getElementById('timeline-phase-label').textContent = `${cycle.shortDate} — ${cycle.phase}`;

  const activeDate = getTrackDateForCycle(basin.primaryTrack, cycle);
  updateGibsLayer(activeDate);

  if (flyToBasin) {
    map.flyTo(basin.center, basin.zoom, { duration: 1.1 });
  }
}

function getTrackDateForCycle(trackNum, cycle) {
  if (trackNum === 47) return cycle.dateTrack47;
  if (trackNum === 25) return cycle.dateTrack25;
  if (trackNum === 120) return cycle.dateTrack120;
  if (trackNum === 127) return cycle.dateTrack127;
  return cycle.dateTrack47;
}

// Renderizar todos los bloques (frames) del Tramo Orbital activo
function renderOrbitalSwaths(basin, cycle) {
  let targetTracks = [];
  if (currentTrackFilter === 'basin_auto') {
    targetTracks = [basin.primaryTrack];
  } else if (currentTrackFilter === 'all') {
    targetTracks = [47, 25, 127, 120];
  } else {
    targetTracks = [parseInt(currentTrackFilter, 10)];
  }

  const trackColors = {
    47: '#818cf8',  // Indigo (Ascendente - Camaná/Majes/Chili)
    25: '#34d399',  // Emerald (Descendente - Ocoña/Camaná)
    127: '#f472b6', // Pink (Descendente - Chili/Tambo)
    120: '#fbbf24'  // Amber (Ascendente - Ocoña/Caravelí)
  };

  currentMatchedScenes = [];

  targetTracks.forEach(trNum => {
    const targetDate = getTrackDateForCycle(trNum, cycle);
    let matching = ASF_REAL_SCENES.filter(s => s.track === trNum && s.date === targetDate);
    if (matching.length === 0) {
      matching = ASF_REAL_SCENES.filter(s => s.track === trNum).slice(0, 2);
    }

    matching.forEach(scene => {
      currentMatchedScenes.push(scene);
      const color = trackColors[trNum] || '#818cf8';
      const dirArrow = scene.flightDirection === 'ASCENDING' ? '↗ ASCENDENTE (Sur → Norte)' : '↙ DESCENDENTE (Norte → Sur)';

      const poly = L.polygon(scene.footprint, {
        pane: 'swathPane',
        color: color,
        weight: 2,
        opacity: 0.9,
        dashArray: '8, 6',
        fillColor: color,
        fillOpacity: 0.05
      }).bindPopup(`
        <div class="text-xs space-y-1.5 font-sans">
          <span class="text-indigo-400 font-bold block">🛰️ TRAMO ORBITAL REAL (NASA ASF SAR)</span>
          <strong>Track / Órbita Relativa:</strong> <span class="font-mono text-white">Track ${scene.track} (Cada 12 días)</span><br>
          <strong>Dirección de Vuelo:</strong> ${dirArrow}<br>
          <strong>Fecha y Hora UTC:</strong> <span class="font-mono text-cyan-300">${scene.startTime}</span><br>
          <strong>Modo / Polarización:</strong> <span class="font-mono">${scene.beamMode} (${scene.polarization})</span><br>
          <strong>Granule ID:</strong> <code class="text-[10px] bg-slate-800 px-1 py-0.5 rounded block truncate">${scene.granuleName}</code>
          <div class="pt-1 flex gap-2">
            <button onclick="toggleRealSarImageOverlay(true)" class="bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 py-1 rounded text-[11px] font-medium w-full">
              📡 Proyectar Todos los Bloques de este Tramo
            </button>
          </div>
        </div>
      `);
      poly.addTo(swathLayerGroup);
    });
  });

  if (currentMatchedScenes.length > 0) {
    const primaryGranule = currentMatchedScenes[0];
    const dirShort = primaryGranule.flightDirection === 'ASCENDING' ? '↗ ASCENDENTE' : '↙ DESCENDENTE';
    document.getElementById('asf-track-label').textContent = `Track ${primaryGranule.track} (${dirShort} · ${currentMatchedScenes.length} bloques)`;
    document.getElementById('asf-date-label').textContent = primaryGranule.startTime.substring(0, 16).replace('T', ' ') + 'Z';
    const granEl = document.getElementById('asf-granule-name');
    granEl.textContent = currentMatchedScenes.map(s => s.granuleName).join(' + ');
    granEl.title = granEl.textContent;
    document.getElementById('hud-track-info').textContent = `Track ${primaryGranule.track} (${primaryGranule.date})`;

    if (isRealSarOverlayActive) {
      showAllMatchedSceneOverlays();
    }
  }
}

// Proyectar TODOS los bloques del Tramo Orbital (superior e inferior) sin bordes negros y DEBAJO del remarcado de los ríos
function showAllMatchedSceneOverlays() {
  realSarOverlayGroup.clearLayers();

  currentMatchedScenes.forEach(scene => {
    if (!scene || !scene.browseUrl || !scene.footprint || scene.footprint.length === 0) return;
    const lats = scene.footprint.map(p => p[0]);
    const lons = scene.footprint.map(p => p[1]);
    const bounds = [
      [Math.min(...lats), Math.min(...lons)],
      [Math.max(...lats), Math.max(...lons)]
    ];

    L.imageOverlay(scene.browseUrl, bounds, {
      pane: 'swathPane',
      opacity: 0.85,
      className: 'sar-browse-image',
      interactive: false
    }).addTo(realSarOverlayGroup);
  });

  isRealSarOverlayActive = true;
  const btnText = document.getElementById('btn-real-sar-text');
  if (btnText) btnText.textContent = 'Ocultar Imagen Radar Real (ASF)';
}

function toggleRealSarImageOverlay(forceOn = false) {
  if (isRealSarOverlayActive && !forceOn) {
    realSarOverlayGroup.clearLayers();
    isRealSarOverlayActive = false;
    const btnText = document.getElementById('btn-real-sar-text');
    if (btnText) btnText.textContent = 'Proyectar Imagen Radar Real (ASF)';
  } else {
    showAllMatchedSceneOverlays();
    if (map.getZoom() > 9) {
      map.flyTo(BASINS[currentBasin].center, 8, { duration: 1.0 });
    }
  }
}

function projectSpecificScene(granuleName) {
  toggleRealSarImageOverlay(true);
}

function zoomToBasin(basinKey) {
  document.querySelectorAll('.basin-btn').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.getElementById(`btn-${basinKey}`);
  if (activeBtn) activeBtn.classList.add('active');
  currentBasin = basinKey;
  if (currentTrackFilter !== 'all') {
    currentTrackFilter = 'basin_auto';
    const ts = document.getElementById('track-selector');
    if (ts) ts.value = 'basin_auto';
  }
  updateAllVisuals(true);
}

function zoomToAllTracks() {
  document.querySelectorAll('.basin-btn').forEach(btn => btn.classList.remove('active'));
  const btnAll = document.getElementById('btn-all-tracks');
  if (btnAll) btnAll.classList.add('active');

  currentTrackFilter = 'all';
  const ts = document.getElementById('track-selector');
  if (ts) ts.value = 'all';

  updateAllVisuals(false);
  map.flyTo([-16.35, -72.35], 8, { duration: 1.2 });
}

function setupEventListeners() {
  const basemapSelect = document.getElementById('basemap-selector');
  const cartoKeyContainer = document.getElementById('carto-key-container');
  const cartoApiKeyInput = document.getElementById('carto-api-key');
  const btnApplyKey = document.getElementById('btn-apply-key');

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
    });
  }

  const trackSelector = document.getElementById('track-selector');
  if (trackSelector) {
    trackSelector.addEventListener('change', (e) => {
      currentTrackFilter = e.target.value;
      updateAllVisuals(false);
    });
  }

  const swathsCheckbox = document.getElementById('layer-swaths');
  if (swathsCheckbox) {
    swathsCheckbox.addEventListener('change', (e) => {
      if (e.target.checked) map.addLayer(swathLayerGroup);
      else map.removeLayer(swathLayerGroup);
    });
  }

  const riverCheckbox = document.getElementById('layer-river');
  if (riverCheckbox) {
    riverCheckbox.addEventListener('change', (e) => {
      if (e.target.checked) {
        map.addLayer(riverLayerGroup);
        map.addLayer(criticalPointsGroup);
      } else {
        map.removeLayer(riverLayerGroup);
        map.removeLayer(criticalPointsGroup);
      }
    });
  }

  const floodCheckbox = document.getElementById('layer-flood');
  if (floodCheckbox) {
    floodCheckbox.addEventListener('change', (e) => {
      if (e.target.checked) map.addLayer(floodLayerGroup);
      else map.removeLayer(floodLayerGroup);
    });
  }

  const anaWmsCheckbox = document.getElementById('layer-ana-wms');
  if (anaWmsCheckbox) {
    anaWmsCheckbox.addEventListener('change', (e) => {
      if (e.target.checked) {
        if (!map.hasLayer(anaWmsLayer)) anaWmsLayer.addTo(map);
      } else {
        if (map.hasLayer(anaWmsLayer)) map.removeLayer(anaWmsLayer);
      }
    });
  }

  const gibsCheckbox = document.getElementById('layer-gibs');
  if (gibsCheckbox) {
    gibsCheckbox.addEventListener('change', (e) => {
      const cycle = ORBITAL_CYCLES[currentCycleIndex];
      const basin = BASINS[currentBasin];
      if (e.target.checked) {
        updateGibsLayer(getTrackDateForCycle(basin.primaryTrack, cycle));
      } else {
        if (gibsLayer && map.hasLayer(gibsLayer)) map.removeLayer(gibsLayer);
      }
    });
  }

  const sarOpacity = document.getElementById('sar-opacity');
  if (sarOpacity) {
    sarOpacity.addEventListener('input', () => {
      updateAllVisuals(false);
    });
  }
}

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
