import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const host = '127.0.0.1';
const port = Number(process.env.PREVIEW_PORT ?? 4173);
const baseUrl = `http://${host}:${port}`;
const outputPath = process.argv[2] ?? 'dist/lab-seminar-presentation.pdf';

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForServer(url, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Server is not ready yet.
    }
    await wait(500);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

const viteBin = path.join(process.cwd(), 'node_modules', 'vite', 'bin', 'vite.js');
const preview = spawn(
  process.execPath,
  [viteBin, 'preview', '--host', host, '--port', String(port), '--strictPort'],
  { stdio: 'inherit' }
);

try {
  await waitForServer(baseUrl);
  await mkdir(path.dirname(outputPath), { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });

  await page.goto(`${baseUrl}/?print-pdf`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__presentationReady === true, null, { timeout: 60_000 });
  await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => undefined);
  await page.waitForTimeout(4000);

  await page.pdf({
    path: outputPath,
    width: '1920px',
    height: '1080px',
    printBackground: true,
    preferCSSPageSize: false,
    margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' }
  });

  await browser.close();
  console.log(`PDF exported to ${outputPath}`);
} finally {
  preview.kill('SIGTERM');
}
