import * as THREE from 'three';
import { togatus } from './forum-models';

// Inside the Bibliotheca: the reading room on the field notes' plate, built
// from primitives in world units (floor at y = 0, the back wall toward -z,
// everything facing +z). Builders return geometries; library.ts merges them.

const box = (w: number, h: number, d: number, x = 0, y = 0, z = 0) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
const cyl = (rTop: number, rBottom: number, h: number, x = 0, y = 0, z = 0, seg = 16) =>
  new THREE.CylinderGeometry(rTop, rBottom, h, seg).translate(x, y + h / 2, z);
const tube = (points: [number, number, number][], radius: number, segments = 24, radial = 8) =>
  new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))), segments, radius, radial);
const lathe = (profile: [number, number][], segments = 32) => new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), segments);

/* ─── The armarium: open pigeonholes for rolls ─── */

export const CABINET = { cols: 3, rows: 5, cellW: 0.62, cellH: 0.6, board: 0.06, depth: 1.0, foot: 0.3 };

/** One cabinet, centred on x = 0 with its back at z = 0 and its holes opening toward +z. */
export function armarium() {
  const { cols, rows, cellW, cellH, board, depth, foot } = CABINET;
  const W = cols * cellW + (cols + 1) * board;
  const H = rows * cellH + (rows + 1) * board;
  const z = depth / 2;
  const parts: THREE.BufferGeometry[] = [];
  parts.push(box(W, H, 0.04, 0, foot + H / 2, 0.02));
  for (const side of [-1, 1]) parts.push(box(board, H, depth, side * (W / 2 - board / 2), foot + H / 2, z));
  for (let r = 0; r <= rows; r++) parts.push(box(W, board, depth, 0, foot + r * (cellH + board) + board / 2, z));
  for (let c = 1; c < cols; c++) parts.push(box(board, H, depth, -W / 2 + c * (cellW + board) + board / 2, foot + H / 2, z));
  parts.push(box(W + 0.12, foot, depth + 0.08, 0, foot / 2, z));
  parts.push(box(W + 0.16, 0.16, depth + 0.12, 0, foot + H + 0.08, z));
  parts.push(box(W + 0.26, 0.07, depth + 0.2, 0, foot + H + 0.2, z));
  const cell = (c: number, r: number) => ({
    x: -W / 2 + board + c * (cellW + board) + cellW / 2,
    floor: foot + board + (rows - 1 - r) * (cellH + board),
  });
  return { parts, W, H, top: foot + H + 0.24, front: depth, cell };
}

/** A rolled papyrus lying along z, centred at the origin: the roll, and its rods' knobs. */
export function rollParts(r: number, length: number) {
  const parts = [new THREE.CylinderGeometry(r, r, length, 24).rotateX(Math.PI / 2)];
  for (const end of [-1, 1]) {
    parts.push(new THREE.CylinderGeometry(r * 0.22, r * 0.22, 0.1, 8).rotateX(Math.PI / 2).translate(0, 0, end * (length / 2 + 0.05)));
    parts.push(new THREE.SphereGeometry(r * 0.32, 8, 6).translate(0, 0, end * (length / 2 + 0.11)));
  }
  return parts;
}

/** The rolled layers seen end-on: a spiral of line segments on a roll's front face. */
export function spiral(r: number, cx: number, cy: number, z: number, out: THREE.Vector3[]) {
  const steps = 70;
  let prev: THREE.Vector3 | null = null;
  for (let i = 0; i <= steps; i++) {
    const f = i / steps;
    const a = f * 4 * Math.PI * 2;
    const rr = r * (0.28 + 0.68 * f);
    const p = new THREE.Vector3(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, z);
    if (prev) out.push(prev, p);
    prev = p;
  }
}

/** A portrait bust on a little socle, to stand on top of a cabinet. */
export function imago() {
  return [
    cyl(0.1, 0.12, 0.08),
    lathe([[0, 0.08], [0.17, 0.08], [0.19, 0.13], [0.11, 0.2], [0.2, 0.28], [0.19, 0.4], [0.08, 0.45], [0, 0.45]], 20),
    new THREE.SphereGeometry(0.1, 14, 10).scale(0.9, 1.1, 1).translate(0, 0.56, 0.01),
  ];
}

/* ─── The reading tables ─── */

export const MENSA = { w: 2.8, d: 0.95, h: 0.78, bench: 0.45 };

/** A long table on trestles with a bench either side, centred on the origin, running along x. */
export function mensa() {
  const { w, d, h, bench } = MENSA;
  const parts: THREE.BufferGeometry[] = [box(w, 0.07, d, 0, h - 0.035, 0)];
  for (const x of [-1, 1]) {
    parts.push(box(0.08, h - 0.07, d * 0.7, x * (w / 2 - 0.3), (h - 0.07) / 2, 0));
    parts.push(box(0.1, 0.06, d * 0.85, x * (w / 2 - 0.3), 0.03, 0));
  }
  parts.push(box(w - 0.6, 0.06, 0.06, 0, h * 0.35, 0));
  for (const z of [-1, 1]) {
    parts.push(box(w * 0.92, 0.06, 0.34, 0, bench - 0.03, z * (d / 2 + 0.38)));
    for (const x of [-1, 1]) parts.push(box(0.06, bench - 0.06, 0.28, x * (w * 0.46 - 0.15), (bench - 0.06) / 2, z * (d / 2 + 0.38)));
  }
  return parts;
}

/** Things on a table: an open roll held by two rods, an inkwell, a lamp. Placed at (x, z) on the table top. */
export function openRoll(x: number, z: number, turn = 0) {
  const top = MENSA.h;
  const parts: THREE.BufferGeometry[] = [box(0.5, 0.008, 0.3, 0, top + 0.004, 0)];
  for (const s of [-1, 1]) parts.push(new THREE.CylinderGeometry(0.035, 0.035, 0.34, 10).rotateX(Math.PI / 2).translate(s * 0.27, top + 0.035, 0));
  return parts.map((g) => g.rotateY(turn).translate(x, 0, z));
}

export function lucerna(x: number, z: number) {
  const top = MENSA.h;
  return {
    parts: [lathe([[0, 0], [0.07, 0], [0.09, 0.03], [0.06, 0.06], [0.02, 0.07], [0, 0.07]], 16).scale(1, 1, 1.4).translate(x, top, z)],
    flame: new THREE.Vector3(x, top + 0.07, z + 0.1),
  };
}

/** A reader on the bench, bent over the table in front of him (+z). Hips at the bench, at the origin. */
export function lector() {
  const b = MENSA.bench;
  const parts: THREE.BufferGeometry[] = [];
  const torso = lathe([[0, 0], [0.2, 0], [0.23, 0.22], [0.21, 0.46], [0.12, 0.58], [0, 0.59]], 20);
  parts.push(torso.rotateX(0.32).translate(0, b, 0));
  // Toga over the lap, legs down to the floor.
  parts.push(box(0.44, 0.14, 0.42, 0, b + 0.06, 0.2));
  for (const x of [-0.1, 0.1]) parts.push(cyl(0.065, 0.06, b - 0.02, x, 0, 0.4, 10));
  parts.push(new THREE.SphereGeometry(0.11, 14, 10).translate(0, b + 0.7, 0.3));
  // Arms forward to the roll on the table.
  for (const s of [-1, 1]) parts.push(tube([[s * 0.2, b + 0.48, 0.14], [s * 0.22, b + 0.3, 0.38], [s * 0.14, MENSA.h + 0.04, 0.6]], 0.045));
  return parts;
}

/* ─── The Thinker, rather early ─── */

/** A seated figure on a rock, elbow on knee and chin on hand, on a pedestal. Faces +z. */
export function cogitator() {
  const parts: THREE.BufferGeometry[] = [];
  const ped = 1.05;
  parts.push(box(1.4, 0.14, 1.3, 0, 0.07, 0));
  parts.push(box(1.15, ped - 0.26, 1.05, 0, 0.14 + (ped - 0.26) / 2, 0));
  parts.push(box(1.35, 0.12, 1.25, 0, ped - 0.06, 0));
  const y = ped;
  const k = 1.15; // a little over life size
  const fig: THREE.BufferGeometry[] = [];
  fig.push(new THREE.IcosahedronGeometry(0.42, 0).scale(1.3, 0.75, 1.05).translate(0, 0.28, -0.08));
  // Torso, leaning hard forward over the knees.
  fig.push(lathe([[0, 0], [0.19, 0], [0.22, 0.2], [0.24, 0.42], [0.15, 0.56], [0, 0.57]], 20).rotateX(0.62).translate(0, 0.52, -0.08));
  for (const x of [-0.1, 0.1]) {
    fig.push(tube([[x, 0.56, -0.05], [x, 0.58, 0.22], [x * 1.1, 0.56, 0.4]], 0.075, 12, 8));
    fig.push(tube([[x * 1.1, 0.56, 0.4], [x * 1.1, 0.3, 0.44], [x * 1.1, 0.05, 0.42]], 0.06, 12, 8));
    fig.push(box(0.09, 0.05, 0.2, x * 1.1, 0.03, 0.48));
  }
  // Right elbow on the left knee, the hand under the chin; the left forearm across the left knee.
  fig.push(tube([[0.2, 0.92, 0.22], [0.05, 0.74, 0.38], [-0.07, 0.62, 0.42]], 0.05, 12, 8));
  fig.push(tube([[-0.07, 0.62, 0.42], [-0.04, 0.82, 0.52], [-0.01, 0.98, 0.52]], 0.045, 12, 8));
  fig.push(tube([[-0.21, 0.9, 0.2], [-0.24, 0.7, 0.34], [-0.13, 0.6, 0.46]], 0.05, 12, 8));
  fig.push(new THREE.SphereGeometry(0.115, 16, 12).scale(0.95, 1.05, 1).translate(0, 1.06, 0.5));
  for (const g of fig) parts.push(g.scale(k, k, k).translate(0, y, 0));
  return { parts, panel: { y: 0.55, z: 0.53, w: 1.0, h: 0.18 } };
}

/* ─── The hall ─── */

/**
 * The back wall, `width` wide, with tall arched windows set above the cabinets
 * and the door out to the Via Sacra at `doorX`. Faces +z, its face at z = 0.
 */
export function paries(width: number, height: number, doorX: number, windows: number[]) {
  const s = new THREE.Shape();
  s.moveTo(-width / 2, 0);
  s.lineTo(width / 2, 0);
  s.lineTo(width / 2, height);
  s.lineTo(-width / 2, height);
  s.closePath();
  const arch = (cx: number, w: number, y0: number, spring: number) => {
    const p = new THREE.Path();
    p.moveTo(cx - w / 2, y0);
    p.lineTo(cx + w / 2, y0);
    p.lineTo(cx + w / 2, spring);
    p.absarc(cx, spring, w / 2, 0, Math.PI, false);
    p.lineTo(cx - w / 2, y0);
    return p;
  };
  s.holes.push(arch(doorX, 1.2, 0, 1.9));
  for (const x of windows) s.holes.push(arch(x, 0.7, 4.0, 4.75));
  const parts: THREE.BufferGeometry[] = [new THREE.ExtrudeGeometry(s, { depth: 0.3, bevelEnabled: false, curveSegments: 16 }).translate(0, 0, -0.3)];
  parts.push(box(width + 0.2, 0.18, 0.5, 0, height + 0.09, -0.1));
  parts.push(box(width, 0.12, 0.38, 0, 3.92, -0.05));
  // The door's architrave and lintel.
  for (const s2 of [-1, 1]) parts.push(box(0.14, 2.5, 0.1, doorX + s2 * 0.67, 1.25, 0.04));
  parts.push(box(1.6, 0.16, 0.12, doorX, 2.62, 0.04));
  return parts;
}

/** A pilaster against the back wall. */
export function pilaster(x: number, height: number) {
  return [box(0.36, 0.2, 0.2, x, 0.1, 0.1), box(0.28, height - 0.4, 0.14, x, height / 2, 0.07), box(0.38, 0.2, 0.2, x, height - 0.1, 0.1)];
}

/** A librarian at his lectern. */
export function bibliothecarius() {
  const parts = togatus('walker');
  parts.push(new THREE.BoxGeometry(0.5, 0.06, 0.38).rotateX(0.3).translate(0, 1.0, 0.42));
  parts.push(cyl(0.05, 0.07, 0.95, 0, 0, 0.42, 10));
  parts.push(box(0.3, 0.04, 0.3, 0, 0.02, 0.42));
  return parts;
}
