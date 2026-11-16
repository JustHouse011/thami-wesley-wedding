import { Component, lazy, Suspense, useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { choreograph } from './choreography';

gsap.registerPlugin(ScrollTrigger);
const Scene = lazy(() => import('./Scene'));

export interface SceneMotion {
  scroll: number;
  approach: number;
}

class SceneBoundary extends Component<{ children: ReactNode; onFailure: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFailure(); }
  render() { return this.state.failed ? null : this.props.children; }
}

function supportsWebGL() {
  try {
    const probe = document.createElement('canvas').getContext('webgl2', { failIfMajorPerformanceCaveat: false });
    probe?.getExtension('WEBGL_lose_context')?.loseContext();
    return Boolean(probe);
  } catch {
    return false;
  }
}

function Intro({ hero, motion, onClose }: { hero: HTMLElement; motion: SceneMotion; onClose: () => void }) {
  const overlay = useRef<HTMLDivElement>(null);
  const skip = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const close = () => {
      if (document.activeElement === skip.current) hero.querySelector('h1')?.focus({ preventScroll: true });
      onClose();
    };
    const handleKey = (event: KeyboardEvent) => { if (event.key === 'Escape') close(); };
    const handlePointer = (event: PointerEvent) => { if (event.target !== skip.current) close(); };
    const handleFocus = (event: FocusEvent) => { if (event.target !== skip.current) close(); };
    const context = gsap.context(() => {
      const timeline = gsap.timeline({ onComplete: close });
      timeline.fromTo('.intro-emblem', { opacity: 0, rotateY: -26, z: -100 }, {
        opacity: 1, rotateY: 0, z: 0, duration: 1.6, ease: 'power2.out',
      }, 0);
      timeline.fromTo('.intro-orbit', { opacity: 0, rotation: -28 }, {
        opacity: 0.85, rotation: 65, duration: 2.5, ease: 'sine.inOut',
      }, 0.15);
      timeline.to('.intro-door-left', { xPercent: -108, rotateY: -42, opacity: 0, duration: 1.2, ease: 'power2.inOut' }, 1.45);
      timeline.to('.intro-door-right', { xPercent: 108, rotateY: 42, opacity: 0, duration: 1.2, ease: 'power2.inOut' }, 1.45);
      timeline.to('.intro-orbit', { opacity: 0, scale: 1.55, duration: 0.85 }, 1.65);
      timeline.to(overlay.current, { backgroundColor: 'rgba(255,253,248,0)', duration: 1.05, ease: 'power2.inOut' }, 1.7);
      timeline.fromTo(motion, { approach: 0 }, { approach: 1, duration: 1.45, ease: 'power2.out' }, 1.85);
      timeline.fromTo(hero.querySelectorAll('.families, .invitation-message, .celebration, .event-date, .event-time, address, .dress-code'),
        { y: 9, opacity: 0.36 }, { y: 0, opacity: 1, stagger: 0.095, duration: 0.58, ease: 'power2.out' }, 2.13);
      timeline.fromTo(hero.querySelectorAll('.given-name, .surname, .ampersand'),
        { clipPath: 'inset(0 0 100% 0)', y: 12 }, { clipPath: 'inset(-25% -15% -30% -15%)', y: 0, stagger: 0.105, duration: 0.78, ease: 'power3.out' }, 2.27);
    }, overlay);
    window.addEventListener('keydown', handleKey);
    window.addEventListener('pointerdown', handlePointer);
    window.addEventListener('focusin', handleFocus);
    window.addEventListener('scroll', close, { passive: true });
    return () => {
      context.revert();
      motion.approach = 1;
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('pointerdown', handlePointer);
      window.removeEventListener('focusin', handleFocus);
      window.removeEventListener('scroll', close);
    };
  }, [hero, motion, onClose]);

  return (
    <div className="cinematic-intro" ref={overlay}>
      <div className="intro-orbit" aria-hidden="true">
        {Array.from({ length: 12 }, (_, index) => (
          <i key={index} style={{ transform: `rotate(${index * 30}deg)` }} />
        ))}
      </div>
      <div className="intro-emblem" aria-hidden="true">
        <div className="intro-door-left" /><div className="intro-door-right" />
      </div>
      <button className="outline-button intro-skip" type="button" ref={skip} onClick={() => {
        hero.querySelector('h1')?.focus({ preventScroll: true });
        onClose();
      }}>Skip intro</button>
    </div>
  );
}

export default function Cinematic({ site, introAllowed }: {
  site: RefObject<HTMLDivElement | null>;
  introAllowed: RefObject<boolean>;
}) {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [supported, setSupported] = useState(false);
  const [intro, setIntro] = useState(false);
  const motion = useRef<SceneMotion>({ scroll: 0, approach: 1 }).current;
  const hero = site.current?.querySelector<HTMLElement>('#wedding');
  const viewport = hero?.querySelector<HTMLElement>('.cinematic-viewport');

  useEffect(() => {
    const frame = requestAnimationFrame(() => setSupported(supportsWebGL()));
    return () => cancelAnimationFrame(frame);
  }, []);

  const close = useCallback(() => {
    introAllowed.current = false;
    setIntro(false);
  }, [introAllowed]);
  const fail = useCallback(() => {
    setFailed(true);
    setReady(false);
    setIntro(false);
  }, []);
  const activate = useCallback(() => {
    if (introAllowed.current && !window.location.hash && window.scrollY < 5) setIntro(true);
    setReady(true);
  }, [introAllowed]);

  useEffect(() => {
    if (!site.current || !hero || !ready || failed) return;
    hero.classList.add('has-cinematic-art');
    const cleanup = choreograph(site.current, hero, motion);
    return () => {
      cleanup();
      hero.classList.remove('has-cinematic-art');
    };
  }, [site, hero, motion, ready, failed]);

  if (!supported || failed || !hero || !viewport) return null;
  return (
    <>
      {createPortal(<SceneBoundary onFailure={fail}><Suspense fallback={null}>
        <Scene hero={hero} motion={motion} onReady={activate} onFailure={fail} />
      </Suspense></SceneBoundary>, viewport)}
      {intro && <Intro hero={hero} motion={motion} onClose={close} />}
    </>
  );
}
