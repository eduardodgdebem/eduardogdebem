import * as THREE from 'three';
import { fine } from './passes';

// Where the citizen would go, marked on the ground in rubric: under the
// pointer, a ring turning slowly with four ticks; where it's clicked, four
// chevrons closing on the spot as a ring tightens and fades. Drawn in the ink
// pass only (pure red there is read as rubric by the paper pass).

export interface Marker {
  /** Show where the pointer is on the ground, or hide it (null). */
  aim(point: THREE.Vector3 | null): void;
  /** The spot was chosen: play the ping there. */
  ping(point: THREE.Vector3): void;
  update(dt: number): void;
  dispose(): void;
}

const PING = 0.5; // s

/** Marks of `radius` (world units), hung in `parent` (the citizen's scene). */
export function createMarker(parent: THREE.Object3D, radius: number, reducedMotion: boolean): Marker {
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.MeshBasicMaterial[] = [];
  const ink = () => {
    const m = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -4,
    });
    materials.push(m);
    return m;
  };
  const flat = (g: THREE.BufferGeometry) => {
    g.rotateX(-Math.PI / 2);
    geometries.push(g);
    return g;
  };
  const ring = (r: number, w: number) => flat(new THREE.RingGeometry(r - w / 2, r + w / 2, 56));
  // A chevron pointing at the centre, its tip at the origin.
  const chevron = (len: number, wide: number) => {
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.lineTo(wide, len);
    s.lineTo(0, len * 0.55);
    s.lineTo(-wide, len);
    s.closePath();
    return flat(new THREE.ShapeGeometry(s));
  };
  const tick = (len: number, w: number) => flat(new THREE.PlaneGeometry(w, len).translate(0, len / 2, 0));

  /* Aim: a ring and four ticks, turning. */
  const aimMat = ink();
  const aim = new THREE.Group();
  aim.add(new THREE.Mesh(ring(radius, radius * 0.12), aimMat));
  aim.add(new THREE.Mesh(ring(radius * 0.18, radius * 0.08), aimMat));
  const tickGeo = tick(radius * 0.32, radius * 0.07);
  for (let i = 0; i < 4; i++) {
    const t = new THREE.Mesh(tickGeo, aimMat);
    t.rotation.y = (i * Math.PI) / 2;
    t.position.set(Math.sin(t.rotation.y) * radius * 1.12, 0, Math.cos(t.rotation.y) * radius * 1.12);
    // Ticks point outward along their own axis.
    t.rotateY(Math.PI);
    aim.add(t);
  }
  aim.visible = false;

  /* Ping: chevrons closing in, a ring tightening. */
  const pingMat = ink();
  const ping = new THREE.Group();
  const pingRing = new THREE.Mesh(ring(radius, radius * 0.12), pingMat);
  ping.add(pingRing);
  const chevGeo = chevron(radius * 0.55, radius * 0.4);
  // Each on a diagonal, its tip turned in toward the spot.
  const chevrons = [0, 1, 2, 3].map((i) => {
    const c = new THREE.Mesh(chevGeo, pingMat);
    c.userData.angle = (i * Math.PI) / 2 + Math.PI / 4;
    c.rotation.y = c.userData.angle + Math.PI;
    ping.add(c);
    return c;
  });
  ping.visible = false;

  const root = new THREE.Group();
  root.add(aim, ping);
  fine(root);
  parent.add(root);

  let aimTarget = 0; // opacity
  let pingT = PING;

  return {
    aim(point) {
      if (point) {
        aim.position.set(point.x, 0.02, point.z);
        aim.visible = true;
      }
      aimTarget = point ? 0.9 : 0;
    },
    ping(point) {
      ping.position.set(point.x, 0.025, point.z);
      ping.visible = true;
      pingT = 0;
    },
    update(dt) {
      aimMat.opacity += (aimTarget - aimMat.opacity) * Math.min(1, dt * 14);
      if (aimMat.opacity < 0.01 && aimTarget === 0) aim.visible = false;
      if (!reducedMotion) aim.rotation.y += dt * 0.9;
      if (pingT < PING) {
        pingT = Math.min(PING, pingT + dt);
        const k = pingT / PING;
        const ease = 1 - (1 - k) ** 3;
        // The chevrons close from well out to just round the spot.
        const d = radius * (2.1 - 1.2 * ease);
        chevrons.forEach((c) => c.position.set(Math.sin(c.userData.angle) * d, 0, Math.cos(c.userData.angle) * d));
        pingRing.scale.setScalar(1.5 - 0.8 * ease);
        pingMat.opacity = k < 0.25 ? k / 0.25 : 1 - (k - 0.25) / 0.75;
        if (pingT >= PING) ping.visible = false;
      }
    },
    dispose() {
      root.removeFromParent();
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
    },
  };
}
