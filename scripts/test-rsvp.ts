import assert from 'node:assert/strict';
import handler from '../api/rsvp.ts';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const valid = { firstName: ' Jane ', lastName: ' Doe ', phone: ' +27 82 123 4567 ', attendance: 'attending' };
async function request(body: unknown = valid, method = 'POST', headers = { 'content-type': 'application/json' }) {
  let code = 0;
  let result: any;
  const response = { setHeader() {}, status(value: number) { code = value; return this; }, json(value: unknown) { result = value; return this; } };
  await handler({ body, method, headers } as VercelRequest, response as unknown as VercelResponse);
  return { code, result };
}
assert.equal((await request(valid, 'GET')).code, 405);
assert.equal((await request(valid, 'POST', { 'content-type': 'text/plain' })).code, 415);
for (const body of [null, [], '{', {}, { ...valid, firstName: ' ' }, { ...valid, lastName: 2 }, { ...valid, phone: '' }, { ...valid, attendance: 'yes' }, { ...valid, firstName: 'a\nB' }]) {
  assert.equal((await request(body)).code, 400);
}
const originalKey = process.env.RESEND_API_KEY;
const originalFrom = process.env.RESEND_FROM_EMAIL;
try {
  delete process.env.RESEND_API_KEY;
  delete process.env.RESEND_FROM_EMAIL;
  assert.equal((await request()).code, 503);
  process.env.RESEND_API_KEY = 'test-only-placeholder';
  process.env.RESEND_FROM_EMAIL = 'configured-sender@example.invalid';
  const originalFetch = globalThis.fetch;
  let email: any;
  let providerKey: string | null = null;
  globalThis.fetch = async (_url, options) => {
    email = JSON.parse(options!.body as string);
    providerKey = new Headers(options!.headers).get('idempotency-key');
    return new Response(JSON.stringify({ id: 'mock-email' }), { status: 200 });
  };
  try {
    assert.equal((await request({ ...valid, firstName: ' <Jane & "friend"> ' })).code, 200);
    assert.equal(Array.isArray(email.to) ? email.to[0] : email.to, 'info@thamidish.com');
    assert.match(email.subject, /^Wedding RSVP — /);
    assert.match(email.html, /&lt;Jane &amp; &quot;friend&quot;&gt;/);
    assert.match(email.text, /28 November 2028/);
    assert.ok(providerKey);
    assert.equal((await request({ ...valid, attendance: 'declined' })).code, 200);
    assert.match(email.text, /Unable to Attend/);
    globalThis.fetch = async () => new Response(JSON.stringify({ message: 'mock failure', name: 'validation_error' }), { status: 422 });
    assert.equal((await request()).code, 502);
    globalThis.fetch = async () => { throw new Error('Network failure'); };
    assert.equal((await request()).code, 502);
  } finally { globalThis.fetch = originalFetch; }
} finally {
  if (originalKey === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = originalKey;
  if (originalFrom === undefined) delete process.env.RESEND_FROM_EMAIL; else process.env.RESEND_FROM_EMAIL = originalFrom;
}
console.log('RSVP API validation, email escaping, success and failure checks passed (mock delivery).');
