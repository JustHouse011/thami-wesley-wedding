import { Suspense, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { CircleGeometry, MathUtils, MeshBasicMaterial, PerspectiveCamera, PlaneGeometry, SRGBColorSpace, TextureLoader, type Group, type Mesh } from 'three';
import { invitationArtwork, petalTexture } from '../artwork';
import type { SceneMotion } from './Cinematic';

const textures = [...invitationArtwork.map(layer => layer.src), petalTexture];
const maxParticles = 22;

interface SceneProps {
  hero: HTMLElement;
  motion: SceneMotion;
  onReady: () => void;
  onFailure: () => void;
}

function Layers({ hero, motion, onReady, onFailure }: SceneProps) {
  const maps = useLoader(TextureLoader, textures);
  const size = useThree(state => state.size);
  const gl = useThree(state => state.gl);
  const invalidate = useThree(state => state.invalidate);
  const plane = useMemo(() => new PlaneGeometry(), []);
  const point = useMemo(() => new CircleGeometry(0.5, 8), []);
  const gold = useMemo(() => new MeshBasicMaterial({
    color: '#b98a38', transparent: true, opacity: 0.46, depthWrite: false, toneMapped: false,
  }), []);
  const petal = useMemo(() => new MeshBasicMaterial({
    map: maps.at(-1), transparent: true, opacity: 0.68, depthWrite: false, toneMapped: false,
  }), [maps]);
  const group = useRef<Group>(null);
  const layers = useRef<(Mesh | null)[]>([]);
  const particles = useRef<(Mesh | null)[]>([]);
  const pointer = useRef({ x: 0, y: 0, touch: false });
  const activity = useRef({ visible: true, time: 0, notified: false });
  const layout = useRef<{ x: number; y: number; width: number; height: number }[]>([]);

  useLayoutEffect(() => {
    for (const map of maps) {
      if (map.colorSpace !== SRGBColorSpace) {
        map.colorSpace = SRGBColorSpace;
        map.needsUpdate = true;
      }
      gl.initTexture(map);
    }
  }, [gl, maps]);
  useEffect(() => () => {
    plane.dispose();
    point.dispose();
    gold.dispose();
    petal.dispose();
  }, [plane, point, gold, petal]);

  useLayoutEffect(() => {
    const measure = () => {
      const stage = hero.getBoundingClientRect();
      layout.current = invitationArtwork.map(({ name }) => {
        const box = hero.querySelector(`[data-art="${name}"]`)!.getBoundingClientRect();
        return { x: box.left - stage.left + box.width / 2 - stage.width / 2,
          y: stage.height / 2 - (box.top - stage.top + box.height / 2), width: box.width, height: box.height };
      });
      invalidate();
    };
    const observer = new ResizeObserver(measure);
    observer.observe(hero);
    hero.querySelectorAll('[data-art]').forEach(image => observer.observe(image));
    measure();
    return () => observer.disconnect();
  }, [hero, size.width, size.height, invalidate]);

  useEffect(() => {
    const touch = matchMedia('(pointer: coarse)');
    const syncPointer = () => { pointer.current.touch = touch.matches; };
    const move = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      const box = hero.getBoundingClientRect();
      pointer.current.x = (event.clientX - box.left) / box.width * 2 - 1;
      pointer.current.y = (event.clientY - box.top) / box.height * 2 - 1;
    };
    const reset = () => { pointer.current.x = 0; pointer.current.y = 0; };
    const resume = () => { if (!document.hidden) invalidate(); };
    const observer = new IntersectionObserver(([entry]) => {
      activity.current.visible = entry.isIntersecting;
      if (entry.isIntersecting) invalidate();
    });
    observer.observe(hero);
    syncPointer();
    touch.addEventListener('change', syncPointer);
    hero.addEventListener('pointermove', move, { passive: true });
    hero.addEventListener('pointerleave', reset);
    document.addEventListener('visibilitychange', resume);
    gl.domElement.addEventListener('webglcontextlost', onFailure);
    return () => {
      observer.disconnect();
      touch.removeEventListener('change', syncPointer);
      hero.removeEventListener('pointermove', move);
      hero.removeEventListener('pointerleave', reset);
      document.removeEventListener('visibilitychange', resume);
      gl.domElement.removeEventListener('webglcontextlost', onFailure);
    };
  }, [hero, gl, invalidate, onFailure]);

  useFrame((state, elapsed) => {
    if (!group.current || !activity.current.visible || document.hidden) return;
    const delta = Math.min(elapsed, 0.05);
    activity.current.time += delta;
    const time = activity.current.time;
    const compact = size.width < 650;
    const scroll = motion.scroll;
    const cursor = pointer.current;
    const parallaxX = cursor.touch ? Math.sin(time * 0.48) * 0.4 : cursor.x;
    const parallaxY = cursor.touch ? Math.cos(time * 0.44) * 0.28 : cursor.y;
    const range = compact ? 8 : 19;
    if (state.camera instanceof PerspectiveCamera) {
      const distance = size.height / (2 * Math.tan(MathUtils.degToRad(state.camera.fov / 2)));
      state.camera.position.z = distance + (1 - motion.approach) * (compact ? 56 : 100);
    }

    invitationArtwork.forEach(({ side, depth }, index) => {
      const mesh = layers.current[index];
      const box = layout.current[index];
      if (!mesh || !box) return;
      const drift = depth * range;
      mesh.scale.set(box.width, box.height, 1);
      mesh.position.x = MathUtils.damp(mesh.position.x, box.x + parallaxX * drift + side * scroll * drift * 1.65, 11, delta);
      mesh.position.y = MathUtils.damp(mesh.position.y, box.y - parallaxY * drift * 0.55 + scroll * drift * 0.8, 11, delta);
      mesh.position.z = depth * scroll * 21;
      mesh.rotation.z = side * scroll * depth * 0.025;
      if (!activity.current.notified || mesh.userData.width !== box.width) {
        mesh.position.x = box.x;
        mesh.position.y = box.y;
        mesh.userData.width = box.width;
      }
    });
    particles.current.forEach((mesh, index) => {
      if (!mesh) return;
      mesh.visible = index < (compact ? 9 : maxParticles);
      if (!mesh.visible) return;
      const left = index % 2 === 0 ? -1 : 1;
      const phase = (index * 0.173 + time * 0.028 + scroll * 0.14) % 1;
      mesh.position.set(left * size.width * (0.36 + 0.07 * Math.sin(index + time * 0.52)),
        size.height * (0.48 - phase * 0.94), 30);
      mesh.rotation.z = index + time * 0.31;
      const radius = index % 5 === 0 ? (compact ? 9 : 14) : 2.3 + index % 3;
      mesh.scale.setScalar(radius * Math.min(1, phase * 14, (1 - phase) * 14));
    });
    if (!activity.current.notified) {
      activity.current.notified = true;
      queueMicrotask(onReady);
    }
    state.invalidate();
  });

  return (
    <group ref={group}>
      {invitationArtwork.map(({ name }, index) => (
        <mesh key={name} ref={mesh => { layers.current[index] = mesh; }} renderOrder={index} geometry={plane}>
          <meshBasicMaterial map={maps[index]} transparent depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
      {Array.from({ length: maxParticles }, (_, index) => (
        <mesh key={index} ref={mesh => { particles.current[index] = mesh; }} renderOrder={10}
          geometry={index % 5 === 0 ? plane : point} material={index % 5 === 0 ? petal : gold} />
      ))}
    </group>
  );
}

export default function Scene(props: SceneProps) {
  return (
    <Canvas flat dpr={[1, 1.25]} frameloop="demand"
      camera={{ fov: 42, position: [0, 0, 1000], near: 0.1, far: 4000 }}
      gl={{ alpha: true, antialias: false, powerPreference: 'low-power' }}
      resize={{ scroll: false }} fallback={null}>
      <Suspense fallback={null}><Layers {...props} /></Suspense>
    </Canvas>
  );
}
