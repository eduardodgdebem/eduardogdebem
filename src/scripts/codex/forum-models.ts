import * as THREE from 'three';

// The Via Sacra on the home plate, built from primitives in world units:
// ground at y = 0, the street running along x, buildings fronting it from the
// north (-z) with their faces toward +z. Builders return geometries; forum.ts
// merges each building into one mesh and gives each place its own material so
// it can be picked out in red.

const box = (w: number, h: number, d: number, x = 0, y = 0, z = 0) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
const cyl = (rTop: number, rBottom: number, h: number, x = 0, y = 0, z = 0, seg = 20) =>
  new THREE.CylinderGeometry(rTop, rBottom, h, seg).translate(x, y + h / 2, z);
const tube = (points: [number, number, number][], radius: number, segments = 40, radial = 8) =>
  new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))), segments, radius, radial);
const lathe = (profile: [number, number][], segments = 40) => new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), segments);

function prism(shape: THREE.Shape, depth: number) {
  return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 24 }).translate(0, 0, -depth / 2);
}

/** A column with base and capital, standing on y = 0. */
function column(x: number, z: number, h: number, r: number, y = 0): THREE.BufferGeometry[] {
  return [
    cyl(r * 1.45, r * 1.55, h * 0.05, x, y, z),
    cyl(r * 0.85, r, h * 0.88, x, y + h * 0.05, z),
    cyl(r * 1.4, r * 0.9, h * 0.04, x, y + h * 0.93, z),
    box(r * 3, h * 0.03, r * 3, x, y + h * 0.985, z),
  ];
}

/** Stepped platform, `steps` high, top at the returned height. */
function steps(w: number, d: number, n: number, rise: number, inset: number) {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < n; i++) parts.push(box(w - i * inset * 2, rise, d - i * inset * 2, 0, rise * (i + 0.5), 0));
  return { parts, top: n * rise };
}

/* ─── Bibliotheca: a small temple-fronted library ─── */

export function bibliotheca() {
  const parts: THREE.BufferGeometry[] = [];
  const base = steps(4.2, 3.4, 3, 0.16, 0.16);
  parts.push(...base.parts);
  const y = base.top;
  const h = 2.0;

  // Cella, with a tall doorway and two windows for reading light.
  parts.push(box(3.0, h, 2.0, 0, y + h / 2, -0.45));
  parts.push(box(0.8, 1.35, 0.06, 0, y + 0.675, 0.58));
  parts.push(box(0.92, 0.08, 0.1, 0, y + 1.39, 0.59));
  for (const x of [-1.05, 1.05]) parts.push(box(0.36, 0.5, 0.05, x, y + 1.25, 0.57));

  // Portico: six columns, entablature, pediment.
  for (let i = 0; i < 6; i++) parts.push(...column(-1.55 + i * 0.62, 1.15, h, 0.12, y));
  parts.push(box(3.75, 0.22, 3.0, 0, y + h + 0.11, -0.2));
  parts.push(box(3.85, 0.1, 3.1, 0, y + h + 0.27, -0.2));
  const gable = new THREE.Shape();
  gable.moveTo(-1.95, 0);
  gable.lineTo(1.95, 0);
  gable.lineTo(0, 0.78);
  gable.closePath();
  parts.push(prism(gable, 3.1).translate(0, y + h + 0.32, -0.2));
  // Acroteria.
  for (const x of [-1.9, 0, 1.9]) parts.push(new THREE.SphereGeometry(0.09, 12, 8).translate(x, y + h + 0.32 + (x === 0 ? 0.82 : 0.06), 1.35));

  // Scroll cases (capsae) by the steps, rolls standing in them.
  for (const x of [-1.75, 1.75]) {
    parts.push(cyl(0.22, 0.22, 0.42, x, 0, 2.0, 24));
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      parts.push(cyl(0.05, 0.05, 0.62, x + Math.cos(a) * 0.11, 0, 2.0 + Math.sin(a) * 0.11, 10));
    }
  }
  return { parts, frieze: { y: y + h + 0.11, z: 1.31, w: 3.4, h: 0.2 }, door: new THREE.Vector3(0, 0, 2.6) };
}

/* ─── Fabrica: the smith's workshop ─── */

export function fabrica() {
  const parts: THREE.BufferGeometry[] = [];
  parts.push(box(3.6, 0.14, 2.8, 0, 0.07, 0));
  const y = 0.14;
  const h = 1.7;

  // Front wall with an arched opening onto the forge.
  const front = new THREE.Shape();
  front.moveTo(-1.6, 0);
  front.lineTo(1.6, 0);
  front.lineTo(1.6, h);
  front.lineTo(-1.6, h);
  front.closePath();
  const arch = new THREE.Path();
  arch.moveTo(-0.6, 0);
  arch.lineTo(0.6, 0);
  arch.lineTo(0.6, 0.75);
  arch.absarc(0, 0.75, 0.6, 0, Math.PI, false);
  arch.lineTo(-0.6, 0);
  front.holes.push(arch);
  parts.push(prism(front, 0.22).translate(0, y, 1.1));
  // Voussoirs round the arch.
  for (let k = 0; k <= 8; k++) {
    const a = (k / 8) * Math.PI;
    parts.push(new THREE.BoxGeometry(0.1, 0.2, 0.26).rotateZ(a - Math.PI / 2).translate(Math.cos(a) * 0.7, y + 0.75 + Math.sin(a) * 0.7, 1.1));
  }
  parts.push(box(3.2, h, 0.2, 0, y + h / 2, -1.1));
  for (const x of [-1.5, 1.5]) parts.push(box(0.2, h, 2.4, x, y + h / 2, 0));
  // The hearth inside, and its glow-hole.
  parts.push(box(1.0, 0.5, 0.6, 0, y + 0.25, -0.7));

  // Pitched, tiled roof: two slopes with rows of cover tiles.
  for (const side of [-1, 1]) {
    const slope = box(3.7, 0.08, 1.65, 0, 0, 0).rotateX(side * 0.5).translate(0, y + h + 0.38, side * 0.72);
    parts.push(slope);
    for (let k = 0; k < 9; k++) {
      const x = -1.6 + k * 0.4;
      parts.push(
        new THREE.CylinderGeometry(0.05, 0.05, 1.65, 8, 1, false, 0, Math.PI)
          .rotateX(Math.PI / 2 + side * 0.5)
          .translate(x, y + h + 0.43, side * 0.72),
      );
    }
  }
  parts.push(cyl(0.07, 0.07, 3.7, 0, 0, 0, 10).rotateZ(Math.PI / 2).translate(1.85, y + h + 0.8, 0));

  // Chimney.
  parts.push(box(0.5, 1.5, 0.5, 0.95, y + h + 0.6, -0.55));
  parts.push(box(0.62, 0.1, 0.62, 0.95, y + h + 1.38, -0.55));

  // Signboard over the arch.
  parts.push(box(1.7, 0.32, 0.06, 0, y + h - 0.12, 1.24));

  // Anvil on its stump, out front.
  parts.push(cyl(0.22, 0.26, 0.42, -1.05, 0, 1.75, 18));
  const anvil = new THREE.Shape();
  anvil.moveTo(-0.28, 0);
  anvil.lineTo(0.2, 0);
  anvil.lineTo(0.14, 0.1);
  anvil.lineTo(0.26, 0.16);
  anvil.lineTo(0.26, 0.24);
  anvil.lineTo(-0.2, 0.24);
  anvil.quadraticCurveTo(-0.5, 0.22, -0.56, 0.14);
  anvil.quadraticCurveTo(-0.36, 0.14, -0.28, 0.1);
  anvil.closePath();
  parts.push(prism(anvil, 0.16).translate(-1.05, 0.42, 1.75));
  // Hammer resting on it.
  parts.push(cyl(0.02, 0.02, 0.4, 0, 0, 0, 8).rotateZ(Math.PI / 2 - 0.2).translate(-0.85, 0.68, 1.78));
  parts.push(box(0.08, 0.14, 0.08, -1.05, 0.73, 1.78));

  // A cartwheel leaning on the wall.
  const wheel: THREE.BufferGeometry[] = [new THREE.TorusGeometry(0.42, 0.04, 8, 40), new THREE.CylinderGeometry(0.08, 0.08, 0.14, 16).rotateX(Math.PI / 2)];
  for (let k = 0; k < 8; k++) wheel.push(box(0.03, 0.8, 0.03).rotateZ((k / 8) * Math.PI));
  for (const g of wheel) parts.push(g.rotateY(Math.PI / 2 - 0.25).rotateZ(0.12).translate(1.78, 0.5, 0.7));

  return {
    parts,
    sign: { y: y + h - 0.12, z: 1.28, w: 1.6, h: 0.26 },
    chimney: new THREE.Vector3(0.95, y + h + 1.45, -0.55),
    door: new THREE.Vector3(0, 0, 2.4),
  };
}

/* ─── A citizen in a toga: the statue of the author, and the reader ─── */

export function togatus(pose: 'orator' | 'walker') {
  const parts: THREE.BufferGeometry[] = [];
  // The toga falls as a bell from the shoulders.
  parts.push(
    lathe([
      [0, 0],
      [0.3, 0],
      [0.31, 0.08],
      [0.27, 0.45],
      [0.23, 0.85],
      [0.24, 1.1],
      [0.23, 1.26],
      [0.13, 1.36],
      [0.06, 1.38],
      [0, 1.38],
    ]),
  );
  parts.push(cyl(0.055, 0.06, 0.1, 0, 1.36, 0, 12));
  parts.push(new THREE.SphereGeometry(0.12, 20, 14).scale(0.92, 1.08, 1).translate(0, 1.56, 0.01));
  // The sinus and umbo: folds swept across the body.
  parts.push(tube([[-0.22, 1.3, 0.06], [-0.05, 1.08, 0.22], [0.16, 0.82, 0.2], [0.27, 0.6, 0.08]], 0.045));
  parts.push(tube([[-0.24, 1.0, 0.12], [-0.02, 0.72, 0.27], [0.22, 0.45, 0.18]], 0.035));
  parts.push(tube([[-0.25, 1.28, -0.05], [-0.3, 0.9, 0.0], [-0.29, 0.5, 0.06]], 0.04));
  // Left arm wrapped in the toga, holding a scroll.
  parts.push(tube([[-0.24, 1.27, 0], [-0.3, 1.02, 0.08], [-0.2, 0.86, 0.22]], 0.06));
  parts.push(cyl(0.035, 0.035, 0.26, 0, 0, 0, 10).rotateZ(Math.PI / 2 - 0.4).translate(-0.18, 0.86, 0.26));
  // Right arm: raised in address on the statue, easy at the side on the walker.
  const right: [number, number, number][] =
    pose === 'orator'
      ? [[0.23, 1.27, 0], [0.38, 1.4, 0.16], [0.46, 1.62, 0.3]]
      : [[0.23, 1.27, 0], [0.29, 1.02, 0.04], [0.29, 0.8, 0.1]];
  parts.push(tube(right, 0.05));
  parts.push(new THREE.SphereGeometry(0.055, 12, 10).translate(...right[2]));
  return parts;
}

export function statua() {
  const parts: THREE.BufferGeometry[] = [];
  const base = steps(1.8, 1.8, 2, 0.16, 0.14);
  parts.push(...base.parts);
  let y = base.top;
  parts.push(box(1.24, 0.12, 1.24, 0, y + 0.06, 0));
  parts.push(box(1.05, 1.5, 1.05, 0, y + 0.12 + 0.75, 0));
  parts.push(box(1.24, 0.14, 1.24, 0, y + 1.69, 0));
  const front = { y: y + 0.12 + 0.95, z: 0.53, w: 0.95, h: 0.22 };
  y += 1.76;
  // Plinth under the feet.
  parts.push(box(0.8, 0.08, 0.8, 0, y + 0.04, 0));
  for (const g of togatus('orator')) parts.push(g.scale(1.3, 1.3, 1.3).translate(0, y + 0.08, 0));
  return { parts, inscription: front, door: new THREE.Vector3(0, 0, 1.6) };
}

/* ─── The street: its arches, temples, basilica, curia and houses ─── */

/**
 * A triumphal arch spanning the street. Built facing +x/-x (the street's
 * direction), centred on z = 0. `bays` is 1 (Titus) or 3 (Septimius Severus).
 */
export function arcus(bays: 1 | 3) {
  const parts: THREE.BufferGeometry[] = [];
  const span = bays === 1 ? 7.2 : 10.4;
  const h = bays === 1 ? 5.4 : 5.8;
  const depth = 1.6;
  const face = new THREE.Shape();
  face.moveTo(-span / 2, 0);
  face.lineTo(span / 2, 0);
  face.lineTo(span / 2, h);
  face.lineTo(-span / 2, h);
  face.closePath();
  const bay = (cx: number, w: number, spring: number) => {
    const p = new THREE.Path();
    p.moveTo(cx - w / 2, 0);
    p.lineTo(cx + w / 2, 0);
    p.lineTo(cx + w / 2, spring);
    p.absarc(cx, spring, w / 2, 0, Math.PI, false);
    p.lineTo(cx - w / 2, 0);
    return p;
  };
  face.holes.push(bay(0, 4.0, 2.0));
  if (bays === 3) face.holes.push(bay(-3.75, 1.5, 1.6), bay(3.75, 1.5, 1.6));
  parts.push(prism(face, depth));
  // Attic, cornices and plinths.
  parts.push(box(span + 0.3, 0.2, depth + 0.3, 0, h + 0.1, 0));
  parts.push(box(span - 0.4, 1.3, depth - 0.1, 0, h + 0.85, 0));
  parts.push(box(span, 0.14, depth + 0.2, 0, h + 1.57, 0));
  parts.push(box(span + 0.2, 0.3, depth + 0.3, 0, 0.15, 0));
  // Engaged columns on both faces, between and beside the bays.
  const xs = bays === 1 ? [-3.0, -2.35, 2.35, 3.0] : [-4.85, -2.7, 2.7, 4.85];
  for (const side of [-1, 1]) {
    for (const x of xs) {
      for (const g of column(0, 0, h - 0.4, 0.17, 0.3)) parts.push(g.translate(x, 0, side * (depth / 2 + 0.12)));
    }
  }
  // Keystone and archivolt.
  parts.push(box(0.35, 0.5, depth + 0.1, 0, 4.2, 0));
  parts.push(new THREE.TorusGeometry(2.08, 0.08, 6, 32, Math.PI).translate(0, 2.0, depth / 2 + 0.02));
  parts.push(new THREE.TorusGeometry(2.08, 0.08, 6, 32, Math.PI).translate(0, 2.0, -depth / 2 - 0.02));
  // Turned to span the street: its faces look along it.
  return { parts: parts.map((g) => g.rotateY(Math.PI / 2)), attic: { y: h + 0.85, w: span - 0.8, h: 0.9, depth } };
}

/** Round temple of Vesta: a ring of columns round a drum, under a conical roof. */
export function tholos() {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 3; i++) parts.push(cyl(2.3 - i * 0.18, 2.3 - i * 0.18, 0.16, 0, i * 0.16, 0, 48));
  const y = 0.48;
  parts.push(cyl(1.35, 1.35, 2.4, 0, y, 0, 40));
  parts.push(box(0.6, 1.3, 0.1, 0, y + 0.65, 1.36));
  for (let k = 0; k < 14; k++) {
    const a = (k / 14) * Math.PI * 2;
    parts.push(...column(Math.cos(a) * 1.85, Math.sin(a) * 1.85, 2.5, 0.1, y));
  }
  parts.push(new THREE.TorusGeometry(1.95, 0.16, 8, 48).rotateX(Math.PI / 2).translate(0, y + 2.6, 0));
  parts.push(new THREE.ConeGeometry(2.2, 1.1, 48, 1, true).translate(0, y + 2.6 + 0.55, 0));
  parts.push(new THREE.SphereGeometry(0.18, 12, 8).translate(0, y + 3.75, 0));
  return { parts, front: 2.3 };
}

/** A basilica: two storeys of arcades along the street. */
export function basilica() {
  const parts: THREE.BufferGeometry[] = [];
  const w = 7.6;
  parts.push(...steps(w + 0.6, 3.6, 2, 0.15, 0.15).parts);
  const y = 0.3;
  const storey = (y0: number, h: number, n: number, spring: number) => {
    const s = new THREE.Shape();
    s.moveTo(-w / 2, 0);
    s.lineTo(w / 2, 0);
    s.lineTo(w / 2, h);
    s.lineTo(-w / 2, h);
    s.closePath();
    const bw = (w - 0.4) / n;
    for (let i = 0; i < n; i++) {
      const cx = -w / 2 + 0.2 + bw * (i + 0.5);
      const p = new THREE.Path();
      const r = bw * 0.32;
      p.moveTo(cx - r, 0.0);
      p.lineTo(cx + r, 0.0);
      p.lineTo(cx + r, spring);
      p.absarc(cx, spring, r, 0, Math.PI, false);
      p.lineTo(cx - r, 0.0);
      s.holes.push(p);
    }
    parts.push(prism(s, 0.35).translate(0, y0, 1.4));
    parts.push(box(w + 0.2, 0.14, 0.55, 0, y0 + h + 0.07, 1.4));
  };
  storey(y, 2.0, 7, 1.25);
  storey(y + 2.14, 1.7, 7, 1.0);
  parts.push(box(w, 3.9, 2.6, 0, y + 1.95, -0.2));
  const gable = new THREE.Shape();
  gable.moveTo(-1.6, 0);
  gable.lineTo(1.6, 0);
  gable.lineTo(0, 0.7);
  gable.closePath();
  parts.push(prism(gable, w).rotateY(Math.PI / 2).translate(0, y + 3.98, 0.1));
  return { parts, front: 1.8 };
}

/** The Curia: a tall brick hall, a bronze door, a plain pediment. */
export function curia() {
  const parts: THREE.BufferGeometry[] = [];
  parts.push(...steps(4.4, 4.2, 3, 0.14, 0.14).parts);
  const y = 0.42;
  parts.push(box(3.8, 4.4, 3.4, 0, y + 2.2, -0.2));
  parts.push(box(1.0, 1.9, 0.08, 0, y + 0.95, 1.55));
  parts.push(box(1.3, 0.12, 0.16, 0, y + 1.98, 1.56));
  for (const x of [-1.05, 0, 1.05]) parts.push(box(0.55, 1.0, 0.06, x, y + 3.1, 1.53));
  // Stucco bands ruled across the brick.
  for (const yy of [1.2, 2.45, 3.85]) parts.push(box(3.86, 0.06, 3.46, 0, y + yy, -0.2));
  parts.push(box(4.0, 0.14, 3.6, 0, y + 4.47, -0.2));
  const gable = new THREE.Shape();
  gable.moveTo(-2.0, 0);
  gable.lineTo(2.0, 0);
  gable.lineTo(0, 0.85);
  gable.closePath();
  parts.push(prism(gable, 3.6).translate(0, y + 4.54, -0.2));
  return { parts, front: 2.1 };
}

/** An insula: shops on the street, two storeys of rooms above, a tiled roof. */
export function insula(width = 4.2, storeys = 3) {
  const parts: THREE.BufferGeometry[] = [];
  const sh = 1.35;
  const h = sh * storeys;
  parts.push(box(width, h, 3.0, 0, h / 2, -0.3));
  // Tabernae: wide openings with their counters, and an awning over them.
  const shops = Math.max(2, Math.round(width / 1.6));
  const sw = width / shops;
  for (let i = 0; i < shops; i++) {
    const x = -width / 2 + sw * (i + 0.5);
    parts.push(box(sw * 0.7, 1.0, 0.06, x, 0.55, 1.22));
    parts.push(box(sw * 0.7, 0.4, 0.3, x, 0.2, 1.42));
  }
  parts.push(box(width + 0.2, 0.05, 0.8, 0, 0, 0).rotateX(0.35).translate(0, 1.3, 1.6));
  // Windows on the upper floors, a balcony on the first.
  for (let f = 1; f < storeys; f++) {
    for (let i = 0; i < shops + 1; i++) {
      parts.push(box(0.35, 0.55, 0.05, -width / 2 + (width / (shops + 1)) * (i + 0.5), sh * f + 0.7, 1.22));
    }
  }
  parts.push(box(width * 0.7, 0.07, 0.5, 0, sh + 0.1, 1.45));
  for (let i = 0; i <= 6; i++) parts.push(box(0.03, 0.42, 0.03, -width * 0.35 + (width * 0.7 * i) / 6, sh + 0.34, 1.68));
  parts.push(box(width * 0.7, 0.04, 0.04, 0, sh + 0.55, 1.68));
  for (const side of [-1, 1]) parts.push(box(width + 0.3, 0.07, 1.75, 0, 0, 0).rotateX(side * 0.45).translate(0, h + 0.36, -0.3 + side * 0.78));
  return { parts, front: 1.7 };
}

export function cypress(height = 3.2) {
  return [
    cyl(0.07, 0.09, 0.4, 0, 0, 0, 8),
    lathe([[0, 0.3], [0.32, 0.45], [0.42, height * 0.35], [0.36, height * 0.65], [0.18, height * 0.9], [0, height]], 18),
  ];
}

/** An honorific column: a tall shaft on a pedestal, an eagle-less statue on top. */
export function columnaHonoraria() {
  const parts: THREE.BufferGeometry[] = [box(1.1, 1.1, 1.1, 0, 0.55, 0), box(1.25, 0.14, 1.25, 0, 1.17, 0)];
  parts.push(...column(0, 0, 5.2, 0.32, 1.24));
  // Spiral band of relief winding up the shaft.
  const pts: [number, number, number][] = [];
  for (let k = 0; k <= 120; k++) {
    const a = k * 0.32;
    pts.push([Math.cos(a) * 0.33, 1.6 + k * 0.038, Math.sin(a) * 0.33]);
  }
  parts.push(tube(pts, 0.035, 360, 5));
  for (const g of togatus('orator')) parts.push(g.scale(0.7, 0.7, 0.7).translate(0, 6.45, 0));
  return parts;
}

/** Joints of the street: polygonal basalt blocks on the Via Sacra, squared slabs on the walks. */
export function pavingLines(halfLength: number, halfWidth: number, walk: number) {
  const pts: THREE.Vector3[] = [];
  const y = 0.006;
  const jitter = (i: number, j: number, k: number) => Math.sin(i * 12.9898 + j * 78.233 + k * 3.1) * 43758.5453 % 1;
  // Basalt: a jittered lattice, so the blocks read as irregular polygons.
  const cx = 0.7;
  const cz = 0.6;
  const nx = Math.ceil((halfLength * 2) / cx);
  const nz = Math.round((halfWidth * 2) / cz);
  const node = (i: number, j: number) =>
    new THREE.Vector3(
      -halfLength + i * cx + (j === 0 || j === nz ? 0 : jitter(i, j, 1) * 0.22),
      y,
      -halfWidth + j * ((halfWidth * 2) / nz) + (j === 0 || j === nz ? 0 : jitter(i, j, 2) * 0.16),
    );
  for (let i = 0; i <= nx; i++) {
    for (let j = 0; j <= nz; j++) {
      if (i < nx) pts.push(node(i, j), node(i + 1, j));
      if (j < nz && (i + j) % 2 === 0) pts.push(node(i, j), node(i, j + 1));
      if (j < nz && i < nx && (i + j) % 2 === 1) pts.push(node(i, j), node(i + 1, j + 1));
    }
  }
  // Kerbs, and squared slabs on the walks either side.
  for (const side of [-1, 1]) {
    for (let k = 0; k <= 3; k++) {
      const z = side * (halfWidth + (k / 3) * walk);
      pts.push(new THREE.Vector3(-halfLength, y, z), new THREE.Vector3(halfLength, y, z));
    }
    for (let x = -halfLength; x <= halfLength; x += 1.1) {
      pts.push(new THREE.Vector3(x, y, side * halfWidth), new THREE.Vector3(x, y, side * (halfWidth + walk)));
    }
  }
  return new THREE.BufferGeometry().setFromPoints(pts);
}

export function planet() {
  return [new THREE.SphereGeometry(4, 48, 32)];
}

/* ─── Townspeople ─── */

/** A matron in stola and palla: slimmer, longer, the palla drawn over the head. */
export function matrona() {
  const parts: THREE.BufferGeometry[] = [];
  parts.push(lathe([[0, 0], [0.24, 0], [0.25, 0.1], [0.2, 0.6], [0.18, 1.0], [0.2, 1.22], [0.11, 1.32], [0, 1.33]]));
  parts.push(cyl(0.05, 0.05, 0.08, 0, 1.3, 0, 10));
  parts.push(new THREE.SphereGeometry(0.11, 16, 12).translate(0, 1.48, 0.01));
  // The palla: a hood over the head, falling down the back.
  parts.push(new THREE.SphereGeometry(0.135, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.6).translate(0, 1.49, -0.015));
  parts.push(tube([[-0.13, 1.45, -0.05], [-0.2, 1.1, -0.1], [-0.22, 0.7, -0.05]], 0.05));
  parts.push(tube([[0.13, 1.45, -0.05], [0.2, 1.1, -0.1], [0.22, 0.7, -0.05]], 0.05));
  parts.push(tube([[-0.2, 1.18, 0.02], [0, 1.0, 0.18], [0.2, 1.18, 0.02]], 0.05));
  return parts;
}

/** A legionary: tunic and mail, crested helmet, the curved shield and a pilum. */
export function miles() {
  const parts: THREE.BufferGeometry[] = [];
  for (const x of [-0.08, 0.08]) parts.push(cyl(0.05, 0.045, 0.5, x, 0, 0, 10));
  parts.push(lathe([[0.1, 0.45], [0.25, 0.45], [0.22, 0.7], [0.21, 1.0], [0.24, 1.2], [0.12, 1.3], [0, 1.31]]));
  parts.push(new THREE.TorusGeometry(0.2, 0.03, 6, 20).rotateX(Math.PI / 2).translate(0, 0.78, 0));
  parts.push(new THREE.SphereGeometry(0.115, 16, 12).translate(0, 1.44, 0.01));
  parts.push(new THREE.SphereGeometry(0.13, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.55).translate(0, 1.47, 0));
  parts.push(box(0.03, 0.12, 0.26, 0, 1.64, 0));
  // Scutum on the left arm, pilum upright in the right hand.
  parts.push(new THREE.CylinderGeometry(0.62, 0.62, 0.9, 16, 1, true, -0.4, 0.8).rotateY(-Math.PI / 2).translate(0.3, 0.85, 0.05));
  parts.push(cyl(0.015, 0.015, 1.9, 0.3, 0.1, 0.15, 6));
  parts.push(new THREE.ConeGeometry(0.03, 0.18, 6).translate(0.3, 2.09, 0.15));
  return parts;
}

/* ─── More of the city ─── */

/** A great temple on a high podium, for the back of the forum. */
export function templum() {
  const parts: THREE.BufferGeometry[] = [];
  const podium = 1.4;
  parts.push(box(6.2, podium, 7.4, 0, podium / 2, -0.6));
  parts.push(box(6.5, 0.14, 7.7, 0, podium + 0.07, -0.6));
  const st = steps(4.2, 1.6, 7, podium / 7, 0);
  for (const g of st.parts) parts.push(g.translate(0, 0, 3.6));
  const y = podium + 0.14;
  const h = 3.2;
  parts.push(box(4.6, h, 4.6, 0, y + h / 2, -1.8));
  for (let i = 0; i < 6; i++) for (const z of [2.3, 1.2]) parts.push(...column(-2.5 + i * 1.0, z, h, 0.17, y));
  for (const x of [-2.5, 2.5]) for (const z of [0.1, -1.0, -2.1, -3.2]) parts.push(...column(x, z, h, 0.17, y));
  parts.push(box(5.6, 0.32, 6.8, 0, y + h + 0.16, -0.5));
  const gable = new THREE.Shape();
  gable.moveTo(-2.95, 0);
  gable.lineTo(2.95, 0);
  gable.lineTo(0, 1.05);
  gable.closePath();
  parts.push(prism(gable, 6.8).translate(0, y + h + 0.32, -0.5));
  return { parts, front: 4.4 };
}

/** A market stall: posts, a counter, a slanting awning, amphorae beside it. */
export function stall() {
  const parts: THREE.BufferGeometry[] = [];
  for (const x of [-0.8, 0.8]) for (const z of [-0.4, 0.4]) parts.push(cyl(0.03, 0.03, 1.5, x, 0, z, 6));
  parts.push(box(1.7, 0.08, 0.9, 0, 0.8, 0));
  parts.push(box(1.6, 0.7, 0.05, 0, 0.42, -0.42));
  parts.push(box(1.9, 0.04, 1.2, 0, 0, 0).rotateX(-0.28).translate(0, 1.55, 0.05));
  // Wares on the counter.
  for (let k = 0; k < 4; k++) parts.push(new THREE.SphereGeometry(0.08, 10, 8).translate(-0.5 + k * 0.33, 0.9, 0.1));
  const amphora = lathe([[0, 0], [0.04, 0.02], [0.13, 0.25], [0.12, 0.45], [0.05, 0.55], [0.04, 0.68], [0.06, 0.7], [0, 0.7]], 16);
  for (const [x, z] of [[1.05, 0.2], [1.2, -0.1], [1.05, -0.35]]) parts.push(amphora.clone().translate(x, 0, z));
  amphora.dispose();
  return parts;
}

/** A fountain basin with a jet column. */
export function fons() {
  const parts: THREE.BufferGeometry[] = [];
  parts.push(lathe([[0, 0], [0.9, 0], [0.95, 0.35], [0.85, 0.38], [0.8, 0.12], [0, 0.12]], 32));
  parts.push(cyl(0.1, 0.14, 0.9, 0, 0.12, 0, 12));
  parts.push(lathe([[0, 0.95], [0.35, 0.95], [0.38, 1.08], [0.32, 1.1], [0, 1.02]], 24));
  return parts;
}

/** A standard: pole, crossbar, and a hanging cloth (returned separately, to be dyed and to wave). */
export function vexillum() {
  const pole = [cyl(0.03, 0.035, 2.9, 0, 0, 0, 8), box(0.95, 0.04, 0.04, 0, 2.62, 0), new THREE.TorusGeometry(0.12, 0.025, 6, 20).translate(0, 3.0, 0)];
  pole.push(cyl(0.12, 0.16, 0.12, 0, 0, 0, 10));
  const cloth = new THREE.PlaneGeometry(0.85, 1.05, 6, 10).translate(0, 2.6 - 0.525, 0.03);
  return { pole, cloth };
}

/** A brazier on a tripod; the flame is drawn as lines in forum.ts. */
export function foculus() {
  const parts: THREE.BufferGeometry[] = [];
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2;
    parts.push(tube([[Math.cos(a) * 0.28, 0, Math.sin(a) * 0.28], [Math.cos(a) * 0.16, 0.45, Math.sin(a) * 0.16], [Math.cos(a) * 0.2, 0.85, Math.sin(a) * 0.2]], 0.02, 12, 5));
  }
  parts.push(lathe([[0, 0.8], [0.12, 0.8], [0.26, 0.92], [0.27, 0.98], [0, 0.94]], 20));
  return { parts, flame: new THREE.Vector3(0, 0.98, 0) };
}
