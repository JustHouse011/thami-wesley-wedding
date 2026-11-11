import { useRef, useState, type FormEvent } from 'react';
import { MAX_GUESTS } from './wedding';

export default function Rsvp() {
  const [attendance, setAttendance] = useState('yes');
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<{ message: string; error: boolean } | null>(null);
  const inFlight = useRef(false);
  const lastAttempt = useRef<{ payload: string; key: string } | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    const form = event.currentTarget;
    const fields = new FormData(form);
    const payload = {
      email: String(fields.get('email') ?? '').trim(),
      notes: String(fields.get('notes') ?? '').trim(),
      ...(attendance === 'yes' && { guestCount: Number(fields.get('guestCount')) }),
      firstName: String(fields.get('firstName') ?? '').trim(),
      lastName: String(fields.get('lastName') ?? '').trim(),
      phone: String(fields.get('phone') ?? '').trim(),
      attendance: attendance === 'yes' ? 'attending' : 'declined',
    };
    for (const name of ['firstName', 'lastName', 'phone'] as const) {
      const input = form.elements.namedItem(name) as HTMLInputElement;
      input.setCustomValidity(payload[name] ? '' : 'Please complete this field.');
      if (!payload[name]) { input.reportValidity(); return; }
    }
    const serialized = JSON.stringify(payload);
    if (lastAttempt.current?.payload !== serialized) {
      lastAttempt.current = { payload: serialized, key: crypto.randomUUID() };
    }
    inFlight.current = true;
    setSending(true);
    setStatus(null);
    try {
      const response = await fetch('/api/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': lastAttempt.current!.key },
        body: serialized,
      });
      const result = await response.json();
      if (!response.ok || result.success !== true) throw new Error('Submission failed');
      setStatus({ error: false, message: payload.attendance === 'attending'
        ? `Thank you, ${payload.firstName}. We can't wait to celebrate with you!`
        : `Thank you, ${payload.firstName}. Your RSVP has been received.` });
      form.reset();
      setAttendance('yes');
      lastAttempt.current = null;
    } catch {
      setStatus({ error: true, message: "We couldn't submit your RSVP. Please try again." });
    } finally {
      inFlight.current = false;
      setSending(false);
    }
  }
  return (
    <section className="rsvp" id="rsvp" aria-labelledby="rsvp-title" data-entrance>
      <div className="gold-divider" aria-hidden="true"><span /></div>
      <img className="rsvp-flowers" src="/assets/rsvp-flowers.png" alt="" loading="lazy" />
      <img className="rsvp-calabash" src="/assets/rsvp-calabash.png" alt="" loading="lazy" />
      <div className="rsvp-card">
        <h2 className="gold-pill rsvp-title" id="rsvp-title">
          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4m10-4v4M3 10h18m-13 5 3 3 5-5" /></svg>
          RSVP
        </h2>
        <p className="rsvp-heading">Please confirm your attendance</p>
        <p className="rsvp-intro">Kindly let us know if you will be joining us on our special day.</p>
        <form id="rsvp-form" aria-label="RSVP form" aria-busy={sending} onSubmit={submit} onChange={event => {
          if (event.target instanceof HTMLInputElement) event.target.setCustomValidity('');
          setStatus(null);
        }}>
          <fieldset className="form-fields" disabled={sending} aria-label="Your RSVP details">
            <div className="field-row">
              <label>First Name <span aria-hidden="true">*</span><input name="firstName" autoComplete="given-name" maxLength={100} required /></label>
              <label>Last Name <span aria-hidden="true">*</span><input name="lastName" autoComplete="family-name" maxLength={100} required /></label>
            </div>
            <div className="field-row">
              <label>Contact Number <span aria-hidden="true">*</span><input name="phone" type="tel" autoComplete="tel" maxLength={64} placeholder="+27 82 123 4567" required /></label>
              <label>Email Address <small>(optional)</small><input name="email" type="email" autoComplete="email" maxLength={254} /></label>
            </div>
            <fieldset className="attendance">
              <legend>Will you be attending? <span aria-hidden="true">*</span></legend>
              <div className="field-row">
                <label><input type="radio" name="attendance" value="yes" checked={attendance === 'yes'} onChange={() => setAttendance('yes')} />I’ll Be There</label>
                <label><input type="radio" name="attendance" value="no" checked={attendance === 'no'} onChange={() => setAttendance('no')} />Unfortunately, I Can’t Make It</label>
              </div>
            </fieldset>
            {attendance === 'yes' && <label>Number of Guests, Including Yourself <span aria-hidden="true">*</span>
              <select name="guestCount" defaultValue="1" required>
                {Array.from({ length: MAX_GUESTS }, (_, index) => <option key={index + 1}>{index + 1}</option>)}
              </select>
            </label>}
            <label>Special Notes / Dietary Requirements <small>(optional)</small>
              <textarea name="notes" rows={3} maxLength={2000} placeholder="Let us know if there’s anything we should be aware of…" />
            </label>
          </fieldset>
          <button className="gold-pill submit-rsvp" type="submit" disabled={sending}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m22 2-7 20-4-9L2 9 22 2ZM11 13 22 2" /></svg>
            {sending ? 'Sending RSVP…' : status?.error ? 'Retry RSVP' : 'Submit RSVP'}
          </button>
          {status && <p className={`form-status${status.error ? ' is-error' : ''}`} role={status.error ? 'alert' : 'status'}>
            {!status.error && <span aria-hidden="true">✓ </span>}{status.message}
          </p>}
        </form>
      </div>
    </section>
  );
}
