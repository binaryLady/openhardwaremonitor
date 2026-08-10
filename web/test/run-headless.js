// Headless bench runner — the CI entry point for the web stack.
// Serves web/ on a local port, opens the test bench in headless Chromium,
// waits for window.__TTM_TEST_RESULTS, prints every failure, and exits
// non-zero if any assertion failed. No framework, no config: the bench
// itself is the test suite; this just gives it a browser and an exit code.
//
//   npm install playwright && npx playwright install --with-deps chromium
//   node web/test/run-headless.js
//
// OHM_CHROMIUM overrides the browser binary (for pre-installed Chromium).
'use strict';
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon',
  '.json': 'application/json',
};

const srv = http.createServer((req, res) => {
  let p = req.url.split('?')[0];
  if (p.endsWith('/')) p += 'index.html';
  const file = path.normalize(path.join(ROOT, p));
  if (!file.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, (e, d) => {
    if (e) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'text/plain' });
    res.end(d);
  });
});

srv.listen(0, async () => {
  const port = srv.address().port;
  let failed = 1;
  try {
    const browser = await chromium.launch({
      executablePath: process.env.OHM_CHROMIUM || undefined,
    });
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto('http://localhost:' + port + '/test/?nogate=1');
    await page.waitForFunction(() => window.__TTM_TEST_RESULTS, null, { timeout: 60000 });
    const r = await page.evaluate(() => window.__TTM_TEST_RESULTS);
    console.log('BENCH ' + r.passed + '/' + r.total);
    r.results.filter((x) => !x.ok).forEach((x) => console.log('FAIL: ' + x.name + ' — ' + x.detail));
    errors.forEach((e) => console.log('PAGE ERROR: ' + e));
    failed = (r.passed === r.total && errors.length === 0) ? 0 : 1;
    await browser.close();
  } catch (e) {
    console.error('runner error:', e.message);
  }
  srv.close();
  process.exit(failed);
});
