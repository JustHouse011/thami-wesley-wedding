import { createHash } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Resend } from 'resend';

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]!);

export default async function handler(request: VercelRequest, response: VercelResponse) {
  response.setHeader('Cache-Control', 'no-store');
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'Method not allowed' });
  }
  if (request.headers['content-type']?.split(';')[0].trim().toLowerCase() !== 'application/json') {
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
  if (!firstName || !lastName || !phone || !['attending', 'declined'].includes(attendance)
    || firstName.length > 100 || lastName.length > 100 || phone.length > 64
    || [firstName, lastName, phone].some(value => /[\u0000-\u001f\u007f]/.test(value))) {
    return response.status(400).json({ error: 'Invalid RSVP fields' });
  }
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  if (!apiKey || !from) return response.status(503).json({ error: 'RSVP delivery is not configured' });

  const guest = `${firstName} ${lastName}`;
  const attendanceLabel = attendance === 'attending' ? 'Attending' : 'Unable to Attend';
  const details = [
    ['Guest', guest], ['Phone', phone], ['Attendance', attendanceLabel],
    ['Event', 'Thami Kotlolo & Wesley Willis'], ['Date', '30th November 2026'],
    ['Venue', 'River Meadow Manor\nTwin River Estates\n1 Jan Smuts Avenue\nCenturion\n0062'],
  ];
  const text = `WEDDING RSVP\n\n${details.map(([label, value]) => `${label}:\n${value}`).join('\n\n')}`;
  const html = `<html><body style="margin:0;background:#f7f5f0;color:#29241d;font-family:Georgia,serif"><div style="max-width:560px;margin:32px auto;padding:32px;background:#ffffff;border-top:4px solid #a38b60"><h1 style="font-size:24px;letter-spacing:3px">WEDDING RSVP</h1>${details.map(([label, value]) => `<p style="margin:24px 0;line-height:1.6"><strong>${label}:</strong><br>${escapeHtml(value).replace(/\n/g, '<br>')}</p>`).join('')}</div></body></html>`;
  // Identical retries use the same provider key, including across function instances.
  const attempt = request.headers['idempotency-key'];
  if (attempt !== undefined && (typeof attempt !== 'string' || !/^[a-zA-Z0-9-]{1,128}$/.test(attempt))) {
    return response.status(400).json({ error: 'Invalid idempotency key' });
  }
  const digest = createHash('sha256').update(JSON.stringify([firstName, lastName, phone, attendance])).digest('hex');
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
