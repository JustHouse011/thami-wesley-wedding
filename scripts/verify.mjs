import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { verifyViewports } from './verify-viewport.mjs';
import { verifyRsvp } from './verify-rsvp.mjs';

const output = 'verification/redesign';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
try {
  await verifyViewports(browser, output);
  await verifyRsvp(browser);
} finally {
  await browser.close();
}
