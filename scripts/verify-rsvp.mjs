import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';

fs.mkdirSync('verification', { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  for (const width of [1600, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    await page.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const section = page.locator('.rsvp');
    const current = await section.screenshot({ animations: 'disabled' });
    // The original idle form differs only in nonvisual submission attributes.
    await page.locator('#rsvp-form').evaluate(form => form.removeAttribute('aria-busy'));
    await page.locator('.submit-rsvp').evaluate(button => button.removeAttribute('disabled'));
    const originalMarkup = await section.screenshot({ animations: 'disabled' });
    assert.deepEqual(current, originalMarkup);
    fs.writeFileSync(`verification/rsvp-verified-${width}.png`, current);

    let calls = 0;
    let release;
    let mode = 'success';
    let lastKey;
    const payloads = [];
    await page.route('**/api/rsvp', async route => {
      calls++;
      payloads.push(route.request().postDataJSON());
      lastKey = route.request().headers()['idempotency-key'];
      if (mode === 'pending') await new Promise(resolve => { release = resolve; });
      await route.fulfill({ status: mode === 'error' ? 502 : 200, contentType: 'application/json', body: JSON.stringify(mode === 'error' ? { error: 'Failed' } : { success: true }) });
    });
    const first = page.getByRole('textbox', { name: 'FIRST NAME' });
    const last = page.getByRole('textbox', { name: 'LAST NAME' });
    const phone = page.getByRole('textbox', { name: 'PHONE NUMBER' });
    const button = page.locator('.submit-rsvp');
    await button.click();
    assert.equal(calls, 0);
    await first.fill('   '); await last.fill('Doe'); await phone.fill('+27 82 123 4567');
    await button.click(); assert.equal(calls, 0);
    await first.fill(' Jane ');
    mode = 'pending';
    await button.click();
    await page.waitForFunction(() => document.querySelector('.submit-rsvp').disabled);
    assert.equal(await button.textContent(), 'Sending RSVP...');
    await page.locator('#rsvp-form').evaluate(form => { form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
    await page.waitForTimeout(100);
    assert.equal(calls, 1);
    release();
    await page.getByRole('status').waitFor();
    assert.equal(await page.getByRole('status').textContent(), "Thank you, Jane. We can't wait to celebrate with you!");
    assert.equal(await first.inputValue(), '');
    assert.deepEqual(payloads[0], { firstName: 'Jane', lastName: 'Doe', phone: '+27 82 123 4567', attendance: 'attending' });
    await first.fill('Alex'); await last.fill('Guest'); await phone.fill('+27 11');
    await page.getByText('Can’t make it', { exact: true }).click();
    mode = 'error';
    await button.click(); await page.getByRole('alert').waitFor();
    assert.equal(await page.getByRole('alert').textContent(), "We couldn't submit your RSVP. Please try again.");
    assert.equal(await first.inputValue(), 'Alex');
    assert.equal(await last.inputValue(), 'Guest');
    assert.equal(await phone.inputValue(), '+27 11');
    const failedKey = lastKey;
    mode = 'success';
    await button.click(); await page.getByRole('status').waitFor();
    assert.equal(lastKey, failedKey);
    assert.equal(await page.getByRole('status').textContent(), 'Thank you, Alex. Your RSVP has been received.');
    assert.equal(await first.inputValue(), '');
    assert.equal(payloads.at(-1).attendance, 'declined');
    await page.close();
  }
  console.log('Desktop/mobile RSVP checks passed: unchanged idle rendering, validation, loading, duplicate prevention, both success messages, error retention and retry key.');
} finally { await browser.close(); }
