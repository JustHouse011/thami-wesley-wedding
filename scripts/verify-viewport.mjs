import assert from 'node:assert/strict';

export async function verifyViewports(browser, output) {
  for (const width of [360, 390, 768, 1024, 1440, 1920]) {
    const page = await browser.newPage({
      viewport: { width, height: 1000 },
      reducedMotion: 'reduce',
      permissions: ['clipboard-read', 'clipboard-write'],
    });
    try {
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('response', response => { if (response.status() >= 400) errors.push(response.url()); });
      await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      await page.locator('img').evaluateAll(images => Promise.all(images.map(image => image.decode())));

      assert.equal(await page.title(), 'Thami & Wesley — 27 November 2026');
      assert.match(await page.locator('h1').innerText(), /Thami\s+Kotlolo\s+&\s+Wesley\s+Willis/);
      assert.match(await page.locator('address').innerText(), /22913 Selalelo Street\s+Ext 4, Mamelodi East\s+Pretoria/i);
      assert.deepEqual(await page.evaluate(() => ({
        width: document.documentElement.scrollWidth,
        sectionsInBounds: [...document.querySelectorAll('main > section')].every(section => {
          const bounds = section.getBoundingClientRect();
          return bounds.left >= 0 && bounds.right <= innerWidth;
        }),
      })), { width, sectionsInBounds: true });
      assert.equal(await page.getByRole('form', { name: 'RSVP form' }).count(), 1);

      if (width === 390 || width === 1440) {
        if (process.env.AXE_SCRIPT) {
          await page.addScriptTag({ path: process.env.AXE_SCRIPT });
          const violations = await page.evaluate(async () => {
            const result = await window.axe.run({ runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] });
            return result.violations.map(({ id, nodes }) => ({ id, targets: nodes.map(node => node.target) }));
          });
          assert.deepEqual(violations, []);
        }
        await page.screenshot({ path: `${output}/${width === 390 ? 'mobile' : 'desktop'}.png`, fullPage: true });
        await page.locator('#wedding').screenshot({ path: `${output}/invitation-${width}.png` });
        await page.locator('#rsvp').screenshot({ path: `${output}/rsvp-${width}.png` });
      }

      await page.getByRole('link', { name: 'Confirm your attendance' }).press('Enter');
      assert.equal(new URL(page.url()).hash, '#rsvp');
      await page.getByRole('navigation', { name: 'Invitation links' }).getByRole('link', { name: 'The Art of Gay-ving' }).press('Enter');
      assert.equal(new URL(page.url()).hash, '#gift-registry');
      const cards = page.locator('.gifts details');
      assert.equal(await cards.count(), 11);
      for (const card of await cards.all()) {
        const summary = card.locator('summary');
        await summary.press('Enter');
        assert.equal(await card.getAttribute('open'), '');
        const description = card.locator('.gift-description');
        await description.waitFor({ state: 'visible' });
        assert.ok((await description.textContent()).trim().length > 100);
        await summary.press('Space');
        assert.equal(await card.getAttribute('open'), null);
      }
      for (const button of await page.locator('.treasury button').all()) {
        const expected = await button.locator('..').locator('span').innerText();
        await button.click();
        assert.equal(await page.evaluate(() => navigator.clipboard.readText()), expected);
        assert.match(await page.locator('.copy-status').innerText(), /copied\.$/);
      }
      assert.deepEqual(errors, []);
      console.log(`Layout, navigation, accordions and clipboard passed at ${width}px.`);
    } finally {
      await page.close();
    }
  }
}
