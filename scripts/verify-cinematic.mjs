import assert from 'node:assert/strict';
import { PNG } from 'pngjs';

const heroSelector = '#wedding';
const widths = [360, 390, 768, 1024, 1440, 1920];

async function verifyRsvpWorks(page) {
  let payload;
  await page.route('**/api/rsvp', async route => {
    payload = route.request().postDataJSON();
    await route.fulfill({ status: 200, json: { success: true } });
  });
  await page.getByRole('link', { name: 'Confirm your attendance' }).click();
  const form = page.getByRole('form', { name: 'RSVP form' });
  await form.getByRole('textbox', { name: 'First Name' }).fill('Jane');
  await form.getByRole('textbox', { name: 'Last Name' }).fill('Guest');
  await form.getByRole('textbox', { name: 'Contact Number' }).fill('+27 82 123 4567');
  await form.getByRole('button', { name: 'Submit RSVP' }).click();
  await form.getByRole('status').waitFor();
  assert.equal(payload.attendance, 'attending');
  assert.equal(payload.firstName, 'Jane');
}

async function assertCanvasArtwork(page) {
  const hero = page.locator(heroSelector);
  const stage = await hero.boundingBox();
  const emblem = await hero.locator('.emblem').boundingBox();
  const capture = PNG.sync.read(await hero.screenshot());
  const centerX = Math.round(emblem.x - stage.x + emblem.width / 2);
  const centerY = Math.round(emblem.y - stage.y + emblem.height / 2);
  let coloredPixels = 0;
  for (let y = centerY - 14; y < centerY + 14; y++) {
    for (let x = centerX - 14; x < centerX + 14; x++) {
      const index = (y * capture.width + x) * 4;
      const rgb = capture.data.subarray(index, index + 3);
      if (Math.max(...rgb) - Math.min(...rgb) > 45) coloredPixels++;
    }
  }
  assert.ok(coloredPixels > 30, 'WebGL paints the emblem after the static image becomes transparent');
}

export async function verifyCinematic(browser, output, url) {
  for (const width of widths) {
    const page = await browser.newPage({ viewport: { width, height: 920 }, hasTouch: width < 650, isMobile: width < 650 });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    try {
      await page.goto(`${url}/#wedding`);
      await page.locator('.has-cinematic-art').waitFor();
      assert.equal(await page.locator('.cinematic-viewport canvas').count(), 1);
      assert.equal(await page.getByRole('button', { name: 'Skip intro' }).count(), 0);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
      assert.equal(await page.getByRole('heading', { level: 1 }).isVisible(), true);
      if (width === 390 || width === 1440) {
        await page.locator('img').evaluateAll(images => Promise.all(images.map(image => {
          image.loading = 'eager';
          return image.decode();
        })));
        await assertCanvasArtwork(page);
        await page.screenshot({ path: `${output}/${width === 390 ? 'mobile' : 'desktop'}.png`, fullPage: true });
      }
      if (width === 390) await verifyRsvpWorks(page);
      if (width === 1440) {
        const firstCard = page.locator('.gifts details').first();
        await firstCard.locator('summary').hover();
        assert.equal(await firstCard.evaluate(card => card.classList.contains('is-lit')), true);
        await firstCard.locator('summary').press('Enter');
        assert.equal(await firstCard.getAttribute('open'), '');
        await page.locator('canvas').evaluate(canvas => {
          canvas.getContext('webgl2').getExtension('WEBGL_lose_context').loseContext();
        });
        await page.locator('.has-cinematic-art').waitFor({ state: 'detached' });
        assert.equal(await page.locator('.emblem').evaluate(image => getComputedStyle(image).opacity), '1');
      }
      assert.deepEqual(errors, []);
      console.log(`WebGL scene and layout passed at ${width}px.`);
    } finally {
      await page.close();
    }
  }

  for (const skip of [true, false]) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 920 } });
    try {
      await page.goto(`${url}/`);
      const button = page.getByRole('button', { name: 'Skip intro' });
      await button.waitFor({ state: 'visible', timeout: 10000 });
      if (skip) {
        await page.keyboard.press('Tab');
        assert.equal(await button.evaluate(element => element === document.activeElement), true);
        await page.keyboard.press('Enter');
      } else {
        await page.waitForFunction(() => Number(getComputedStyle(document.querySelector('.intro-emblem')).opacity) > 0.9);
        await page.locator('.cinematic-intro').screenshot({ path: `${output}/intro.png`, timeout: 2500 });
      }
      await button.waitFor({ state: 'detached', timeout: 6000 });
      assert.equal(await page.evaluate(() => scrollY), 0);
      assert.equal(await page.locator('#couple .given-name').first().evaluate(name => getComputedStyle(name).clipPath), 'none');
    } finally {
      await page.close();
    }
  }

  const fallback = await browser.newPage({ viewport: { width: 390, height: 900 } });
  try {
    await fallback.addInitScript(() => {
      const getContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...args) {
        return type.startsWith('webgl') ? null : getContext.call(this, type, ...args);
      };
    });
    await fallback.goto(`${url}/`, { waitUntil: 'networkidle' });
    assert.equal(await fallback.locator('canvas').count(), 0);
    assert.equal(await fallback.locator('.emblem').evaluate(image => getComputedStyle(image).opacity), '1');
    await verifyRsvpWorks(fallback);
  } finally {
    await fallback.close();
  }
  console.log('Intro completion and keyboard skip, context-loss fallback, and RSVP without WebGL passed.');
}
