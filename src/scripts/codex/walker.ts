import * as THREE from 'three';
import { gsap } from 'gsap';
import { createMarker, type Marker } from './marker';

// The reader's citizen on foot, shared by the walkable plates (the forum, the
// library): arrow keys or WASD walk him, a clicked spot draws him to it, and a
// path can walk him somewhere on his own (in at a door, up to a shelf).

export interface Walker {
  /** Advance one frame. Returns whether he is moving. */
  step(dt: number): boolean;
  /** Make for a spot on the floor (it is clamped to where he may walk); it's marked with a ping. */
  walkTo(point: THREE.Vector3): void;
  /** Mark the spot under the pointer as where he'd go (clamped too), or clear it (null). */
  aim(point: THREE.Vector3 | null): void;
  /** Walk a path on his own, ignoring the keys; fades him into a doorway at the end if asked. */
  follow(points: THREE.Vector3[], options?: { intoDoorway?: boolean }): Promise<void>;
  /** Walking on his own along a path. */
  readonly busy: boolean;
  /** Stand still: drop the keys, the spot and any path. */
  halt(): void;
  /** Turn to face a heading at once (after being placed). */
  face(heading: number): void;
  /** Deaf to the keys (the scene is only being looked at), or listening again. */
  pause(on: boolean): void;
  dispose(): void;
}

interface Options {
  speed: number;
  /** Keep a position where he may walk (in place). */
  clamp: (p: THREE.Vector3) => void;
  reducedMotion: boolean;
  /** Enter was pressed (not on a link or button, not while typing). */
  onEnterKey?: () => void;
}

const KEYMAP: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0], KeyA: [-1, 0],
  ArrowRight: [1, 0], KeyD: [1, 0],
  ArrowUp: [0, -1], KeyW: [0, -1],
  ArrowDown: [0, 1], KeyS: [0, 1],
};

const typing = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));

const angleTo = (from: number, to: number) => {
  let d = (to - from) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
};

export function createWalker(citizen: THREE.Object3D, { speed, clamp, reducedMotion, onEnterKey }: Options): Walker {
  const keys = new Set<string>();
  const velocity = new THREE.Vector3();
  const want = new THREE.Vector3();
  const heading = { value: citizen.rotation.y };
  let stride = 0;
  let stroll: THREE.Vector3 | null = null;
  let path: gsap.core.Tween | null = null;
  // The marks on the ground, sized to him, hung in his scene once he's in one.
  const height = new THREE.Box3().setFromObject(citizen).getSize(new THREE.Vector3()).y || 1;
  let marker: Marker | null = null;
  const marks = () => {
    if (!marker && citizen.parent) marker = createMarker(citizen.parent, height * 0.2, reducedMotion);
    return marker;
  };

  let paused = false;
  const onKeyDown = (e: KeyboardEvent) => {
    if (paused) return;
    if (e.metaKey || e.ctrlKey || e.altKey || typing(e.target)) return;
    if (KEYMAP[e.code]) {
      if (path) return;
      e.preventDefault();
      keys.add(e.code);
      stroll = null;
    } else if (e.code === 'Enter' && !(e.target instanceof HTMLAnchorElement || e.target instanceof HTMLButtonElement)) {
      onEnterKey?.();
    }
  };
  const onKeyUp = (e: KeyboardEvent) => keys.delete(e.code);
  const onBlur = () => keys.clear();
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);

  const turn = (dt: number) => {
    citizen.rotation.y += angleTo(citizen.rotation.y, heading.value) * Math.min(1, dt * 10);
  };

  return {
    step(dt) {
      marker?.update(dt);
      if (path) {
        turn(dt);
        citizen.position.y = Math.abs(Math.sin(stride)) * 0.06;
        return true;
      }
      // Keys, or a spot to make for.
      want.set(0, 0, 0);
      keys.forEach((k) => {
        want.x += KEYMAP[k][0];
        want.z += KEYMAP[k][1];
      });
      if (stroll) {
        want.subVectors(stroll, citizen.position).setY(0);
        if (want.length() < 0.1) stroll = null;
      }
      if (want.lengthSq() > 0) want.normalize().multiplyScalar(speed);
      velocity.lerp(want, Math.min(1, dt * 9));
      const moving = velocity.length() > 0.05;

      citizen.position.addScaledVector(velocity, dt);
      clamp(citizen.position);
      if (moving) {
        heading.value = Math.atan2(velocity.x, velocity.z);
        stride += dt * 9;
      }
      turn(dt);
      citizen.position.y = moving ? Math.abs(Math.sin(stride)) * 0.06 : citizen.position.y * 0.8;
      citizen.rotation.z = moving ? Math.sin(stride) * 0.04 : 0;
      return moving;
    },
    walkTo(point) {
      stroll = point.clone().setY(0);
      clamp(stroll);
      marks()?.ping(stroll);
    },
    aim(point) {
      if (!point || path) return marks()?.aim(null);
      const spot = point.clone().setY(0);
      clamp(spot);
      marks()?.aim(spot);
    },
    follow(points, { intoDoorway = false } = {}) {
      keys.clear();
      stroll = null;
      path?.kill();
      const curve = new THREE.CurvePath<THREE.Vector3>();
      let from = citizen.position.clone().setY(0);
      for (const p of points) {
        if (from.distanceTo(p) > 0.05) curve.add(new THREE.LineCurve3(from, p.clone()));
        from = p;
      }
      if (!curve.curves.length || reducedMotion) {
        if (points.length) citizen.position.copy(points[points.length - 1]);
        return Promise.resolve();
      }
      const length = curve.getLength();
      const state = { t: 0 };
      const tangent = new THREE.Vector3();
      return new Promise<void>((resolve) => {
        path = gsap.to(state, {
          t: 1,
          duration: THREE.MathUtils.clamp(length / speed, 0.5, 3.2),
          ease: 'power1.inOut',
          onUpdate: () => {
            curve.getPointAt(state.t, citizen.position);
            curve.getTangentAt(Math.min(state.t, 0.999), tangent);
            heading.value = Math.atan2(tangent.x, tangent.z);
            stride += 0.25;
            if (intoDoorway) {
              // Into the shadow of the doorway.
              const fade = THREE.MathUtils.smoothstep(state.t, 0.8, 1);
              citizen.scale.setScalar(1 - fade * 0.15);
              citizen.visible = fade < 0.98;
            }
          },
          onComplete: () => {
            path = null;
            resolve();
          },
        });
      });
    },
    get busy() {
      return path !== null;
    },
    halt() {
      path?.kill();
      path = null;
      keys.clear();
      stroll = null;
      velocity.set(0, 0, 0);
    },
    pause(on) {
      paused = on;
      if (on) keys.clear();
    },
    face(value) {
      heading.value = value;
      citizen.rotation.y = value;
    },
    dispose() {
      path?.kill();
      marker?.dispose();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    },
  };
}
