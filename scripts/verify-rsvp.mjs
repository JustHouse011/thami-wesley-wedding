import assert from 'node:assert/strict';

export async function verifyRsvp(browser, url) {
  for (const width of [390, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
    try {
      let mode = 'hold';
      let release;
      const submissions = [];
      await page.route('**/api/rsvp', async route => {
        const payload = route.request().postDataJSON();
        submissions.push(payload);
        if (mode === 'hold') await new Promise(resolve => { release = resolve; });
        const success = mode !== 'error';
        const confirmation = payload.email || payload.confirmationRetryToken ? 'accepted' : 'not_requested';
        const result = mode === 'partial'
          ? { success: true, confirmation: 'retryable', confirmationRetryToken: 'mock-retry-token' }
          : mode === 'retry-error' ? { success: true, confirmation: 'retryable' } : { success, confirmation };
        await route.fulfill({ status: success && mode !== 'retry-error' ? 200 : 502, json: result });
      });
      await page.goto(`${url}/`);
      const form = page.getByRole('form', { name: 'RSVP form' });
      const first = form.getByRole('textbox', { name: 'First Name' });
      const last = form.getByRole('textbox', { name: 'Last Name' });
      const phone = form.getByRole('textbox', { name: 'Contact Number' });
      const email = form.getByRole('textbox', { name: 'Email Address (for RSVP confirmation)', exact: true });
      assert.match(await email.getAttribute('aria-describedby'), /rsvp-email-help/);
      const notes = form.getByRole('textbox', { name: 'Special Notes (optional)', exact: true });
      const guests = form.getByRole('combobox', { name: 'Number of Guests, Including Yourself' });
      const submit = form.getByRole('button', { name: 'Submit RSVP' });
      await submit.click();
      assert.equal(submissions.length, 0);
      await first.fill('   ');
      await last.fill(' Doe ');
      await phone.fill('+27 82 123 4567');
      await submit.click();
      assert.equal(await first.evaluate(input => input.validity.customError), true);
      assert.equal(submissions.length, 0);
      await first.fill(' Jane ');
      await email.fill('invalid');
      await submit.click();
      assert.equal(await email.evaluate(input => input.validity.typeMismatch), true);
      await email.fill('jane@example');
      await submit.click();
      assert.equal(await email.evaluate(input => input.validity.customError), true);
      assert.equal(submissions.length, 0);
      await email.fill('jane@example.com');
      await notes.fill('No nuts');
      await guests.selectOption('3');

      const request = page.waitForRequest('**/api/rsvp');
      await submit.click();
      await request;
      await form.getByRole('button', { name: 'Sending RSVP…' }).waitFor();
      assert.equal(await first.isDisabled(), true);
      await form.dispatchEvent('submit', { bubbles: true, cancelable: true });
      assert.equal(submissions.length, 1);
      assert.ok(release);
      release();
      await form.getByRole('status').waitFor();
      assert.match(await form.getByRole('status').innerText(), /Thank you, Jane.*queued for sending/);
      assert.equal(await first.inputValue(), '');
      assert.equal(await guests.inputValue(), '1');
      assert.deepEqual(submissions[0], {
        email: 'jane@example.com', notes: 'No nuts', guestCount: 3,
        firstName: 'Jane', lastName: 'Doe', phone: '+27 82 123 4567', attendance: 'attending',
      });

      await first.fill('Alex');
      await last.fill('Guest');
      await phone.fill('+27 82 123 4567');
      await notes.fill('Thanks for inviting me');
      await form.getByRole('radio', { name: 'Unfortunately, I Can’t Make It' }).check();
      assert.equal(await guests.count(), 0);
      mode = 'error';
      await submit.click();
      await form.getByRole('alert').waitFor();
      assert.equal(await first.inputValue(), 'Alex');
      assert.equal(await notes.inputValue(), 'Thanks for inviting me');
      assert.equal(submissions[1].attendance, 'declined');
      assert.equal('guestCount' in submissions[1], false);
      mode = 'success';
      await form.getByRole('button', { name: 'Retry RSVP' }).click();
      await form.getByRole('status').waitFor();
      assert.match(await form.getByRole('status').innerText(), /Thank you, Alex/);
      assert.deepEqual(submissions[2], submissions[1]);

      await first.fill('Sam');
      await last.fill('Guest');
      await phone.fill('+27 82 123 4567');
      await email.fill('sam@example.com');
      mode = 'partial';
      await submit.click();
      const retry = form.getByRole('button', { name: 'Retry confirmation email' });
      await retry.waitFor();
      assert.match(await form.getByRole('status').innerText(), /RSVP is saved.*couldn’t queue/);
      assert.equal(await first.inputValue(), '');
      await page.reload();
      await retry.waitFor();
      assert.match(await form.getByRole('status').innerText(), /RSVP is saved.*couldn’t queue/);
      mode = 'retry-error';
      await retry.click();
      await form.getByText(/Please try again/).waitFor();
      mode = 'success';
      await retry.click();
      await retry.waitFor({ state: 'detached' });
      assert.match(await form.getByRole('status').innerText(), /queued for sending/);
      assert.deepEqual(submissions.slice(4), Array(2).fill({ confirmationRetryToken: 'mock-retry-token' }));
      console.log(`RSVP validation, duplicate prevention, decline and confirmation-only retry passed at ${width}px (mock delivery).`);
    } finally {
      await page.close();
    }
  }
}
