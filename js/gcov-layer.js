let processedGcovOverlay = null;
let processedGcovRequest = 0;

// Zones with GCOV results published from the original HDF5 files.
const GCOV_REGIONS = {
  majes: { root: 'output/gcov_majes', label: 'Majes-Camaná (NISAR 22-Oct-2026)' },
  legacy_chili: { root: 'output/chili', label: 'Chili (exportación anterior)' },
  legacy_camana: { root: 'output/gcov', label: 'Camaná (exportación anterior)' }
};

function gcovRegionRoot(region) {
  const el = document.getElementById('gcov-region');
  const key = region || (el && el.value) || 'majes';
  return (GCOV_REGIONS[key] || GCOV_REGIONS.majes).root;
}

async function renderProcessedGcovLayer() {
  const request = ++processedGcovRequest;
  const enabled = document.getElementById('toggle-processed-gcov').checked;
  const status = document.getElementById('processed-gcov-status');
  if (processedGcovOverlay) {
    map.removeLayer(processedGcovOverlay);
    processedGcovOverlay = null;
  }
  if (!enabled) { status.textContent = 'Agua por fecha y cambio, a partir de los originales.'; return; }
  status.textContent = 'Cargando resultados GCOV...';
  try {
    const method = document.getElementById('gcov-method').value;
    if (method === 'opera') {
      const region = document.getElementById('gcov-region').value;
      const operaRoot = region === 'chili' ? 'output/opera_chili' : 'output/opera_camana';
      const response = await fetch(`${operaRoot}/web_manifest.json`, {cache:'no-store'});
      if (!response.ok) throw new Error('Aún no hay diagnóstico OPERA exportado.');
      const diagnostic = await response.json();
      if (request !== processedGcovRequest) return;
      if (diagnostic.status === 'failed') throw new Error(diagnostic.warning);
      processedGcovOverlay = L.imageOverlay(`${operaRoot}/diagnostic.png`, diagnostic.bounds,
        {pane:'riversTopPane',opacity:.85,interactive:false}).addTo(map);
      if (!map.getBounds().intersects(L.latLngBounds(diagnostic.bounds))) map.fitBounds(diagnostic.bounds);
      status.textContent = `${diagnostic.warning} Fecha ${diagnostic.date}. Naranja: agua; amarillo: agua parcial; violeta: vegetación inundada según el algoritmo (sin validar). El deslizador dB y el selector de fecha no modifican esta ejecución OPERA.`;
      return;
    }
    const root = gcovRegionRoot();
    const resp = await fetch(`${root}/web_manifest.json`, {cache:'no-store'});
    if (!resp.ok) throw new Error('No se encontraron resultados procesados de esta zona. Tener los HDF5 descargados no genera automáticamente las capas del visor.');
    const manifest = await resp.json();
    if (request !== processedGcovRequest) return;
    const coverage = L.latLngBounds(manifest.bounds);
    if (!map.getBounds().intersects(coverage)) map.fitBounds(coverage);
    const mode = document.getElementById('processed-gcov-mode').value;
    const changeOption = document.querySelector('#processed-gcov-mode option[value="change"]');
    changeOption.disabled = !manifest.layers.change;
    const afterOption = document.querySelector('#processed-gcov-mode option[value="water_after"]');
    if (afterOption) {
      const haySegunda = Boolean(manifest.after);
      afterOption.disabled = !haySegunda;
      afterOption.textContent = haySegunda ? 'Agua candidata: segunda fecha' : 'Agua candidata: segunda fecha (no disponible)';
      if (!haySegunda && document.getElementById('processed-gcov-mode').value === 'water_after') {
        document.getElementById('processed-gcov-mode').value = 'water_before';
      }
    }
    if (mode === 'change' && !manifest.layers.change) {
      status.textContent = manifest.change_unavailable_reason || 'No hay un resultado de cambio comparable.';
      return;
    }
    const selectedDb = Number(document.getElementById('gcov-db-slider').value);
    const terrain = method === 'terrain';
    const variants = terrain ? manifest.terrain_variants : manifest.threshold_variants;
    if (terrain && !variants) throw new Error('El filtro de terreno todavía se está preparando. Puedes comparar con Solo SAR.');
    const variant = variants?.[selectedDb.toFixed(1)];
    const filename = mode === 'change' ? manifest.layers[mode] : variant?.layers[mode] || manifest.layers[mode];
    if (!/^(?:(?:thresholds|terrain)\/m\d+\/)?(?:water_before|water_after|change)\.png$/.test(filename)) throw new Error('Capa GCOV inválida');
    processedGcovOverlay = L.imageOverlay(`${root}/${filename}`, manifest.bounds,
      {pane: 'gcovPane', opacity: .8, interactive: false}).addTo(map);
    processedGcovOverlay.on('error', () => { status.textContent = 'No se pudo cargar la imagen GCOV exportada.'; });
    const metadata = mode === 'water_before' ? manifest.before : manifest.after;
    const date = metadata?.zeroDopplerStartTime?.slice(0, 10) || 'fecha del archivo importado';
    const threshold = variant ? selectedDb : mode === 'water_before' ? manifest.threshold_before_db : manifest.threshold_after_db;
    const area = variant?.area_ha?.[mode === 'water_before' ? 'before' : 'after'];
    if (mode !== 'change' && area === 0) {
      status.textContent = `${date}: la capa cargó correctamente, pero ${threshold} dB con semillas ${threshold - manifest.strong_margin_db} dB no deja candidatos con este filtro. No significa río seco. Prueba -18 o -14 dB, o compara con Solo SAR.`;
      return;
    }
    status.textContent = mode === 'change' ? manifest.legend : `${terrain ? 'SAR + terreno experimental' : 'Solo SAR'}: agua candidata (${date}), umbral ${threshold} dB; semillas ${threshold - manifest.strong_margin_db} dB. ${variant && area !== undefined ? 'Área candidata: ' + Number(area).toFixed(1) + ' ha.' : ''} Sin validación local. ${manifest.change_unavailable_reason || ''}`;
  } catch (err) {
    if (request === processedGcovRequest) status.textContent = err.message;
  }
}
