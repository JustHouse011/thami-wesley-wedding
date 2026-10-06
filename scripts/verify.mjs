import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import fs from 'node:fs';
import assert from 'node:assert/strict';

fs.mkdirSync('verification', { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
// Freeze only the verification browser to match Figma's 66:20:00:01 display.
const wedding = Date.parse('2026-11-30T00:00:00+02:00');
await page.clock.install({ time: wedding - (66 * 86400 + 20 * 3600 + 61) * 1000 });
await page.clock.pauseAt(wedding - (66 * 86400 + 20 * 3600 + 1) * 1000);
await page.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
assert.equal(await page.evaluate(() => ['126px "Fraunces Variable"', '21px "Abhaya Libre"', '26px Aboreto', '98px "Share Tech"', '18px Inter', '14px Roboto'].every(font => document.fonts.check(font))), true);
await page.locator('img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
assert.equal(await page.locator('.desktop-page').evaluate(el => el.scrollHeight), 6652);
assert.deepEqual(await page.locator('.countdown-number').allTextContents(), ['66', '20', '00', '01']);
await page.screenshot({ path: 'verification/desktop.png', fullPage: true });

const reference = PNG.sync.read(fs.readFileSync('design-reference/desktop.png'));
const actual = PNG.sync.read(fs.readFileSync('verification/desktop.png'));
const sections = [['hero', 0, 952], ['invitation', 953, 535], ['portraits', 1488, 1714], ['save-date', 3202, 562], ['polaroids', 3761, 952], ['rsvp-intro', 4713, 527], ['rsvp', 5240, 967], ['footer', 6207, 325]];
const metrics = [];
for (const [name, y, height] of sections) {
  const comparison = new PNG({ width: 1600, height });
  // Reference left; local render right, each shown at half scale.
  const paired = new PNG({ width: 1600, height: Math.ceil(height / 2) });
  let total = 0;
  let changed = 0;
  for (let row = 0; row < height; row++) {
    for (let x = 0; x < 1600; x++) {
      const offset = ((y + row) * 1600 + x) * 4;
      const out = (row * 1600 + x) * 4;
      let delta = 0;
      for (let c = 0; c < 3; c++) {
        const d = Math.abs(reference.data[offset + c] - actual.data[offset + c]);
        delta += d;
        comparison.data[out + c] = d;
      }
      comparison.data[out + 3] = 255;
      total += delta;
      if (delta > 45) changed++;
      if (row % 2 === 0 && x % 2 === 0) {
        const left = ((row / 2) * 1600 + x / 2) * 4;
        reference.data.copy(paired.data, left, offset, offset + 4);
        actual.data.copy(paired.data, left + 800 * 4, offset, offset + 4);
      }
    }
  }
  fs.writeFileSync(`verification/${name}-comparison.png`, PNG.sync.write(paired));
  fs.writeFileSync(`verification/${name}-diff.png`, PNG.sync.write(comparison));
  metrics.push({ section: name, meanChannelDifference: +(total / (1600 * height * 3)).toFixed(3), pixelsOverThresholdPercent: +(100 * changed / (1600 * height)).toFixed(2) });
}
await page.clock.runFor(2000);
assert.deepEqual(await page.locator('.countdown-number').allTextContents(), ['66', '19', '59', '59']);
await page.getByRole('textbox', { name: 'FIRST NAME' }).fill('Visual');
await page.getByRole('textbox', { name: 'LAST NAME' }).fill('Check');
await page.getByRole('textbox', { name: 'PHONE NUMBER' }).fill('+27 82 123 4567');
await page.getByText('Can’t make it', { exact: true }).click();
assert.equal(await page.locator('input[value=no]').isChecked(), true);
await page.route('**/api/rsvp', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) }));
await page.getByRole('button', { name: 'Submit RSVP' }).click();
await page.getByRole('status').waitFor();
assert.equal(await page.getByRole('status').textContent(), 'Thank you, Visual. Your RSVP has been received.');
await page.clock.setSystemTime(wedding + 10000);
await page.clock.runFor(1000);
assert.deepEqual(await page.locator('.countdown-number').allTextContents(), ['00', '00', '00', '00']);
assert.deepEqual(errors, []);
fs.writeFileSync('verification/results.json', JSON.stringify({ viewport: '1600 × 1000', page: '1600 × 6652', errors, metrics, checks: ['All images decoded', 'All fonts loaded', 'Countdown matches frozen time', 'Countdown ticks across minute boundary', 'Countdown clamps at zero', 'RSVP fields editable', 'Attendance choice selectable', 'RSVP success with mocked API'] }, null, 2));
console.log(JSON.stringify({ errors, metrics }, null, 2));
await browser.close();
