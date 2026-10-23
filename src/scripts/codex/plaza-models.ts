import * as THREE from 'three';
import { column } from './forum-models';

// The author's plaza on the about page, built from primitives in world units:
// a round paved square (centre at the origin, floor at y = 0), a curved
// colonnade behind, pedestals for the monuments, and an occasional visitor
// from rather further afield.

const box = (w: number, h: number, d: number, x = 0, y = 0, z = 0) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
const cyl = (rTop: number, rBottom: number, h: number, x = 0, y = 0, z = 0, seg = 24) =>
  new THREE.CylinderGeometry(rTop, rBottom, h, seg).translate(x, y + h / 2, z);
const tube = (points: [number, number, number][], radius: number, segments = 32, radial = 8) =>
  new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))), segments, radius, radial);
const lathe = (profile: [number, number][], segments = 24) => new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), segments);

/** The paving's joints as line segments: rings of stone round the centre, cut by radial joints. */
export function pavingRings(radius: number) {
  const pts: THREE.Vector3[] = [];
  const y = 0.005;
  const ring = (r: number, n = 120) => {
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2;
      const a1 = ((i + 1) / n) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a0) * r, y, Math.sin(a0) * r), new THREE.Vector3(Math.cos(a1) * r, y, Math.sin(a1) * r));
    }
  };
  let course = 0;
  for (let r = 1.9; r < radius; r += 0.62, course++) {
    ring(r);
    // Staggered radial joints in each course, about a slab long.
    const n = Math.round((Math.PI * 2 * r) / 0.9);
    for (let i = 0; i < n; i++) {
      const a = ((i + (course % 2) * 0.5) / n) * Math.PI * 2;
      const r1 = Math.min(r + 0.62, radius);
      pts.push(new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r), new THREE.Vector3(Math.cos(a) * r1, y, Math.sin(a) * r1));
    }
  }
  // A double border at the rim.
  ring(radius - 0.12);
  ring(radius - 0.3);
  return new THREE.BufferGeometry().setFromPoints(pts);
}

/** A curved colonnade round the back of the plaza, from angle a0 to a1 (radians, 0 = +x). */
export function porticus(radius: number, a0: number, a1: number, n: number) {
  const parts: THREE.BufferGeometry[] = [];
  const h = 3.0;
  for (let i = 0; i < n; i++) {
    const a = a0 + ((a1 - a0) * i) / (n - 1);
    parts.push(...column(Math.cos(a) * radius, Math.sin(a) * radius, h, 0.14, 0.2));
  }
  // Stylobate and entablature, as ring segments.
  const seg = (r0: number, r1: number, y0: number, y1: number) => {
    const s = new THREE.Shape();
    s.absarc(0, 0, r1, a0 - 0.06, a1 + 0.06, false);
    s.absarc(0, 0, r0, a1 + 0.06, a0 - 0.06, true);
    return new THREE.ExtrudeGeometry(s, { depth: y1 - y0, bevelEnabled: false, curveSegments: 48 }).rotateX(Math.PI / 2).translate(0, y1, 0);
  };
  parts.push(seg(radius - 0.45, radius + 0.45, 0, 0.2));
  parts.push(seg(radius - 0.32, radius + 0.32, 0.2 + h, 0.2 + h + 0.32));
  parts.push(seg(radius - 0.4, radius + 0.4, 0.2 + h + 0.32, 0.2 + h + 0.44));
  // The back wall of the walk behind the columns.
  parts.push(seg(radius + 1.1, radius + 1.3, 0, 0.2 + h + 0.44));
  return parts;
}

/** A monument's pedestal: base, die and cornice; the object stands on top at the returned height. */
export function basis() {
  const parts = [
    box(1.2, 0.16, 1.2, 0, 0.08, 0),
    box(0.92, 0.95, 0.92, 0, 0.16 + 0.475, 0),
    box(1.08, 0.12, 1.08, 0, 1.17, 0),
  ];
  return { parts, top: 1.23, panel: { y: 0.82, z: 0.462, w: 0.84, h: 0.16 } };
}

export function bench(length = 1.6) {
  return [box(length, 0.1, 0.42, 0, 0.45, 0), box(0.12, 0.4, 0.36, -length / 2 + 0.18, 0.2, 0), box(0.12, 0.4, 0.36, length / 2 - 0.18, 0.2, 0)];
}

/* ─── A visitor ─── */

/**
 * A blue box of the kind once used to call the watch, its doors toward +z.
 * The sign panels are returned separately, to be lettered.
 */
export function capsa() {
  const parts: THREE.BufferGeometry[] = [];
  const w = 1.05;
  parts.push(box(w + 0.12, 0.1, w + 0.12, 0, 0.05, 0));
  parts.push(box(w, 2.15, w, 0, 0.1 + 1.075, 0));
  // Corner posts, a little proud of the walls.
  for (const x of [-1, 1]) for (const z of [-1, 1]) parts.push(box(0.12, 2.3, 0.12, x * (w / 2), 0.1 + 1.15, z * (w / 2)));
  // The sign band and the stepped roof, with its lamp.
  parts.push(box(w + 0.14, 0.2, w + 0.14, 0, 2.43, 0));
  parts.push(box(w + 0.02, 0.08, w + 0.02, 0, 2.57, 0));
  parts.push(box(w - 0.18, 0.08, w - 0.18, 0, 2.65, 0));
  parts.push(cyl(0.06, 0.07, 0.16, 0, 2.69, 0, 12));
  parts.push(new THREE.SphereGeometry(0.06, 10, 8).translate(0, 2.88, 0));
  // On each face: panelled doors, the top row of panels glazed.
  for (let side = 0; side < 4; side++) {
    const face: THREE.BufferGeometry[] = [];
    for (const x of [-0.22, 0.22]) {
      for (let row = 0; row < 4; row++) {
        const y = 0.45 + row * 0.45;
        if (row === 3) for (const wx of [-0.06, 0.06]) for (const wy of [-0.06, 0.06]) face.push(box(0.1, 0.1, 0.03, x + wx, y + 0.02 + wy, w / 2 + 0.02));
        else face.push(box(0.32, 0.32, 0.03, x, y, w / 2 + 0.02));
      }
    }
    face.push(box(0.04, 2.0, 0.04, 0, 1.1, w / 2 + 0.03));
    for (const g of face) parts.push(g.rotateY((side * Math.PI) / 2));
  }
  const signs = [0, 1, 2, 3].map((side) => ({ turn: (side * Math.PI) / 2, y: 2.43, z: w / 2 + 0.075, w: w - 0.1, h: 0.13 }));
  return { parts, signs };
}

/** A traveller in a long coat, his scarf (returned separately, to be dyed) wound twice and trailing. Faces +z. */
export function medicus() {
  const body: THREE.BufferGeometry[] = [];
  for (const x of [-0.08, 0.08]) body.push(cyl(0.05, 0.045, 0.6, x, 0, 0, 10));
  body.push(lathe([[0.1, 0.42], [0.26, 0.42], [0.24, 0.8], [0.21, 1.1], [0.23, 1.28], [0.13, 1.36], [0, 1.37]]));
  for (const s of [-1, 1]) body.push(tube([[s * 0.22, 1.28, 0], [s * 0.27, 1.02, 0.03], [s * 0.25, 0.8, 0.08]], 0.05, 12, 8));
  body.push(cyl(0.05, 0.05, 0.08, 0, 1.36, 0, 10));
  body.push(new THREE.SphereGeometry(0.115, 16, 12).translate(0, 1.52, 0.01));
  // A great mop of hair, and a broad-brimmed hat on it.
  body.push(new THREE.SphereGeometry(0.135, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55).scale(1.1, 1, 1.1).translate(0, 1.55, -0.02));
  body.push(cyl(0.24, 0.24, 0.02, 0, 1.63, 0, 20));
  body.push(cyl(0.12, 0.13, 0.12, 0, 1.64, 0, 16));
  const scarf: THREE.BufferGeometry[] = [];
  const loop: [number, number, number][] = [];
  for (let k = 0; k <= 24; k++) {
    const a = (k / 24) * Math.PI * 4;
    loop.push([Math.cos(a) * 0.12, 1.36 - k * 0.004, Math.sin(a) * 0.12]);
  }
  scarf.push(tube(loop, 0.035, 48, 6));
  scarf.push(tube([[0.1, 1.3, 0.08], [0.16, 0.95, 0.16], [0.14, 0.5, 0.2], [0.18, 0.12, 0.22]], 0.035, 24, 6));
  scarf.push(tube([[-0.08, 1.3, 0.1], [-0.14, 1.0, 0.18], [-0.12, 0.7, 0.2]], 0.035, 16, 6));
  return { body, scarf };
}
