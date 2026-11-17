import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'node:crypto';
import { DRESS_CODE, WEDDING_ADDRESS, WEDDING_DATE_LABEL, WEDDING_TIME } from '../src/wedding.js';

export interface GuestConfirmation {
  firstName: string;
  email: string;
  attending: boolean;
  guestCount: number;
  digest: string;
}

const retryLifetime = 60 * 60 * 1000;
const nonceBytes = 12;
const tagBytes = 16;

export const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]!);

function retryKey(secret: string) {
  return createHmac('sha256', secret).update('wedding-rsvp-confirmation-retry-v1').digest();
}

export function createConfirmationRetry(guest: GuestConfirmation, secret: string) {
  const nonce = randomBytes(nonceBytes);
  const cipher = createCipheriv('aes-256-gcm', retryKey(secret), nonce);
  const payload = JSON.stringify({ ...guest, expiresAt: Date.now() + retryLifetime });
  const ciphertext = Buffer.concat([cipher.update(payload, 'utf8'), cipher.final()]);
  return Buffer.concat([nonce, cipher.getAuthTag(), ciphertext]).toString('base64url');
}

export function readConfirmationRetry(token: unknown, secret: string): GuestConfirmation | null {
  if (typeof token !== 'string' || !/^[\w-]{40,2048}$/.test(token)) return null;
  const bytes = Buffer.from(token, 'base64url');
  if (bytes.toString('base64url') !== token) return null;
  try {
    const decipher = createDecipheriv('aes-256-gcm', retryKey(secret), bytes.subarray(0, nonceBytes));
    decipher.setAuthTag(bytes.subarray(nonceBytes, nonceBytes + tagBytes));
    const plaintext = Buffer.concat([decipher.update(bytes.subarray(nonceBytes + tagBytes)), decipher.final()]);
    const payload = JSON.parse(plaintext.toString('utf8')) as GuestConfirmation & { expiresAt: number };
    return payload.expiresAt > Date.now() ? payload : null;
  } catch {
    return null;
  }
}

export function confirmationEmail(guest: GuestConfirmation, reminder = false) {
  const subject = reminder ? 'A Wedding Reminder — Thami & Wesley' : guest.attending
    ? "You're Invited — Thami & Wesley's Wedding RSVP Confirmed"
    : 'Thank You for Responding — Thami & Wesley';
  const greeting = `Dear ${guest.firstName},`;
  const message = reminder ? [
    'We can’t wait to celebrate with you on Friday, 27 November!',
    'Here are the details for our day of love, culture and togetherness.',
    'Contact Barbara Ledwaba on +27 79 075 6607 if you need any help.',
  ] : guest.attending ? [
    'Thank you for confirming your attendance!',
    'We are delighted that you will be joining us as we celebrate our love, culture and togetherness.',
  ] : [
    'Thank you for letting us know you won’t be able to join us.',
    'We appreciate your love and support as we celebrate this special day.',
  ];
  const details = guest.attending ? [
    `Friday, ${WEDDING_DATE_LABEL}`,
    `${WEDDING_TIME} — Until the music stops`,
    WEDDING_ADDRESS.join(', '),
    `Dress Code: ${DRESS_CODE}`,
  ] : [];
  const text = ['Thami & Wesley', greeting, ...message, details.join('\n'), 'With love,\nThami & Wesley'].filter(Boolean).join('\n\n');
  const paragraphs = [greeting, ...message].map(value => `<p style="margin:0 0 16px">${escapeHtml(value)}</p>`).join('');
  const event = guest.attending ? `<p style="margin:24px 0;padding:18px 0;border-top:1px solid #c49b54;border-bottom:1px solid #c49b54">${details.map(escapeHtml).join('<br>')}</p>` : '';
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;background:#f7f2e7;color:#35291f">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f7f2e7"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#fffdf6;border:1px solid #d8bc83;font:17px/1.55 Georgia,serif"><tr><td style="padding:28px 22px">
<h1 style="margin:0 0 24px;padding-bottom:16px;border-bottom:1px solid #c49b54;color:#795116;text-align:center;font:normal 32px Georgia,serif">Thami &amp; Wesley</h1>
${paragraphs}${event}<p style="margin:24px 0 0">With love,<br>Thami &amp; Wesley</p>
</td></tr></table></td></tr></table></body></html>`;
  return { to: [guest.email], subject, html, text };
}
