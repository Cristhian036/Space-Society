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
let mathShowDry = true;
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

async function runMathematicalRiverExtraction() {
  if (!map) return;
  initMathEngineLayer();

  if (mathAbort) mathAbort.abort();
  mathAbort = new AbortController();
  isMathComputing = true;

  const btnTextEl = document.getElementById('btn-math-engine-text');
  if (btnTextEl) btnTextEl.textContent = '⚙️ Calculando red hidrográfica...';
  mathSetStatus('<span class="text-amber-300 animate-pulse">⚙️ DEM nativo → Priority-Flood → D8 → Strahler...</span>');

  const b = map.getBounds();
  const params = new URLSearchParams({
    south: b.getSouth().toFixed(5),
    north: b.getNorth().toFixed(5),
    west: b.getWest().toFixed(5),
    east: b.getEast().toFixed(5),
    res: mathResolutionMode,
    sens: String(mathSensitivity),
    burn: mathBurnOptical ? '1' : '0'
  });

  const t0 = performance.now();
  try {
    const resp = await fetch(`${HYDRO_API}?${params}`, { signal: mathAbort.signal });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    if (data.status !== 'ok') throw new Error(data.message || 'error');
    mathLastResult = data;
    drawMathRivers(data);

    const m = data.metrics;
    const ms = Math.round(performance.now() - t0);
    mathSetStatus(`
      <div class="space-y-0.5 text-[10px] font-mono">
        <div class="text-emerald-400 font-bold">✅ ${m.links.toLocaleString()} tramos · Strahler máx ${m.maxStrahler} · ${ms} ms</div>
        <div class="text-slate-300">DEM z${m.demZoom} nativo: <span class="text-white">${m.gridW}×${m.gridH}</span> (${(m.totalNodes / 1e6).toFixed(2)} M celdas, ${m.pixelMeters} m/px)</div>
        <div class="text-slate-300">Umbral área drenaje: <span class="text-amber-300">${m.areaThresholdKm2} km²</span>${m.lakePixels ? ` · lagos: ${m.lakePixels.toLocaleString()} px` : ''}</div>
        <div class="text-slate-400">${data.engine}${m.burn ? ' + stream burning óptico' : ''}</div>
      </div>`);
  } catch (err) {
    if (err.name === 'AbortError') return;
    console.error('Motor hidrológico:', err);
    mathSetStatus(`<span class="text-rose-400">⚠️ No responde el microservicio (:8050). Ejecuta <code>python hydro_sar_microservice.py</code><br>${err.message}</span>`);
  } finally {
    isMathComputing = false;
    if (btnTextEl) btnTextEl.textContent = '🔄 Recalcular en vista actual';
  }
}

function drawMathRivers(data) {
  if (!mathVectorGroup) return;
  mathVectorGroup.clearLayers();

  const maxO = data.metrics.maxStrahler || 1;
  // Para legibilidad: los cauces secos de orden bajo se ocultan, los húmedos se muestran desde orden 1-2
  const dryMinOrder = Math.max(2, maxO - 2);
  const wetMinOrder = Math.max(1, maxO - 4);

  const activePolygons =
    typeof currentMatchedScenes !== 'undefined'
      ? currentMatchedScenes.map((s) => s.footprint).filter((f) => f && f.length >= 3)
      : [];
  const clipToSar =
    typeof detectionMode !== 'undefined' && detectionMode === 'strict_sar_intersect' && activePolygons.length > 0;

  // Dibujar de menor a mayor orden para que los troncos principales queden encima
  const sorted = [...data.polylines].sort((a, b) => a.order - b.order);

  sorted.forEach((seg) => {
    const wet = seg.water >= 0.18;
    if (wet && seg.order < wetMinOrder) return;
    if (!wet && (!mathShowDry || seg.order < dryMinOrder)) return;

    const rel = seg.order - (wet ? wetMinOrder : dryMinOrder);
    const weight = wet ? 0.9 + rel * 0.55 : 0.6 + rel * 0.35;
    const style = {
      renderer: mathCanvasRenderer,
      color: wet ? (seg.order >= maxO - 1 ? '#22d3ee' : '#67e8f9') : '#cbd5e1',
      weight: Math.min(3.6, weight),
      opacity: wet ? 0.95 : 0.45,
      lineCap: 'round',
      lineJoin: 'round',
      smoothFactor: 0.6
    };

    const parts =
      clipToSar && typeof extractSubSegmentsInsideSar === 'function'
        ? extractSubSegmentsInsideSar(seg.coords, activePolygons)
        : [seg.coords];

    parts.forEach((pts) => {
      if (pts.length < 2) return;
      L.polyline(pts, style)
        .bindPopup(
          `<div class="text-xs space-y-1 font-sans">
            <span class="text-emerald-400 font-bold block">🧮 Cauce calculado (DEM + D8)</span>
            <strong>Orden de Strahler:</strong> <span class="font-mono text-white">${seg.order}</span><br>
            <strong>Área de drenaje:</strong> <span class="font-mono text-cyan-300">${seg.areaKm2.toLocaleString()} km²</span><br>
            <strong>Cota media:</strong> <span class="font-mono">${seg.elev} msnm</span><br>
            <strong>Agua/vegetación observada:</strong> <span class="font-mono ${wet ? 'text-cyan-300' : 'text-slate-400'}">${Math.round(seg.water * 100)}% ${wet ? '(río activo)' : '(cauce seco)'}</span>
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

  // Recalcular automáticamente al mover/zoom (debounce) cuando el motor está activo
  const waitMap = setInterval(() => {
    if (typeof map === 'undefined' || !map) return;
    clearInterval(waitMap);
    map.on('moveend', () => {
      if (!isMathEngineActive) return;
      clearTimeout(mathMoveTimer);
      mathMoveTimer = setTimeout(runMathematicalRiverExtraction, 700);
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
        <span class="text-cyan-400 font-bold block">🛰️ VENTANA NISAR L2 GCOV (GOOGLE COLAB)</span>
        <strong>Colección:</strong> <code class="text-emerald-300 font-mono">NISAR_L2_GCOV_PROVISIONAL_V1</code><br>
        <strong>Capa HDF5:</strong> <code class="text-slate-300 font-mono">science/LSAR/GCOV/grids/frequencyA/HHHH</code><br>
        <strong>Estiaje [10]:</strong> <span class="font-mono text-white">04-Sep-2026 (GCOV_029_147_A)</span><br>
        <strong>Crecida [25]:</strong> <span class="font-mono text-white">19-Ene-2026 (GCOV_010_147_A)</span><br>
        <strong>Expansión Cauce (ΔdB &lt; -3.5):</strong> <span class="text-rose-400 font-bold">158.72 ha</span><br>
        <strong>Llanura Saturada (ΔdB &gt; +3.5):</strong> <span class="text-cyan-300 font-bold">618.88 ha</span><br>
        <strong>ΔdB Promedio Valle:</strong> <span class="text-amber-300 font-mono">+0.89 dB</span>
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
              ${isOpenWater ? '🌊 AGUA ABIERTA NUEVA (ESPEJO RADAR ΔdB < -3.5)' : '🌾 LLANURA INUNDADA (DOBLE REBOTE L-BAND ΔdB > +3.5)'}
            </span>
            <strong>Coordenada:</strong> <span class="font-mono">${pt.lat}, ${pt.lon}</span><br>
            <strong>Estiaje (04-Sep-2026):</strong> <span class="font-mono text-slate-300">${pt.db_estiaje} dB</span><br>
            <strong>Crecida (19-Ene-2026):</strong> <span class="font-mono text-white">${pt.db_crecida} dB</span><br>
            <strong>Cambio Diferencial (ΔdB):</strong> <code class="bg-slate-800 px-1.5 py-0.5 rounded font-mono font-bold ${isOpenWater ? 'text-rose-300' : 'text-cyan-300'}">${pt.delta_db > 0 ? '+' : ''}${pt.delta_db} dB</code>
          </div>
        `
        )
        .addTo(nisarColabVectorGroup);
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
