const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const PORT = 8085;
const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.tif': 'application/octet-stream',
  '.sqlite': 'application/octet-stream'
};

const ROOT_DIR = path.resolve(__dirname, '..');

// 1. In-process static server
function startServer() {
  const server = http.createServer((req, res) => {
    let filePath = path.join(ROOT_DIR, decodeURIComponent(req.url.split('?')[0]));
    if (req.url === '/' || req.url === '') filePath = path.join(ROOT_DIR, 'index.html');

    fs.stat(filePath, (err, stats) => {
      if (err || !stats.isFile()) {
        res.writeHead(404);
        res.end('Not found: ' + req.url);
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
      fs.createReadStream(filePath).pipe(res);
    });
  });
  return new Promise(resolve => server.listen(PORT, '127.0.0.1', () => resolve(server)));
}

async function main() {
  console.log('Starting internal server...');
  const server = await startServer();
  console.log(`Server running at http://127.0.0.1:${PORT}`);

  const outDir = path.join(ROOT_DIR, 'output', 'video_frames');
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true
  });

  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1
  });

  console.log('Navigating to dashboard...');
  await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);

  // FRAME 1: NATIONAL OVERVIEW (The Challenge & Dry Basins)
  console.log('Capturing Frame 01: National / Basin Overview...');
  await page.evaluate(() => {
    map.setView([-16.3, -72.0], 9);
  });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(outDir, 'frame_01_national_challenge.png') });

  // FRAME 2: CHILI RIVER (Where simple methods fail - Urban & low flow)
  console.log('Capturing Frame 02: Rio Chili in Arequipa...');
  await page.evaluate(() => {
    zoomToBasin('chili');
    document.getElementById('gcov-region').value = 'legacy_chili';
    document.getElementById('toggle-processed-gcov').checked = true;
    renderProcessedGcovLayer();
  });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(outDir, 'frame_02_chili_urban_failure.png') });

  // FRAME 3: RAW NISAR RADAR BACKSCATTER
  console.log('Capturing Frame 03: Raw NISAR Radar Backscatter...');
  await page.evaluate(() => {
    const nisarToggle = document.getElementById('toggle-nisar-rivers');
    nisarToggle.checked = true;
    const modeSelect = document.getElementById('nisar-rivers-mode');
    modeSelect.value = 'sar';
    renderNisarRiversLayer(true);
  });
  await page.waitForTimeout(4000);
  await page.screenshot({ path: path.join(outDir, 'frame_03_nisar_raw_radar.png') });

  // FRAME 4: TOP-HAT DETECTED RIVER CHANNELS & RIPARIAN CORRIDORS
  console.log('Capturing Frame 04: Top-Hat Detected River Channels...');
  await page.evaluate(() => {
    const modeSelect = document.getElementById('nisar-rivers-mode');
    modeSelect.value = 'channels';
    renderNisarRiversLayer(false);
  });
  await page.waitForTimeout(4000);
  await page.screenshot({ path: path.join(outDir, 'frame_04_tophat_channels.png') });

  // FRAME 5: CLOSEUP OF DETECTED RIPARIAN & OPEN WATER WITH POPUP
  console.log('Capturing Frame 05: Close-up with telemetry popup...');
  await page.evaluate(() => {
    if (nisarRiverVectors) {
      const layers = nisarRiverVectors.getLayers();
      if (layers.length > 0) {
        const target = layers[Math.floor(layers.length / 2)];
        if (target && target.getBounds) {
          map.fitBounds(target.getBounds().pad(3));
          target.openPopup();
        }
      }
    }
  });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(outDir, 'frame_05_channel_telemetry_popup.png') });

  // FRAME 6: 12-DAY ORBITAL CYCLE SIMULATION (PEAK FLOOD)
  console.log('Capturing Frame 06: Orbital 12-Day Simulation (+36d Peak)...');
  await page.evaluate(() => {
    zoomToBasin('camana');
    if (typeof stepOrbitalPassTo === 'function') {
      stepOrbitalPassTo(3); // +36d Peak Flood
    }
  });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(outDir, 'frame_06_orbital_cycle_simulation.png') });

  console.log('All 6 high-res frames captured successfully in output/video_frames/');
  await browser.close();
  server.close();
  process.exit(0);
}

main().catch(err => {
  console.error('Error generating frames:', err);
  process.exit(1);
});
