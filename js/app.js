// Space Society - National Massive SAR Reading Engine (All Peru) and Automated River Detection by Backscatter
let map;
let currentBasin = 'camana';
let currentCycleIndex = 3; // Cycle 4 (+36d: 06-17 Feb - Peak Flood Crest) by default
let currentTrackFilter = 'all'; // All active swaths simultaneously by default
let sarThresholdDb = -14.0;
let detectionMode = 'strict_sar_intersect';
let activeBasemapLayer;
let gibsLayer;
let anaWmsLayer;
let realSarOverlayGroup;
let isRealSarOverlayActive = false;
let playInterval = null;
let currentMatchedScenes = [];
let liveFetchedAsfScenes = [];

// Leaflet Layer Groups
let riverLayerGroup;
let floodLayerGroup;
let swathLayerGroup;
let criticalPointsGroup;

// Basemap Configurations
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
  if (typeof renderNisarColabLayer === 'function') {
    renderNisarColabLayer();
  }
  if (typeof renderNisarRiversLayer === 'function') {
    renderNisarRiversLayer(true);
  }
  if (typeof renderProcessedGcovLayer === 'function') {
    renderProcessedGcovLayer();
  }

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
    zoom: 9,
    zoomControl: false,
    preferCanvas: false
  });

  // Create Map Panes with explicit z-indices to guarantee detected rivers ALWAYS render above SAR swaths
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

  // NISAR radar image: below rivers, above background basemap
  map.createPane('nisarPane');
  map.getPane('nisarPane').style.zIndex = 520;
  map.getPane('nisarPane').style.pointerEvents = 'none';

  // River channel detection on top of radar image
  map.createPane('nisarMaskPane');
  map.getPane('nisarMaskPane').style.zIndex = 600;
  map.getPane('nisarMaskPane').style.pointerEvents = 'none';

  // GCOV candidate water: visible, but does not occlude the radar image
  map.createPane('gcovPane');
  map.getPane('gcovPane').style.zIndex = 540;
  map.getPane('gcovPane').style.pointerEvents = 'none';

  swathLayerGroup = L.layerGroup();
  realSarOverlayGroup = L.layerGroup();
  floodLayerGroup = L.layerGroup();
  riverLayerGroup = L.layerGroup();
  criticalPointsGroup = L.layerGroup();

  L.control.zoom({ position: 'topleft' }).addTo(map);

  // Initial Basemap: Esri World Imagery Satellite
  switchBasemap('esri_satellite');

  // Official WMS Layer from National Water Authority (ANA - GeoSNIRH)
  anaWmsLayer = L.tileLayer.wms('https://geosnirh.ana.gob.pe/server/services/RecursosHidricosANA_MIL1/MapServer/WMSServer', {
    layers: '0,1,2,3,4,5',
    format: 'image/png',
    transparent: true,
    pane: 'riversTopPane',
    attribution: '&copy; ANA Perú - GeoSNIRH'
  });

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
    btn.className = `px-1.5 py-1 rounded border text-left transition flex flex-col justify-between cursor-pointer ${
      isActive
        ? 'bg-[#151c25] border-water text-[#f1f5f9]'
        : 'bg-base border-borderline text-[#94a3b8] hover:bg-[#151c25] hover:text-[#f1f5f9]'
    }`;
    btn.onclick = () => selectOrbitalCycle(idx);

    let dotColor = 'bg-ok';
    if (cyc.floodIntensity >= 0.8) dotColor = 'bg-danger';
    else if (cyc.floodIntensity >= 0.5) dotColor = 'bg-crops';
    else if (cyc.floodIntensity >= 0.15) dotColor = 'bg-crops';

    btn.innerHTML = `
      <div class="flex items-center justify-between w-full">
        <span class="text-[9.5px] font-mono font-semibold ${isActive ? 'text-water' : 'text-[#64748b]'}">+${cyc.dayOffset}d</span>
        <span class="w-1.5 h-1.5 rounded-full ${dotColor}"></span>
      </div>
      <div class="text-[9.5px] font-medium truncate mt-0.5">${cyc.shortDate.split(' ')[0]} ${cyc.shortDate.split(' ')[1] || ''}</div>
      <div class="text-[9px] font-mono text-[#64748b] tabular-nums">${cyc.sarBackscatterDb} dB</div>
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
    const isFlooded = cyc.sarBackscatterDb <= sarThresholdDb;

    const col = document.createElement('div');
    col.className = 'flex-1 flex flex-col items-center cursor-pointer group h-full justify-end';
    col.onclick = () => selectOrbitalCycle(idx);

    const barColor = isActive
      ? (isFlooded ? 'bg-water' : 'bg-ok')
      : (isFlooded ? 'bg-water/40 group-hover:bg-water/80' : 'bg-[#202833] group-hover:bg-[#334155]');

    col.innerHTML = `
      <span class="text-[9px] font-mono ${isActive ? 'text-water font-bold' : 'text-[#64748b]'} mb-0.5 tabular-nums">${cyc.sarBackscatterDb}</span>
      <div class="w-full rounded-t transition-all ${barColor}" style="height: ${pct}%"></div>
      <span class="text-[9px] font-mono text-[#94a3b8] mt-0.5 tabular-nums">+${cyc.dayOffset}d</span>
    `;
    chart.appendChild(col);
  });
}

function selectOrbitalCycle(index) {
  currentCycleIndex = index;
  renderTimelineControls();
  renderBackscatterChart();
  updateAllVisuals(false);
  if (typeof isMathEngineActive !== 'undefined' && isMathEngineActive) {
    runMathematicalRiverExtraction();
  }
}

function togglePlayCycles() {
  const playIcon = document.getElementById('play-icon');
  const playText = document.getElementById('play-text');
  if (playInterval) {
    clearInterval(playInterval);
    playInterval = null;
    if (playIcon) playIcon.textContent = '▶';
    if (playText) playText.textContent = 'Ciclo 12 Días';
  } else {
    if (playIcon) playIcon.textContent = '⏸';
    if (playText) playText.textContent = 'Pausar';
    playInterval = setInterval(() => {
      const next = (currentCycleIndex + 1) % ORBITAL_CYCLES.length;
      selectOrbitalCycle(next);
    }, 1800);
  }
}

function getZoomScaleFactor() {
  if (!map) return 1.0;
  const z = map.getZoom();
  if (z <= 6) return 0.25;
  if (z === 7) return 0.32;
  if (z === 8) return 0.42;
  if (z === 9) return 0.55;
  if (z === 10) return 0.72;
  if (z === 11) return 0.92;
  if (z === 12) return 1.15;
  return 1.45;
}

// Geometric Algorithm: Ray-Casting Point-in-Polygon to determine if a river vertex lies inside an active SAR swath
function isPointInPolygon(pt, poly) {
  return RiverGeometry.pointInPolygon(pt, poly);
}

function isPointInsideAnyActiveSwath(pt, activePolygons) {
  if (detectionMode === 'global_all') return true;
  for (let k = 0; k < activePolygons.length; k++) {
    if (isPointInPolygon(pt, activePolygons[k])) return true;
  }
  return false;
}

// Partition a river segment into sub-reaches physically INSIDE active SAR swaths
function extractSubSegmentsInsideSar(segment, activePolygons) {
  if (detectionMode === 'global_all') return [segment];
  return RiverGeometry.clipLineToPolygons(segment, activePolygons);
}

function getTrackDateForCycle(trackNum, cycle) {
  if (trackNum === 47) return cycle.dateTrack47;
  if (trackNum === 25) return cycle.dateTrack25;
  if (trackNum === 120) return cycle.dateTrack120;
  if (trackNum === 127) return cycle.dateTrack127;
  return cycle.dateTrack47;
}

// Resolve which SAR swaths are active based on the current track filter
function computeActiveSarScenes(basin, cycle) {
  let matched = [];

  if (currentTrackFilter === 'peru_all') {
    // All 118 national swaths + live view swaths
    const national = (typeof PERU_NATIONAL_SAR_SCENES !== 'undefined') ? PERU_NATIONAL_SAR_SCENES : [];
    matched = [...national, ...liveFetchedAsfScenes];
  } else {
    let targetTracks = [];
    if (currentTrackFilter === 'basin_auto') {
      targetTracks = [basin.primaryTrack, basin.secondaryTrack];
    } else if (currentTrackFilter === 'all') {
      targetTracks = [47, 25, 127, 120];
    } else {
      targetTracks = [parseInt(currentTrackFilter, 10)];
    }

    targetTracks.forEach(trNum => {
      const targetDate = getTrackDateForCycle(trNum, cycle);
      let trScenes = ASF_REAL_SCENES.filter(s => s.track === trNum && s.date === targetDate);
      if (trScenes.length === 0) {
        trScenes = ASF_REAL_SCENES.filter(s => s.track === trNum).slice(0, 2);
      }
      matched.push(...trScenes);
    });

    if (liveFetchedAsfScenes.length > 0) {
      matched.push(...liveFetchedAsfScenes);
    }
  }

  return matched;
}

// Master Function: Renders active SAR swaths and executes SAR signal river detection inside swaths
function updateAllVisuals(flyToBasin = false) {
  const basin = BASINS[currentBasin];
  const cycle = ORBITAL_CYCLES[currentCycleIndex];
  if (!basin || !cycle || !map) return;

  riverLayerGroup.clearLayers();
  floodLayerGroup.clearLayers();
  swathLayerGroup.clearLayers();
  criticalPointsGroup.clearLayers();

  const opacitySlider = document.getElementById('sar-opacity');
  const userOpacity = opacitySlider ? (opacitySlider.value / 100) : 0.90;
  const zScale = getZoomScaleFactor();

  // 1. RETRIEVE AND RENDER ALL ACTIVE SAR SWATHS
  currentMatchedScenes = computeActiveSarScenes(basin, cycle);
  const activePolygons = currentMatchedScenes.map(s => s.footprint).filter(f => f && f.length >= 3);

  renderOrbitalSwaths(currentMatchedScenes);

  let detectedRiverCount = 0;
  let totalDetectedVertices = 0;

  // Crisp, fine lines subtly modulated across the 12-day orbital cycle
  const expFactor = 1.0 + cycle.floodIntensity * 0.45;
  const outerW = Math.min(4.2, Math.max(2.2, +(expFactor * 2.4 * zScale).toFixed(1)));
  const midW = Math.min(2.6, Math.max(1.4, +(expFactor * 1.6 * zScale).toFixed(1)));
  const coreW = Math.min(1.4, Math.max(0.9, +(expFactor * 0.9 * zScale).toFixed(1)));

  // 2. PROCESS THE 4 DETAILED AREQUIPA BASINS (7,334 GPS Coordinates)
  Object.keys(BASINS).forEach(bKey => {
    const bData = BASINS[bKey];
    const isCurrent = bKey === currentBasin;
    // Effective basin backscatter in this 12-day orbital cycle
    const riverDb = cycle.sarBackscatterDb - (isCurrent ? 0.5 : 0.0);
    const passesThreshold = riverDb <= sarThresholdDb;
    let basinDetected = false;

    bData.riverSegments.forEach(seg => {
      const bName = typeof getBasinName === 'function' ? getBasinName(bKey) : bData.name;
      const cycleInfo = typeof getCycleText === 'function' ? getCycleText(currentCycleIndex) : cycle;

      // Baseline river channel trace (always visible for geographic reference)
      L.polyline(seg, {
        pane: 'riversTopPane',
        color: '#0284c7',
        weight: Math.max(1.5, 1.8 * zScale),
        opacity: 0.65,
        lineCap: 'butt',
        lineJoin: 'round'
      }).bindPopup(`
        <div class="text-xs space-y-1 font-sans">
          <span class="text-sky-400 font-bold block">💧 ${typeof t === 'function' ? t('popup_channel_base') : 'HYDROGRAPHIC CHANNEL'} (${bName})</span>
          <strong>${typeof t === 'function' ? t('popup_ana_code') : 'ANA Code:'}</strong> ${bData.anaCode}<br>
          <strong>${typeof t === 'function' ? t('popup_sim_value') : 'Simulation Value:'}</strong> <code class="text-cyan-300 font-mono">${riverDb.toFixed(1)} dB</code>
        </div>
      `).addTo(riverLayerGroup);

      // SAR DETECTION: Extract all river reaches falling INSIDE active SAR swaths that satisfy the dB threshold
      if (passesThreshold) {
        const subSegs = extractSubSegmentsInsideSar(seg, activePolygons);
        subSegs.forEach(sub => {
          basinDetected = true;
          totalDetectedVertices += sub.length;

          // Outer radar anomaly glow
          L.polyline(sub, {
            pane: 'floodPane',
            color: '#0284c7',
            weight: outerW,
            opacity: userOpacity * 0.45,
            lineCap: 'butt',
            lineJoin: 'round'
          }).addTo(floodLayerGroup);

          // Primary water reach detected by SAR
          L.polyline(sub, {
            pane: 'floodPane',
            color: '#00f5ff',
            weight: midW,
            opacity: userOpacity * 0.78,
            lineCap: 'butt',
            lineJoin: 'round'
          }).bindPopup(`
            <div class="text-xs space-y-1">
              <span class="text-cyan-400 font-bold block">${typeof t === 'function' ? t('popup_detected_river') : '🛰️ SAR RADAR DETECTED RIVER'}</span>
              <strong>${typeof t === 'function' ? t('popup_basin') : 'Basin:'}</strong> ${bName}<br>
              <strong>${typeof t === 'function' ? t('popup_orbital_phase') : 'Orbital Phase:'}</strong> ${cycle.label} (${cycleInfo.phase || cycle.phase})<br>
              <strong>${typeof t === 'function' ? t('popup_backscatter') : 'Measured Backscatter (σ⁰):'}</strong> <code class="bg-slate-800 px-1 py-0.5 rounded text-cyan-300 font-mono">${riverDb.toFixed(1)} dB &le; ${sarThresholdDb} dB</code><br>
              <strong>${typeof t === 'function' ? t('popup_water_width') : 'Water Surface Width:'}</strong> <span class="text-amber-400 font-bold">${cycle.metrics[bKey].width}</span><br>
              <strong>${typeof t === 'function' ? t('popup_flooded_crop') : 'Flooded Agricultural Area:'}</strong> <span class="text-rose-400 font-bold">${cycle.metrics[bKey].ha}</span>
            </div>
          `).addTo(floodLayerGroup);

          // Bright specular reflection core (topmost layer)
          L.polyline(sub, {
            pane: 'riversTopPane',
            color: '#e0f2fe',
            weight: coreW,
            opacity: userOpacity * 0.95,
            lineCap: 'butt',
            lineJoin: 'round'
          }).addTo(riverLayerGroup);
        });
      }
    });

    if (basinDetected) detectedRiverCount++;

    // Critical flood overflow checkpoints
    bData.criticalPoints.forEach(cp => {
      const insideSwath = isPointInsideAnyActiveSwath(cp.coords, activePolygons);
      const color = insideSwath && passesThreshold ? '#f43f5e' : '#64748b';

      if (insideSwath && passesThreshold && cycle.floodIntensity >= 0.25) {
        L.circleMarker(cp.coords, {
          pane: 'criticalPane',
          radius: Math.max(7, Math.round(11 * zScale)),
          color: '#f43f5e',
          fillColor: '#f43f5e',
          fillOpacity: 0.25,
          weight: 1,
          dashArray: '3, 3'
        }).addTo(criticalPointsGroup);
      }

      const trCp = typeof getCheckpointTranslation === 'function' ? getCheckpointTranslation(cp) : cp;
      const bName = typeof getBasinName === 'function' ? getBasinName(bKey) : bData.name;
      const sarStatusLabel = insideSwath && passesThreshold
        ? (typeof currentLang !== 'undefined' && currentLang === 'en' ? 'INSIDE ACTIVE SAR SWATH' : (typeof t === 'function' ? t('popup_inside_swath') : 'DENTRO DE BLOQUE SAR ACTIVO'))
        : (typeof t === 'function' ? t('popup_outside_swath') : 'Outside Threshold / Swath');

      L.circleMarker(cp.coords, {
        pane: 'criticalPane',
        radius: isCurrent ? 5.5 : 4.5,
        color: '#ffffff',
        fillColor: color,
        fillOpacity: 0.95,
        weight: 1.5
      }).bindPopup(`
        <div class="text-xs space-y-1">
          <span class="font-bold text-rose-400 block">📍 ${trCp.name}</span>
          <strong>${typeof t === 'function' ? t('popup_basin') : 'Basin:'}</strong> ${bName}<br>
          <strong>${typeof t === 'function' ? t('popup_sar_status') : 'SAR Detection Status:'}</strong> <span class="font-bold ${insideSwath && passesThreshold ? 'text-cyan-300' : 'text-slate-400'}">${sarStatusLabel}</span><br>
          <strong>${typeof t === 'function' ? t('popup_vulnerability') : 'Vulnerability:'}</strong> ${trCp.vulnerability}
        </div>
      `).addTo(criticalPointsGroup);
    });
  });

  // 3. PROCESS THE 29 ADDITIONAL NATIONAL BASINS ACROSS ALL PERU (North, Center, South, Titicaca, and Amazon)
  if (typeof PERU_NATIONAL_RIVERS !== 'undefined') {
    PERU_NATIONAL_RIVERS.forEach(natRiver => {
      // Adjust national river dB signature based on temporal cycle
      const effectiveDb = +(natRiver.baseBackscatterDb - (cycle.floodIntensity * 2.5)).toFixed(1);
      const passesThreshold = effectiveDb <= sarThresholdDb;
      let natDetected = false;

      natRiver.segments.forEach(seg => {
        // National baseline river channel
        L.polyline(seg, {
          pane: 'riversTopPane',
          color: '#0369a1',
          weight: Math.max(1.2, 1.5 * zScale),
          opacity: 0.6,
          lineCap: 'butt',
          lineJoin: 'round'
        }).bindPopup(`
          <div class="text-xs space-y-1">
            <span class="text-sky-400 font-bold block">${typeof t === 'function' ? t('popup_national_network') : '🇵🇪 PERU HYDROGRAPHIC NETWORK:'} ${natRiver.name}</span>
            <strong>${typeof t === 'function' ? t('popup_region') : 'Hydrographic Region:'}</strong> ${natRiver.zone}<br>
            <strong>${typeof t === 'function' ? t('popup_radar_signature') : 'Radar Signature (σ⁰):'}</strong> <code class="text-cyan-300 font-mono">${effectiveDb} dB</code>
          </div>
        `).addTo(riverLayerGroup);

        if (passesThreshold) {
          const subSegs = extractSubSegmentsInsideSar(seg, activePolygons);
          subSegs.forEach(sub => {
            natDetected = true;
            totalDetectedVertices += sub.length;

            L.polyline(sub, {
              pane: 'floodPane',
              color: '#00f5ff',
              weight: Math.max(2.5, midW * 0.85),
              opacity: userOpacity * 0.72,
              lineCap: 'butt',
              lineJoin: 'round'
            }).bindPopup(`
              <div class="text-xs space-y-1">
                <span class="text-cyan-400 font-bold block">${typeof t === 'function' ? t('popup_national_detected') : '🛰️ NATIONAL RIVER DETECTED BY SAR:'} ${natRiver.name}</span>
                <strong>${typeof t === 'function' ? t('popup_slope_zone') : 'Slope / Zone:'}</strong> ${natRiver.zone}<br>
                <strong>${typeof t === 'function' ? t('popup_radar_signature') : 'Radar Signature (σ⁰):'}</strong> <code class="bg-slate-800 px-1 py-0.5 rounded text-cyan-300 font-mono">${effectiveDb} dB &le; ${sarThresholdDb} dB</code><br>
                <strong>${typeof t === 'function' ? t('popup_extracted_pts') : 'Extracted GPS Points:'}</strong> ${sub.length} ${typeof t === 'function' ? t('popup_pts_inside_suffix') : 'vertices inside SAR swath'}
              </div>
            `).addTo(floodLayerGroup);

            L.polyline(sub, {
              pane: 'riversTopPane',
              color: '#bae6fd',
              weight: Math.max(1.4, coreW * 0.8),
              opacity: userOpacity * 0.9,
              lineCap: 'butt',
              lineJoin: 'round'
            }).addTo(riverLayerGroup);
          });
        }
      });

      if (natDetected) detectedRiverCount++;
    });
  }

  // 4. UPDATE SAR TELEMETRY AND METRIC HUD PANELS
  const refSuffix = typeof t === 'function' ? t('ref_rivers_count_suffix') : ' REFERENCE RIVERS';
  document.getElementById('detected-rivers-count').textContent = `${detectedRiverCount}${refSuffix}`;
  document.getElementById('header-active-stats').textContent = typeof t === 'function' ? t('header_status') : 'NISAR L2 GCOV · 20m NATIVE MESH';

  const bMetrics = cycle.metrics[currentBasin];
  const passPrefix = typeof t === 'function' ? t('pass_badge_prefix') : '🛰️ ORBITAL CYCLE ';
  document.getElementById('pass-badge').textContent = `${passPrefix}+${cycle.dayOffset}d`;

  const cycleInfo = typeof getCycleText === 'function' ? getCycleText(currentCycleIndex) : null;
  const riskLevelText = cycleInfo ? cycleInfo.riskLevel : cycle.riskLevel;
  const riskDescText = cycleInfo ? cycleInfo.summary : cycle.summary;
  const phaseText = cycleInfo ? cycleInfo.phase : cycle.phase;

  const riskEl = document.getElementById('risk-level');
  riskEl.textContent = riskLevelText;
  const riskClassMap = {
    'ALERTA ROJA': 'text-danger border-danger/40 bg-danger/10',
    'CRITICAL FLOOD ALERT': 'text-danger border-danger/40 bg-danger/10',
    'ALERTA ROJA (DESBORDE)': 'text-danger border-danger/40 bg-danger/10',
    'ALERTA MODERADA': 'text-crops border-crops/40 bg-crops/10',
    'MODERATE ALERT': 'text-crops border-crops/40 bg-crops/10',
    'NORMAL': 'text-ok border-ok/40 bg-ok/10',
    'GREEN LEVEL (BASE)': 'text-ok border-ok/40 bg-ok/10',
    'NIVEL VERDE (BASE)': 'text-ok border-ok/40 bg-ok/10'
  };
  riskEl.className = `text-[10px] font-mono px-2 py-0.5 rounded border font-bold ${riskClassMap[riskLevelText] || 'text-danger border-danger/40 bg-danger/10'}`;

  document.getElementById('ana-code').textContent = basin.anaCode;
  document.getElementById('stat-flow').textContent = bMetrics.flow;
  document.getElementById('risk-desc').textContent = riskDescText;
  const widthPrefix = typeof t === 'function' ? t('metric_width_prefix') : 'Width: ';
  document.getElementById('sar-width').textContent = `${widthPrefix}${bMetrics.width}`;
  document.getElementById('stat-hectares').textContent = bMetrics.ha ? bMetrics.ha.replace(' ha', '') : '0';
  document.getElementById('stat-pop').textContent = bMetrics.pop;
  
  const basinName = currentTrackFilter === 'peru_all' 
    ? (typeof t === 'function' ? t('btn_peru_all') : 'National Peru (118 SAR)')
    : (typeof getBasinName === 'function' ? getBasinName(currentBasin) : basin.name);
  document.getElementById('active-basin-name').textContent = basinName;
  const sidebarTitle = document.getElementById('sidebar-basin-title');
  if (sidebarTitle) sidebarTitle.textContent = basinName;
  document.getElementById('timeline-phase-label').textContent = `${cycle.shortDate} — ${phaseText}`;

  const activeDate = getTrackDateForCycle(basin.primaryTrack, cycle);
  updateGibsLayer(activeDate);

  if (flyToBasin) {
    map.flyTo(basin.center, basin.zoom, { duration: 1.1 });
  }
}

// Render polygons for all active orbital SAR swaths and populate the scenes reader list
function renderOrbitalSwaths(scenes) {
  const trackColors = {
    47: '#818cf8',  // Indigo
    25: '#34d399',  // Emerald
    127: '#f472b6', // Pink
    120: '#fbbf24'  // Amber
  };

  scenes.forEach(scene => {
    if (!scene.footprint || scene.footprint.length < 3) return;
    const color = trackColors[scene.track] || '#38bdf8';
    const dirArrow = typeof getFlightDirectionLabel === 'function'
      ? getFlightDirectionLabel(scene.flightDirection)
      : (scene.flightDirection === 'ASCENDING' ? '↗ ASCENDING (South → North)' : '↙ DESCENDING (North → South)');

    const titleSwath = typeof t === 'function' ? t('popup_swath_title') : '🛰️ ACTIVE SAR SWATH (NASA ASF)';
    const labelTrack = typeof t === 'function' ? t('popup_track_label') : 'Orbital Track';
    const labelDate = typeof t === 'function' ? t('popup_acq_date') : 'Acquisition Date:';
    const labelMode = typeof t === 'function' ? t('popup_mode_pol') : 'Mode / Polarization:';
    const btnProjectThis = typeof t === 'function' ? t('btn_project_single') : 'Project this Swath';
    const btnProjectAll = typeof t === 'function' ? t('btn_project_all') : 'Project All';

    const poly = L.polygon(scene.footprint, {
      pane: 'swathPane',
      color: color,
      weight: currentTrackFilter === 'peru_all' ? 1.2 : 2.0,
      opacity: 0.85,
      dashArray: '6, 5',
      fillColor: color,
      fillOpacity: currentTrackFilter === 'peru_all' ? 0.04 : 0.06
    }).bindPopup(`
      <div class="text-xs space-y-1.5 font-sans">
        <span class="text-indigo-400 font-bold block">${titleSwath}</span>
        <strong>${labelTrack}:</strong> <span class="font-mono text-white">Track ${scene.track} (${dirArrow})</span><br>
        <strong>${labelDate}</strong> <span class="font-mono text-cyan-300">${scene.startTime || scene.date}</span><br>
        <strong>${labelMode}</strong> <span class="font-mono">${scene.beamMode || 'IW'} (${scene.polarization || 'VV+VH'})</span><br>
        <strong>Granule ID:</strong> <code class="text-[10px] bg-slate-800 px-1 py-0.5 rounded block truncate">${scene.granuleName}</code>
        <div class="pt-1 flex gap-1.5">
          <button onclick="projectSingleScene('${scene.granuleName}')" class="bg-indigo-600 hover:bg-indigo-500 text-white px-2 py-1 rounded text-[11px] font-medium flex-1 cursor-pointer">
            📡 ${btnProjectThis}
          </button>
          <button onclick="toggleRealSarImageOverlay(true)" class="bg-cyan-700 hover:bg-cyan-600 text-white px-2 py-1 rounded text-[11px] font-medium flex-1 cursor-pointer">
            🌐 ${btnProjectAll}
          </button>
        </div>
      </div>
    `);
    poly.addTo(swathLayerGroup);
  });

  // Update SAR scenes reader in the left panel
  const readerList = document.getElementById('sar-scenes-reader-list');
  if (readerList) {
    readerList.innerHTML = '';
    scenes.slice(0, 30).forEach(sc => {
      const item = document.createElement('div');
      item.className = 'flex items-center justify-between bg-slate-950/90 hover:bg-slate-800 px-2 py-1 rounded cursor-pointer border border-slate-800/80 transition';
      item.onclick = () => {
        if (sc.centerLat && sc.centerLon) {
          map.flyTo([sc.centerLat, sc.centerLon], 9, { duration: 0.9 });
        }
        projectSingleScene(sc.granuleName);
      };
      item.innerHTML = `
        <span class="text-cyan-300 font-bold">T${sc.track} (${sc.flightDirection ? sc.flightDirection[0] : 'S'})</span>
        <span class="text-slate-400 truncate max-w-[130px]" title="${sc.granuleName}">${sc.granuleName.substring(17, 32)}</span>
        <span class="text-indigo-400 hover:underline">${typeof t === 'function' ? t('reader_view') : '📡 View'}</span>
      `;
      readerList.appendChild(item);
    });
  }

  const trackLabelSuffix = typeof t === 'function' ? t('hud_swaths_suffix') : ' Active Swaths';
  document.getElementById('asf-track-label').textContent = `${scenes.length}${trackLabelSuffix}`;
  document.getElementById('asf-date-label').textContent = currentTrackFilter === 'peru_all' ? (typeof t === 'function' ? t('btn_peru_all') : 'National Peru') : `+${ORBITAL_CYCLES[currentCycleIndex].dayOffset}d`;
  const granEl = document.getElementById('asf-granule-name');
  granEl.textContent = scenes.length > 0 ? `Tracks: ${scenes.map(s => 'T' + s.track).slice(0, 6).join(', ')}... (${scenes.length} total)` : 'No active tracks';
  document.getElementById('hud-track-info').textContent = `${scenes.length}${trackLabelSuffix}`;

  if (isRealSarOverlayActive) {
    showAllMatchedSceneOverlays();
  }
}

// Project live NASA ASF radar browse images on active swaths (up to 24 simultaneous for smooth rendering)
function showAllMatchedSceneOverlays() {
  realSarOverlayGroup.clearLayers();

  const scenesToProject = currentMatchedScenes.slice(0, 24);
  scenesToProject.forEach(scene => {
    if (!scene || !scene.browseUrl || !scene.footprint || scene.footprint.length === 0) return;
    const lats = scene.footprint.map(p => p[0]);
    const lons = scene.footprint.map(p => p[1]);
    const bounds = [
      [Math.min(...lats), Math.min(...lons)],
      [Math.max(...lats), Math.max(...lons)]
    ];

    L.imageOverlay(scene.browseUrl, bounds, {
      pane: 'swathPane',
      opacity: 0.88,
      className: 'sar-browse-image',
      interactive: false
    }).addTo(realSarOverlayGroup);
  });

  isRealSarOverlayActive = true;
  const btnText = document.getElementById('btn-real-sar-text');
  if (btnText) {
    const isEn = typeof currentLang !== 'undefined' ? currentLang === 'en' : true;
    btnText.textContent = isEn
      ? `Hide Radar Images (${scenesToProject.length} Active)`
      : `Ocultar Imágenes Radar (${scenesToProject.length} Activas)`;
  }
}

function projectSingleScene(granuleName) {
  const allAvailable = [
    ...ASF_REAL_SCENES,
    ...(typeof PERU_NATIONAL_SAR_SCENES !== 'undefined' ? PERU_NATIONAL_SAR_SCENES : []),
    ...liveFetchedAsfScenes
  ];
  const scene = allAvailable.find(s => s.granuleName === granuleName);
  if (!scene || !scene.browseUrl || !scene.footprint) return;

  const lats = scene.footprint.map(p => p[0]);
  const lons = scene.footprint.map(p => p[1]);
  const bounds = [
    [Math.min(...lats), Math.min(...lons)],
    [Math.max(...lats), Math.max(...lons)]
  ];

  L.imageOverlay(scene.browseUrl, bounds, {
    pane: 'swathPane',
    opacity: 0.90,
    className: 'sar-browse-image',
    interactive: false
  }).addTo(realSarOverlayGroup);

  isRealSarOverlayActive = true;
  const btnText = document.getElementById('btn-real-sar-text');
  if (btnText) {
    const isEn = typeof currentLang !== 'undefined' ? currentLang === 'en' : true;
    btnText.textContent = isEn ? 'Hide Active Radar Images' : 'Ocultar Imágenes Radar Activas';
  }
}

function toggleRealSarImageOverlay(forceOn = false) {
  if (isRealSarOverlayActive && !forceOn) {
    realSarOverlayGroup.clearLayers();
    isRealSarOverlayActive = false;
    const btnText = document.getElementById('btn-real-sar-text');
    if (btnText) {
      btnText.textContent = typeof t === 'function' ? t('btn_project_raster') : 'Project Radar Raster on Swaths';
    }
  } else {
    showAllMatchedSceneOverlays();
  }
}

// Live query to NASA ASF API (Alaska Satellite Facility) for current viewport bounds
async function fetchLiveAsfForCurrentView() {
  if (!map) return;
  const btnText = document.getElementById('btn-live-asf-text');
  if (btnText) {
    btnText.textContent = typeof t === 'function' ? t('btn_querying_asf') : 'Querying NASA ASF API live...';
  }

  const b = map.getBounds();
  const minLon = Math.max(-81.5, b.getWest()).toFixed(2);
  const minLat = Math.max(-18.5, b.getSouth()).toFixed(2);
  const maxLon = Math.min(-68.5, b.getEast()).toFixed(2);
  const maxLat = Math.min(-0.05, b.getNorth()).toFixed(2);

  const url = `https://api.daac.asf.alaska.edu/services/search/param?platform=Sentinel-1&bbox=${minLon},${minLat},${maxLon},${maxLat}&processingLevel=GRD_HD&start=2024-01-15T00:00:00Z&end=2024-03-15T23:59:59Z&output=json&maxResults=35`;

  try {
    const resp = await fetch(url);
    const data = await resp.json();
    const rawList = (Array.isArray(data) && Array.isArray(data[0])) ? data[0] : (Array.isArray(data) ? data : []);

    const parsed = [];
    rawList.forEach(s => {
      const wkt = s.stringFootprint || '';
      if (!wkt.startsWith('POLYGON')) return;
      const inner = wkt.replace('POLYGON', '').replace(/\(/g, '').replace(/\)/g, '').trim();
      const pts = inner.split(',').map(pair => {
        const parts = pair.trim().split(/\s+/);
        return [parseFloat(parts[1]), parseFloat(parts[0])];
      }).filter(p => !isNaN(p[0]) && !isNaN(p[1]));

      const bList = s.browse;
      const bUrl = Array.isArray(bList) && bList.length > 0 ? bList[0] : (typeof bList === 'string' ? bList : '');

      if (pts.length >= 3) {
        parsed.push({
          granuleName: s.granuleName,
          date: (s.startTime || '').substring(0, 10),
          startTime: s.startTime,
          track: parseInt(s.track || 0, 10),
          flightDirection: s.flightDirection,
          polarization: s.polarization,
          beamMode: s.beamModeType || 'IW',
          centerLat: parseFloat(s.centerLat || 0),
          centerLon: parseFloat(s.centerLon || 0),
          footprint: pts,
          browseUrl: bUrl
        });
      }
    });

    liveFetchedAsfScenes = parsed;
    if (btnText) {
      const isEn = typeof currentLang !== 'undefined' ? currentLang === 'en' : true;
      btnText.textContent = isEn
        ? `✅ ${parsed.length} NASA ASF Scenes Loaded in View`
        : `✅ ${parsed.length} Escenas NASA ASF Leídas en Vista`;
    }
    updateAllVisuals(false);
  } catch (err) {
    if (btnText) {
      const isEn = typeof currentLang !== 'undefined' ? currentLang === 'en' : true;
      btnText.textContent = isEn
        ? '⚠️ Using Preloaded National Catalog (166 scenes)'
        : '⚠️ Usando Catálogo Nacional Pre-cargado (166 escenas)';
    }
  }
}

// Activate National Peru View (118 SAR Swaths + 33 Active River Basins Simultaneously)
function activateNationalPeruView() {
  document.querySelectorAll('.basin-btn').forEach(btn => btn.classList.remove('active'));
  const btnPeru = document.getElementById('btn-peru-all');
  if (btnPeru) btnPeru.classList.add('active');

  currentTrackFilter = 'peru_all';
  const ts = document.getElementById('track-selector');
  if (ts) ts.value = 'peru_all';

  updateAllVisuals(false);
  map.flyTo([-9.50, -75.00], 6, { duration: 1.3 });
}

function zoomToBasin(basinKey) {
  document.querySelectorAll('.basin-btn').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.getElementById(`btn-${basinKey}`);
  if (activeBtn) activeBtn.classList.add('active');
  currentBasin = basinKey;
  if (currentTrackFilter === 'peru_all') {
    currentTrackFilter = 'all';
    const ts = document.getElementById('track-selector');
    if (ts) ts.value = 'all';
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
  map.flyTo([-16.25, -72.25], 8, { duration: 1.1 });
}

function setupEventListeners() {
  // SAR Detection Threshold Slider (dB)
  const thresholdSlider = document.getElementById('sar-threshold-slider');
  const thresholdLabel = document.getElementById('threshold-db-label');
  if (thresholdSlider) {
    thresholdSlider.addEventListener('input', (e) => {
      sarThresholdDb = parseFloat(e.target.value);
      if (thresholdLabel) thresholdLabel.textContent = `${sarThresholdDb.toFixed(1)} dB`;
      renderBackscatterChart();
      updateAllVisuals(false);
    });
  }

  // Detection Mode Selector
  const detModeSelect = document.getElementById('detection-mode-select');
  if (detModeSelect) {
    detModeSelect.addEventListener('change', (e) => {
      detectionMode = e.target.value;
      updateAllVisuals(false);
    });
  }

  // Basemap Selector
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

  // SAR Swaths Selector (Track / National)
  const trackSelector = document.getElementById('track-selector');
  if (trackSelector) {
    trackSelector.addEventListener('change', (e) => {
      currentTrackFilter = e.target.value;
      if (currentTrackFilter === 'peru_all') {
        map.flyTo([-9.50, -75.00], 6, { duration: 1.2 });
      }
      updateAllVisuals(false);
    });
  }

  // Layer Toggles
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
