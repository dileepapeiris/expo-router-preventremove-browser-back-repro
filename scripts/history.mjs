// Replays the issue steps in headless Chrome. For each step it prints the browser history
// (DevTools `Page.getNavigationHistory`), the history commands the app issued, and saves a
// screenshot to media/<label>-<step>.png.
// Usage: node scripts/history.mjs http://localhost:8099 [label]   (dev server from `npm run web`)
// Set CHROME to your Chrome binary if it is not at the macOS default path.
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';

const BASE = process.argv[2] || 'http://localhost:8099';
const LABEL = process.argv[3] || 'run';
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync('media', { recursive: true });

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });

async function snapshot(page, cdp, step, caption, shot) {
  await page.evaluate((text) => globalThis.setCaption?.(text), caption);
  await sleep(700);
  const { currentIndex, entries } = await cdp.send('Page.getNavigationHistory');
  const real = entries.filter((e) => e.url !== 'about:blank');
  const index = currentIndex - (entries.length - real.length);
  const path = await page.evaluate(() => location.pathname);
  const blocked = await page.evaluate(() => globalThis.blockedAction ?? null);
  const history = real.map((e) => new URL(e.url).pathname);
  console.log(`  ${step.padEnd(22)} ${JSON.stringify({ path, blocked, history, index })}`);
  const log = await page.evaluate(() => globalThis.historyLog?.splice(0) ?? []);
  for (const line of log) console.log(`      ${line}`);
  if (shot) await page.screenshot({ path: `media/${shot}.png` });
}

async function scenario(name, link, leave, leaveCaption, shot) {
  console.log(`${name}:`);
  const page = await browser.newPage();
  await page.setViewport({ width: 560, height: 300, deviceScaleFactor: 2 });
  const cdp = await page.createCDPSession();
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle0', timeout: 120000 });
  await page.waitForSelector(`[data-testid="${link}"]`, { timeout: 60000 });
  await page.evaluate(() => globalThis.historyLog?.splice(0));
  await page.click(`[data-testid="${link}"]`);
  await sleep(1500);
  await snapshot(page, cdp, 'after Link', '1. Opened the page from the home screen', shot && `${shot}-1-page`);
  await leave(page);
  await snapshot(page, cdp, 'after leaving', leaveCaption, shot && `${shot}-2-left`);
  await page.goForward({ waitUntil: 'load' }).catch(() => {});
  await snapshot(page, cdp, 'after browser Forward', '3. Pressed browser Forward', shot && `${shot}-3-forward`);
  await page.close();
}

const browserBack = (page) => page.goBack({ waitUntil: 'load' }).catch(() => {});
const routerBack = (page) => page.click('[data-testid="back"]');

await scenario('browser Back, usePreventRemove + repeat()', 'open', browserBack, '2. Pressed browser Back; the dialog confirmed, repeat() ran', `${LABEL}-browser-back`);
await scenario('router.back(), usePreventRemove + repeat() (control)', 'open', routerBack, '2. Pressed router.back(); the dialog confirmed, repeat() ran', `${LABEL}-router-back`);
await scenario('browser Back, preventRemove set to false before repeat()', 'open2', browserBack, '2. Pressed browser Back; preventRemove cleared, repeat() ran');
await scenario('browser Back, page without the hook (control)', 'open-plain', browserBack, '2. Pressed browser Back (no hook)');
await browser.close();
