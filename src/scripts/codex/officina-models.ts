import * as THREE from 'three';
import type { Work } from '../../data/projects';

// Inside the Fabrica: the workshop on the projects' plate, built from
// primitives in world units (floor at y = 0, the back wall toward -z,
// everything facing +z). Builders return geometries; officina.ts merges them.

const box = (w: number, h: number, d: number, x = 0, y = 0, z = 0) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
const cyl = (rTop: number, rBottom: number, h: number, x = 0, y = 0, z = 0, seg = 16) =>
  new THREE.CylinderGeometry(rTop, rBottom, h, seg).translate(x, y + h / 2, z);
const tube = (points: [number, number, number][], radius: number, segments = 24, radial = 8) =>
  new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))), segments, radius, radial);
const lathe = (profile: [number, number][], segments = 32) => new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), segments);

/* ─── Furniture ─── */

export const BENCH = { w: 1.9, d: 0.8, h: 0.86 };

/** A joiner's bench: a thick top on four legs, a stretcher and a shelf under it. */
export function scamnum() {
  const { w, d, h } = BENCH;
  const parts = [box(w, 0.1, d, 0, h - 0.05, 0)];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) parts.push(box(0.1, h - 0.1, 0.1, sx * (w / 2 - 0.12), (h - 0.1) / 2, sz * (d / 2 - 0.1)));
  parts.push(box(w - 0.3, 0.05, d - 0.25, 0, 0.22, 0));
  // A vice at one end.
  parts.push(box(0.14, 0.22, 0.24, w / 2 - 0.05, h - 0.02, d / 2 - 0.12));
  return parts;
}

/** The anvil, on its block. Its face is at y = ANVIL_TOP. */
export const ANVIL_TOP = 0.92;
export function incus() {
  const parts = [cyl(0.32, 0.36, 0.5, 0, 0, 0, 12)];
  parts.push(box(0.36, 0.14, 0.26, 0, 0.57, 0), box(0.22, 0.14, 0.18, 0, 0.71, 0));
  parts.push(box(0.62, 0.14, 0.3, 0, 0.85, 0));
  // The horn.
  parts.push(new THREE.ConeGeometry(0.13, 0.42, 12).rotateZ(Math.PI / 2).scale(1, 0.8, 1).translate(0.5, 0.86, 0));
  return parts;
}

/** The hearth and its hood against the back wall, a chimney up through the roof; the fire is at `fire`. */
export function caminus() {
  const parts = [box(1.9, 0.75, 1.1, 0, 0.375, 0.55)];
  parts.push(box(1.7, 0.08, 0.9, 0, 0.79, 0.55)); // the fire bed's rim
  // The hood: a frustum, wide over the hearth, narrowing to the flue.
  const hood = new THREE.CylinderGeometry(0.42, 1.3, 1.1, 4, 1).rotateY(Math.PI / 4).scale(1, 1, 0.65);
  parts.push(hood.translate(0, 2.25, 0.45));
  parts.push(box(0.62, 2.1, 0.45, 0, 3.85, 0.3));
  // The bellows beside it.
  const bellows = new THREE.CylinderGeometry(0.02, 0.32, 0.9, 4).rotateZ(Math.PI / 2).rotateX(Math.PI / 4).scale(1, 0.55, 1);
  parts.push(bellows.translate(-1.45, 0.62, 0.6), box(0.06, 0.6, 0.06, -1.45, 0.3, 0.6));
  return { parts, fire: new THREE.Vector3(0, 0.84, 0.55) };
}

/** Tools hung on a board on the back wall: hammers, tongs, a saw, files. */
export function instrumenta() {
  const parts = [box(2.4, 1.0, 0.05, 0, 0, 0)];
  const hammer = (x: number, len: number) => [box(0.035, len, 0.035, x, -len / 2 + 0.3, 0.06), box(0.16, 0.08, 0.08, x, 0.3, 0.06)];
  parts.push(...hammer(-0.95, 0.6), ...hammer(-0.7, 0.5));
  // Tongs: two long arms meeting at a rivet.
  parts.push(box(0.03, 0.75, 0.03, -0.38, -0.05, 0.06).rotateZ(0.08), box(0.03, 0.75, 0.03, -0.32, -0.05, 0.06).rotateZ(-0.08));
  // A saw: a blade and its handle.
  parts.push(box(0.7, 0.16, 0.012, 0.25, 0.15, 0.06), box(0.14, 0.2, 0.04, -0.15, 0.17, 0.06));
  // Files and chisels.
  for (const [i, x] of [0.8, 0.92, 1.04].entries()) parts.push(box(0.03, 0.5 - i * 0.08, 0.02, x, 0.05, 0.06));
  parts.push(box(2.4, 0.06, 0.12, 0, 0.36, 0.06)); // the peg rail
  return parts;
}

/* ─── The works: one for each project ─── */

/**
 * The object that stands for a project, centred on the origin with its foot
 * at y = 0, about half a unit tall, facing +z. Its glowing parts (red when it's
 * in focus) are everything; `turn` says whether it should spin on its stand.
 */
export function opus(work: Work): THREE.BufferGeometry[] {
  switch (work) {
    case 'forfex':
      return forfex();
    case 'caput':
      return caput();
    case 'tabula':
      return tabula();
    case 'ouroboros':
      return ouroboros();
  }
}

/** Shears, open, standing on their points in a block, a comb leaning against it. */
function forfex() {
  const parts = [box(0.3, 0.1, 0.22, 0, 0.05, 0)];
  for (const s of [-1, 1]) {
    const blade = new THREE.Shape();
    blade.moveTo(0, 0);
    blade.quadraticCurveTo(0.045, 0.2, 0.025, 0.42);
    blade.lineTo(-0.01, 0.42);
    blade.quadraticCurveTo(0.0, 0.2, 0, 0);
    const g = new THREE.ExtrudeGeometry(blade, { depth: 0.015, bevelEnabled: false }).translate(0, 0, -0.0075);
    g.rotateZ(s * 0.32).translate(-s * 0.06, 0.08, 0);
    parts.push(g);
    // The bow, a ring for a finger, above the pivot.
    parts.push(new THREE.TorusGeometry(0.06, 0.014, 6, 18).translate(s * 0.12, 0.62, 0));
    parts.push(box(0.02, 0.14, 0.015, s * 0.07, 0.52, 0).rotateZ(-s * 0.32));
  }
  parts.push(new THREE.CylinderGeometry(0.022, 0.022, 0.03, 10).rotateX(Math.PI / 2).translate(0, 0.47, 0)); // the pivot
  // The comb: a spine with its teeth, leaning on the block.
  const comb = [box(0.34, 0.04, 0.012, 0, 0.12, 0)];
  for (let i = 0; i < 12; i++) comb.push(box(0.012, 0.1, 0.01, -0.155 + i * 0.028, 0.05, 0));
  for (const g of comb) parts.push(g.rotateX(-0.5).translate(0.02, 0.02, 0.17));
  return parts;
}

/** A hairdresser's head on its stand, the hair braided down the back and pinned up in a bun. */
function caput() {
  const parts = [cyl(0.13, 0.16, 0.05, 0, 0, 0, 16), cyl(0.03, 0.03, 0.22, 0, 0.05, 0, 8)];
  parts.push(lathe([[0, 0], [0.07, 0], [0.06, 0.07], [0.09, 0.1], [0.12, 0.14], [0, 0.15]], 16).translate(0, 0.25, 0)); // neck and shoulders' top
  parts.push(new THREE.SphereGeometry(0.13, 18, 14).scale(0.92, 1.1, 1).translate(0, 0.52, 0));
  // Hair over the crown, a bun at the back, and a braid falling from it.
  parts.push(new THREE.SphereGeometry(0.138, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.55).scale(0.95, 1.1, 1.04).translate(0, 0.53, -0.01));
  parts.push(new THREE.TorusGeometry(0.05, 0.03, 8, 16).translate(0, 0.6, -0.14));
  const braid: [number, number, number][] = [];
  for (let i = 0; i <= 10; i++) braid.push([Math.sin(i * 1.4) * 0.025, 0.56 - i * 0.04, -0.15 - Math.sin((i / 10) * Math.PI) * 0.04]);
  parts.push(tube(braid, 0.025, 40, 6));
  // A hand mirror leaning on the stand.
  parts.push(cyl(0.075, 0.075, 0.012, 0, 0, 0, 20).rotateX(Math.PI / 2 - 0.3).translate(0.2, 0.16, 0.06), box(0.022, 0.13, 0.014, 0.2, 0.05, 0.03).rotateX(-0.3));
  return parts;
}

/** A drafting board on its easel: the sheet pinned on it, a set square and dividers. */
function tabula() {
  const parts: THREE.BufferGeometry[] = [];
  // Easel legs and the board, tipped back.
  for (const s of [-1, 1]) parts.push(box(0.025, 0.62, 0.025, s * 0.22, 0.31, 0.02).rotateX(-0.25));
  parts.push(box(0.025, 0.55, 0.025, 0, 0.27, -0.14).rotateX(0.35));
  const board = [box(0.56, 0.42, 0.025, 0, 0, 0), box(0.6, 0.03, 0.06, 0, -0.225, 0.03)];
  // The sheet a hair proud of the board; its lines are drawn by officina.ts.
  board.push(box(0.46, 0.33, 0.004, 0, 0.01, 0.015));
  // A set square and dividers on the sheet.
  const tri = new THREE.Shape();
  tri.moveTo(0, 0);
  tri.lineTo(0.18, 0);
  tri.lineTo(0, 0.13);
  tri.closePath();
  board.push(new THREE.ExtrudeGeometry(tri, { depth: 0.008, bevelEnabled: false }).translate(0.04, -0.13, 0.018));
  board.push(box(0.012, 0.22, 0.008, -0.12, -0.02, 0.02).rotateZ(0.22), box(0.012, 0.22, 0.008, -0.08, -0.02, 0.02).rotateZ(-0.22));
  for (const g of board) parts.push(g.rotateX(-0.25).translate(0, 0.42, 0.06));
  return parts;
}

/** The ouroboros: a snake bent round into a ring, its tail in its mouth, set upright on the anvil. */
function ouroboros() {
  const R = 0.2;
  const pts: [number, number, number][] = [];
  // Most of the way round, narrowing to the tail, which runs into the jaws.
  for (let i = 0; i <= 40; i++) {
    const a = Math.PI / 2 + (i / 40) * Math.PI * 1.9;
    pts.push([Math.cos(a) * R, Math.sin(a) * R + R + 0.02, Math.sin(i * 0.9) * 0.01]);
  }
  const body = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), 80, 1, 10);
  // Taper the tube toward the tail.
  const p = body.attributes.position as THREE.BufferAttribute;
  const curve = new THREE.CatmullRomCurve3(pts.map((q) => new THREE.Vector3(...q)));
  const spine = new THREE.Vector3();
  for (let v = 0; v < p.count; v++) {
    const u = Math.floor(v / 11) / 80;
    curve.getPointAt(Math.min(1, u), spine);
    const r = 0.045 * (1 - u * 0.8);
    const dx = p.getX(v) - spine.x;
    const dy = p.getY(v) - spine.y;
    const dz = p.getZ(v) - spine.z;
    const len = Math.hypot(dx, dy, dz) || 1;
    p.setXYZ(v, spine.x + (dx / len) * r, spine.y + (dy / len) * r, spine.z + (dz / len) * r);
  }
  body.computeVertexNormals();
  // The head at the top of the ring, its jaws closing on the tail.
  const head = new THREE.SphereGeometry(0.06, 14, 10).scale(1.5, 0.8, 0.9).translate(-0.04, R * 2 + 0.03, 0);
  const jaw = new THREE.ConeGeometry(0.035, 0.08, 8).rotateZ(Math.PI / 2).translate(0.06, R * 2 + 0.01, 0);
  return [body, head, jaw, box(0.18, 0.02, 0.1, 0, 0.01, 0)];
}

/* ─── People ─── */

/** The smith: a stocky figure in a leather apron. His hammer arm is separate, to swing. */
export function faber() {
  const parts = [lathe([[0, 0], [0.24, 0], [0.26, 0.5], [0.22, 0.95], [0.14, 1.12], [0, 1.14]], 16)];
  parts.push(new THREE.SphereGeometry(0.13, 12, 10).translate(0, 1.27, 0));
  parts.push(box(0.36, 0.6, 0.04, 0, 0.62, 0.22)); // apron
  parts.push(box(0.09, 0.4, 0.09, -0.27, 0.85, 0.05).rotateZ(0.2)); // the other arm, on his hip
  // Hanging from the shoulder (the origin): the arm, then the hammer held out in front.
  const arm = [box(0.09, 0.45, 0.09, 0, -0.22, 0), box(0.035, 0.035, 0.32, 0, -0.45, 0.15), box(0.1, 0.16, 0.1, 0, -0.45, 0.3)];
  return { parts, arm, shoulder: new THREE.Vector3(0.27, 1.02, 0.02) };
}
