/* Capa NISAR: imagen de radar GCOV y cauces detectados sobre ella.
 *
 * Los datos vienen de `gcov_rivers.py`: detección top-hat sobre la malla
 * nativa de 20 m de NISAR L2 GCOV, con filtro de forma y esqueleto.
 * La imagen SAR es la medida; la red de referencia del visor es contexto.
 */
let nisarRiverOverlay = null;
let nisarRiverVectors = null;
let nisarRiverRequest = 0;
let nisarManifestCache = null;
// La primera carga encuadra sobre la zona medida: si no, el recorte de NISAR
// queda como un rectangulo pequeno dentro de la vista nacional.
let nisarFirstFitDone = false;

// Zonas con exportacion real de NISAR L2 GCOV.
const NISAR_REGIONS = {
  majes: { root: 'output/nisar_majes', label: 'Majes-Camaná (valle inferior)' }
};

function nisarRegionRoot() {
  const sel = document.getElementById('nisar-rivers-region');
  const key = sel && sel.value ? sel.value : 'majes';
  return (NISAR_REGIONS[key] || NISAR_REGIONS.majes).root;
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
    ? 'Agua abierta / sombra especular (oscura en Banda L)'
    : 'Corredor ripario o cauce con vegetación (brillante en Banda L)';
  const cambio = p.cambio ? `<br>Cambio entre fechas: ${p.cambio}` : '';
  return `<div style="min-width:230px">
    <strong style="color:#ffd43b">Cauce detectado por NISAR</strong><br>
    <span style="color:#94a3b8">${tipo}</span><hr style="border-color:#334155">
    Adquisición: ${p.adquisicion || 's/d'}${cambio}<br>
    Largo: ${(p.largo_m || 0).toLocaleString('es-PE')} m &nbsp; Ancho medio: ${(p.ancho_m || 0).toFixed(0)} m<br>
    Elongación: ${p.elongacion || 's/d'} &nbsp; dB medio: ${p.db_medio ?? 's/d'}<br>
    <span style="color:#64748b;font-size:11px">${p.origen || ''}</span>
  </div>`;
}

function clearNisarRiversLayer() {
  if (nisarRiverOverlay) { map.removeLayer(nisarRiverOverlay); nisarRiverOverlay = null; }
  if (nisarRiverVectors) { map.removeLayer(nisarRiverVectors); nisarRiverVectors = null; }
}

/* El selector de fecha se arma con las adquisiciones realmente exportadas:
   si la carpeta tiene una sola fecha, el visor no ofrece un "antes" falso. */
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
    status.textContent = 'Cauces medidos en la imagen NISAR desactivados.';
    return;
  }
  status.textContent = 'Cargando imagen NISAR GCOV y cauces detectados...';
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
      // La imagen de radar es la medida; la máscara y los vectores son la detección.
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
    const fechas = (manifest.fechas || []).map(f => `${f.adquisicion || f.clave} (${f.lineas} cauces)`).join(' y ');
    status.textContent = `NISAR L2 GCOV, malla nativa ${d.pixel_m} m. ${lineas} cauces detectados · ${fechas}. ${manifest.warning || ''}`;
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
