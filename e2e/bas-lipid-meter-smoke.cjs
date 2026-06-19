#!/usr/bin/env node
/**
 * SCRUM-14 — Customer BAS Lipid Meter product: end-to-end smoke test.
 *
 * Drives the real customer journey against a running deployment and proves the
 * whole pipeline is wired:
 *   account login  ->  Personalize (enter Lipid Meter readings)  ->  AI parse
 *   ->  submit  ->  bang-api indices generation  ->  Biological Age Score (BAS)
 *   shown back to the customer in Recent Activity.
 *
 * It is a *verification* harness only — it adds no application code and mutates
 * nothing but the test user's own measurement data on the target environment.
 * The clinical indices / Truth-Engine math is intentionally NOT touched here.
 *
 * Usage (staging):
 *   E2E_BASE=https://app.dev.meterbolic.com \
 *   E2E_EMAIL=<staging test user> E2E_PASS=<password> \
 *   PW_CHROMIUM=/home/ubuntu/.cache/ms-playwright/chromium-1140/chrome-linux/chrome \
 *   PW_MODULE=/abs/path/to/node_modules/playwright \
 *   node e2e/bas-lipid-meter-smoke.cjs
 *
 * The test user must already exist and be CONFIRMED in the env's Cognito pool.
 * No secrets are committed: all credentials come from the environment.
 * Exit code 0 = a numeric BAS was computed and surfaced; non-zero = failure.
 */

const BASE = process.env.E2E_BASE || 'https://app.dev.meterbolic.com';
const EMAIL = process.env.E2E_EMAIL;
const PASS = process.env.E2E_PASS;
const PW_MODULE = process.env.PW_MODULE || 'playwright';
const PW_CHROMIUM = process.env.PW_CHROMIUM || undefined; // let Playwright resolve if unset
const SHOTS = process.env.E2E_SHOTS || '/tmp/bas-e2e';

if (!EMAIL || !PASS) {
  console.error('Set E2E_EMAIL and E2E_PASS (a confirmed Cognito test user).');
  process.exit(2);
}

const { chromium } = require(PW_MODULE);
const fs = require('node:fs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: PW_CHROMIUM });
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 1100 } })).newPage();

  try {
    // 1. Customer sign-in (in-app Cognito auth — "client account creation" path).
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
    await page.fill('input[type=email]', EMAIL);
    await page.fill('input[type=password]', PASS);
    await Promise.all([
      page.waitForNavigation({ url: (u) => !u.toString().includes('/login'), timeout: 30000 }).catch(() => {}),
      page.click('button[type=submit]'),
    ]);
    await sleep(2500);

    // 2. Reach the assistant (skip onboarding gate for the smoke run) and send a
    //    first message so the backend auto-provisions the Meterbolic user.
    await page.evaluate(() => localStorage.setItem('meo_onboarding_v1', '1'));
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    await sleep(4000);
    // A returning user opens straight into a conversation (textarea composer);
    // a fresh user sees the welcome composer (input). "New chat" gives us a
    // deterministic composer, then we match either element type.
    await page.getByText('New chat', { exact: false }).first().click().catch(() => {});
    await sleep(1500);
    const ask = page.locator('input[type=text], textarea').last();
    await ask.waitFor({ timeout: 20000 });
    await ask.click();
    await ask.fill('Hello, I am ready to start my Biological Age Score.');
    await ask.press('Enter');
    await sleep(15000); // allow provisioning + first response

    // 3. Personalize: enter a full Lipid Meter panel and let the AI structure it.
    await page.goto(`${BASE}/personalize`, { waitUntil: 'networkidle' });
    await sleep(2000);
    await page.getByText('Use example', { exact: false }).first().click();
    await sleep(800);
    await page.getByText('Parse with AI', { exact: false }).first().click();

    // 4. Submit the parsed measurements.
    let submitted = false;
    for (let i = 0; i < 30; i++) {
      await sleep(2000);
      const btn = page.getByText(/Submit \d+ measurement/i).first();
      if ((await btn.count()) > 0 && (await btn.isVisible().catch(() => false))) {
        await btn.click();
        submitted = true;
        break;
      }
    }
    if (!submitted) throw new Error('Parse/review never produced a Submit button');
    for (let i = 0; i < 12; i++) {
      await sleep(1500);
      if ((await page.getByText(/Successfully submitted/i).count()) > 0) break;
    }

    // 5. Indices generation runs server-side; give it time, then read it back.
    await sleep(12000);
    await page.goto(`${BASE}/activity`, { waitUntil: 'networkidle' });
    await sleep(5000);
    await page.screenshot({ path: `${SHOTS}/bas-activity.png`, fullPage: true });

    // 6. Assert a numeric Biological Age Score (BAS) is now shown to the customer.
    const basRow = page.locator('text=/^BAS$/').first();
    if ((await basRow.count()) === 0) throw new Error('No BAS row in Recent Activity — indices did not surface');
    const bodyText = await page.locator('body').innerText();
    if (!/\bBAS\b[\s\S]{0,80}?\d{1,3}(\.\d+)?/.test(bodyText)) throw new Error('BAS present but no numeric value found');

    console.log('PASS: BAS Lipid Meter E2E — account -> lipid entry -> parse -> submit -> indices -> BAS shown.');
    await browser.close();
    process.exit(0);
  } catch (e) {
    await page.screenshot({ path: `${SHOTS}/bas-failure.png`, fullPage: true }).catch(() => {});
    console.error('FAIL:', e.message);
    await browser.close();
    process.exit(1);
  }
})();
