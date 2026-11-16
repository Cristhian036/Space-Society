/* NISAR Layer: GCOV radar imagery and detected river channels overlaid.
 *
 * Data source is `gcov_rivers.py`: top-hat morphology detection over the
 * native 20 m NISAR L2 GCOV grid, with shape and skeleton filtering.
 * The SAR image represents the physical measurement; the baseline network provides context.
 */
let nisarRiverOverlay = null;
let nisarRiverVectors = null;
let nisarRiverRequest = 0;
let nisarManifestCache = null;
// First load fits bounds to the measured zone to prevent the NISAR tile
// from appearing as an unnoticeable small rectangle in the national view.
let nisarFirstFitDone = false;

// Zones with authentic exported NISAR L2 GCOV products.
const NISAR_REGIONS = {
  chili: { root: 'output/nisar_chili', label: 'Chili Valley (Measured Reach)' },
  majes: { root: 'output/nisar_chili', label: 'Chili Valley (Measured Reach)' }
};

function nisarRegionRoot() {
  const sel = document.getElementById('nisar-rivers-region');
  const key = sel && sel.value ? sel.value : 'chili';
  return (NISAR_REGIONS[key] || NISAR_REGIONS.chili).root;
}

function nisarChannelStyle(feature) {
  const props = feature.properties || {};
  const tipo = props.tipo;
  const cambio = props.cambio;
  if (cambio === 'nuevo') return { color: '#ff466e', weight: 3.5, opacity: 0.95 };
  if (cambio === 'retirado') return { color: '#ffb92d', weight: 3.5, opacity: 0.9, dashArray: '5 5' };
  if (tipo === 'agua_abierta_oscura') return { color: '#00e5ff', weight: 3, opacity: 0.95 };
  return { color: '#ffd43b', weight: 3, opacity: 0.95 };
}

function nisarChannelPopup(feature) {
  const p = feature.properties || {};
  const tipo = p.tipo === 'agua_abierta_oscura'
    ? 'Open water / specular reflection (dark in L-band)'
    : 'Riparian corridor / vegetated channel (bright in L-band)';
  const cambio = p.cambio ? `<br>Multitemporal change: ${p.cambio}` : '';
  return `<div style="min-width:230px">
    <strong style="color:#ffd43b">NISAR Detected River Channel</strong><br>
    <span style="color:#94a3b8">${tipo}</span><hr style="border-color:#334155">
    Acquisition: ${p.adquisicion || 'N/A'}${cambio}<br>
    Length: ${(p.largo_m || 0).toLocaleString('en-US')} m &nbsp; Mean width: ${(p.ancho_m || 0).toFixed(0)} m<br>
    Elongation: ${p.elongacion || 'N/A'} &nbsp; Mean dB: ${p.db_medio ?? 'N/A'}<br>
    <span style="color:#64748b;font-size:11px">${p.origen || 'Raw NISAR L2 GCOV'}</span>
  </div>`;
}

function clearNisarRiversLayer() {
  if (nisarRiverOverlay) { map.removeLayer(nisarRiverOverlay); nisarRiverOverlay = null; }
  if (nisarRiverVectors) { map.removeLayer(nisarRiverVectors); nisarRiverVectors = null; }
}

/* The date selector dynamically populates with exported acquisitions:
   if the target folder contains only one date, the UI avoids presenting a fake "before" option. */
function nisarSyncDateOptions(manifest) {
  const select = document.getElementById('nisar-rivers-date');
  if (!select) return;
  const fechas = (manifest.fechas || []).map(f => ({
    clave: f.clave,
    etiqueta: f.adquisicion ? `${f.adquisicion}` : f.clave
  }));
  const previous = select.value;
  select.innerHTML = '';
  if (!fechas.length) return;
  fechas.forEach(f => {
    const opt = document.createElement('option');
    opt.value = f.clave;
    opt.textContent = f.etiqueta;
    select.appendChild(opt);
  });
  if (fechas.some(f => f.clave === previous)) select.value = previous;
}

function nisarSyncModeOptions(manifest) {
  const select = document.getElementById('nisar-rivers-mode');
  if (!select) return;
  const changeOption = select.querySelector('option[value="change"]');
  if (!changeOption) return;
  const disponible = Boolean(manifest.change_layer);
  changeOption.disabled = !disponible;
  changeOption.textContent = disponible
    ? 'Cambio entre las dos fechas'
    : 'Cambio entre fechas (no disponible: una sola adquisición)';
  if (!disponible && select.value === 'change') select.value = 'channels';
}

async function renderNisarRiversLayer(fit = false) {
  const request = ++nisarRiverRequest;
  const enabled = document.getElementById('toggle-nisar-rivers').checked;
  const status = document.getElementById('nisar-rivers-status');
  clearNisarRiversLayer();
  if (!enabled) {
    status.textContent = 'Measured NISAR river channels disabled.';
    return;
  }
  status.textContent = 'Loading raw NISAR GCOV imagery and detected channels...';
  const root = nisarRegionRoot();
  try {
    const resp = await fetch(`${root}/web_manifest.json`, { cache: 'no-store' });
    if (!resp.ok) throw new Error('No se encontró la exportación de NISAR. Ejecuta gcov_rivers.py sobre los HDF5.');
    const manifest = await resp.json();
    if (request !== nisarRiverRequest) return;
    nisarManifestCache = manifest;

    nisarSyncDateOptions(manifest);
    nisarSyncModeOptions(manifest);

    const mode = document.getElementById('nisar-rivers-mode').value;
    const bounds = L.latLngBounds(manifest.bounds);
    const fecha = document.getElementById('nisar-rivers-date').value;
    const sarKey = manifest.layers[`sar_${fecha}`] ? `sar_${fecha}` : `sar_before`;
    const maskKey = manifest.layers[`channels_${fecha}`] ? `channels_${fecha}` : `channels_before`;
    nisarRiverOverlay = L.layerGroup().addTo(map);

    if (mode === 'sar') {
      nisarRiverOverlay.addLayer(L.imageOverlay(`${root}/${manifest.layers[sarKey]}`, bounds,
        { pane: 'nisarPane', opacity: 0.9, interactive: false }));
    }
    if (mode === 'channels') {
      // The radar image represents the physical measurement; the mask and vectors represent the detection.
      nisarRiverOverlay.addLayer(L.imageOverlay(`${root}/${manifest.layers[sarKey]}`, bounds,
        { pane: 'nisarPane', opacity: 0.9, interactive: false }));
      if (manifest.layers[maskKey]) {
        nisarRiverOverlay.addLayer(L.imageOverlay(`${root}/${manifest.layers[maskKey]}`, bounds,
          { pane: 'nisarMaskPane', opacity: 0.85, interactive: false }));
      }
    }
    if (mode === 'change' && manifest.change_layer) {
      nisarRiverOverlay.addLayer(L.imageOverlay(`${root}/${manifest.change_layer}`, bounds,
        { pane: 'nisarMaskPane', opacity: 0.9, interactive: false }));
    }
    nisarRiverOverlay.eachLayer(l => l.on('error', () => { status.textContent = 'No se pudo cargar la imagen exportada.'; }));

    if (mode === 'channels' || mode === 'change') {
      const geo = await (await fetch(`${root}/${manifest.channels}`, { cache: 'no-store' })).json();
      if (request !== nisarRiverRequest) return;
      nisarRiverVectors = L.geoJSON(geo, {
        pane: 'riversTopPane',
        filter: f => !fecha || !f.properties || f.properties.fecha === fecha,
        style: nisarChannelStyle,
        onEachFeature: (f, lyr) => lyr.bindPopup(nisarChannelPopup(f))
      }).addTo(map);
    }

    const encuadrar = fit || !nisarFirstFitDone;
    if (encuadrar || !map.getBounds().intersects(bounds)) map.fitBounds(bounds, { padding: [24, 24] });
    nisarFirstFitDone = true;
    const d = manifest.detector || {};
    const lineas = Object.values(manifest.lineas || {}).reduce((acc, v) => acc + (v.brillo || 0) + (v.oscuro || 0), 0);
    const fechas = (manifest.fechas || []).map(f => `${f.adquisicion || f.clave} (${f.lineas} channels)`).join(' & ');
    status.textContent = `NISAR L2 GCOV, 20m native grid. ${lineas} river reaches detected · ${fechas}. ${manifest.warning || ''}`;
  } catch (err) {
    if (request === nisarRiverRequest) status.textContent = err.message;
  }
}

function flyToNisarRivers() {
  const root = nisarRegionRoot();
  fetch(`${root}/web_manifest.json`, { cache: 'no-store' })
    .then(r => r.json())
    .then(m => map.fitBounds(L.latLngBounds(m.bounds), { padding: [24, 24] }))
    .catch(() => {});
}
