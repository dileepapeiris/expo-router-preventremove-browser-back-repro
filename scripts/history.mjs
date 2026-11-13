// Replays the issue steps in headless Chrome and prints the browser history after each step.
// Usage: node scripts/history.mjs http://localhost:8099   (dev server from `npm run web`)
// Set CHROME to your Chrome binary if it is not at the macOS default path.
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';

const BASE = process.argv[2] || 'http://localhost:8099';
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync('media', { recursive: true });

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });

async function snapshot(page, cdp, label, shot) {
  await sleep(600);
  const { currentIndex, entries } = await cdp.send('Page.getNavigationHistory');
  const real = entries.filter((e) => e.url !== 'about:blank');
  const index = currentIndex - (entries.length - real.length);
  const path = await page.evaluate(() => location.pathname);
  const blocked = await page.evaluate(() => globalThis.blockedAction ?? null);
  const history = real.map((e) => new URL(e.url).pathname);
  console.log(`  ${label.padEnd(24)} ${JSON.stringify({ path, blocked, history, index })}`);
  if (shot) await page.screenshot({ path: `media/${shot}.png` });
}
async function scenario(name, link, leave, shot) {
  console.log(`${name}:`);
  const page = await browser.newPage();
  const cdp = await page.createCDPSession();
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle0', timeout: 120000 });
  await page.waitForSelector(`[data-testid="${link}"]`, { timeout: 60000 });
  await page.click(`[data-testid="${link}"]`);
  await sleep(1500);
  await snapshot(page, cdp, 'after Link', shot && `${shot}-1-page`);
  await leave(page);
  await snapshot(page, cdp, 'after leaving', shot && `${shot}-2-left`);
  await page.goForward({ waitUntil: 'load' }).catch(() => {});
  await snapshot(page, cdp, 'after browser Forward', shot && `${shot}-3-forward`);
  await page.close();
}
