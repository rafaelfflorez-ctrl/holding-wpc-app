import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CDP_URL = 'http://127.0.0.1:9222/json/version';
const APP_URL = 'http://localhost:3000';

async function getWSEndpoint() {
  const res = await fetch(CDP_URL);
  const data = await res.json();
  return data.webSocketDebuggerUrl;
}

const viewports = [
  { name: 'mobile', width: 390, height: 844, desc: 'Mobile (iPhone 12)' },
  { name: 'tablet', width: 768, height: 1024, desc: 'Tablet (iPad)' },
  { name: 'desktop', width: 1366, height: 768, desc: 'Desktop (laptop)' },
  { name: 'tv', width: 1920, height: 1080, desc: 'TV Full HD' },
];

const wsEndpoint = await getWSEndpoint();
console.log('Connecting to', wsEndpoint);
const browser = await puppeteer.connect({ browserWSEndpoint: wsEndpoint, defaultViewport: null });

for (const vp of viewports) {
  const page = await browser.newPage();
  await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 1 });
  console.log(`\n[${vp.desc}] ${vp.width}x${vp.height} -> loading ${APP_URL}`);
  await page.goto(APP_URL, { waitUntil: 'networkidle0', timeout: 30000 });
  await new Promise(r => setTimeout(r, 1500));
  const outPath = `screenshots/${vp.name}.png`;
  fs.mkdirSync('screenshots', { recursive: true });
  await page.screenshot({ path: outPath, fullPage: false });
  console.log(`  -> saved ${outPath} (${fs.statSync(outPath).size} bytes)`);
  await page.close();
}

await browser.disconnect();
console.log('\nAll screenshots done. Check ./screenshots/ folder.');
