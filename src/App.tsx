import { Fragment, useEffect, useRef, useState, type FormEvent } from 'react';
import { timeRemaining } from './countdown';

const asset = (name: string) => `/assets/${name}`;

function FlipUnit({ value, label, index }: { value: number; label: string; index: number }) {
  const [flip, setFlip] = useState<{ from: string; to: string } | null>(null);
  const previousValue = useRef(value);
  const displayedValue = String(value).padStart(2, '0');

  useEffect(() => {
    if (previousValue.current === value) return;
    const nextFlip = { from: String(previousValue.current).padStart(2, '0'), to: displayedValue };
    previousValue.current = value;
    setFlip(nextFlip);
    const timer = window.setTimeout(() => setFlip(null), 700);
    return () => window.clearTimeout(timer);
  }, [value, displayedValue]);

  const oldValue = flip?.from ?? displayedValue;
  const newValue = flip?.to ?? displayedValue;
  return (
    <div className={`countdown-unit${flip ? ' is-flipping' : ''}`} style={{ left: index * 133.91 }}>
      <div className="flip-half flip-top" />
      <div className="flip-half flip-bottom" />
      <span className="countdown-number" aria-hidden="true">{displayedValue}</span>
      {flip && <>
        <div className="flip-flap flip-flap-top" aria-hidden="true"><span>{oldValue}</span></div>
        <div className="flip-flap flip-flap-bottom" aria-hidden="true"><span>{newValue}</span></div>
      </>}
      <img className="flip-seam" src={asset(['3-194-a86f9.svg', '3-194-da417.svg', '3-194-08b2b.svg', '3-194-d1baf.svg'][index])} alt="" />
      {[14.01, 110.56].map(left => [45.16, 54.5].map(top => <img key={`${left}-${top}`} className="flip-pin" src={asset('3-194-70917.svg')} alt="" style={{ left, top }} />))}
      <span className="countdown-label">{label}</span>
    </div>
  );
}

function Countdown() {
  const [remaining, setRemaining] = useState(timeRemaining);
  useEffect(() => {
    const timer = window.setInterval(() => setRemaining(timeRemaining()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const labels = ['DAYS', 'HOURS', 'MINUTES', 'SECONDS'];
  return (
    <div className="countdown" role="timer" aria-label="Time until 30th November 2026">
      {remaining.map((value, index) => (
        <Fragment key={labels[index]}>
          {index > 0 && <img className="countdown-colon" src={asset('3-194-a62bc.svg')} alt="" style={{ left: 127.69 + (index - 1) * 133.91 }} />}
          <FlipUnit value={value} label={labels[index]} index={index} />
        </Fragment>
      ))}
    </div>
  );
}

function Hero() {
  return (
    <section className="hero" aria-labelledby="couple-name" data-node-id="3:194">
      <img className="hero-underlay" src={asset('3-194-ccca4.png')} alt="" />
      <img className="hero-photo" src={asset('3-194-44410.png')} alt="Thami and Wesley smiling together" />
      <div className="hero-shade" />
      <img className="hero-pattern" src={asset('3-194-d0f59.svg')} alt="" />
      <div className="hero-logo">
        <img className="logo-disc" src={asset('3-194-65dd4.svg')} alt="" />
        <img className="logo-mark" src={asset('3-194-0d203.svg')} alt="Thami and Wesley monogram" />
        <img className="logo-triangle" src={asset('3-194-a334a.svg')} alt="" />
      </div>
      <h1 id="couple-name">THAMI &amp; WESLEY</h1>
      <div className="wedding-caption">
        <span className="wedding-day">Wedding day</span>
        <img src={asset('3-194-679e5.svg')} alt="" />
        <span className="wedding-date">30th November 2026</span>
      </div>
      <Countdown />
    </section>
  );
}

function Invitation() {
  return (
    <section className="invitation copy-section" aria-labelledby="invitation-title" data-node-id="3:189">
      <h2 id="invitation-title">You are invited</h2>
      <p><strong className="invitation-lead">Two hearts. One love. One beautiful beginning.</strong><span><br />{' With hearts full of love and gratitude, '}<strong>Mr. Thami Kotlolo &amp; Dr. Wesley Willis</strong>{' invite you to share in the joy of their wedding celebration as they honour the journey that brought them together and begin their next chapter as one. Join them for a celebration of love, laughter, partnership and a lifetime of beautiful adventures, surrounded by the people who have supported, embraced and celebrated their love along the way'}</span></p>
    </section>
  );
}

function Portraits() {
  return (
    <section className="portraits" aria-label="Thami and Wesley" data-node-id="3:68">
      <h2>THAMI &amp; WESLEY</h2>
      <div className="portrait-right"><img src={asset('3-68-ff2dc.png')} alt="Thami and Wesley celebrating together" /></div>
      <div className="portrait-left"><img src={asset('3-68-27ceb.png')} alt="Thami and Wesley standing together" /></div>
      <div className="portrait-logo-panel"><img src={asset('3-68-8c4f2.svg')} alt="Thami and Wesley monogram" /></div>
    </section>
  );
}

function SaveTheDate() {
  return (
    <section className="save-date copy-section" aria-labelledby="save-date-title" data-node-id="3:63">
      <h2 id="save-date-title">You Are Invited</h2>
      <div className="save-date-content">
        <p>Together with their families,<br />Thami Kotlolo &amp; Wesley Willis request the pleasure of your company at their wedding celebration.</p>
        <p>Come share in a day of love, culture, and laughter.</p>
        <ul className="save-date-details">
          <li><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4m10-4v4M3 11h18m-14 4h3m4 0h3" /></svg><span><strong>Date:</strong> 30th November 2026</span></li>
          <li><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg><span><strong>Time:</strong> 14:30 for 15:00</span></li>
          <li><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg><span><strong>Venue:</strong> River Meadow Manor, Twin River Estates, 1 Jan Smuts Avenue, Centurion, 0062</span></li>
          <li><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 3-6 4 3 5 3-2v11h8V10l3 2 3-5-6-4a4 4 0 0 1-8 0Z" /></svg><span><strong>Dress Code:</strong> Black</span></li>
        </ul>
        <p>Kindly RSVP by latest <strong>3rd November 2026</strong></p>
        <a className="save-date-rsvp" href="#rsvp-form" onClick={event => {
          event.preventDefault();
          const form = document.getElementById('rsvp-form');
          form?.focus({ preventScroll: true });
          form?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
        }}>Click here to RSVP</a>
      </div>
    </section>
  );
}

function Polaroids() {
  return (
    <section className="polaroids" aria-label="Memories together" data-node-id="5:514">
      <div className="polaroid polaroid-first"><img src={asset('5-514-75ca7.png')} alt="Celebrating a graduation together" /></div>
      <div className="polaroid polaroid-second"><img src={asset('5-514-feb77.png')} alt="Thami and Wesley sharing a sunny moment" /></div>
      <img className="polaroid-pattern" src={asset('5-514-4fcce.svg')} alt="" />
    </section>
  );
}

function RsvpIntroduction() {
  return (
    <section className="rsvp-intro copy-section" aria-labelledby="rsvp-intro-title" data-node-id="3:19">
      <h2 id="rsvp-intro-title">Kindly RSVP</h2>
      <p>We would be honoured to celebrate this beautiful occasion with you. Please let Thami &amp; Wesley know if you’ll be joining them as they gather with family, friends and loved ones for this unforgettable day. Kindly confirm your attendance using the RSVP form below.</p>
    </section>
  );
}

function Rsvp() {
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
    <section className="rsvp" aria-labelledby="rsvp-title" data-node-id="5:518">
      <img className="rsvp-photo" src={asset('5-518-024a3.png')} alt="" />
      <div className="rsvp-shade" />
      <div className="rsvp-content">
        <h2 id="rsvp-title">RSVP</h2>
        <div className="event-details">
          <p><svg className="event-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4m10-4v4M3 11h18m-14 4h3m4 0h3" /></svg><span>30th November 2026</span></p>
          <p><svg className="event-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg><span>River Meadow Manor, Twin River Estates, 1 Jan Smuts Avenue, Centurion, 0062</span></p>
        </div>
        <div className="schedule">
          {['Schedule', 'Arrival', 'Ceremony', 'Live Music & Dancing'].map((label, index) => (
            <Fragment key={label}>
              {index > 0 && <img className="schedule-separator" src={asset(index === 3 ? '5-518-1d854.svg' : '5-518-2c2e6.svg')} alt="" />}
              <div className="schedule-item"><span>{label}</span>{index === 0 ? <img src={asset('5-518-2d231.svg')} alt="" /> : <strong>{['', '14:30', '15:00', '9:00 PM'][index]}</strong>}</div>
            </Fragment>
          ))}
        </div>
        <form id="rsvp-form" tabIndex={-1} aria-label="RSVP form" aria-busy={sending} onSubmit={submit} onChange={event => {
          if (event.target instanceof HTMLInputElement) event.target.setCustomValidity('');
          setStatus(null);
        }}>
          <div className="name-fields">
            <label>FIRST NAME<input name="firstName" placeholder="John" autoComplete="given-name" required /></label>
            <label>LAST NAME<input name="lastName" placeholder="Doe" autoComplete="family-name" required /></label>
          </div>
          <label className="phone-field">PHONE NUMBER<input name="phone" type="tel" placeholder="+27" autoComplete="tel" required /></label>
          <fieldset className="attendance"><legend className="visually-hidden">Will you attend?</legend>
            <label className={attendance === 'yes' ? 'selected' : ''}><input type="radio" name="attendance" value="yes" checked={attendance === 'yes'} onChange={() => setAttendance('yes')} /><img className="emoji" src={asset('rsvp-accept.png')} alt="" /><span>I’ll be there</span></label>
            <label className={attendance === 'no' ? 'selected' : ''}><input type="radio" name="attendance" value="no" checked={attendance === 'no'} onChange={() => setAttendance('no')} /><img className="emoji" src={asset('rsvp-decline.png')} alt="" /><span>Can’t make it</span></label>
          </fieldset>
          <button className="submit-rsvp" type="submit" disabled={sending}>{sending ? 'Sending RSVP...' : 'Submit RSVP'}</button>
          {status && <p className="form-status" role={status.error ? 'alert' : 'status'}>{status.message}</p>}
        </form>
      </div>
    </section>
  );
}

export default function App() {
  return (
    <main className="desktop-page">
      <Hero />
      <img className="pattern-invitation" src={asset('222-24-40211.svg')} alt="" />
      <Invitation />
      <Portraits />
      <SaveTheDate />
      <div className="pattern-middle" aria-hidden="true" />
      <Polaroids />
      <RsvpIntroduction />
      <Rsvp />
      <div className="pattern-footer" aria-hidden="true" />
      <footer className="site-footer">
        <p>© 2026 Thami &amp; Wesley. All rights reserved.</p>
        <p>Designed By Bongani Nombamba</p>
      </footer>
    </main>
  );
}
