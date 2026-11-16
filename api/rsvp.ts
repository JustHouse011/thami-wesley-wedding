import { createHash } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Resend } from 'resend';
import { DRESS_CODE, MAX_GUESTS, WEDDING_ADDRESS, WEDDING_DATE_LABEL, WEDDING_TIME } from '../src/wedding';

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]!);

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
    || email.length > 254 || (email && !/^[^\s@\u0000-\u001f\u007f]+@[^\s@\u0000-\u001f\u007f]+\.[^\s@\u0000-\u001f\u007f]+$/.test(email))
    || (values.notes !== undefined && typeof values.notes !== 'string')
    || notes.length > 2000 || /[\u0000-\u0008\u000b-\u001f\u007f]/.test(notes)
    || typeof guestCount !== 'number' || !Number.isInteger(guestCount)
    || (attendance === 'attending' ? guestCount < 1 || guestCount > MAX_GUESTS : guestCount !== 0)
    || values.guestCount === null) {
    return response.status(400).json({ error: 'Invalid email, guest count or notes' });
  }
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  if (!apiKey || !from) return response.status(503).json({ error: 'RSVP delivery is not configured' });

  const guest = `${firstName} ${lastName}`;
  const attendanceLabel = attendance === 'attending' ? 'Attending' : 'Unable to Attend';
  const details = [
    ['Guest', guest], ['Phone', phone], ['Email', email || 'Not provided'],
    ['Attendance', attendanceLabel], ['Guest count', String(guestCount)], ['Special notes', notes || 'None'],
    ['Event', 'Thami Kotlolo & Wesley Willis'], ['Date', WEDDING_DATE_LABEL],
    ['Time', `${WEDDING_TIME} (until the music stops)`], ['Venue', WEDDING_ADDRESS.join('\n')],
    ['Dress code', DRESS_CODE],
  ];
  const text = `WEDDING RSVP\n\n${details.map(([label, value]) => `${label}:\n${value}`).join('\n\n')}`;
  const html = `<html><body style="margin:0;background:#f7f5f0;color:#29241d;font-family:Georgia,serif"><div style="max-width:560px;margin:32px auto;padding:32px;background:#ffffff;border-top:4px solid #a38b60"><h1 style="font-size:24px;letter-spacing:3px">WEDDING RSVP</h1>${details.map(([label, value]) => `<p style="margin:24px 0;line-height:1.6"><strong>${label}:</strong><br>${escapeHtml(value).replace(/\n/g, '<br>')}</p>`).join('')}</div></body></html>`;
  // Identical retries use the same provider key, including across function instances.
  const attempt = request.headers['idempotency-key'];
  if (attempt !== undefined && (typeof attempt !== 'string' || !/^[a-zA-Z0-9-]{1,128}$/.test(attempt))) {
    return response.status(400).json({ error: 'Invalid idempotency key' });
  }
  const digest = createHash('sha256')
    .update(JSON.stringify([firstName, lastName, phone, attendance, email, guestCount, notes]))
    .digest('hex');
  try {
    const { data, error } = await new Resend(apiKey).emails.send({
      from, to: 'info@thamidish.com', subject: `Wedding RSVP — ${guest}`, html, text,
    }, { idempotencyKey: `rsvp-${attempt ?? digest}-${digest}` });
    if (error || !data) return response.status(502).json({ error: 'Unable to deliver RSVP' });
    return response.status(200).json({ success: true });
  } catch {
    return response.status(502).json({ error: 'Unable to deliver RSVP' });
  }
}
