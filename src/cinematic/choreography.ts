import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { SceneMotion } from './Cinematic';

export function choreograph(site: HTMLElement, hero: HTMLElement, motion: SceneMotion) {
  const context = gsap.context(() => {
    gsap.to(motion, {
      scroll: 1, ease: 'none',
      scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true },
    });

    const rsvp = gsap.timeline({
      scrollTrigger: { trigger: '#rsvp', start: 'top 95%', end: 'top 38%', scrub: 0.45 },
    });
    rsvp.from('.rsvp-flowers', { x: 20, rotation: 3, opacity: 0.65 }, 0);
    rsvp.from('.rsvp-calabash', { x: -18, opacity: 0.7 }, 0);
    rsvp.from('.rsvp-card', { y: 18, rotateX: 3, transformPerspective: 1100, transformOrigin: 'center top' }, 0);
    rsvp.fromTo('.rsvp-outline rect', { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.65 }, 0.05);
    rsvp.from('.rsvp-title', { opacity: 0.74 }, 0.15);
    rsvp.from('.rsvp-heading', { opacity: 0.74, y: 5 }, 0.22);
    rsvp.from('.form-fields > *', { y: 6, stagger: 0.075, duration: 0.3 }, 0.24);

    const cardRows = Array.from(site.querySelectorAll('.gift-reveal'));
    for (let index = 0; index < cardRows.length; index += 2) {
      gsap.from(cardRows.slice(index, index + 2), {
        y: 15, opacity: 0.78, stagger: 0.09, duration: 0.55, ease: 'power2.out',
        scrollTrigger: { trigger: cardRows[index], start: 'top 95%', toggleActions: 'play none none reverse' },
      });
    }
    gsap.from('.treasury', {
      y: 20, opacity: 0.8, rotateX: 2, transformPerspective: 1100,
      scrollTrigger: { trigger: '.treasury', start: 'top 93%', end: 'top 62%', scrub: 0.4 },
    });
    const footer = gsap.timeline({
      scrollTrigger: { trigger: 'footer', start: 'top bottom', end: 'bottom bottom', scrub: 0.5 },
    });
    footer.from('.footer-flowers', { xPercent: -20, rotation: -6, opacity: 0.45 }, 0);
    footer.from('.footer-traditional', { xPercent: 20, rotation: 4, opacity: 0.45 }, 0);
  }, site);

  const cleanTilt = [...site.querySelectorAll<HTMLElement>('.gifts details')].map(card => {
    const move = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      const box = card.parentElement!.getBoundingClientRect();
      const x = Math.min(1, Math.max(0, (event.clientX - box.left) / box.width));
      const y = Math.min(1, Math.max(0, (event.clientY - box.top) / box.height));
      card.style.setProperty('--light-x', `${x * 100}%`);
      card.style.setProperty('--light-y', `${y * 100}%`);
      card.style.setProperty('--tilt-x', `${(0.5 - y) * 5}deg`);
      card.style.setProperty('--tilt-y', `${(x - 0.5) * 5}deg`);
      card.classList.add('is-lit');
    };
    const reset = () => {
      card.classList.remove('is-lit');
      for (const property of ['--light-x', '--light-y', '--tilt-x', '--tilt-y']) card.style.removeProperty(property);
    };
    card.addEventListener('pointermove', move, { passive: true });
    card.addEventListener('pointerleave', reset);
    return () => {
      card.removeEventListener('pointermove', move);
      card.removeEventListener('pointerleave', reset);
      reset();
    };
  });

  let refreshTimer = 0;
  const gifts = site.querySelector('.gifts');
  const resize = new ResizeObserver(() => {
    clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(() => ScrollTrigger.refresh(), 130);
  });
  if (gifts) resize.observe(gifts);

  return () => {
    resize.disconnect();
    clearTimeout(refreshTimer);
    cleanTilt.forEach(cleanup => cleanup());
    context.revert();
  };
}
