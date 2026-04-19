/**
 * Captures screenshots of the running tidemarq app for use in the website.
 *
 * Prerequisites:
 *   - tidemarq running at TIDEMARQ_URL (default https://localhost:8717)
 *   - @playwright/test installed: npx playwright install chromium
 *
 * Usage:
 *   TIDEMARQ_URL=https://localhost:8717 \
 *   TIDEMARQ_USER=admin \
 *   TIDEMARQ_PASS=your-password \
 *   node scripts/capture-screenshots.mjs
 *
 * Output: public/screenshots/*.png
 *
 * After running, set hasScreenshot = true in src/components/Hero.astro
 * and replace doc-screenshot-placeholder elements in docs pages with
 * <img class="doc-screenshot" src={u('/screenshots/<name>.png')} ... />
 */

import { chromium } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '../public/screenshots');
const BASE_URL = process.env.TIDEMARQ_URL || 'https://localhost:8717';
const USERNAME = process.env.TIDEMARQ_USER || 'admin';
const PASSWORD = process.env.TIDEMARQ_PASS || 'admin';

mkdirSync(OUT_DIR, { recursive: true });

async function login(page) {
  await page.goto(`${BASE_URL}/login`);
  await page.waitForSelector('input[type="text"], input[id*="username"]');
  await page.locator('input[type="text"], input[id*="username"]').first().fill(USERNAME);
  await page.locator('input[type="password"], input[id*="password"]').first().fill(PASSWORD);
  await page.locator('button:has-text("Sign in"), button[type="submit"]').first().click();
  await page.waitForSelector('.sidebar, nav[class*="sidebar"], aside', { timeout: 10_000 });
  console.log('  logged in');
}

async function nav(page, linkText) {
  await page.click(`.nav-item:has-text("${linkText}")`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(600);
}

async function shot(page, name, label) {
  const file = path.join(OUT_DIR, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log(`  ✓ ${name}.png  (${label})`);
}

async function main() {
  console.log(`\nCapturing screenshots from ${BASE_URL}\n`);

  const browser = await chromium.launch();
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 1440, height: 860 },
  });
  const page = await context.newPage();

  await login(page);

  // Dashboard
  await nav(page, 'Dashboard');
  await shot(page, 'dashboard', 'Dashboard');

  // Jobs list
  await nav(page, 'Sync Jobs');
  await shot(page, 'jobs', 'Sync Jobs list');

  // Job detail — click first job row if one exists
  try {
    await page.click('table tbody tr:first-child td:first-child, .job-row:first-child, [class*="job"]:first-child', { timeout: 3000 });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(600);
    await shot(page, 'job-detail', 'Job detail');
  } catch {
    console.log('  ! job-detail skipped — no jobs exist yet');
  }

  // New job wizard — navigate back to jobs list first, then open wizard
  await nav(page, 'Sync Jobs');
  try {
    await page.click('button:has-text("New Job"), button:has-text("New job"), a:has-text("New Job")', { timeout: 3000 });
    await page.waitForTimeout(600);
    await shot(page, 'new-job-wizard', 'New job wizard');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  } catch {
    console.log('  ! new-job-wizard skipped');
  }

  // Conflicts
  await nav(page, 'Conflicts');
  await shot(page, 'conflicts', 'Conflict queue');

  // Quarantine
  await nav(page, 'Quarantine');
  await shot(page, 'quarantine', 'Quarantine');

  // Audit Log
  await nav(page, 'Audit Log');
  await shot(page, 'audit', 'Audit log');

  // Mounts
  await nav(page, 'Mounts');
  await shot(page, 'mounts', 'Mounts');

  // Settings
  await nav(page, 'Settings');
  await shot(page, 'settings', 'Settings');

  await browser.close();

  console.log(`\nAll screenshots saved to public/screenshots/`);
  console.log(`\nNext steps:`);
  console.log(`  1. Set hasScreenshot = true in src/components/Hero.astro`);
  console.log(`  2. Replace doc-screenshot-placeholder elements in docs pages`);
  console.log(`     with <img class="doc-screenshot" src={u('/screenshots/<name>.png')} />`);
}

main().catch(err => {
  console.error('\nCapture failed:', err.message);
  process.exit(1);
});
