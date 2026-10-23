import * as THREE from 'three';
import { miles } from './forum-models';

// The arena and its fighters, built from primitives in world units, faces
// toward +z. Soldiers are life size (about 1.6 tall) and scaled down in
// ludus.ts; the arena is the sand's ellipse, centred at the origin, with the
// stands on its far (-z) half so the field can be seen into.

const box = (w: number, h: number, d: number, x = 0, y = 0, z = 0) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
const cyl = (rTop: number, rBottom: number, h: number, x = 0, y = 0, z = 0, seg = 12) =>
  new THREE.CylinderGeometry(rTop, rBottom, h, seg).translate(x, y + h / 2, z);
const tube = (points: [number, number, number][], radius: number, segments = 16, radial = 6) =>
  new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))), segments, radius, radial);
const lathe = (profile: [number, number][], segments = 16) => new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), segments);

/* ─── Bodies ─── */

/** Legs, tunic and a head; `bare` for a Gaul (trousers, no armour). */
function body(bare: boolean) {
  const parts: THREE.BufferGeometry[] = [];
  for (const x of [-0.08, 0.08]) parts.push(cyl(0.055, 0.05, 0.55, x, 0, 0, 8));
  parts.push(
    lathe(bare
      ? [[0.1, 0.5], [0.22, 0.5], [0.2, 0.75], [0.2, 1.05], [0.23, 1.22], [0.12, 1.32], [0, 1.33]]
      : [[0.1, 0.45], [0.25, 0.45], [0.22, 0.7], [0.21, 1.0], [0.24, 1.2], [0.12, 1.3], [0, 1.31]]),
  );
  parts.push(new THREE.SphereGeometry(0.115, 12, 10).translate(0, 1.44, 0.01));
  return parts;
}

/** A Gaul's head of hair, limed and swept back, and his moustache. */
function hair() {
  return [
    new THREE.SphereGeometry(0.15, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.6).scale(1.05, 1.15, 1.2).translate(0, 1.47, -0.03),
    tube([[-0.07, 1.4, 0.11], [0, 1.39, 0.125], [0.07, 1.4, 0.11]], 0.015, 8, 4),
  ];
}

const helmet = () => [
  new THREE.SphereGeometry(0.13, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55).translate(0, 1.47, 0),
  box(0.03, 0.12, 0.24, 0, 1.64, 0),
];

/** Arm reaching from the right shoulder to (x, y, z). */
const arm = (x: number, y: number, z: number) => tube([[0.22, 1.25, 0], [x * 0.7 + 0.08, (1.25 + y) / 2, z * 0.5], [x, y, z]], 0.045, 10, 6);

/* ─── Romans ─── */

export function legionarius() {
  return miles();
}

export function sagittarius() {
  const parts = [...body(false), ...helmet().slice(0, 1)];
  // The bow held out in the left hand, the quiver on the back.
  parts.push(tube([[-0.32, 1.55, 0.3], [-0.42, 1.15, 0.38], [-0.32, 0.75, 0.3]], 0.015, 16, 4));
  parts.push(tube([[-0.22, 1.25, 0], [-0.3, 1.18, 0.2], [-0.4, 1.15, 0.36]], 0.045, 10, 6));
  parts.push(cyl(0.06, 0.06, 0.5, 0.05, 0.95, -0.2, 8).rotateX(0.25));
  parts.push(arm(0.12, 1.2, 0.3));
  return parts;
}

export function triarius() {
  const parts = [...body(false), ...helmet()];
  // A round shield and the long hasta, levelled.
  parts.push(new THREE.CylinderGeometry(0.3, 0.3, 0.05, 18).rotateX(Math.PI / 2).translate(-0.24, 0.95, 0.18));
  parts.push(cyl(0.015, 0.015, 2.6, 0, 0, 0, 6).rotateX(Math.PI / 2 - 0.15).translate(0.24, 1.05, -0.9));
  parts.push(arm(0.24, 1.05, 0.3));
  return parts;
}

/* ─── Gauls ─── */

export function gallus() {
  const parts = [...body(true), ...hair()];
  // The tall oval shield, and a long sword raised.
  parts.push(new THREE.CylinderGeometry(0.48, 0.48, 0.9, 14, 1, true, -0.5, 1.0).scale(0.75, 1, 1).rotateY(Math.PI).translate(0.05, 0.85, -0.3));
  parts.push(box(0.03, 0.85, 0.06, 0.32, 1.7, 0.18).rotateX(0));
  parts.push(arm(0.32, 1.28, 0.18));
  return parts;
}

export function funditor() {
  const parts = [...body(true), ...hair()];
  // The sling whirled overhead.
  parts.push(tube([[0.22, 1.25, 0], [0.3, 1.6, 0.05], [0.25, 1.95, 0.1]], 0.04, 10, 6));
  parts.push(tube([[0.25, 1.95, 0.1], [0.05, 2.1, 0.2], [-0.15, 2.0, 0.15]], 0.01, 10, 4));
  return parts;
}

export function hastatusGallus() {
  const parts = [...body(true), ...hair()];
  parts.push(new THREE.CylinderGeometry(0.26, 0.26, 0.05, 14).rotateX(Math.PI / 2).translate(-0.24, 0.95, 0.18));
  parts.push(cyl(0.015, 0.015, 2.2, 0.24, 0.1, 0.15, 6));
  parts.push(arm(0.24, 1.05, 0.2));
  return parts;
}

/* ─── Cavalry ─── */

/** A horse, facing +z, standing on y = 0. */
function equus() {
  const parts: THREE.BufferGeometry[] = [];
  parts.push(new THREE.CapsuleGeometry(0.28, 0.9, 6, 12).rotateX(Math.PI / 2).translate(0, 1.05, 0));
  for (const x of [-0.16, 0.16]) for (const z of [-0.45, 0.45]) parts.push(cyl(0.06, 0.05, 0.85, x, 0, z, 8));
  parts.push(cyl(0.12, 0.17, 0.6, 0, 0, 0, 10).rotateX(-0.7).translate(0, 1.15, 0.6));
  parts.push(box(0.17, 0.2, 0.45, 0, 1.62, 0.95).rotateX(0));
  parts.push(tube([[0, 1.15, -0.72], [0, 0.95, -0.85], [0, 0.6, -0.82]], 0.05, 10, 6));
  return parts;
}

/** A rider on a horse: Roman (helmet, spear) or Gallic (hair, spear, oval shield). */
function eques(gaul: boolean) {
  const parts = equus();
  const rider: THREE.BufferGeometry[] = [];
  rider.push(lathe([[0.1, 0], [0.22, 0], [0.2, 0.35], [0.22, 0.55], [0.12, 0.65], [0, 0.66]]));
  rider.push(new THREE.SphereGeometry(0.11, 12, 10).translate(0, 0.78, 0));
  if (gaul) rider.push(new THREE.SphereGeometry(0.14, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.6).scale(1.05, 1.15, 1.2).translate(0, 0.81, -0.03));
  else rider.push(new THREE.SphereGeometry(0.125, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55).translate(0, 0.81, 0));
  for (const x of [-0.16, 0.16]) rider.push(tube([[x, 0.05, 0], [x * 1.6, -0.25, 0.1], [x * 1.5, -0.5, 0.15]], 0.045, 8, 5));
  rider.push(cyl(0.015, 0.015, 2.2, 0, 0, 0, 6).rotateX(Math.PI / 2 - 0.35).translate(0.22, 0.5, -0.4));
  rider.push(tube([[0.2, 0.55, 0], [0.24, 0.45, 0.2], [0.22, 0.5, 0.3]], 0.04, 8, 5));
  if (gaul) rider.push(new THREE.CylinderGeometry(0.4, 0.4, 0.7, 12, 1, true, -0.5, 1.0).scale(0.7, 1, 1).rotateY(Math.PI / 2).translate(-0.45, 0.3, 0));
  for (const g of rider) parts.push(g.translate(0, 1.25, -0.1));
  return parts;
}

export const equesRomanus = () => eques(false);
export const equesGallus = () => eques(true);

/* ─── Standards ─── */

/** A legion's signum: pole, crossbar and discs, with its red cloth (returned separately, to be dyed). */
export function signum() {
  const pole = [cyl(0.03, 0.035, 2.6, 0, 0, 0, 8), box(0.7, 0.04, 0.04, 0, 2.35, 0)];
  for (const y of [1.3, 1.6, 1.9]) pole.push(new THREE.CylinderGeometry(0.1, 0.1, 0.03, 14).rotateX(Math.PI / 2).translate(0, y, 0.03));
  pole.push(new THREE.ConeGeometry(0.06, 0.2, 8).translate(0, 2.7, 0));
  return { pole, cloth: [box(0.62, 0.75, 0.015, 0, 1.95, 0.04)] };
}

/** A Gallic standard: a boar on a pole. */
export function aper() {
  return [
    cyl(0.03, 0.035, 2.5, 0, 0, 0, 8),
    new THREE.CapsuleGeometry(0.1, 0.3, 4, 8).rotateX(Math.PI / 2).translate(0, 2.62, 0),
    new THREE.ConeGeometry(0.07, 0.16, 8).rotateX(Math.PI / 2).translate(0, 2.6, 0.3),
    box(0.02, 0.12, 0.25, 0, 2.78, -0.02),
    ...[-0.12, 0.12].flatMap((z) => [-0.05, 0.05].map((x) => cyl(0.02, 0.02, 0.14, x, 2.42, z, 6))),
  ];
}

/* ─── The arena ─── */

export const SAND = { rx: 14, rz: 9.5 };

/** Points round an ellipse, from angle a0 to a1 (0 = +x, π/2 = +z). */
const around = (rx: number, rz: number, a0: number, a1: number, n: number) =>
  Array.from({ length: n }, (_, i) => {
    const a = a0 + ((a1 - a0) * i) / (n - 1 || 1);
    return { x: Math.cos(a) * rx, z: Math.sin(a) * rz, a };
  });

/** A band of the ellipse (radii scaled from rx, rz), as an open ring segment of a cylinder. Three's theta 0 is +z. */
const band = (rx: number, rz: number, h: number, y: number, thetaStart = 0, thetaLength = Math.PI * 2, open = true) =>
  new THREE.CylinderGeometry(1, 1, h, 96, 1, open, thetaStart, thetaLength).scale(rx, 1, rz).translate(0, y + h / 2, 0);

/**
 * One tier of seats: a band of the ellipse between an inner and an outer
 * edge, over the far half (−z) or the near one, with its seat at height `top`.
 */
function tier(rxIn: number, rzIn: number, rxOut: number, rzOut: number, top: number, far = true) {
  const s = new THREE.Shape();
  // Shape y becomes world z after the turn below; the far half is y < 0.
  const [a0, a1] = far ? [Math.PI, Math.PI * 2] : [0, Math.PI];
  s.absellipse(0, 0, rxOut, rzOut, a0, a1, false, 0);
  s.absellipse(0, 0, rxIn, rzIn, a1, a0, true, 0);
  return new THREE.ExtrudeGeometry(s, { depth: top, bevelEnabled: false, curveSegments: 48 }).rotateX(Math.PI / 2).translate(0, top, 0);
}

export function arena() {
  const { rx, rz } = SAND;
  const sand: THREE.BufferGeometry[] = [new THREE.CircleGeometry(1, 96).rotateX(-Math.PI / 2).scale(rx, 1, rz)];
  const stone: THREE.BufferGeometry[] = [];
  // The podium wall round the sand, low enough to look over on the near side.
  stone.push(band(rx + 0.2, rz + 0.2, 1.1, 0, Math.PI / 2, Math.PI, true));
  stone.push(band(rx + 0.2, rz + 0.2, 0.5, 0, -Math.PI / 2, Math.PI, true));
  // Its coping: a ring, not a lid (a closed band would cap the far sand).
  stone.push(tier(rx + 0.12, rz + 0.12, rx + 0.42, rz + 0.42, 1.2));
  // The cavea: tiers of seats rising on the far half.
  const TIERS = 7;
  for (let k = 0; k < TIERS; k++) {
    stone.push(tier(rx + 0.35 + k * 0.85, rz + 0.35 + k * 0.85, rx + 0.35 + (k + 1) * 0.85, rz + 0.35 + (k + 1) * 0.85, 1.2 + k * 0.55));
  }
  // The near stands, cut away: a few low tiers, so the eye can see over them.
  for (let k = 0; k < 3; k++) {
    stone.push(tier(rx + 0.45 + k * 0.85, rz + 0.45 + k * 0.85, rx + 0.45 + (k + 1) * 0.85, rz + 0.45 + (k + 1) * 0.85, 0.45 + k * 0.2, false));
  }
  // The outer arcade, behind the top tier.
  const top = { rx: rx + 0.6 + TIERS * 0.85, rz: rz + 0.6 + TIERS * 0.85 };
  for (const p of around(top.rx, top.rz, Math.PI + 0.05, 2 * Math.PI - 0.05, 30)) {
    stone.push(box(0.4, 2.6, 0.5, 0, 0, 0).rotateY(-p.a + Math.PI / 2).translate(p.x, 1.2 + TIERS * 0.55 + 1.3, p.z));
  }
  stone.push(band(top.rx, top.rz, 0.35, 1.2 + TIERS * 0.55 + 2.6, Math.PI / 2, Math.PI, true));
  stone.push(band(top.rx + 0.1, top.rz + 0.1, 0.15, 1.2 + TIERS * 0.55 + 2.95, Math.PI / 2, Math.PI, true));
  // The gates at either end of the long axis.
  for (const s of [-1, 1]) {
    stone.push(box(0.4, 2.2, 0.4, s * (rx + 0.3), 1.1, -1.2), box(0.4, 2.2, 0.4, s * (rx + 0.3), 1.1, 1.2));
    stone.push(box(0.5, 0.35, 2.8, s * (rx + 0.3), 2.35, 0));
  }
  // The emperor's box, at the middle of the far side, under its awning (returned separately, to be dyed).
  const pulvinar = [box(3.2, 0.2, 1.6, 0, 2.2, -(rz + 1.2)), box(3.2, 0.9, 0.1, 0, 2.75, -(rz + 0.45))];
  for (const x of [-1.5, 1.5]) for (const z of [-0.5, -1.9]) pulvinar.push(cyl(0.06, 0.06, 1.6, x, 2.3, -(rz + 0.7) + z + 0.7, 8));
  const awning = [box(3.6, 0.05, 2.0, 0, 3.95, -(rz + 1.2)).rotateX(0)];
  return { sand, stone: [...stone, ...pulvinar], awning };
}

/**
 * The crowd on the tiers, for one merged mesh: a seated spectator is a robe
 * and a head, light enough to fill the stands.
 */
export function crowd(seed = 3, part: 0 | 1 = 0) {
  const { rx, rz } = SAND;
  let s = seed;
  const rand = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const parts: THREE.BufferGeometry[] = [];
  const figure = [lathe([[0, 0], [0.3, 0], [0.26, 0.5], [0.14, 0.78], [0, 0.8]], 8), new THREE.SphereGeometry(0.13, 8, 6).translate(0, 0.92, 0)];
  for (let k = 0; k < 7; k++) {
    const r = { x: rx + 0.6 + k * 0.85 - 0.35, z: rz + 0.6 + k * 0.85 - 0.35 };
    const y = 1.2 + k * 0.55;
    for (const [i, p] of around(r.x, r.z, Math.PI + 0.12, 2 * Math.PI - 0.12, 46).entries()) {
      if (rand() < 0.45 || Math.abs(p.x) < 1.8 || (i + k) % 2 !== part) continue;
      for (const g of figure) {
        parts.push(g.clone().scale(0.5, 0.5 + rand() * 0.1, 0.5).translate(p.x, y, p.z));
      }
    }
  }
  figure.forEach((g) => g.dispose());
  return parts;
}

/* ─── The Colosseum, as the Via Sacra sees it ─── */

/** The amphitheatre's outside: three arcaded storeys and an attic, its long axis along x. */
export function amphitheatrum(rx = 3.8, rz = 3.1) {
  const parts: THREE.BufferGeometry[] = [];
  const storey = 1.25;
  const N = 30;
  for (let t = 0; t < 3; t++) {
    const y = t * storey;
    for (const p of around(rx, rz, 0, Math.PI * 2 - (Math.PI * 2) / N, N)) {
      const turn = -p.a + Math.PI / 2;
      parts.push(box(0.2, storey - 0.15, 0.32, 0, 0, 0).rotateY(turn).translate(p.x, y + (storey - 0.15) / 2, p.z));
      // Half-columns on the piers: Tuscan, Ionic, Corinthian, as it goes up.
      parts.push(new THREE.CylinderGeometry(0.05, 0.06, storey - 0.2, 8).rotateY(turn).translate(p.x * 1.02, y + storey / 2, p.z * 1.02));
    }
    parts.push(band(rx + 0.03, rz + 0.03, 0.15, y + storey - 0.15));
    // The arches' heads, as a band pierced only below: a solid ring above each bay's crown.
    parts.push(band(rx - 0.02, rz - 0.02, 0.2, y + storey - 0.35));
  }
  parts.push(band(rx, rz, 1.0, 3 * storey));
  for (const p of around(rx + 0.01, rz + 0.01, 0, Math.PI * 2 - (Math.PI * 2) / 15, 15)) {
    parts.push(box(0.22, 0.28, 0.04, 0, 0, 0).rotateY(-p.a + Math.PI / 2).translate(p.x, 3 * storey + 0.55, p.z));
  }
  parts.push(band(rx + 0.05, rz + 0.05, 0.12, 3 * storey + 1.0));
  // The inner seating bowl, seen over the rim.
  parts.push(band(rx - 0.35, rz - 0.35, 3 * storey + 0.6, 0, 0, Math.PI * 2, true));
  parts.push(new THREE.CircleGeometry(1, 48).rotateX(-Math.PI / 2).scale(rx - 0.4, 1, rz - 0.4).translate(0, 0.02, 0));
  // AMPHITHEATRVM, cut in the attic over the way in.
  const panel = { y: 3 * storey + 0.5, z: rz + 0.03, w: 2.6, h: 0.3 };
  return { parts, front: rz, panel };
}
