import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import fs from 'node:fs';
import assert from 'node:assert/strict';

const browser = await chromium.launch({ channel: 'chrome' });
const errors = [];
const results = [];
for (const width of [1280, 1440, 1600, 1920, 2560]) {
  const page = await browser.newPage({ viewport: { width, height: 1000 }, deviceScaleFactor: 1 });
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  const instant = Date.parse('2026-11-30T00:00:00+02:00') - (66 * 86400 + 20 * 3600 + 1) * 1000;
  await page.clock.install({ time: instant });
  await page.clock.pauseAt(instant);
  await page.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.locator('img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
  const dimensions = await page.evaluate(() => {
    const rect = selector => {
      const { x, width, bottom } = document.querySelector(selector).getBoundingClientRect();
      return { x, width, bottom };
    };
    return {
      viewport: innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight,
      sections: [...document.querySelectorAll('main > section')].map(el => ({ name: el.className, x: el.getBoundingClientRect().x, width: el.getBoundingClientRect().width })),
      root: rect('#root'), main: rect('main'), footer: rect('.pattern-footer'),
      title: rect('h1'), countdown: rect('.countdown'), form: rect('.rsvp-content'),
      fontSize: getComputedStyle(document.querySelector('h1')).fontSize,
      heroFit: getComputedStyle(document.querySelector('.hero-photo')).objectFit,
    };
  });
  assert.equal(dimensions.scrollWidth, width);
  assert.equal(dimensions.scrollHeight, 6532);
  for (const box of [dimensions.root, dimensions.main, dimensions.footer, ...dimensions.sections]) {
    assert.equal(box.x, 0);
    assert.equal(box.width, width);
  }
  assert.equal(dimensions.footer.bottom, 6532);
  assert.equal(dimensions.fontSize, '126px');
  assert.equal(dimensions.heroFit, 'cover');
  assert.equal(dimensions.countdown.width, 530);
  assert.ok(dimensions.title.x >= 0 && dimensions.title.x + dimensions.title.width <= width);
  assert.ok(dimensions.form.x >= 0 && dimensions.form.x + dimensions.form.width <= width);
  await page.screenshot({ path: `verification/viewport-${width}.png`, fullPage: true });
  if (width === 1600) {
    const before = PNG.sync.read(fs.readFileSync('verification/approved-desktop.png'));
    const after = PNG.sync.read(fs.readFileSync('verification/viewport-1600.png'));
    let difference = 0;
    for (let i = 0; i < after.data.length; i += 4) {
      for (let c = 0; c < 3; c++) difference += Math.abs(before.data[i + c] - after.data[i + c]);
    }
    dimensions.approvedMeanChannelDifference = difference / (after.width * after.height * 3);
    assert.ok(dimensions.approvedMeanChannelDifference < 1, 'Approved desktop composition changed unexpectedly');
  }
  results.push(dimensions);
  await page.close();
}
assert.deepEqual(errors, []);
fs.writeFileSync('verification/viewport-results.json', JSON.stringify({ results, errors }, null, 2));
console.log(JSON.stringify(results.map(({ viewport, scrollWidth, approvedMeanChannelDifference }) => ({ viewport, scrollWidth, approvedMeanChannelDifference })), null, 2));
await browser.close();
