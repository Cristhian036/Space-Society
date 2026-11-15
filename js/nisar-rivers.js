/* Capa NISAR: imagen de radar GCOV y cauces detectados sobre ella.
 *
 * Los datos vienen de `gcov_rivers.py`: detección top-hat sobre la malla
 * nativa de 20 m de NISAR L2 GCOV, con filtro de forma y esqueleto.
 * La imagen SAR es la medida; la red de referencia del visor es contexto.
 */
let nisarRiverOverlay = null;
let nisarRiverVectors = null;
let nisarRiverRequest = 0;
const NISAR_REGION_ROOT = 'output/nisar_chili';

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
  return `<div style="min-width:230px">
    <strong style="color:#ffd43b">Cauce detectado por NISAR</strong><br>
    <span style="color:#94a3b8">${tipo}</span><hr style="border-color:#334155">
    Adquisición: ${p.adquisicion || 's/d'}<br>
    Cambio entre fechas: ${p.cambio || 's/d'}<br>
    Largo: ${(p.largo_m || 0).toLocaleString('es-PE')} m &nbsp; Ancho medio: ${(p.ancho_m || 0).toFixed(0)} m<br>
    Elongación: ${p.elongacion || 's/d'} &nbsp; dB medio: ${p.db_medio ?? 's/d'}<br>
    <span style="color:#64748b;font-size:11px">${p.origen || ''}</span>
  </div>`;
}

function clearNisarRiversLayer() {
  if (nisarRiverOverlay) { map.removeLayer(nisarRiverOverlay); nisarRiverOverlay = null; }
  if (nisarRiverVectors) { map.removeLayer(nisarRiverVectors); nisarRiverVectors = null; }
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
  try {
    const resp = await fetch(`${NISAR_REGION_ROOT}/web_manifest.json`, { cache: 'no-store' });
    if (!resp.ok) throw new Error('No se encontró la exportación de NISAR. Ejecuta gcov_rivers.py sobre los HDF5.');
    const manifest = await resp.json();
    if (request !== nisarRiverRequest) return;

    const mode = document.getElementById('nisar-rivers-mode').value;
    const bounds = L.latLngBounds(manifest.bounds);
    const fecha = document.getElementById('nisar-rivers-date').value;
    const sarKey = fecha === 'after' ? 'sar_after' : 'sar_before';
    const maskKey = fecha === 'after' ? 'channels_after' : 'channels_before';
    nisarRiverOverlay = L.layerGroup().addTo(map);

    if (mode === 'sar') {
      nisarRiverOverlay.addLayer(L.imageOverlay(`${NISAR_REGION_ROOT}/${manifest.layers[sarKey]}`, bounds,
        { pane: 'nisarPane', opacity: 0.9, interactive: false }));
    }
    if (mode === 'channels') {
      // La imagen de radar es la medida; la máscara y los vectores son la detección.
      nisarRiverOverlay.addLayer(L.imageOverlay(`${NISAR_REGION_ROOT}/${manifest.layers[sarKey]}`, bounds,
        { pane: 'nisarPane', opacity: 0.9, interactive: false }));
      nisarRiverOverlay.addLayer(L.imageOverlay(`${NISAR_REGION_ROOT}/${manifest.layers[maskKey]}`, bounds,
        { pane: 'nisarMaskPane', opacity: 0.85, interactive: false }));
    }
    if (mode === 'change') {
      nisarRiverOverlay.addLayer(L.imageOverlay(`${NISAR_REGION_ROOT}/${manifest.change_layer}`, bounds,
        { pane: 'nisarMaskPane', opacity: 0.9, interactive: false }));
    }
    nisarRiverOverlay.eachLayer(l => l.on('error', () => { status.textContent = 'No se pudo cargar la imagen exportada.'; }));

    if (mode === 'channels' || mode === 'change') {
      const geo = await (await fetch(`${NISAR_REGION_ROOT}/${manifest.channels}`, { cache: 'no-store' })).json();
      if (request !== nisarRiverRequest) return;
      nisarRiverVectors = L.geoJSON(geo, {
        pane: 'riversTopPane',
        filter: f => !fecha || !f.properties || f.properties.fecha === fecha,
        style: nisarChannelStyle,
        onEachFeature: (f, lyr) => lyr.bindPopup(nisarChannelPopup(f))
      }).addTo(map);
    }

    if (fit || !map.getBounds().intersects(bounds)) map.fitBounds(bounds, { padding: [24, 24] });
    const d = manifest.detector || {};
    status.textContent = `NISAR L2 GCOV, malla nativa ${d.pixel_m} m. ${manifest.lineas.before.brillo + manifest.lineas.before.oscuro} cauces el ${manifest.before.zeroDopplerStartTime.slice(0, 10)} y ${manifest.lineas.after.brillo + manifest.lineas.after.oscuro} el ${manifest.after.zeroDopplerStartTime.slice(0, 10)}. ${manifest.warning}`;
  } catch (err) {
    if (request === nisarRiverRequest) status.textContent = err.message;
  }
}

function flyToNisarRivers() {
  fetch(`${NISAR_REGION_ROOT}/web_manifest.json`, { cache: 'no-store' })
    .then(r => r.json())
    .then(m => map.fitBounds(L.latLngBounds(m.bounds), { padding: [24, 24] }))
    .catch(() => {});
}
