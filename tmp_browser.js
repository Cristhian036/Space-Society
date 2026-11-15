// Verificacion del visor en un navegador real.
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 950 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('requestfailed', r => errors.push('requestfailed: ' + r.url() + ' ' + (r.failure() || {}).errorText));

  await page.goto('http://localhost:8000/index.html', { waitUntil: 'load' });
  await page.waitForTimeout(6000);

  const info = await page.evaluate(() => {
    const imgs = [...document.querySelectorAll('.leaflet-image-layer')].map(i => ({
      src: i.getAttribute('src'), w: i.naturalWidth, h: i.naturalHeight,
      op: getComputedStyle(i).opacity, disp: getComputedStyle(i).display
    }));
    const paths = document.querySelectorAll('#map path').length;
    return {
      nisarStatus: document.getElementById('nisar-rivers-status').textContent.trim(),
      gcovStatus: document.getElementById('processed-gcov-status').textContent.trim(),
      dateOptions: [...document.querySelectorAll('#nisar-rivers-date option')].map(o => o.textContent),
      modeOptions: [...document.querySelectorAll('#nisar-rivers-mode option')].map(o => ({ t: o.textContent, d: o.disabled })),
      gcovMode: [...document.querySelectorAll('#processed-gcov-mode option')].map(o => ({ t: o.textContent, d: o.disabled })),
      images: imgs,
      svgPaths: paths,
      center: [map.getCenter().lat, map.getCenter().lng],
      zoom: map.getZoom()
    };
  });
  console.log(JSON.stringify(info, null, 2));
  console.log('ERRORES:', errors.length ? errors : 'ninguno');

  await page.screenshot({ path: 'tmp_browser.png' });
  await browser.close();
})();
