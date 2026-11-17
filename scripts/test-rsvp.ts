import assert from 'node:assert/strict';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import handler from '../api/rsvp.ts';

const valid = { firstName: ' Jane ', lastName: ' Doe ', phone: ' +27 82 123 4567 ', attendance: 'attending' };
const jsonHeaders = { 'content-type': 'application/json' };
async function request(body: unknown = valid, method = 'POST', headers: Record<string, string> = jsonHeaders) {
  let code = 0;
  let result: any;
  const response = { setHeader() {}, status(value: number) { code = value; return this; }, json(value: unknown) { result = value; return this; } };
  await handler({ body, method, headers } as VercelRequest, response as unknown as VercelResponse);
  return { code, result };
}

const originalKey = process.env.RESEND_API_KEY;
const originalFrom = process.env.RESEND_FROM_EMAIL;
const originalFetch = globalThis.fetch;
const realNow = Date.now;
const now = () => Date.parse('2026-11-17T08:00:00+02:00');
Date.now = now;
const scheduled: { key: string; email: any }[] = [];
const calls: { key: string; email: { from: string; to: string | string[]; subject: string; text: string; html: string } }[] = [];
const deliveries = new Map<string, string>();
let failure: 'organiser' | 'guest' | 'guest_after_acceptance' | 'reminder' | 'network' | undefined;
const sender = 'configured-sender@example.invalid';
globalThis.fetch = async (url, options) => {
  assert.equal(url, 'https://api.resend.com/emails');
  assert.equal(new Headers(options?.headers).get('authorization') === 'Bearer test-only-placeholder', true);
  const key = new Headers(options?.headers).get('idempotency-key');
  assert.ok(key);
  const email = JSON.parse(options?.body as string);
  if (email.scheduled_at) scheduled.push({ key, email });
  else calls.push({ key, email });
  const organiser = email.to === 'info@thamidish.com';
  if (failure === 'reminder' && email.scheduled_at?.startsWith('2026-11-26')) {
    return new Response('{}', { status: 503 });
  }
  if (failure === 'network') throw new Error('Mock network failure');
  if ((failure === 'organiser' && organiser) || (failure === 'guest' && !organiser)) {
    return new Response(JSON.stringify({ message: 'Mock rejection with private data' }), { status: 422 });
  }
  const previous = deliveries.get(key);
  if (previous) assert.equal(previous, options?.body);
  else deliveries.set(key, options?.body as string);
  if (failure === 'guest_after_acceptance' && !organiser) throw new Error('Mock lost response after acceptance');
  return new Response(JSON.stringify({ id: key }), { status: 200 });
};

try {
  delete process.env.RESEND_API_KEY;
  delete process.env.RESEND_FROM_EMAIL;
  assert.equal((await request()).code, 503);
  process.env.RESEND_API_KEY = 'test-only-placeholder';
  process.env.RESEND_FROM_EMAIL = sender;
  assert.equal((await request(valid, 'GET')).code, 405);
  assert.equal((await request(valid, 'POST', { 'content-type': 'text/plain' })).code, 415);
  for (const body of [
    null, [], '{', {}, { ...valid, firstName: ' ' }, { ...valid, lastName: 2 },
    { ...valid, phone: '' }, { ...valid, attendance: 'yes' }, { ...valid, firstName: 'a\nB' },
    { ...valid, email: 4 }, { ...valid, email: 'invalid-email' }, { ...valid, email: 'guest@example' },
    { ...valid, email: 'guest@example.com,other@example.com' }, { ...valid, guestCount: '2' },
    { ...valid, guestCount: 0 }, { ...valid, guestCount: 2.5 }, { ...valid, guestCount: 21 },
    { ...valid, attendance: 'declined', guestCount: 1 }, { ...valid, notes: 'a'.repeat(2001) },
    { confirmationRetryToken: '<invalid>' },
  ]) assert.equal((await request(body)).code, 400);
  assert.equal(calls.length, 0);

  assert.deepEqual(await request(), { code: 200, result: { success: true, confirmation: 'not_requested' } });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].email.to, 'info@thamidish.com');
  assert.doesNotMatch(calls[0].email.text, /Guest count/);

  const expanded = { ...valid, firstName: ' <Jane & "friend"> ', email: 'jane@example.com', guestCount: 2, notes: 'No nuts.\r\n<please>' };
  const headers = { ...jsonHeaders, 'idempotency-key': 'test-attempt' };
  assert.deepEqual(await request(expanded, 'POST', headers), { code: 200, result: { success: true, confirmation: 'accepted' } });
  assert.equal(calls.length, 3);
  assert.deepEqual(scheduled.map(call => call.email.scheduled_at), ['2026-11-20T09:00:00+02:00', '2026-11-26T09:00:00+02:00']);
  for (const call of scheduled) {
    assert.deepEqual(call.email.to, ['jane@example.com']);
    assert.match(call.email.text, /27 November/);
    assert.match(call.email.text, /Barbara Ledwaba/);
    assert.doesNotMatch(call.email.text, /guest count/i);
    assert.ok(call.key.startsWith('rsvp-reminder-'));
  }
  const [organiser, guest] = calls.slice(1);
  assert.notEqual(organiser.key, guest.key);
  assert.equal(organiser.email.to, 'info@thamidish.com');
  assert.match(organiser.email.subject, /^Wedding RSVP — /);
  assert.match(organiser.email.html, /&lt;Jane &amp; &quot;friend&quot;&gt;/);
  assert.match(organiser.email.html, /No nuts\.<br>&lt;please&gt;/);
  assert.match(organiser.email.text, /Email:\njane@example.com/);
  assert.doesNotMatch(organiser.email.text, /Guest count/);
  assert.match(organiser.email.text, /22913 Selalelo Street\nExt 4, Mamelodi East\nPretoria/);
  assert.deepEqual(guest.email.to, ['jane@example.com']);
  assert.equal(guest.email.from, sender);
  assert.equal(guest.email.subject, "You're Invited — Thami & Wesley's Wedding RSVP Confirmed");
  assert.match(guest.email.html, /Dear &lt;Jane &amp; &quot;friend&quot;&gt;,/);
  assert.doesNotMatch(guest.email.html, /<Jane|No nuts|<please>/);
  assert.match(guest.email.text, /Thank you for confirming your attendance!/);
  assert.match(guest.email.text, /Friday, 27 November 2026\n14:00 — Until the music stops\n22913 Selalelo Street, Ext 4, Mamelodi East, Pretoria\nDress Code: Casually Traditional/);
  assert.match(guest.email.text, /With love,\nThami & Wesley$/);

  const beforeDuplicate = deliveries.size;
  await Promise.all([request(expanded), request(expanded, 'POST', { ...headers, 'idempotency-key': 'fresh-attempt' })]);
  assert.deepEqual(calls.slice(-4).map(call => call.key).sort(), [organiser.key, organiser.key, guest.key, guest.key].sort());
  assert.equal(deliveries.size, beforeDuplicate);

  const scheduledBeforeDecline = scheduled.length;
  assert.equal((await request({ ...expanded, attendance: 'declined', guestCount: 0 })).code, 200);
  assert.equal(scheduled.length, scheduledBeforeDecline);
  assert.match(calls.at(-2)!.email.text, /Unable to Attend/);
  assert.doesNotMatch(calls.at(-2)!.email.text, /Guest count/);
  assert.equal(calls.at(-1)!.email.subject, 'Thank You for Responding — Thami & Wesley');
  assert.match(calls.at(-1)!.email.text, /appreciate your love and support/);
  assert.doesNotMatch(calls.at(-1)!.email.text, /confirming your attendance|confirmed guest count/i);

  failure = 'organiser';
  let before = calls.length;
  assert.deepEqual(await request(expanded), { code: 502, result: { error: 'Unable to deliver RSVP' } });
  assert.equal(calls.length, before + 1);
  failure = 'network';
  assert.equal((await request(expanded)).code, 502);

  const partial = { ...expanded, email: 'retry@example.com' };
  failure = 'guest';
  const initial = await request(partial);
  assert.equal(initial.code, 200);
  assert.equal(initial.result.success, true);
  assert.equal(initial.result.confirmation, 'retryable');
  const token: string = initial.result.confirmationRetryToken;
  assert.ok(token);
  assert.doesNotMatch(Buffer.from(token, 'base64url').toString(), /retry@example\.com|Jane/);
  const retry = { confirmationRetryToken: token };
  const guestRetryKey = calls.at(-1)!.key;
  before = calls.length;
  assert.equal((await request({ confirmationRetryToken: `${token[0] === 'a' ? 'b' : 'a'}${token.slice(1)}` })).code, 400);
  Date.now = () => now() + 61 * 60 * 1000;
  assert.equal((await request(retry)).code, 400);
  Date.now = now;
  assert.equal(calls.length, before);
  assert.deepEqual(await request(retry), { code: 502, result: { success: true, confirmation: 'retryable' } });
  failure = 'guest_after_acceptance';
  assert.equal((await request(retry)).code, 502);
  failure = undefined;
  const beforeRetry = deliveries.size;
  assert.deepEqual(await request({ ...retry, email: 'untrusted@example.com' }), { code: 200, result: { success: true, confirmation: 'accepted' } });
  assert.equal(deliveries.size, beforeRetry + 2);
  assert.equal(calls.length, before + 3);
  assert.ok(calls.slice(before).every(call => call.key === guestRetryKey));
  for (const call of calls.slice(before)) assert.deepEqual(call.email.to, ['retry@example.com']);
  failure = 'reminder';
  const reminderFailure = await request({ ...expanded, email: 'schedule-retry@example.com' });
  assert.equal(reminderFailure.result.confirmation, 'retryable');
  const organiserCalls = calls.filter(call => call.email.to === 'info@thamidish.com').length;
  const acceptedBeforeRetry = deliveries.size;
  failure = undefined;
  assert.equal((await request({ confirmationRetryToken: reminderFailure.result.confirmationRetryToken })).result.confirmation, 'accepted');
  assert.equal(deliveries.size, acceptedBeforeRetry + 1);
  assert.equal(calls.filter(call => call.email.to === 'info@thamidish.com').length, organiserCalls);

  const scheduledBeforeLate = scheduled.length;
  Date.now = () => Date.parse('2026-11-21T10:00:00+02:00');
  await request({ ...expanded, email: 'late@example.com' });
  assert.equal(scheduled.length, scheduledBeforeLate + 1);
  assert.equal(scheduled.at(-1)!.email.scheduled_at, '2026-11-26T09:00:00+02:00');
  Date.now = () => Date.parse('2026-11-27T10:00:00+02:00');
  await request({ ...expanded, email: 'last-minute@example.com' });
  assert.equal(scheduled.length, scheduledBeforeLate + 1);
} finally {
  globalThis.fetch = originalFetch;
  Date.now = realNow;
  if (originalKey === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = originalKey;
  if (originalFrom === undefined) delete process.env.RESEND_FROM_EMAIL; else process.env.RESEND_FROM_EMAIL = originalFrom;
}
console.log('RSVP API validation, separate emails, idempotency, and confirmation-only retries passed (mock delivery).');
