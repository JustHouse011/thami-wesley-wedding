import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { verifyViewports } from './verify-viewport.mjs';
import { verifyRsvp } from './verify-rsvp.mjs';
import { verifyCinematic } from './verify-cinematic.mjs';

const url = process.env.VERIFY_URL ?? 'http://127.0.0.1:5173';
const output = 'verification/cinematic';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', args: ['--enable-unsafe-swiftshader'] });
try {
  await verifyViewports(browser, output, url);
  await verifyRsvp(browser, url);
  await verifyCinematic(browser, output, url);
} finally {
  await browser.close();
}
