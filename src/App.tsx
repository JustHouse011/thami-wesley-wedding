import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { invitationArtwork } from './artwork';
import Rsvp from './Rsvp';
import Registry from './Registry';
import { WEDDING_ISO, WEDDING_DATE_LABEL, WEDDING_TIME, WEDDING_ADDRESS, DRESS_CODE } from './wedding';

const Cinematic = lazy(() => import('./cinematic/Cinematic').catch(() => ({ default: () => null })));

function Invitation() {
  return (
    <section className="invitation" id="wedding" aria-labelledby="couple">
      <div className="cinematic-viewport" aria-hidden="true" />
      {invitationArtwork.filter(art => art.name !== 'emblem').map(({ name, src }) => (
        <img key={name} data-art={name} className={`invitation-art art-${name}`} src={src} alt="" />
      ))}
      <div className="invitation-copy">
        <img className="emblem" data-art="emblem" src="/assets/cinematic/emblem.webp" alt="" width="237" height="157" />
        <p className="families">Together with our<br /> families</p>
        <h1 id="couple" tabIndex={-1}>
          <span className="given-name">Thami</span><span className="surname">Kotlolo</span>
          <span className="ampersand">&amp;</span>
          <span className="given-name">Wesley</span><span className="surname">Willis</span>
        </h1>
        <p className="invitation-message">Request the pleasure of your company at their wedding celebration.</p>
        <p className="celebration">Come share in a day of love,<br /> culture, and laughter.</p>
        <div className="event">
          <time dateTime={WEDDING_ISO}><span className="event-date">Friday, {WEDDING_DATE_LABEL}</span>
            <span className="event-time">Time: {WEDDING_TIME} (until the music stops)</span></time>
          <address>{WEDDING_ADDRESS.map(line => <span key={line}>{line}</span>)}</address>
          <p className="dress-code">Dress code: {DRESS_CODE}</p>
          <p className="contact">Contact Barbara Ledwaba<br /><a href="tel:+27790756607">+27 79 075 6607</a></p>
        </div>
        <nav className="invitation-actions" aria-label="Invitation links">
          <a className="outline-button" href="#rsvp">Confirm your attendance</a>
          <a className="outline-button" href="#gift-registry">The Art of Gay-ving</a>
        </nav>
      </div>
    </section>
  );
}

export default function App() {
  const site = useRef<HTMLDivElement>(null);
  const [motion, setMotion] = useState(false);
  const introAllowed = useRef(true);

  useEffect(() => {
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const markInteraction = () => { introAllowed.current = false; };
    const deadline = window.setTimeout(markInteraction, 2800);
    const sync = () => setMotion(!preference.matches);
    const frame = requestAnimationFrame(sync);
    preference.addEventListener('change', sync);
    const events = ['pointerdown', 'keydown', 'scroll'] as const;
    events.forEach(event => window.addEventListener(event, markInteraction, { passive: true }));
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(deadline);
      preference.removeEventListener('change', sync);
      events.forEach(event => window.removeEventListener(event, markInteraction));
    };
  }, []);

  return (
    <div className="wedding-site" ref={site}>
      {motion && <Suspense fallback={null}><Cinematic site={site} introAllowed={introAllowed} /></Suspense>}
      <main>
        <Invitation />
        <Rsvp />
        <Registry />
      </main>
      <footer>
        <img className="footer-flowers" src="/assets/cinematic/lower-left.webp" alt="" loading="lazy" />
        <img className="footer-traditional" src="/assets/cinematic/traditional.webp" alt="" loading="lazy" />
        <img className="footer-emblem" src="/assets/cinematic/emblem.webp" alt="" width="237" height="157" />
        <p className="footer-names">Thami Kotlolo &amp; Wesley Willis</p>
        <time dateTime={WEDDING_ISO}>{WEDDING_DATE_LABEL}</time>
        <nav aria-label="Footer links">
          <a href="#wedding">Wedding Details</a><a href="#rsvp">RSVP</a><a href="#gift-registry">The Art of Gay-ving</a>
        </nav>
        <p className="credit">Designed by Bongani Nombamba</p>
      </footer>
    </div>
  );
}
