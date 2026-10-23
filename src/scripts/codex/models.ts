import * as THREE from 'three';

// Solid procedural models for the three plates. Built from primitives so the
// site ships no model files; each builder returns a group centred on the origin
// and scaled to a common size. Swap any of these for a loaded .glb later: the
// engraving only needs meshes with normals.

import { circinus, hora, liber, machina, sigillum, stilus } from './scenes';

export type PlateId = 'galea' | 'fides' | 'currus' | 'stilus' | 'sigillum' | 'machina' | 'liber' | 'hora' | 'circinus';
/** The home page's cycle. Inner pages pick one plate each (see src/components/Plate.astro). */
export const PLATES: PlateId[] = ['galea', 'fides', 'currus'];

const box = (w: number, h: number, d: number, x = 0, y = 0, z = 0) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);

function extrude(shape: THREE.Shape, depth: number, bevel = 0.04, segments = 3) {
  return new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: segments,
    curveSegments: 48,
  }).translate(0, 0, -depth / 2);
}

function poly(points: [number, number][]) {
  const s = new THREE.Shape();
  s.moveTo(...points[0]);
  for (const p of points.slice(1)) s.lineTo(...p);
  s.closePath();
  return s;
}

const tube = (points: [number, number, number][], radius: number, segments = 120) =>
  new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))), segments, radius, 10);

/* ─── I · Galea ─── */

function galea(): THREE.BufferGeometry[] {
  const S: [number, number, number] = [0.9, 0.98, 1.1];
  const bowl = new THREE.SphereGeometry(1, 96, 48, 0, Math.PI * 2, 0, Math.PI * 0.56).scale(...S);
  const rim = new THREE.TorusGeometry(1.0, 0.045, 12, 128).rotateX(Math.PI / 2).translate(0, -0.18, 0).scale(...S);
  const brow = new THREE.TorusGeometry(1.03, 0.06, 12, 96, Math.PI * 0.9)
    .rotateX(Math.PI / 2)
    .rotateY(-Math.PI * 0.05)
    .translate(0, 0.12, 0)
    .scale(...S);
  const neck = new THREE.CylinderGeometry(1.0, 1.75, 0.3, 96, 4, true, Math.PI * 0.6, Math.PI * 0.8).translate(0, -0.32, 0).scale(...S);
  const cheek = (start: number) =>
    new THREE.CylinderGeometry(0.98, 0.86, 0.7, 48, 6, true, start, 0.62).translate(0, -0.55, 0).scale(...S);

  // Crest: horsehair fan running front to back; +X of the profile is the face.
  const crestShape = new THREE.Shape();
  crestShape.moveTo(0.78, 0.82);
  crestShape.bezierCurveTo(0.95, 1.55, 0.45, 2.05, -0.15, 2.02);
  crestShape.bezierCurveTo(-0.75, 1.98, -1.2, 1.5, -1.05, 0.62);
  crestShape.lineTo(-0.82, 0.66);
  crestShape.quadraticCurveTo(-0.1, 1.42, 0.62, 0.86);
  crestShape.closePath();
  const crest = extrude(crestShape, 0.22, 0.05, 3).rotateY(-Math.PI / 2);
  const knob = new THREE.CylinderGeometry(0.07, 0.11, 0.18, 24).translate(0, 1.12, 0);

  // Rivets along the brow ridge.
  const rivets = Array.from({ length: 9 }, (_, i) => {
    const a = Math.PI * (0.12 + (i / 8) * 0.76);
    return new THREE.SphereGeometry(0.035, 10, 8).translate(Math.cos(a) * 1.0 * S[0], 0.02 * S[1], Math.sin(a) * 1.0 * S[2]);
  });

  return [bowl, rim, brow, neck, cheek(Math.PI / 2 - 0.62), cheek(-Math.PI / 2), crest, knob, ...rivets];
}

/* ─── II · Fides ─── */

function fides(): THREE.BufferGeometry[] {
  const half: [number, number][] = [
    [0, -1], [0.36, -0.96], [0.56, -0.74], [0.6, -0.46], [0.52, -0.2], [0.42, -0.12],
    [0.31, 0.02], [0.4, 0.2], [0.48, 0.38], [0.47, 0.62], [0.36, 0.88], [0, 1],
  ];
  const spline = new THREE.SplineCurve(half.map(([x, y]) => new THREE.Vector2(x, y))).getPoints(80);
  const outline = [...spline, ...spline.slice(1, -1).reverse().map((p) => new THREE.Vector2(-p.x, p.y))];
  const bodyShape = new THREE.Shape(outline);
  // f-holes cut through the top.
  const fhole = (side: 1 | -1) => {
    const p = new THREE.Path();
    p.moveTo(side * 0.25, -0.36);
    p.bezierCurveTo(side * 0.17, -0.3, side * 0.24, -0.05, side * 0.13, 0.06);
    p.lineTo(side * 0.11, 0.05);
    p.bezierCurveTo(side * 0.21, -0.06, side * 0.14, -0.3, side * 0.23, -0.38);
    p.closePath();
    return p;
  };
  bodyShape.holes.push(fhole(1), fhole(-1));
  const body = extrude(bodyShape, 0.2, 0.07, 5);
  const top = 0.17;

  const neck = box(0.14, 0.78, 0.12, 0, 1.38, 0.02);
  const fingerboard = box(0.24, 1.5, 0.05, 0, 1.0, top + 0.06, );
  {
    const p = fingerboard.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) p.setX(i, p.getX(i) * THREE.MathUtils.mapLinear(p.getY(i), 0.25, 1.75, 1, 0.55));
  }
  const pegbox = box(0.12, 0.42, 0.14, 0, 1.97, 0);
  const pegs = [0, 1, 2, 3].map((i) =>
    new THREE.CylinderGeometry(0.025, 0.04, 0.34, 12).rotateZ(Math.PI / 2).translate(i % 2 ? 0.17 : -0.17, 1.84 + i * 0.075, 0),
  );
  const scrollPts: [number, number, number][] = Array.from({ length: 61 }, (_, i) => {
    const t = i / 60;
    const a = t * Math.PI * 4.4;
    const r = 0.13 * (1 - 0.8 * t);
    return [0, 2.28 + r * Math.sin(a), 0.02 + r * Math.cos(a)];
  });
  const scroll = tube(scrollPts, 0.05, 160);

  const strings = [-1.5, -0.5, 0.5, 1.5].map((k) =>
    tube([[k * 0.03, -0.62, top + 0.05], [k * 0.05, -0.2, top + 0.2], [k * 0.026, 1.76, top + 0.1]], 0.006, 60),
  );
  const bridge = box(0.32, 0.03, 0.18, 0, -0.2, top + 0.1);
  const tailpiece = extrude(poly([[-0.05, -0.97], [0.05, -0.97], [0.1, -0.55], [-0.1, -0.55]]), 0.035, 0.01, 1).translate(0, 0, top + 0.04);
  const chinrest = new THREE.SphereGeometry(0.2, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2)
    .scale(1, 0.25, 0.7)
    .rotateX(Math.PI / 2)
    .translate(-0.2, -0.82, top + 0.02);

  // Bow, built along X then laid across the violin.
  const L = 2.15;
  const stick = tube(
    Array.from({ length: 21 }, (_, i) => {
      const x = -L + (2 * L * i) / 20;
      return [x, 0.13 - 0.06 * (1 - (x / L) ** 2), 0] as [number, number, number];
    }),
    0.024,
  );
  const hair = box(2 * L - 0.35, 0.012, 0.06, 0.12, 0, 0);
  const frog = box(0.3, 0.13, 0.07, -L + 0.3, 0.06, 0);
  const tip = box(0.06, 0.15, 0.045, L - 0.02, 0.07, 0);
  const bow = [stick, hair, frog, tip].map((g) => g.rotateZ(1.05).translate(0.25, 0.15, 0.55));

  return [body, neck, fingerboard, pegbox, ...pegs, scroll, ...strings, bridge, tailpiece, chinrest, ...bow];
}

/* ─── III · Currus ─── */

function currus(): THREE.BufferGeometry[] {
  const tire = (x: number, z: number, r: number, w: number) =>
    new THREE.CylinderGeometry(r, r, w, 64, 2).rotateX(Math.PI / 2).translate(x, r, z);
  const hub = (x: number, z: number, r: number, w: number) =>
    new THREE.CylinderGeometry(r * 0.55, r * 0.55, w + 0.02, 32).rotateX(Math.PI / 2).translate(x, r, z);

  const tub = extrude(
    poly([
      [2.25, 0.16], [2.2, 0.24], [1.0, 0.42], [0.42, 0.52], [0.2, 0.5], [-0.25, 0.56], [-0.42, 0.84],
      [-0.62, 0.84], [-1.0, 0.6], [-1.62, 0.42], [-1.86, 0.34], [-1.86, 0.12], [2.25, 0.12],
    ]),
    0.46,
    0.05,
    3,
  );
  {
    const p = tub.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      let k = 1;
      if (x > 0.9) k = THREE.MathUtils.mapLinear(x, 0.9, 2.3, 1, 0.38);
      else if (x < -1.0) k = THREE.MathUtils.mapLinear(x, -1.0, -1.9, 1, 0.55);
      p.setZ(i, p.getZ(i) * k);
    }
    tub.computeVertexNormals();
  }
  const podShape = poly([[0.42, 0.14], [0.42, 0.44], [0.28, 0.5], [-0.4, 0.46], [-1.25, 0.26], [-1.3, 0.14]]);
  const pods = [0.42, -0.42].map((z) => extrude(podShape, 0.3, 0.06, 3).translate(0, 0, z));
  const floor = box(2.6, 0.025, 1.12, -0.35, 0.07, 0);
  const frontWing = [
    box(0.46, 0.03, 1.72, 1.98, 0.08, 0),
    box(0.3, 0.025, 1.6, 1.86, 0.15, 0),
    box(0.22, 0.025, 1.5, 1.8, 0.21, 0),
    box(0.55, 0.2, 0.025, 1.92, 0.15, 0.87),
    box(0.55, 0.2, 0.025, 1.92, 0.15, -0.87),
  ];
  const rearWing = [
    box(0.34, 0.035, 0.98, -1.98, 0.74, 0),
    box(0.22, 0.03, 0.98, -1.9, 0.86, 0),
    box(0.25, 0.025, 0.86, -1.88, 0.36, 0),
    box(0.6, 0.62, 0.03, -1.96, 0.58, 0.5),
    box(0.6, 0.62, 0.03, -1.96, 0.58, -0.5),
    box(0.06, 0.38, 0.035, -1.86, 0.52, 0),
  ];
  const halo = tube(
    [[-0.32, 0.58, 0.25], [-0.05, 0.7, 0.24], [0.22, 0.72, 0.13], [0.3, 0.72, 0], [0.22, 0.72, -0.13], [-0.05, 0.7, -0.24], [-0.32, 0.58, -0.25]],
    0.024,
    80,
  );
  const pillar = new THREE.CylinderGeometry(0.02, 0.025, 0.24, 8).rotateZ(0.8).translate(0.4, 0.62, 0);
  const helmet = new THREE.SphereGeometry(0.12, 32, 20).translate(-0.12, 0.66, 0);
  const arms = [1, -1].flatMap((s) =>
    [
      [[1.1, 0.4, s * 0.15], [1.38, 0.38, s * 0.5]],
      [[1.55, 0.36, s * 0.12], [1.38, 0.38, s * 0.5]],
      [[1.15, 0.2, s * 0.18], [1.38, 0.18, s * 0.5]],
      [[-1.05, 0.38, s * 0.2], [-1.3, 0.4, s * 0.45]],
      [[-1.55, 0.36, s * 0.15], [-1.3, 0.4, s * 0.45]],
      [[-1.1, 0.18, s * 0.22], [-1.3, 0.18, s * 0.45]],
    ].map((pts) => tube(pts as [number, number, number][], 0.012, 4)),
  );

  return [
    tire(1.38, 0.66, 0.29, 0.24), tire(1.38, -0.66, 0.29, 0.24), tire(-1.3, 0.64, 0.3, 0.3), tire(-1.3, -0.64, 0.3, 0.3),
    hub(1.38, 0.66, 0.29, 0.24), hub(1.38, -0.66, 0.29, 0.24), hub(-1.3, 0.64, 0.3, 0.3), hub(-1.3, -0.64, 0.3, 0.3),
    tub, ...pods, floor, ...frontWing, ...rearWing, halo, pillar, helmet, ...arms,
  ];
}

const POSE: Record<PlateId, THREE.Euler> = {
  galea: new THREE.Euler(0.12, -1.35, 0),
  fides: new THREE.Euler(-0.45, 0.35, -0.55),
  currus: new THREE.Euler(0.26, -0.45, 0),
  stilus: new THREE.Euler(0.62, -0.35, 0),
  sigillum: new THREE.Euler(-0.15, 0.3, 0.04),
  machina: new THREE.Euler(-0.12, 0.38, 0.05),
  liber: new THREE.Euler(0.72, -0.2, 0.05),
  hora: new THREE.Euler(0.12, 0.3, 0.06),
  circinus: new THREE.Euler(0.15, -0.35, 0.05),
};

const BUILDERS: Record<PlateId, () => THREE.BufferGeometry[]> = { galea, fides, currus, stilus, sigillum, machina, liber, hora, circinus };

// Long, thin objects need a larger size to fill the same plate.
const SIZE: Record<PlateId, number> = {
  galea: 5.2, fides: 6.0, currus: 6.6,
  stilus: 6.4, sigillum: 5.0, machina: 5.2, liber: 6.2, hora: 4.8, circinus: 5.2,
};

/** Meshes for a plate, posed, centred and scaled so the largest dimension is `size`. */
export function buildModel(id: PlateId, material: THREE.Material, size = SIZE[id]) {
  const inner = new THREE.Group();
  for (const g of BUILDERS[id]()) inner.add(new THREE.Mesh(g, material));
  inner.rotation.copy(POSE[id]);
  inner.updateMatrixWorld(true);

  const bbox = new THREE.Box3().setFromObject(inner);
  const dims = bbox.getSize(new THREE.Vector3());
  const k = size / Math.max(dims.x, dims.y, dims.z);
  inner.scale.setScalar(k);
  inner.position.copy(bbox.getCenter(new THREE.Vector3()).multiplyScalar(-k));

  const group = new THREE.Group();
  group.add(inner);
  return group;
}

export function disposeModel(group: THREE.Object3D) {
  group.traverse((o) => {
    if (o instanceof THREE.Mesh) o.geometry.dispose();
  });
}
