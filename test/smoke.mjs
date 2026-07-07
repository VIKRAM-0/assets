// Headless smoke test: boots the real app in system Chrome and asserts the
// core flow works. Gate for every refactor commit.
//
// Usage: node test/smoke.mjs [--shot /path/out.png]
// Requires: python3 -m http.server started by this script (port 8123).

import puppeteer from 'puppeteer-core';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 8123;
const URL = `http://localhost:${PORT}/index.html`;
const shotIdx = process.argv.indexOf('--shot');
const SHOT = shotIdx > -1 ? process.argv[shotIdx + 1] : null;

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
}

// Errors we tolerate: local /api/* endpoints don't exist, and external
// CDNs/texture hosts can be flaky. Anything else is a real defect.
const TOLERATED = [
  /\/api\//,
  /Failed to fetch/i,
  /ERR_(NAME_NOT_RESOLVED|CONNECTION|INTERNET|TIMED_OUT|ABORTED)/,
  /net::/,
  /404/,
  /CORS/i,
  /polyhaven|ambientcg|mityinc|supabase/i,
];
const tolerated = (msg) => TOLERATED.some((re) => re.test(msg));

const server = spawn('node', [new globalThis.URL('./serve.mjs', import.meta.url).pathname, String(PORT)], {
  stdio: 'ignore',
});
await sleep(800);

let browser;
let exitCode = 1;
try {
  browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--use-gl=angle', '--window-size=1440,900'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e?.message || e)));
  page.on('console', (m) => {
    if (m.type() === 'error' && !tolerated(m.text())) {
      // console.error is informational; only uncaught pageerror fails the run,
      // but log it so regressions are visible.
      console.log('  [console.error]', m.text().slice(0, 200));
    }
  });

  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  check('page loads', true);

  // Dismiss the onboarding tour if it appears (blocks the viewport).
  await sleep(3000);
  await page.evaluate(() => window._tourSkip?.()).catch(() => {});

  // Model load signal: loading overlay off AND mesh/zone list populated.
  // (`let` globals aren't on window, so DOM is the observable surface.)
  let modelLoaded = false;
  try {
    await page.waitForFunction(
      () => {
        const loading = document.getElementById('loading');
        const zones = document.querySelectorAll('#mesh-list .mesh-item, #mesh-list [data-eid], #mesh-list > *').length;
        return loading && !loading.classList.contains('on') && zones > 0;
      },
      { timeout: 60000, polling: 500 }
    );
    modelLoaded = true;
  } catch { /* fallthrough */ }
  check('model loads (loading clears, zone list populated)', modelLoaded);

  // Swatch apply: click the first fabric swatch in the bar.
  let swatchOk = false;
  if (modelLoaded) {
    try {
      await page.waitForSelector('.bar-sw', { timeout: 10000 });
      await page.evaluate(() => document.querySelector('.bar-sw')?.click());
      await sleep(2500);
      swatchOk = true;
    } catch { /* fallthrough */ }
  }
  check('first swatch click executes', swatchOk);

  // Room view round-trip. Observable: config panel swaps product<->room pane.
  const roomPaneVisible = () => {
    const room = document.getElementById('panel-room');
    return !!room && room.style.display !== 'none';
  };
  let roomOk = false;
  if (modelLoaded) {
    try {
      await page.evaluate(() => window.toggleRoomView());
      await page.waitForFunction(roomPaneVisible, { timeout: 45000, polling: 500 });
      await sleep(2000);
      await page.evaluate(() => window.toggleRoomView());
      await page.waitForFunction(
        () => document.getElementById('panel-room')?.style.display === 'none',
        { timeout: 30000, polling: 500 }
      );
      roomOk = true;
    } catch { /* fallthrough */ }
  }
  check('room view enter/exit', roomOk);

  const realErrors = pageErrors.filter((e) => !tolerated(e));
  check('no uncaught page errors', realErrors.length === 0, realErrors.slice(0, 3).join(' | '));

  if (SHOT) {
    await page.screenshot({ path: SHOT });
    console.log('screenshot:', SHOT);
  }

  exitCode = results.every((r) => r.ok) ? 0 : 1;
} catch (e) {
  console.log('FAIL  harness error —', e.message);
  exitCode = 1;
} finally {
  await browser?.close().catch(() => {});
  server.kill();
}
process.exit(exitCode);
