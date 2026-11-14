// Space Society - Motor Principal de Ríos Reales, Ciclos Orbitales (12 Días) y Escenas NASA ASF
let map;
let currentBasin = 'camana';
let currentCycleIndex = 3; // Ciclo 4 (+36d: 06-17 Feb - Pico de Crecida) por defecto
let currentTrackFilter = 'basin_auto';
let activeBasemapLayer;
let gibsLayer;
let anaWmsLayer;
let realSarImageOverlay = null;
let isRealSarOverlayActive = false;
let playInterval = null;

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

  swathLayerGroup = L.layerGroup();
  floodLayerGroup = L.layerGroup();
  riverLayerGroup = L.layerGroup();
  criticalPointsGroup = L.layerGroup();

  map = L.map('map', {
    center: initial.center,
    zoom: initial.zoom,
    zoomControl: false,
    preferCanvas: true
  });

  L.control.zoom({ position: 'topleft' }).addTo(map);

  // Mapa Base Inicial: Esri Satelital
  switchBasemap('esri_satellite');

  // Capa Oficial WMS de la Autoridad Nacional del Agua (ANA - GeoSNIRH)
  anaWmsLayer = L.tileLayer.wms('https://geosnirh.ana.gob.pe/server/services/RecursosHidricosANA_MIL1/MapServer/WMSServer', {
    layers: '0,1,2,3,4,5',
    format: 'image/png',
    transparent: true,
    attribution: '&copy; ANA Perú - GeoSNIRH'
  });

  // Agregar grupos en orden de apilamiento
  swathLayerGroup.addTo(map);
  floodLayerGroup.addTo(map);
  riverLayerGroup.addTo(map);
  criticalPointsGroup.addTo(map);

  map.on('mousemove', (e) => {
    const coordsEl = document.getElementById('coords-display');
    if (coordsEl) {
      coordsEl.textContent = `${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}`;
    }
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

// Actualizar Capa NASA GIBS sincronizada con la fecha del Pase Orbital
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

// Renderizar los 7 botones del Ciclo Orbital de 12 Días en la barra inferior
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

    // Indicador de color según severidad
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

// Renderizar el gráfico de barras de Retrodispersión Radar (dB) cada 12 días
function renderBackscatterChart() {
  const chart = document.getElementById('backscatter-chart');
  if (!chart) return;

  chart.innerHTML = '';
  ORBITAL_CYCLES.forEach((cyc, idx) => {
    const isActive = idx === currentCycleIndex;
    // Escalar de -8 dB a -20 dB en altura porcentual (mayor caída de dB = mayor barra de anomalía de agua)
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

// Función Maestra: Dibuja Ríos Reales, Mancha de Agua SAR Orgánica y Tramos Orbitales
function updateAllVisuals(flyToBasin = false) {
  const basin = BASINS[currentBasin];
  const cycle = ORBITAL_CYCLES[currentCycleIndex];
  if (!basin || !cycle || !map) return;

  // Limpiar capas vectoriales previas
  riverLayerGroup.clearLayers();
  floodLayerGroup.clearLayers();
  swathLayerGroup.clearLayers();
  criticalPointsGroup.clearLayers();

  const opacitySlider = document.getElementById('sar-opacity');
  const userOpacity = opacitySlider ? (opacitySlider.value / 100) : 0.85;

  // 1. DIBUJAR TODOS LOS RÍOS REALES (4,064 puntos GPS)
  // Dibujamos los ríos de las demás cuencas en tono tenue y la cuenca activa resaltada
  Object.keys(BASINS).forEach(bKey => {
    const bData = BASINS[bKey];
    const isCurrent = bKey === currentBasin;

    bData.riverSegments.forEach(seg => {
      // Halo sutil debajo del cauce
      if (isCurrent) {
        L.polyline(seg, {
          color: '#0284c7',
          weight: 5,
          opacity: 0.35,
          lineCap: 'round',
          lineJoin: 'round'
        }).addTo(riverLayerGroup);
      }

      // Línea central real del río
      const line = L.polyline(seg, {
        color: isCurrent ? '#38bdf8' : '#0369a1',
        weight: isCurrent ? 2.5 : 1.5,
        opacity: isCurrent ? 0.95 : 0.65,
        lineCap: 'round',
        lineJoin: 'round'
      }).bindPopup(`
        <div class="text-xs space-y-1 font-sans">
          <span class="text-sky-400 font-bold block">💧 TRAZO HIDROGRÁFICO REAL (GPS)</span>
          <strong>Cuenca:</strong> ${bData.name}<br>
          <strong>Código Oficial:</strong> ${bData.anaCode}<br>
          <strong>Geometría:</strong> Cauce natural continuo de alta precisión (${bData.riverSegments.reduce((a, s) => a + s.length, 0)} vértices GPS)
        </div>
      `);
      line.addTo(riverLayerGroup);
    });
  });

  // 2. DIBUJAR LA MANCHA DE DESBORDE SAR ORGÁNICA SIGUIENDO LAS CURVAS REALES DEL VALLE
  // En lugar de rectángulos artificiales, el agua detectada por SAR se expande sobre los meandros reales del valle
  if (cycle.waterExpansionFactor > 1.05) {
    const outerWidth = Math.round(cycle.waterExpansionFactor * 9);
    const midWidth = Math.round(cycle.waterExpansionFactor * 5.5);
    const coreWidth = Math.round(cycle.waterExpansionFactor * 3);

    basin.valleyFloodSegments.forEach(vSeg => {
      // Suelo agrícola saturado / Doble rebote Banda L (exterior)
      L.polyline(vSeg, {
        color: '#0284c7',
        weight: outerWidth,
        opacity: userOpacity * 0.38,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(floodLayerGroup);

      // Lámina de desborde fluvial activa (medio)
      L.polyline(vSeg, {
        color: '#06b6d4',
        weight: midWidth,
        opacity: userOpacity * 0.55,
        lineCap: 'round',
        lineJoin: 'round'
      }).bindPopup(`
        <div class="text-xs space-y-1">
          <span class="text-cyan-400 font-bold block">🌊 DESBORDE DETECTADO POR RADAR SAR</span>
          <strong>Fase Orbital:</strong> ${cycle.label} (${cycle.phase})<br>
          <strong>Firma Radar (&sigma;<sup>0</sup>):</strong> <code class="bg-slate-800 px-1 py-0.5 rounded text-cyan-300 font-mono">${cycle.sarBackscatterDb} dB</code><br>
          <strong>Ancho de Espejo de Agua:</strong> <span class="text-amber-400 font-bold">${cycle.metrics[currentBasin].width}</span><br>
          <strong>Área Agrícola Afectada:</strong> <span class="text-rose-400 font-bold">${cycle.metrics[currentBasin].ha}</span><br>
          <p class="text-[10px] text-slate-300 mt-1">Anomalía detectada a lo largo de la llanura aluvial real del ${basin.name}.</p>
        </div>
      `).addTo(floodLayerGroup);

      // Espejo de agua libre (reflexión especular pura < -18 dB)
      if (cycle.floodIntensity >= 0.5) {
        L.polyline(vSeg, {
          color: '#67e8f9',
          weight: coreWidth,
          opacity: userOpacity * 0.8,
          lineCap: 'round',
          lineJoin: 'round'
        }).addTo(floodLayerGroup);
      }
    });
  }

  // 3. DIBUJAR PUNTOS CRÍTICOS DE MONITOREO Y ANEGAMIENTO EN EL RÍO REAL
  basin.criticalPoints.forEach(cp => {
    const radius = 6 + Math.round(cycle.floodIntensity * 10);
    const isCritical = cycle.floodIntensity >= 0.5;
    const color = isCritical ? '#f43f5e' : (cycle.floodIntensity >= 0.2 ? '#f59e0b' : '#10b981');

    // Halo pulsante en crecida
    if (cycle.floodIntensity >= 0.25) {
      L.circleMarker(cp.coords, {
        radius: radius + 7,
        color: color,
        fillColor: color,
        fillOpacity: 0.2,
        weight: 1,
        dashArray: '3, 3'
      }).addTo(criticalPointsGroup);
    }

    const marker = L.circleMarker(cp.coords, {
      radius: 6,
      color: '#ffffff',
      fillColor: color,
      fillOpacity: 0.95,
      weight: 2
    }).bindPopup(`
      <div class="text-xs space-y-1">
        <span class="font-bold text-rose-400 block">📍 PUNTO CRÍTICO: ${cp.name}</span>
        <strong>Sector:</strong> ${cp.sector}<br>
        <strong>Vulnerabilidad CENEPRED:</strong> ${cp.vulnerability}<br>
        <strong>Estado en ${cycle.shortDate}:</strong> <span class="font-bold text-cyan-300">${cycle.phase}</span><br>
        <strong>Retrodispersión Local:</strong> <code class="font-mono text-amber-300">${cycle.sarBackscatterDb} dB</code>
      </div>
    `);
    marker.addTo(criticalPointsGroup);
  });

  // 4. DIBUJAR TRAMOS ORBITALES REALES (SWATHS DE 250 KM DE NASA ASF)
  renderOrbitalSwaths(basin, cycle);

  // 5. ACTUALIZAR TARJETAS DE TELEMETRÍA Y SIDEBAR
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

  // Actualizar NASA GIBS con la fecha real del Track primario
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

// Renderizar los polígonos reales de los Tramos Orbitales (Swaths) de NASA ASF
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

  let primaryGranule = null;

  targetTracks.forEach(trNum => {
    const targetDate = getTrackDateForCycle(trNum, cycle);
    // Buscar escenas de ese track en esa fecha (o la más cercana)
    let matching = ASF_REAL_SCENES.filter(s => s.track === trNum && s.date === targetDate);
    if (matching.length === 0) {
      matching = ASF_REAL_SCENES.filter(s => s.track === trNum).slice(0, 2);
    }

    matching.forEach(scene => {
      if (!primaryGranule) primaryGranule = scene;
      const color = trackColors[trNum] || '#818cf8';
      const dirArrow = scene.flightDirection === 'ASCENDING' ? '↗ ASCENDENTE (Sur → Norte)' : '↙ DESCENDENTE (Norte → Sur)';

      const poly = L.polygon(scene.footprint, {
        color: color,
        weight: 2,
        opacity: 0.85,
        dashArray: '8, 6',
        fillColor: color,
        fillOpacity: 0.06
      }).bindPopup(`
        <div class="text-xs space-y-1.5 font-sans">
          <span class="text-indigo-400 font-bold block">🛰️ TRAMO ORBITAL REAL (NASA ASF SAR)</span>
          <strong>Track / Órbita Relativa:</strong> <span class="font-mono text-white">Track ${scene.track} (Cada 12 días)</span><br>
          <strong>Dirección de Vuelo:</strong> ${dirArrow}<br>
          <strong>Fecha y Hora UTC:</strong> <span class="font-mono text-cyan-300">${scene.startTime}</span><br>
          <strong>Modo / Polarización:</strong> <span class="font-mono">${scene.beamMode} (${scene.polarization})</span><br>
          <strong>Granule ID:</strong> <code class="text-[10px] bg-slate-800 px-1 py-0.5 rounded block truncate">${scene.granuleName}</code>
          <div class="pt-1 flex gap-2">
            <button onclick="projectSpecificScene('${scene.granuleName}')" class="bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 py-1 rounded text-[11px] font-medium w-full">
              📡 Proyectar Imagen Radar de este Tramo
            </button>
          </div>
        </div>
      `);
      poly.addTo(swathLayerGroup);
    });
  });

  // Actualizar panel lateral con los datos del Granule activo
  if (primaryGranule) {
    const dirShort = primaryGranule.flightDirection === 'ASCENDING' ? '↗ ASCENDENTE' : '↙ DESCENDENTE';
    document.getElementById('asf-track-label').textContent = `Track ${primaryGranule.track} (${dirShort})`;
    document.getElementById('asf-date-label').textContent = primaryGranule.startTime.substring(0, 16).replace('T', ' ') + 'Z';
    const granEl = document.getElementById('asf-granule-name');
    granEl.textContent = primaryGranule.granuleName;
    granEl.title = primaryGranule.granuleName;
    document.getElementById('hud-track-info').textContent = `Track ${primaryGranule.track} (${primaryGranule.date})`;

    // Si la superposición de imagen SAR real está activa, actualizarla al nuevo ciclo de 12 días
    if (isRealSarOverlayActive) {
      showSceneBrowseOverlay(primaryGranule);
    }
  }
}

// Superponer la imagen de retrodispersión radar REAL desde NASA ASF Datapool sobre el mapa
function showSceneBrowseOverlay(scene) {
  if (!scene || !scene.browseUrl || !scene.footprint || scene.footprint.length === 0) return;

  if (realSarImageOverlay && map.hasLayer(realSarImageOverlay)) {
    map.removeLayer(realSarImageOverlay);
  }

  const lats = scene.footprint.map(p => p[0]);
  const lons = scene.footprint.map(p => p[1]);
  const bounds = [
    [Math.min(...lats), Math.min(...lons)],
    [Math.max(...lats), Math.max(...lons)]
  ];

  realSarImageOverlay = L.imageOverlay(scene.browseUrl, bounds, {
    opacity: 0.78,
    interactive: false
  }).addTo(map);

  isRealSarOverlayActive = true;
  const btnText = document.getElementById('btn-real-sar-text');
  if (btnText) btnText.textContent = 'Ocultar Imagen Radar Real (ASF)';
}

function toggleRealSarImageOverlay() {
  if (isRealSarOverlayActive) {
    if (realSarImageOverlay && map.hasLayer(realSarImageOverlay)) {
      map.removeLayer(realSarImageOverlay);
    }
    isRealSarOverlayActive = false;
    const btnText = document.getElementById('btn-real-sar-text');
    if (btnText) btnText.textContent = 'Proyectar Imagen Radar Real (ASF)';
  } else {
    const granName = document.getElementById('asf-granule-name').textContent.trim();
    const scene = ASF_REAL_SCENES.find(s => s.granuleName === granName) || ASF_REAL_SCENES[0];
    showSceneBrowseOverlay(scene);
    // Hacer zoom intermedio para apreciar el tramo de 250 km junto con el río
    if (map.getZoom() > 10) {
      map.flyTo(BASINS[currentBasin].center, 9, { duration: 1.0 });
    }
  }
}

function projectSpecificScene(granuleName) {
  const scene = ASF_REAL_SCENES.find(s => s.granuleName === granuleName);
  if (scene) {
    showSceneBrowseOverlay(scene);
  }
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

// Vista panorámica de todos los Tramos Orbitales de 250 km sobre la región Arequipa
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
  // Selector de Mapa Base
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

  // Selector de Tramo Orbital (Track)
  const trackSelector = document.getElementById('track-selector');
  if (trackSelector) {
    trackSelector.addEventListener('change', (e) => {
      currentTrackFilter = e.target.value;
      updateAllVisuals(false);
    });
  }

  // Toggles de Capas
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
