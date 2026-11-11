import { useEffect, useRef, type PointerEvent } from 'react';
import Rsvp from './Rsvp';
import Registry from './Registry';
import { WEDDING_ISO, WEDDING_DATE_LABEL, WEDDING_TIME, WEDDING_ADDRESS, DRESS_CODE } from './wedding';

function Invitation() {
  function moveArtwork(event: PointerEvent<HTMLElement>) {
    if (event.pointerType !== 'mouse' || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty('--art-shift', `${(event.clientX - bounds.left - bounds.width / 2) / bounds.width * 12}px`);
  }

  return (
    <section className="invitation" id="wedding" aria-labelledby="couple" onPointerMove={moveArtwork}
      onPointerLeave={event => event.currentTarget.style.removeProperty('--art-shift')}>
      <img className="invitation-art art-left" src="/assets/invitation-left.png" alt="" />
      <img className="invitation-art art-right" src="/assets/invitation-right.png" alt="" />
      <div className="invitation-copy">
        <img className="emblem" src="/assets/invitation-emblem.png" alt="" width="231" height="133" />
        <p className="families">Together with our<br /> families</p>
        <h1 id="couple">
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
  const content = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!content.current || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('entered');
        observer.unobserve(entry.target);
      }
    }, { threshold: 0.1 });
    content.current.querySelectorAll('[data-entrance]').forEach(section => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="wedding-site">
      <main ref={content}>
        <Invitation />
        <Rsvp />
        <Registry />
      </main>
      <footer>
        <img className="footer-emblem" src="/assets/invitation-emblem.png" alt="" width="231" height="133" />
        <p className="footer-names">Thami &amp; Wesley Willis</p>
        <time dateTime={WEDDING_ISO}>{WEDDING_DATE_LABEL}</time>
        <nav aria-label="Footer links">
          <a href="#wedding">Wedding Details</a><a href="#rsvp">RSVP</a><a href="#gift-registry">The Art of Gay-ving</a>
        </nav>
        <p className="credit">Designed by Bongani Nombamba</p>
      </footer>
    </div>
  );
}
