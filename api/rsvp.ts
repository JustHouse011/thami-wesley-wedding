import { createHash } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { confirmationEmail, createConfirmationRetry, escapeHtml, readConfirmationRetry, type GuestConfirmation } from '../server/rsvp-confirmation.js';
import { isRsvpEmail } from '../src/rsvp-email.js';
import { DRESS_CODE, MAX_GUESTS, WEDDING_ADDRESS, WEDDING_DATE_LABEL, WEDDING_TIME } from '../src/wedding.js';

type Email = Omit<ReturnType<typeof confirmationEmail>, 'to'> & { to: string | string[]; scheduled_at?: string };

async function sendEmail(apiKey: string, from: string, email: Email, idempotencyKey: string) {
  try {
    // Provider errors can include recipient details. Keep them out of application logs and responses.
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify({ from, ...email }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return false;
    const result = await response.json();
    return typeof result?.id === 'string' && result.id.length > 0;
  } catch {
    return false;
  }
}

async function sendConfirmation(apiKey: string, from: string, guest: GuestConfirmation) {
  if (!await sendEmail(apiKey, from, confirmationEmail(guest), `rsvp-guest-v2-${guest.digest}`)) return false;
  if (!guest.attending) return true;
  // Resend stores these scheduled messages. Skip dates that have already passed.
  const reminders = ['2026-11-20T09:00:00+02:00', '2026-11-26T09:00:00+02:00'];
  for (const scheduled_at of reminders) {
    if (Date.parse(scheduled_at) <= Date.now()) continue;
    const email = { ...confirmationEmail(guest, true), scheduled_at };
    const accepted = await sendEmail(apiKey, from, email, `rsvp-reminder-${guest.digest}-${scheduled_at.slice(0, 10)}`);
    if (!accepted) return false;
  }
  return true;
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  response.setHeader('Cache-Control', 'no-store');
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'Method not allowed' });
  }
  const contentType = request.headers['content-type'];
  if (typeof contentType !== 'string' || contentType.split(';')[0].trim().toLowerCase() !== 'application/json') {
    return response.status(415).json({ error: 'Expected application/json' });
  }
  let body: unknown = request.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { return response.status(400).json({ error: 'Invalid JSON' }); }
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return response.status(400).json({ error: 'Invalid request' });
  }
  const values = body as Record<string, unknown>;
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  if ('confirmationRetryToken' in values) {
    if (!apiKey || !from) return response.status(503).json({ error: 'Confirmation service is unavailable' });
    const guest = readConfirmationRetry(values.confirmationRetryToken, apiKey);
    if (!guest) return response.status(400).json({ error: 'Invalid or expired confirmation retry' });
    const accepted = await sendConfirmation(apiKey, from, guest);
    return response.status(accepted ? 200 : 502).json({
      success: true, confirmation: accepted ? 'accepted' : 'retryable',
    });
  }
  const trimmed = (key: string) => typeof values[key] === 'string' ? values[key].trim() : '';
  const firstName = trimmed('firstName');
  const lastName = trimmed('lastName');
  const phone = trimmed('phone');
  const attendance = trimmed('attendance');
  const email = trimmed('email');
  const notes = trimmed('notes').replace(/\r\n?/g, '\n');
  const guestCount = values.guestCount ?? (attendance === 'attending' ? 1 : 0);
  if (!firstName || !lastName || !phone || !['attending', 'declined'].includes(attendance)
    || firstName.length > 100 || lastName.length > 100 || phone.length > 64
    || [firstName, lastName, phone].some(value => /[\u0000-\u001f\u007f]/.test(value))) {
    return response.status(400).json({ error: 'Invalid RSVP fields' });
  }
  if ((values.email !== undefined && typeof values.email !== 'string')
    || (email && !isRsvpEmail(email))
    || (values.notes !== undefined && typeof values.notes !== 'string')
    || notes.length > 2000 || /[\u0000-\u0008\u000b-\u001f\u007f]/.test(notes)
    || typeof guestCount !== 'number' || !Number.isInteger(guestCount)
    || (attendance === 'attending' ? guestCount < 1 || guestCount > MAX_GUESTS : guestCount !== 0)
    || values.guestCount === null) {
    return response.status(400).json({ error: 'Invalid email, guest count or notes' });
  }
  if (!apiKey || !from) return response.status(503).json({ error: 'RSVP delivery is not configured' });

  const guest = `${firstName} ${lastName}`;
  const attendanceLabel = attendance === 'attending' ? 'Attending' : 'Unable to Attend';
  const details = [
    ['Guest', guest], ['Phone', phone], ['Email', email || 'Not provided'],
    ['Attendance', attendanceLabel], ['Special notes', notes || 'None'],
    ['Event', 'Thami Kotlolo & Wesley Willis'], ['Date', WEDDING_DATE_LABEL],
    ['Time', `${WEDDING_TIME} (until the music stops)`], ['Venue', WEDDING_ADDRESS.join('\n')],
    ['Dress code', DRESS_CODE],
  ];
  const text = `WEDDING RSVP\n\n${details.map(([label, value]) => `${label}:\n${value}`).join('\n\n')}`;
  const html = `<html><body style="margin:0;background:#f7f5f0;color:#29241d;font-family:Georgia,serif"><div style="max-width:560px;margin:32px auto;padding:32px;background:#ffffff;border-top:4px solid #a38b60"><h1 style="font-size:24px;letter-spacing:3px">WEDDING RSVP</h1>${details.map(([label, value]) => `<p style="margin:24px 0;line-height:1.6"><strong>${label}:</strong><br>${escapeHtml(value).replace(/\n/g, '<br>')}</p>`).join('')}</div></body></html>`;
  // Older browsers still send this header. Provider keys depend on the RSVP so a reload or a fresh client key cannot duplicate a send.
  const attempt = request.headers['idempotency-key'];
  if (attempt !== undefined && (typeof attempt !== 'string' || !/^[a-zA-Z0-9-]{1,128}$/.test(attempt))) {
    return response.status(400).json({ error: 'Invalid idempotency key' });
  }
  const digest = createHash('sha256')
    .update(JSON.stringify([firstName, lastName, phone, attendance, email, guestCount, notes]))
    .digest('hex');
  const saved = await sendEmail(apiKey, from, {
    to: 'info@thamidish.com', subject: `Wedding RSVP — ${guest}`, html, text,
  }, `rsvp-v2-${digest}-${digest}`);
  if (!saved) return response.status(502).json({ error: 'Unable to deliver RSVP' });
  if (!email) return response.status(200).json({ success: true, confirmation: 'not_requested' });

  const confirmation = { firstName, email, attending: attendance === 'attending', guestCount, digest };
  if (await sendConfirmation(apiKey, from, confirmation)) {
    return response.status(200).json({ success: true, confirmation: 'accepted' });
  }
  return response.status(200).json({
    success: true, confirmation: 'retryable', confirmationRetryToken: createConfirmationRetry(confirmation, apiKey),
  });
}
