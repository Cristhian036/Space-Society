/**
 * SPACE SOCIETY - Motor Hidrológico Ab-Initio v2 (frontend)
 * ----------------------------------------------------------
 * Pide al microservicio Python (:8050) la red de ríos calculada desde el DEM:
 *   Priority-Flood+ε (Barnes 2014) → D8 → acumulación en km² → umbral de área
 *   → orden de Strahler → polilíneas simplificadas (Douglas-Peucker + Chaikin).
 * Se dibujan SOLO líneas finas (canvas renderer), grosor según orden de Strahler:
 *   - Cian: tramo con agua/vegetación riparia observada (stream burning óptico)
 *   - Gris-azulado tenue: cauce/quebrada seca inferido solo por topografía
 */

let mathVectorGroup = null;
let mathCanvasRenderer = null;
let isMathEngineActive = false;
let isMathComputing = false;
let mathResolutionMode = 'high';
let mathSensitivity = 1.0;
let mathShowDry = false;
let mathBurnOptical = true;
let mathAbort = null;
let mathMoveTimer = null;
let mathLastResult = null;

const HYDRO_API = 'http://localhost:8050/api/compute-rivers';

function initMathEngineLayer() {
  if (!map) return;
  if (!mathCanvasRenderer) {
    mathCanvasRenderer = L.canvas({ pane: 'riversTopPane', padding: 0.3, tolerance: 4 });
  }
  if (!mathVectorGroup) {
    mathVectorGroup = L.layerGroup().addTo(map);
  }
}

function mathSetStatus(html) {
  const el = document.getElementById('math-engine-status');
  if (el) el.innerHTML = html;
}

async function runMathematicalRiverExtraction(forceRecalc = false) {
  if (!map) return;
  initMathEngineLayer();

  if (mathAbort) mathAbort.abort();
  mathAbort = new AbortController();
  isMathComputing = true;

  const btnTextEl = document.getElementById('btn-math-engine-text');
  if (btnTextEl) {
    btnTextEl.textContent = forceRecalc
      ? '⚙️ Recalculando red de drenaje...'
      : 'Calculando / cargando red de drenaje...';
  }
  mathSetStatus(
    forceRecalc
      ? '<span class="text-amber-300 animate-pulse">⚙️ Ejecutando Priority-Flood + D8 + Filtro TPI y guardando en SQLite...</span>'
      : '<span class="text-cyan-300 animate-pulse">Cargando red de la zona; la primera descarga puede tardar...</span>'
  );

  const b = map.getBounds();
  const params = new URLSearchParams({
    south: b.getSouth().toFixed(5),
    north: b.getNorth().toFixed(5),
    west: b.getWest().toFixed(5),
    east: b.getEast().toFixed(5),
    res: mathResolutionMode,
    sens: String(mathSensitivity),
    burn: mathBurnOptical ? '1' : '0',
    force_recalc: forceRecalc ? '1' : '0'
  });

  const t0 = performance.now();
  const request = mathAbort;
  const timeout = setTimeout(() => request.abort('timeout'), 120000);
  try {
    const resp = await fetch(forceRecalc ? `${HYDRO_API}?${params}` : 'assets/river_reference_network.json', { signal: request.signal });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.message || `HTTP ${resp.status}`);
    if (request !== mathAbort || request.signal.aborted) return;
    if (data.status !== 'ok') throw new Error(data.message || 'error');
    mathLastResult = data;
    drawMathRivers(data);

    if (data.source === 'reference_network') {
      mathSetStatus(`<div class="text-yellow-300">Red de referencia completa: ${data.metrics.links} tramos. Amarillo: cauces de referencia; no confirma agua actual. Usa Recalcular solo para analizar una zona pequeña desde el terreno.</div>`);
      return;
    }

    const m = data.metrics;
    const ms = Math.round(performance.now() - t0);
    const isSqlite = data.source === 'complete_result_cache';
    mathSetStatus(`
      <div class="space-y-0.5 text-[10px] font-mono">
        <div class="text-emerald-400 font-bold">${isSqlite ? 'CÁLCULO EN CACHÉ' : 'RED CALCULADA'} (${ms} ms) · ${m.links.toLocaleString()} tramos</div>
        <div class="text-slate-300">Malla DEM: ${m.pixelMeters} m/píxel · Strahler máx ${m.maxStrahler}</div>
        <div class="text-slate-400">Cian: indicio óptico · Gris discontinuo: drenaje inferido. Agua SAR sin confirmar.</div>
      </div>`);
  } catch (err) {
    if (request.signal.reason === 'timeout') {
      mathSetStatus('<span class="text-amber-300">El cálculo superó dos minutos. Reduce la zona o carga la red de referencia completa.</span>');
      return;
    }
    if (err.name === 'AbortError') return;
    console.error('Motor hidrológico:', err);
    mathSetStatus('<span class="text-rose-400"></span>');
    const status = document.getElementById('math-engine-status');
    if (status) status.firstElementChild.textContent = `No se pudo cargar la red: ${err.message}. Servicio local: puerto 8050.`;
  } finally {
    clearTimeout(timeout);
    if (request === mathAbort) {
      isMathComputing = false;
      if (btnTextEl) btnTextEl.textContent = 'Cargar red de drenaje';
    }
  }
}

function drawMathRivers(data) {
  if (!mathVectorGroup) return;
  mathVectorGroup.clearLayers();

  const activePolygons =
    typeof currentMatchedScenes !== 'undefined'
      ? currentMatchedScenes.map((s) => s.footprint).filter((f) => f && f.length >= 3)
      : [];
  const clipToSar =
    data.source !== 'reference_network' && typeof detectionMode !== 'undefined' && detectionMode === 'strict_sar_intersect';

  // Dibujar de menor a mayor orden para que los troncos principales queden encima
  const sorted = [...data.polylines].sort((a, b) => a.order - b.order);

  sorted.forEach((seg) => {
    const wet = seg.evidence === 'optical_proxy' && seg.water >= 0.22;
    if (!wet && !mathShowDry && seg.evidence !== 'reference') return;

    const isMain = seg.isMainStem || seg.order >= 4;
    // Líneas finas, nítidas y bien perfiladas (1.0 px a 2.5 px)
    const weight = wet
      ? isMain
        ? Math.min(2.5, 1.3 + (seg.order - 2) * 0.35)
        : Math.min(1.6, 0.95 + seg.order * 0.2)
      : 0.75;

    const style = {
      renderer: mathCanvasRenderer,
      color: seg.evidence === 'reference' ? '#ffe600' : wet ? '#00f5ff' : '#e2e8f0',
      weight: seg.evidence === 'reference' ? 2.8 : Math.max(weight, 1.5),
      opacity: 0.95,
      dashArray: seg.evidence === 'reference' || wet ? null : '4 4',
      lineCap: 'round',
      lineJoin: 'round',
      smoothFactor: 0.5
    };

    const parts =
      clipToSar && typeof extractSubSegmentsInsideSar === 'function'
        ? extractSubSegmentsInsideSar(seg.coords, activePolygons)
        : [seg.coords];

    const isEn = typeof currentLang !== 'undefined' ? currentLang === 'en' : true;
    const vDepth = Number.isFinite(seg.valleyDepthMeters)
      ? `${seg.valleyDepthMeters} m`
      : (isEn ? 'No measurement' : 'Sin medición');
    const titleName = seg.name || (isEn ? `Calculated Channel (Strahler ${seg.order})` : `Cauce Calculado (Strahler ${seg.order})`);
    const strahlerNote = isEn ? (isMain ? 'Main Stem' : 'Canyon Tributary') : (isMain ? 'Tronco Principal' : 'Tributario de Cañón');
    const evidenceText = seg.evidence === 'reference'
      ? (isEn ? 'Reference geometry; current water unconfirmed' : 'Geometría de referencia; agua actual sin confirmar')
      : wet
        ? (isEn ? 'Optical evidence of water or riparian vegetation' : 'Indicio óptico de agua o vegetación ribereña')
        : (isEn ? 'Drainage inferred from terrain' : 'Drenaje inferido del terreno');

    parts.forEach((pts) => {
      if (pts.length < 2) return;
      L.polyline(pts, style)
        .bindPopup(
          `<div class="text-xs space-y-1 font-sans">
            <span class="text-emerald-400 font-bold block">⚡ ${titleName}</span>
            <strong>${isEn ? 'Strahler Order:' : 'Orden de Strahler:'}</strong> <span class="font-mono text-white">${seg.order} (${strahlerNote})</span><br>
            <strong>${isEn ? 'D8 Drainage Area:' : 'Área de Drenaje D8:'}</strong> <span class="font-mono text-cyan-300">${seg.areaKm2.toLocaleString()} km²</span><br>
            <strong>${isEn ? 'Incision Depth (TPI/HAND):' : 'Profundidad de Incisión (TPI/HAND):'}</strong> <span class="font-mono text-amber-300">${vDepth}</span><br>
            <strong>${isEn ? 'Mean DEM Elevation:' : 'Cota Media DEM:'}</strong> <span class="font-mono text-white">${seg.elev} msnm</span><br>
            <strong>${isEn ? 'Evidence:' : 'Evidencia:'}</strong> ${evidenceText}<br>
            <strong>${isEn ? 'SAR Backscatter:' : 'Retrodispersión SAR:'}</strong> ${isEn ? 'No measurement in this layer' : 'Sin medición en esta capa'}
          </div>`
        )
        .addTo(mathVectorGroup);
    });
  });
}

function applyPreexistingVisibility(hidePreexisting) {
  const riverCb = document.getElementById('layer-river');
  const floodCb = document.getElementById('layer-flood');
  const show = !hidePreexisting;
  if (riverCb) riverCb.checked = show;
  if (floodCb) floodCb.checked = show;
  [riverLayerGroup, floodLayerGroup, criticalPointsGroup].forEach((g) => {
    if (!map || !g) return;
    if (show && !map.hasLayer(g)) map.addLayer(g);
    if (!show && map.hasLayer(g)) map.removeLayer(g);
  });
}

function toggleMathRiverEngine() {
  const toggleCheckbox = document.getElementById('toggle-math-engine');
  const hideCb = document.getElementById('math-hide-preexisting');

  if (toggleCheckbox && toggleCheckbox.checked) {
    isMathEngineActive = true;
    if (hideCb && hideCb.checked) applyPreexistingVisibility(true);
    runMathematicalRiverExtraction();
  } else {
    isMathEngineActive = false;
    if (mathAbort) mathAbort.abort();
    if (mathVectorGroup) mathVectorGroup.clearLayers();
    applyPreexistingVisibility(false);
    mathSetStatus('<span class="text-slate-400">Motor en espera. Actívalo para extraer los ríos desde el DEM.</span>');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const resSelect = document.getElementById('math-res-select');
  if (resSelect) {
    mathResolutionMode = resSelect.value;
    resSelect.addEventListener('change', (e) => {
      mathResolutionMode = e.target.value;
      if (isMathEngineActive) runMathematicalRiverExtraction();
    });
  }

  const sensSlider = document.getElementById('math-sens-slider');
  if (sensSlider) {
    mathSensitivity = parseFloat(sensSlider.value) || 1.0;
    sensSlider.addEventListener('change', (e) => {
      mathSensitivity = parseFloat(e.target.value) || 1.0;
      if (isMathEngineActive) runMathematicalRiverExtraction();
    });
  }

  const hideCb = document.getElementById('math-hide-preexisting');
  if (hideCb) {
    hideCb.addEventListener('change', (e) => {
      if (isMathEngineActive) applyPreexistingVisibility(e.target.checked);
    });
  }

  const dryCb = document.getElementById('math-show-dry');
  if (dryCb) {
    mathShowDry = dryCb.checked;
    dryCb.addEventListener('change', (e) => {
      mathShowDry = e.target.checked;
      if (mathLastResult) drawMathRivers(mathLastResult);
    });
  }

  const burnCb = document.getElementById('math-burn-optical');
  if (burnCb) {
    mathBurnOptical = burnCb.checked;
    burnCb.addEventListener('change', (e) => {
      mathBurnOptical = e.target.checked;
      if (isMathEngineActive) runMathematicalRiverExtraction();
    });
  }

  // Consultar SQLite automáticamente al mover/zoom (debounce corto de 180ms porque SQLite responde en <5ms)
  const waitMap = setInterval(() => {
    if (typeof map === 'undefined' || !map) return;
    clearInterval(waitMap);
    map.on('moveend', () => {
      if (!isMathEngineActive || mathLastResult?.source === 'reference_network') return;
      clearTimeout(mathMoveTimer);
      mathMoveTimer = setTimeout(() => runMathematicalRiverExtraction(false), 180);
    });
  }, 200);
});

// ============================================================================
// INTEGRACIÓN GOOGLE COLAB: NISAR L2 GCOV MULTITEMPORAL (HHHH ΔdB LOG-RATIO)
// Valle Majes - Camaná (lon=-72.725, lat=-16.565, radio=3500m, EPSG:32718)
// ============================================================================
let nisarColabOverlay = null;
let nisarColabVectorGroup = null;
let nisarColabTelemetryCache = null;

const NISAR_COLAB_BOUNDS = [
  [-16.59663, -72.7578],
  [-16.53337, -72.6922]
];

async function renderNisarColabLayer() {
  if (!map) return;
  const toggleCb = document.getElementById('toggle-nisar-colab');
  const modeSelect = document.getElementById('nisar-colab-mode');

  if (!nisarColabVectorGroup) {
    nisarColabVectorGroup = L.layerGroup().addTo(map);
  }

  if (!toggleCb || !toggleCb.checked) {
    if (nisarColabOverlay && map.hasLayer(nisarColabOverlay)) {
      map.removeLayer(nisarColabOverlay);
    }
    nisarColabVectorGroup.clearLayers();
    return;
  }

  const mode = modeSelect ? modeSelect.value : 'water_mask';
  const imageMap = {
    water_mask: 'assets/nisar_gcov_water_mask.png',
    delta_db: 'assets/nisar_gcov_delta_db.png',
    crecida: 'assets/nisar_gcov_crecida.png',
    estiaje: 'assets/nisar_gcov_estiaje.png'
  };

  const imgUrl = imageMap[mode] || imageMap.water_mask;

  if (nisarColabOverlay && map.hasLayer(nisarColabOverlay)) {
    map.removeLayer(nisarColabOverlay);
  }

  nisarColabOverlay = L.imageOverlay(imgUrl, NISAR_COLAB_BOUNDS, {
    pane: 'riversTopPane',
    opacity: mode === 'water_mask' ? 0.92 : 0.85,
    interactive: false
  }).addTo(map);

  nisarColabVectorGroup.clearLayers();

  const isEn = typeof currentLang !== 'undefined' ? currentLang === 'en' : true;

  // Marco delimitador del recorte NISAR L2 GCOV (7 km x 7 km, 350x350 px @ 20m)
  L.rectangle(NISAR_COLAB_BOUNDS, {
    pane: 'criticalPane',
    color: '#22d3ee',
    weight: 2,
    dashArray: '6, 4',
    fillOpacity: 0.02
  })
    .bindPopup(
      `
      <div class="text-xs space-y-1 font-sans">
        <span class="text-cyan-400 font-bold block">${isEn ? '🛰️ NISAR L2 GCOV WINDOW (GOOGLE COLAB)' : '🛰️ VENTANA NISAR L2 GCOV (GOOGLE COLAB)'}</span>
        <strong>${isEn ? 'Collection:' : 'Colección:'}</strong> <code class="text-emerald-300 font-mono">NISAR_L2_GCOV_PROVISIONAL_V1</code><br>
        <strong>${isEn ? 'HDF5 Layer:' : 'Capa HDF5:'}</strong> <code class="text-slate-300 font-mono">science/LSAR/GCOV/grids/frequencyA/HHHH</code><br>
        <strong>${isEn ? 'Low Flow [10]:' : 'Estiaje [10]:'}</strong> <span class="font-mono text-white">04-Sep-2026 (GCOV_029_147_A)</span><br>
        <strong>${isEn ? 'Flood Peak [25]:' : 'Crecida [25]:'}</strong> <span class="font-mono text-white">19-Jan-2026 (GCOV_010_147_A)</span><br>
        <strong>${isEn ? 'Reduced Signal (prior estimate):' : 'Señal reducida (estimación previa):'}</strong> <span class="text-rose-400 font-bold">158.72 ha</span><br>
        <strong>${isEn ? 'Increased Signal (prior estimate):' : 'Señal aumentada (estimación previa):'}</strong> <span class="text-cyan-300 font-bold">618.88 ha</span><br>
        <strong>${isEn ? 'Status:' : 'Estado:'}</strong> ${isEn ? 'Unvalidated; different processing versions.' : 'Sin validar; versiones de procesamiento diferentes.'}<br>
        <strong>${isEn ? 'Mean Valley ΔdB:' : 'ΔdB Promedio Valle:'}</strong> <span class="text-amber-300 font-mono">+0.89 dB</span>
      </div>
    `
    )
    .addTo(nisarColabVectorGroup);

  // Cargar los 57 nodos de telemetría real extraídos de las matrices del Colab
  if (!nisarColabTelemetryCache) {
    try {
      const resp = await fetch('assets/nisar_colab_telemetry.json');
      if (resp.ok) {
        nisarColabTelemetryCache = await resp.json();
      }
    } catch (_e) {
      // ignore
    }
  }

  if (
    nisarColabTelemetryCache &&
    Array.isArray(nisarColabTelemetryCache.sample_nodes)
  ) {
    nisarColabTelemetryCache.sample_nodes.forEach((pt, idx) => {
      if (idx % 2 !== 0) return;
      const isOpenWater = pt.type === 'open_water';
      const nodeTitle = isEn
        ? (isOpenWater ? 'REDUCED SIGNAL: UNVALIDATED CANDIDATE CHANGE' : 'INCREASED SIGNAL: UNVALIDATED CANDIDATE CHANGE')
        : (isOpenWater ? 'SEÑAL REDUCIDA: CAMBIO CANDIDATO SIN VALIDAR' : 'SEÑAL AUMENTADA: CAMBIO CANDIDATO SIN VALIDAR');

      L.circleMarker([pt.lat, pt.lon], {
        pane: 'criticalPane',
        radius: 4.5,
        color: '#ffffff',
        fillColor: isOpenWater ? '#f43f5e' : '#00d7ff',
        fillOpacity: 0.95,
        weight: 1.3
      })
        .bindPopup(
          `
          <div class="text-xs space-y-1 font-sans">
            <span class="${isOpenWater ? 'text-rose-400' : 'text-cyan-300'} font-bold block">
              ${nodeTitle}
            </span>
            <strong>${isEn ? 'Coordinate:' : 'Coordenada:'}</strong> <span class="font-mono">${pt.lat}, ${pt.lon}</span><br>
            <strong>${isEn ? 'Low Flow (04-Sep-2026):' : 'Estiaje (04-Sep-2026):'}</strong> <span class="font-mono text-slate-300">${pt.db_estiaje} dB</span><br>
            <strong>${isEn ? 'Flood Peak (19-Jan-2026):' : 'Crecida (19-Ene-2026):'}</strong> <span class="font-mono text-white">${pt.db_crecida} dB</span><br>
            <strong>${isEn ? 'Differential Change (ΔdB):' : 'Cambio Diferencial (ΔdB):'}</strong> <code class="bg-slate-800 px-1.5 py-0.5 rounded font-mono font-bold ${isOpenWater ? 'text-rose-300' : 'text-cyan-300'}">${pt.delta_db > 0 ? '+' : ''}${pt.delta_db} dB</code>
          </div>
        `
        )
        .addTo(nisarColabVectorGroup);
    });
    });
  }
}

function flyToNisarColabZone() {
  const toggleCb = document.getElementById('toggle-nisar-colab');
  if (toggleCb) toggleCb.checked = true;
  renderNisarColabLayer();
  if (map) {
    map.flyTo([-16.565, -72.725], 13, { duration: 1.3 });
  }
}

function openNisarColabModal() {
  const modal = document.getElementById('nisar-colab-modal');
  if (modal) modal.classList.remove('hidden');
}

function closeNisarColabModal() {
  const modal = document.getElementById('nisar-colab-modal');
  if (modal) modal.classList.add('hidden');
}
