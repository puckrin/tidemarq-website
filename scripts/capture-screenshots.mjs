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
  await page.waitForSelector('input[name="username"], input[placeholder*="sername"], input[type="text"]');
  const userInput = page.locator('input[name="username"]').or(page.locator('input[type="text"]')).first();
  const passInput = page.locator('input[name="password"]').or(page.locator('input[type="password"]')).first();
  await userInput.fill(USERNAME);
  await passInput.fill(PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForSelector('.sidebar, [class*="sidebar"]', { timeout: 10_000 });
  console.log('  logged in');
}

async function nav(page, linkText) {
  await page.click(`.sidebar a:has-text("${linkText}"), nav a:has-text("${linkText}")`);
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

  // Job detail — click first job if one exists
  try {
    await page.click('table tbody tr:first-child, [class*="job-row"]:first-child', { timeout: 3000 });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(600);
    await shot(page, 'job-detail', 'Job detail');
    await page.goBack();
    await page.waitForLoadState('networkidle');
  } catch {
    console.log('  ! job-detail skipped — no jobs exist yet');
  }

  // New job wizard — step 1
  try {
    await page.click('button:has-text("New Job"), a:has-text("New Job")', { timeout: 3000 });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(400);
    await shot(page, 'new-job-wizard', 'New job wizard');
    // dismiss
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
