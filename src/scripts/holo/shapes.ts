import * as THREE from 'three';
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js';

// Each shape is a list of parts. A part is a surface (sampled by area) or a
// curve (sampled along its length), with a weight that decides how many of the
// shared particles it receives. Weights are relative within a shape.
type Part =
  | { kind: 'surface'; geometry: THREE.BufferGeometry; weight: number; jitter?: number }
  | { kind: 'curve'; curve: THREE.Curve<THREE.Vector3>; weight: number; jitter?: number };

export type ShapeId = 'galea' | 'fides' | 'currus';

// Deterministic PRNG so every visit renders the same constellation.
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const surface = (geometry: THREE.BufferGeometry, weight: number, jitter = 0): Part => ({
  kind: 'surface',
  geometry,
  weight,
  jitter,
});

const curve = (points: [number, number, number][], weight: number, jitter = 0): Part => ({
  kind: 'curve',
  curve: new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))),
  weight,
  jitter,
});

const line = (a: [number, number, number], b: [number, number, number], weight: number): Part => ({
  kind: 'curve',
  curve: new THREE.LineCurve3(new THREE.Vector3(...a), new THREE.Vector3(...b)),
  weight,
});

const box = (w: number, h: number, d: number, x = 0, y = 0, z = 0) =>
  new THREE.BoxGeometry(w, h, d).translate(x, y, z);

// Extrudes a 2D profile drawn in the XY plane, centred on Z.
function extrude(shape: THREE.Shape, depth: number, bevel = 0.04, segments = 3) {
  const g = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: segments,
    curveSegments: 48,
  });
  return g.translate(0, 0, -depth / 2);
}

function polyShape(points: [number, number][]) {
  const s = new THREE.Shape();
  s.moveTo(...points[0]);
  for (const p of points.slice(1)) s.lineTo(...p);
  s.closePath();
  return s;
}

// Strands from a base arc hugging the crown out to a taller, wider outer arc.
// t sweeps strand by strand, so uniform sampling spreads points across all of them.
class CrestCurve extends THREE.Curve<THREE.Vector3> {
  constructor(private strands: number) {
    super();
  }

  getPoint(t: number, target = new THREE.Vector3()) {
    const f = Math.min(t * this.strands, this.strands - 1e-6);
    const i = Math.floor(f);
    const along = f - i;
    const u = (i / (this.strands - 1)) * 2 - 1; // −1 back … +1 front
    const baseZ = u * 0.85;
    const baseY = 1.04 * Math.sqrt(Math.max(0, 1 - (baseZ / 1.12) ** 2)) + 0.1;
    const lift = 0.5 + 0.35 * Math.sin(((u + 1) / 2) * Math.PI) + 0.08 * u;
    const tipZ = baseZ * 1.28 - 0.05;
    const tipY = baseY + lift;
    const sway = Math.sin(i * 12.9898) * 0.05;
    return target.set(sway * along, baseY + (tipY - baseY) * along, baseZ + (tipZ - baseZ) * along);
  }
}

/* ─── I · Galea — Imperial Gallic legionary helmet ─────────────────────── */

function galea(): Part[] {
  const S = new THREE.Vector3(0.9, 0.98, 1.1);
  const scaled = (g: THREE.BufferGeometry) => g.scale(S.x, S.y, S.z);

  const bowl = scaled(new THREE.SphereGeometry(1, 64, 32, 0, Math.PI * 2, 0, Math.PI * 0.56));
  const rim = scaled(new THREE.TorusGeometry(1.0, 0.035, 8, 96).rotateX(Math.PI / 2).translate(0, -0.18, 0));

  // Brow ridge: the reinforcing bar across the forehead.
  const brow = scaled(
    new THREE.TorusGeometry(1.03, 0.045, 8, 64, Math.PI * 0.9)
      .rotateX(Math.PI / 2)
      .rotateY(-Math.PI * 0.05)
      .translate(0, 0.12, 0),
  );

  // Neck guard: a flared skirt across the back.
  const neck = scaled(
    new THREE.CylinderGeometry(1.0, 1.75, 0.3, 48, 4, true, Math.PI * 0.6, Math.PI * 0.8).translate(0, -0.32, 0),
  );

  // Cheek guards hang from each side, slightly forward of centre.
  const cheekR = new THREE.CylinderGeometry(0.98, 0.86, 0.7, 24, 8, true, Math.PI / 2 - 0.62, 0.62).translate(0, -0.55, 0);
  const cheekL = new THREE.CylinderGeometry(0.98, 0.86, 0.7, 24, 8, true, -Math.PI / 2 + 0.0, 0.62).translate(0, -0.55, 0);
  scaled(cheekR);
  scaled(cheekL);

  // Crest: a fan of horsehair strands running front to back along the crown.
  const crest: Part = { kind: 'curve', curve: new CrestCurve(70), weight: 0.24 };

  // Crest holder knob on the crown.
  const knob = new THREE.CylinderGeometry(0.07, 0.11, 0.18, 16).translate(0, 1.12, 0);

  return [
    surface(bowl, 0.3),
    crest,
    surface(neck, 0.12),
    surface(cheekR, 0.08),
    surface(cheekL, 0.08),
    surface(brow, 0.06),
    surface(rim, 0.06),
    surface(knob, 0.02),
  ];
}

/* ─── II · Fides — violin and bow ──────────────────────────────────────── */

function fides(): Part[] {
  // Right half of the body outline, bottom to top (body length = 2 units).
  const half: [number, number][] = [
    [0, -1],
    [0.36, -0.96],
    [0.56, -0.74],
    [0.6, -0.46],
    [0.52, -0.2],
    [0.42, -0.12],
    [0.31, 0.02],
    [0.4, 0.2],
    [0.48, 0.38],
    [0.47, 0.62],
    [0.36, 0.88],
    [0, 1],
  ];
  const spline = new THREE.SplineCurve(half.map(([x, y]) => new THREE.Vector2(x, y))).getPoints(80);
  const outline = [...spline, ...spline.slice(1, -1).reverse().map((p) => new THREE.Vector2(-p.x, p.y))];
  const bodyShape = new THREE.Shape(outline);
  const body = extrude(bodyShape, 0.2, 0.07, 4);

  const top = 0.17; // front plate height incl. arching
  const fhole = (side: 1 | -1) =>
    curve(
      [
        [side * 0.24, -0.38, top],
        [side * 0.2, -0.3, top],
        [side * 0.19, -0.12, top],
        [side * 0.16, 0.02, top],
        [side * 0.12, 0.08, top],
      ],
      0.018,
    );

  const neck = box(0.14, 0.78, 0.12, 0, 1.38, 0.02);

  // Fingerboard: tapered from scroll end to body end.
  const fingerboard = box(0.24, 1.5, 0.05, 0, 1.0, top + 0.06);
  {
    const p = fingerboard.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const k = THREE.MathUtils.mapLinear(p.getY(i), 0.25, 1.75, 1, 0.55);
      p.setX(i, p.getX(i) * k);
    }
  }

  const pegbox = box(0.12, 0.42, 0.14, 0, 1.97, 0);
  const pegs = [0, 1, 2, 3].map((i) =>
    new THREE.CylinderGeometry(0.025, 0.035, 0.34, 8).rotateZ(Math.PI / 2).translate(i % 2 ? 0.17 : -0.17, 1.84 + i * 0.075, 0),
  );

  // Scroll: an Archimedean spiral swept as a ribbon.
  const scrollPts: [number, number, number][] = [];
  for (let i = 0; i <= 60; i++) {
    const t = i / 60;
    const a = t * Math.PI * 4.4;
    const r = 0.13 * (1 - 0.8 * t);
    scrollPts.push([0, 2.28 + r * Math.sin(a), 0.02 + r * Math.cos(a)]);
  }
  const scroll = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(scrollPts.map((p) => new THREE.Vector3(...p))), 120, 0.035, 8);
  const scrollL = scroll.clone().translate(-0.04, 0, 0);
  scroll.translate(0.04, 0, 0);

  const strings = [-1.5, -0.5, 0.5, 1.5].map((k) => [
    line([k * 0.03, -0.62, top + 0.05], [k * 0.05, -0.2, top + 0.2], 0.008),
    line([k * 0.05, -0.2, top + 0.2], [k * 0.026, 1.76, top + 0.1], 0.022),
  ]).flat();

  const bridge = box(0.32, 0.025, 0.18, 0, -0.2, top + 0.1);
  const tailpiece = extrude(polyShape([[-0.05, -0.97], [0.05, -0.97], [0.1, -0.55], [-0.1, -0.55]]), 0.03, 0.01, 1).translate(0, 0, top + 0.04);

  // Bow: stick with a slight camber, hair ribbon, frog and tip. Built along X then laid across the violin.
  const L = 2.15;
  const stickPts: [number, number, number][] = [];
  for (let i = 0; i <= 20; i++) {
    const x = -L + (2 * L * i) / 20;
    stickPts.push([x, 0.13 - 0.06 * (1 - (x / L) ** 2), 0]);
  }
  const stick = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(stickPts.map((p) => new THREE.Vector3(...p))), 120, 0.022, 6);
  const hair = new THREE.PlaneGeometry(2 * L - 0.35, 0.05).rotateX(Math.PI / 2).translate(0.12, 0, 0);
  const frog = box(0.3, 0.13, 0.06, -L + 0.3, 0.06, 0);
  const tip = box(0.06, 0.15, 0.04, L - 0.02, 0.07, 0);
  const layBow = (g: THREE.BufferGeometry) => g.rotateZ(1.05).translate(0.25, 0.15, 0.55);
  [stick, hair, frog, tip].forEach(layBow);

  return [
    surface(body, 0.36),
    fhole(1),
    fhole(-1),
    surface(neck, 0.035),
    surface(fingerboard, 0.07),
    surface(pegbox, 0.03),
    ...pegs.map((g) => surface(g, 0.005)),
    surface(scroll, 0.025),
    surface(scrollL, 0.025),
    ...strings,
    surface(bridge, 0.015),
    surface(tailpiece, 0.025),
    surface(stick, 0.09),
    surface(hair, 0.05),
    surface(frog, 0.02),
    surface(tip, 0.005),
  ];
}

/* ─── III · Currus — modern Formula 1 car ──────────────────────────────── */

function currus(): Part[] {
  // Unit ≈ 1.27 m. X runs rear (−) to nose (+), Y is up, Z is width.
  // Tread plus the outer sidewall; solid caps read as discs once sampled.
  const tire = (x: number, z: number, r: number, w: number) =>
    new THREE.CylinderGeometry(r, r, w, 48, 2, true).rotateX(Math.PI / 2).translate(x, r, z);
  const rim = (x: number, z: number, r: number, w: number) =>
    new THREE.RingGeometry(r * 0.58, r, 48, 2).translate(x, r, z + Math.sign(z) * (w / 2));

  // Monocoque + engine cover in side profile, narrowed toward nose and tail.
  const tub = extrude(
    polyShape([
      [2.25, 0.16],
      [2.2, 0.24],
      [1.0, 0.42],
      [0.42, 0.52],
      [0.2, 0.5],
      [-0.25, 0.56],
      [-0.42, 0.84],
      [-0.62, 0.84],
      [-1.0, 0.6],
      [-1.62, 0.42],
      [-1.86, 0.34],
      [-1.86, 0.12],
      [2.25, 0.12],
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
  }

  const sidepodShape = polyShape([
    [0.42, 0.14],
    [0.42, 0.44],
    [0.28, 0.5],
    [-0.4, 0.46],
    [-1.25, 0.26],
    [-1.3, 0.14],
  ]);
  const podR = extrude(sidepodShape, 0.3, 0.06, 3).translate(0, 0, 0.42);
  const podL = extrude(sidepodShape, 0.3, 0.06, 3).translate(0, 0, -0.42);

  const floor = box(2.6, 0.025, 1.12, -0.35, 0.07, 0);

  const frontWing = [
    box(0.46, 0.025, 1.72, 1.98, 0.08, 0),
    box(0.3, 0.02, 1.6, 1.86, 0.15, 0).rotateZ(0),
    box(0.22, 0.02, 1.5, 1.8, 0.21, 0),
    box(0.55, 0.2, 0.02, 1.92, 0.15, 0.87),
    box(0.55, 0.2, 0.02, 1.92, 0.15, -0.87),
  ];

  const rearWing = [
    box(0.34, 0.03, 0.98, -1.98, 0.74, 0),
    box(0.22, 0.025, 0.98, -1.9, 0.86, 0),
    box(0.25, 0.02, 0.86, -1.88, 0.36, 0),
    box(0.6, 0.62, 0.025, -1.96, 0.58, 0.5),
    box(0.6, 0.62, 0.025, -1.96, 0.58, -0.5),
    box(0.06, 0.38, 0.03, -1.86, 0.52, 0),
  ];

  // Halo loop over the cockpit and its centre pillar.
  const halo = new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3(
      [
        [-0.32, 0.58, 0.25],
        [-0.05, 0.7, 0.24],
        [0.22, 0.72, 0.13],
        [0.3, 0.72, 0],
        [0.22, 0.72, -0.13],
        [-0.05, 0.7, -0.24],
        [-0.32, 0.58, -0.25],
      ].map((p) => new THREE.Vector3(...(p as [number, number, number]))),
    ),
    80,
    0.022,
    6,
  );
  const pillar = new THREE.CylinderGeometry(0.02, 0.025, 0.24, 6)
    .rotateZ(0.8)
    .translate(0.4, 0.62, 0);
  const helmet = new THREE.SphereGeometry(0.12, 24, 16).translate(-0.12, 0.66, 0);
  const mirrors = [0.36, -0.36].map((z) => box(0.08, 0.05, 0.12, 0.35, 0.62, z));

  const arms = [1, -1].flatMap((s) => [
    line([1.1, 0.4, s * 0.15], [1.38, 0.38, s * 0.5], 0.005),
    line([1.55, 0.36, s * 0.12], [1.38, 0.38, s * 0.5], 0.005),
    line([1.15, 0.2, s * 0.18], [1.38, 0.18, s * 0.5], 0.005),
    line([-1.05, 0.38, s * 0.2], [-1.3, 0.4, s * 0.45], 0.005),
    line([-1.55, 0.36, s * 0.15], [-1.3, 0.4, s * 0.45], 0.005),
    line([-1.1, 0.18, s * 0.22], [-1.3, 0.18, s * 0.45], 0.005),
  ]);

  return [
    surface(tire(1.38, 0.66, 0.29, 0.24), 0.04),
    surface(tire(1.38, -0.66, 0.29, 0.24), 0.04),
    surface(tire(-1.3, 0.64, 0.3, 0.3), 0.05),
    surface(tire(-1.3, -0.64, 0.3, 0.3), 0.05),
    surface(rim(1.38, 0.66, 0.29, 0.24), 0.02),
    surface(rim(1.38, -0.66, 0.29, 0.24), 0.02),
    surface(rim(-1.3, 0.64, 0.3, 0.3), 0.02),
    surface(rim(-1.3, -0.64, 0.3, 0.3), 0.02),
    surface(tub, 0.26),
    surface(podR, 0.06),
    surface(podL, 0.06),
    surface(floor, 0.03),
    ...frontWing.map((g) => surface(g, 0.024)),
    ...rearWing.map((g) => surface(g, 0.024)),
    surface(halo, 0.025),
    surface(pillar, 0.004),
    surface(helmet, 0.014),
    ...mirrors.map((g) => surface(g, 0.003)),
    ...arms,
  ];
}

/* ─── Sampling ─────────────────────────────────────────────────────────── */

// Presentation pose per shape, applied before normalisation.
const POSE: Record<ShapeId, THREE.Euler> = {
  galea: new THREE.Euler(0.12, -1.2, 0),
  fides: new THREE.Euler(-0.45, 0.35, -0.55),
  currus: new THREE.Euler(0.24, -0.38, 0),
};

const BUILDERS: Record<ShapeId, () => Part[]> = { galea, fides, currus };

export const SHAPES: ShapeId[] = ['galea', 'fides', 'currus'];

/**
 * Samples `count` points across a shape's parts, centred on the origin and
 * scaled so its largest dimension equals `size`. Points are sorted along X so
 * morphs between shapes sweep across the stage instead of crossing randomly.
 */
export function sampleShape(id: ShapeId, count: number, size = 4.4, seed = 7): Float32Array {
  const rand = mulberry32(seed + id.length * 131);
  const parts = BUILDERS[id]();
  const total = parts.reduce((s, p) => s + p.weight, 0);

  const out = new Float32Array(count * 3);
  const v = new THREE.Vector3();
  const rot = new THREE.Matrix4().makeRotationFromEuler(POSE[id]);
  let written = 0;

  parts.forEach((part, pi) => {
    const n = pi === parts.length - 1 ? count - written : Math.round((part.weight / total) * count);
    const take = Math.min(n, count - written);
    let sampler: MeshSurfaceSampler | null = null;
    if (part.kind === 'surface') {
      sampler = new MeshSurfaceSampler(new THREE.Mesh(part.geometry)).setRandomGenerator(rand).build();
    }
    for (let i = 0; i < take; i++) {
      if (sampler) sampler.sample(v);
      else if (part.kind === 'curve') part.curve.getPoint(rand(), v);
      const j = part.jitter ?? 0;
      if (j) v.set(v.x + (rand() - 0.5) * j, v.y + (rand() - 0.5) * j, v.z + (rand() - 0.5) * j);
      v.applyMatrix4(rot);
      out.set([v.x, v.y, v.z], (written + i) * 3);
    }
    written += take;
    if (part.kind === 'surface') part.geometry.dispose();
  });

  // Normalise to a common footprint.
  const bbox = new THREE.Box3().setFromArray(out);
  const center = bbox.getCenter(new THREE.Vector3());
  const dims = bbox.getSize(new THREE.Vector3());
  const k = size / Math.max(dims.x, dims.y, dims.z);
  for (let i = 0; i < out.length; i += 3) {
    out[i] = (out[i] - center.x) * k;
    out[i + 1] = (out[i + 1] - center.y) * k;
    out[i + 2] = (out[i + 2] - center.z) * k;
  }

  // Sort by X with a little noise so the sweep has a ragged edge.
  const order = Array.from({ length: count }, (_, i) => i);
  const key = new Float32Array(count);
  for (let i = 0; i < count; i++) key[i] = out[i * 3] + (rand() - 0.5) * 0.6;
  order.sort((a, b) => key[a] - key[b]);
  const sorted = new Float32Array(count * 3);
  order.forEach((src, dst) => sorted.set(out.subarray(src * 3, src * 3 + 3), dst * 3));
  return sorted;
}
