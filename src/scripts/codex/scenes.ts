import * as THREE from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';

// Plates for the inner pages of the codex. Like models.ts, everything is built
// from primitives; each builder returns geometries in its own local units and
// buildModel() poses, centres and scales them.

const box = (w: number, h: number, d: number, x = 0, y = 0, z = 0) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);

const tube = (points: [number, number, number][], radius: number, segments = 80, radial = 8) =>
  new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))), segments, radius, radial);

function extrude(shape: THREE.Shape | THREE.Shape[], depth: number, bevel = 0.02, segments = 2) {
  return new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: segments,
    curveSegments: 32,
  }).translate(0, 0, -depth / 2);
}

const lathe = (profile: [number, number][], segments = 64) =>
  new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), segments);

/* ─── Stilus · field notes: an open roll, ink and a quill ─── */

export function stilus(): THREE.BufferGeometry[] {
  const parts: THREE.BufferGeometry[] = [];

  // Sheet between two rollers, sagging a little; one end still partly rolled.
  const sheet = new THREE.PlaneGeometry(2.6, 2.0, 40, 30).rotateX(-Math.PI / 2);
  {
    const p = sheet.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const z = p.getZ(i);
      p.setY(i, 0.05 * Math.sin(x * 2.1) + 0.06 * Math.cos(z * 1.4) + 0.12 * Math.max(0, -z - 0.6) ** 2);
    }
    sheet.computeVertexNormals();
  }
  parts.push(sheet);

  for (const [z, r] of [[1.05, 0.11], [-1.08, 0.2]] as const) {
    parts.push(new THREE.CylinderGeometry(r, r, 2.75, 32).rotateZ(Math.PI / 2).translate(0, r * 0.6, z));
    for (const x of [-1.5, 1.5]) {
      parts.push(new THREE.CylinderGeometry(0.06, 0.06, 0.2, 16).rotateZ(Math.PI / 2).translate(x * 1.03, r * 0.6, z));
      parts.push(new THREE.SphereGeometry(0.1, 16, 12).translate(x * 1.1, r * 0.6, z));
    }
  }

  // Lines of writing: thin raised strokes that follow the sheet.
  for (let row = 0; row < 9; row++) {
    const z = -0.7 + row * 0.19;
    const len = row === 8 ? 1.1 : 1.6 + (row % 3) * 0.2;
    const pts: [number, number, number][] = [];
    for (let k = 0; k <= 12; k++) {
      const x = -1.05 + (k / 12) * len;
      pts.push([x, 0.05 * Math.sin(x * 2.1) + 0.06 * Math.cos(z * 1.4) + 0.012, z]);
    }
    parts.push(tube(pts, 0.012, 24, 4));
  }

  // Inkwell: squat turned bottle with a lip.
  const well = lathe([[0, 0], [0.42, 0], [0.48, 0.08], [0.46, 0.32], [0.28, 0.46], [0.2, 0.5], [0.22, 0.56], [0.18, 0.58], [0.16, 0.5]]);
  parts.push(well.translate(1.75, 0, -0.35));

  // Quill: curved shaft rising out of the well, with an asymmetric vane.
  const quill = new THREE.Group();
  const shaftPts: [number, number, number][] = [[0, 0, 0], [0.05, 0.9, 0], [0.15, 1.8, 0], [0.32, 2.6, 0]];
  const shaft = tube(shaftPts, 0.025, 60, 6);
  const vane = new THREE.Shape();
  vane.moveTo(0.04, 0.55);
  vane.bezierCurveTo(0.34, 0.9, 0.42, 1.9, 0.33, 2.62);
  vane.bezierCurveTo(0.22, 2.1, 0.05, 1.5, 0.02, 1.2);
  vane.bezierCurveTo(-0.16, 1.6, -0.12, 2.2, 0.3, 2.6);
  vane.bezierCurveTo(-0.24, 2.2, -0.22, 1.2, 0.04, 0.55);
  const vaneGeo = extrude(vane, 0.015, 0.006, 1);
  // Barbs: notches cut as slim strokes across the vane.
  const barbs: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 14; i++) {
    const y = 0.8 + i * 0.13;
    barbs.push(tube([[0.06 + y * 0.03, y, 0.01], [0.28 + Math.sin(i) * 0.03, y + 0.12, 0.012]], 0.005, 4, 3));
  }
  for (const g of [shaft, vaneGeo, ...barbs]) quill.add(new THREE.Mesh(g));
  quill.rotation.set(0.1, 0.2, -0.38);
  quill.position.set(1.72, 0.3, -0.38);
  quill.updateMatrixWorld(true);
  quill.traverse((o) => {
    if (o instanceof THREE.Mesh) parts.push(o.geometry.applyMatrix4(o.matrixWorld));
  });

  return parts;
}

/* ─── Sigillum · the author: the sigil pressed into wax, in laurel ─── */

const SIGIL =
  'M186.935,163.024c1.83,-0.328 3.848,-0.669 6.065,-1.024l0,-22c-77.616,10.315 -119.236,53.48 -130,131l-18,0c8.029,-85.417 58.948,-134.056 148,-150l0,-20l-25,0l0,-17l25,0l0,-17l-26,0l0,-17l26,0l0,-23l18,0l0,22l26,0l0,18l-26,0l0,17l26,0l0,17l-26,0l0,20c82.809,9.243 138.835,59.577 149,148l-18,0c-9.378,-74.566 -52.801,-117.211 -130,-130l0,23c4.637,-0.159 4.107,0.696 8.491,1.371c56.323,8.67 99.509,57.396 99.509,116.129c0,64.85 -52.65,117.5 -117.5,117.5c-64.85,0 -117.5,-52.65 -117.5,-117.5c0,-59.574 44.431,-108.852 101.935,-116.476Zm15.565,18.976c-54.364,0 -98.5,44.136 -98.5,98.5c0,54.364 44.136,98.5 98.5,98.5c54.364,0 98.5,-44.136 98.5,-98.5c0,-54.364 -44.136,-98.5 -98.5,-98.5Z';

export function sigillum(): THREE.BufferGeometry[] {
  const parts: THREE.BufferGeometry[] = [];

  // Wax pool: an irregular, puddled edge.
  const wax = new THREE.Shape();
  const N = 90;
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * Math.PI * 2;
    const r = 1.25 + 0.07 * Math.sin(a * 5 + 1) + 0.04 * Math.sin(a * 11 + 2) + 0.05 * Math.sin(a * 3);
    if (i === 0) wax.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else wax.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  parts.push(extrude(wax, 0.18, 0.1, 4));

  // Raised rim and the impressed field.
  parts.push(new THREE.TorusGeometry(0.98, 0.06, 12, 96).translate(0, 0, 0.17));
  parts.push(new THREE.TorusGeometry(0.86, 0.02, 8, 96).translate(0, 0, 0.17));

  // The sigil itself, standing proud of the wax.
  const shapes = SVGLoader.createShapes(new SVGLoader().parse(`<svg xmlns="http://www.w3.org/2000/svg"><path d="${SIGIL}"/></svg>`).paths[0]);
  // Shape units are SVG units, depth is world units: the bevel needs one of each.
  const sigil = new THREE.ExtrudeGeometry(shapes, {
    depth: 0.12,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 2.5,
    bevelSegments: 2,
    curveSegments: 32,
  }).translate(-205.5, -204.5, -0.06); // centre of the 411×409 viewBox
  // SVG y points down. Flipping z too keeps the determinant positive, so the
  // winding (and which faces get culled) survives the mirror.
  sigil.scale(0.0041, -0.0041, -1);
  sigil.translate(0, -0.02, 0.24);
  parts.push(sigil);

  // Laurel: two branches curving up either side, leaves alternating out and in.
  for (const side of [-1, 1]) {
    const pts: [number, number, number][] = [];
    for (let k = 0; k <= 20; k++) {
      const a = -Math.PI / 2 + (k / 20) * Math.PI * 0.82;
      pts.push([side * Math.cos(a) * 1.55, Math.sin(a) * 1.55, 0.05]);
    }
    parts.push(tube(pts, 0.025, 60, 6));
    for (let k = 1; k <= 13; k++) {
      const a = -Math.PI / 2 + (k / 14) * Math.PI * 0.82;
      for (const out of [1, -1]) {
        const leaf = new THREE.SphereGeometry(1, 12, 8).scale(0.07, 0.2, 0.025);
        const r = 1.55 + out * 0.13;
        // Leaves point along the branch, splayed outward or inward.
        leaf.rotateZ(side * (a + Math.PI / 2) * -1 + side * out * 0.55 * -1);
        leaf.translate(side * Math.cos(a + 0.05) * r, Math.sin(a + 0.05) * r, 0.05 + out * 0.03);
        parts.push(leaf);
      }
    }
  }
  // Tied at the base.
  parts.push(new THREE.TorusGeometry(0.09, 0.03, 8, 24).rotateY(Math.PI / 2).translate(0, -1.55, 0.05));

  return parts;
}

/* ─── Machina · dev: a gear train, after the one raised off Antikythera ─── */

function gear(radius: number, teeth: number, depth: number, spokes = 4) {
  const s = new THREE.Shape();
  const tooth = 0.07 + radius * 0.04;
  for (let i = 0; i < teeth; i++) {
    const a0 = (i / teeth) * Math.PI * 2;
    const step = (Math.PI * 2) / teeth;
    const pts = [
      [radius, a0],
      [radius + tooth, a0 + step * 0.18],
      [radius + tooth, a0 + step * 0.48],
      [radius, a0 + step * 0.66],
    ] as const;
    pts.forEach(([r, a], k) => (i === 0 && k === 0 ? s.moveTo(Math.cos(a) * r, Math.sin(a) * r) : s.lineTo(Math.cos(a) * r, Math.sin(a) * r)));
  }
  s.closePath();
  // Lightening holes between the spokes.
  for (let k = 0; k < spokes; k++) {
    const a = (k / spokes) * Math.PI * 2 + Math.PI / spokes;
    const hole = new THREE.Path();
    const r0 = radius * 0.28;
    const r1 = radius * 0.78;
    const half = Math.PI / spokes - 0.22;
    hole.absarc(0, 0, r1, a - half, a + half, false);
    hole.absarc(0, 0, r0, a + half * 0.75, a - half * 0.75, true);
    hole.closePath();
    s.holes.push(hole);
  }
  const axle = new THREE.Path();
  axle.absarc(0, 0, radius * 0.08, 0, Math.PI * 2, true);
  s.holes.push(axle);
  return extrude(s, depth, 0.01, 1);
}

export function machina(): THREE.BufferGeometry[] {
  const parts: THREE.BufferGeometry[] = [];
  const train: [number, number, number, number, number][] = [
    // radius, teeth, x, y, z
    [1.1, 40, 0, 0, 0],
    [0.55, 20, 1.72, 0.28, 0.12],
    [0.7, 26, -0.6, 1.72, -0.12],
    [0.38, 14, 1.2, -1.06, -0.1],
    [0.5, 18, -1.55, -0.45, 0.12],
  ];
  for (const [r, n, x, y, z] of train) {
    parts.push(gear(r, n, 0.09, r > 0.6 ? 4 : 3).rotateZ(x * 0.7).translate(x, y, z));
    parts.push(new THREE.CylinderGeometry(r * 0.08, r * 0.08, 0.5, 16).rotateX(Math.PI / 2).translate(x, y, z));
    parts.push(new THREE.CylinderGeometry(r * 0.16, r * 0.16, 0.12, 24).rotateX(Math.PI / 2).translate(x, y, z + 0.08));
  }
  // Calendar dial in front of the great wheel, with its pointer.
  const dial = new THREE.Shape();
  dial.absarc(0, 0, 0.72, 0, Math.PI * 2, false);
  const inner = new THREE.Path();
  inner.absarc(0, 0, 0.6, 0, Math.PI * 2, true);
  dial.holes.push(inner);
  parts.push(extrude(dial, 0.03, 0.005, 1).translate(0, 0, 0.32));
  for (let k = 0; k < 36; k++) {
    const a = (k / 36) * Math.PI * 2;
    const len = k % 3 === 0 ? 0.12 : 0.06;
    parts.push(box(0.012, len, 0.02, 0, 0.6 - len / 2 - 0.01, 0.36).rotateZ(a));
  }
  parts.push(box(0.04, 0.62, 0.02, 0, 0.26, 0.4).rotateZ(-0.6));
  parts.push(new THREE.SphereGeometry(0.06, 16, 12).translate(0, 0, 0.42));
  // A slim bronze rim the train is mounted in, with two cross-bars behind.
  parts.push(new THREE.TorusGeometry(2.35, 0.05, 10, 128).translate(0, 0.1, -0.3));
  parts.push(box(4.6, 0.08, 0.05, 0, 0.1, -0.32));
  parts.push(box(0.08, 4.6, 0.05, 0, 0.1, -0.32));
  return parts;
}

/* ─── Liber · notes: an open book, a page in mid-turn, a ribbon ─── */

export function liber(): THREE.BufferGeometry[] {
  const parts: THREE.BufferGeometry[] = [];
  const W = 1.5;
  const D = 2.1;
  // Page surface rises from the gutter then levels out.
  const surfaceY = (x: number) => 0.32 * Math.sqrt(Math.min(1, Math.abs(x) / W)) * (1 - 0.18 * (Math.abs(x) / W) ** 3);

  for (const side of [-1, 1]) {
    const page = new THREE.PlaneGeometry(W, D, 40, 4).rotateX(-Math.PI / 2).translate((side * W) / 2, 0, 0);
    const p = page.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) p.setY(i, surfaceY(p.getX(i)) + 0.12);
    page.computeVertexNormals();
    parts.push(page);
    // Block of pages beneath, and the board.
    parts.push(box(W - 0.05, 0.16, D - 0.04, (side * W) / 2, 0.08, 0));
    parts.push(box(W + 0.08, 0.04, D + 0.12, (side * (W + 0.08)) / 2, -0.02, 0));
    // Lines of text.
    for (let row = 0; row < 12; row++) {
      const z = -0.85 + row * 0.15;
      const pts: [number, number, number][] = [];
      for (let k = 0; k <= 10; k++) {
        const x = side * (0.18 + (k / 10) * (W - 0.4));
        pts.push([x, surfaceY(x) + 0.13, z]);
      }
      parts.push(tube(pts, 0.009, 20, 3));
    }
  }
  parts.push(new THREE.CylinderGeometry(0.06, 0.06, D + 0.12, 16).rotateX(Math.PI / 2).translate(0, 0.0, 0));

  // A leaf lifting from the right, arcing over the spine.
  const leaf = new THREE.PlaneGeometry(W, D, 30, 2).rotateX(-Math.PI / 2).translate(W / 2, 0, 0);
  {
    const p = leaf.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const t = p.getX(i) / W;
      const a = 1.25 * t ** 0.8;
      const r = W * 0.82;
      p.setX(i, Math.sin(a) * r * 0.95 + 0.04);
      p.setY(i, 0.44 + (1 - Math.cos(a)) * r * 0.7 + t * 0.15);
    }
    leaf.computeVertexNormals();
  }
  parts.push(leaf);

  // Ribbon bookmark trailing out of the gutter.
  parts.push(tube([[0, 0.45, -0.5], [0.05, 0.3, 0.6], [0.12, 0.08, 1.15], [0.3, -0.05, 1.45], [0.55, -0.08, 1.6]], 0.035, 40, 4).scale(1, 1, 1));
  return parts;
}

/* ─── Hora · thoughts: an hourglass, sand half run ─── */

export function hora(): THREE.BufferGeometry[] {
  const parts: THREE.BufferGeometry[] = [];
  const H = 1.25;
  // Glass drawn as an engraver would: outline meridians and a few rings, so the sand shows.
  const profile = (y: number) => 0.08 + 0.62 * Math.sin((Math.abs(y) / H) * Math.PI * 0.92) ** 0.9;
  for (let m = 0; m < 10; m++) {
    const a = (m / 10) * Math.PI * 2;
    const pts: [number, number, number][] = [];
    for (let k = 0; k <= 30; k++) {
      const y = -H + (k / 30) * 2 * H;
      const r = profile(y);
      pts.push([Math.cos(a) * r, y, Math.sin(a) * r]);
    }
    parts.push(tube(pts, 0.012, 60, 4));
  }
  for (const y of [-1.0, -0.6, -0.25, 0.25, 0.6, 1.0]) {
    parts.push(new THREE.TorusGeometry(profile(y), 0.01, 4, 64).rotateX(Math.PI / 2).translate(0, y, 0));
  }
  // Sand: a mound below, a funnel above, a thread between.
  parts.push(lathe([[0, -H + 0.02], [0.62, -H + 0.02], [0.5, -H + 0.25], [0.2, -H + 0.48], [0, -H + 0.55]], 48));
  parts.push(lathe([[0, 0.12], [0.18, 0.3], [0.45, 0.55], [0.52, 0.65], [0, 0.65]], 48));
  parts.push(new THREE.CylinderGeometry(0.012, 0.012, 0.75, 6).translate(0, -0.25, 0));

  // Turned caps and three posts.
  for (const s of [-1, 1]) {
    parts.push(lathe([[0, 0], [0.95, 0], [0.98, 0.06], [0.9, 0.1], [0.92, 0.16], [0, 0.16]], 64).scale(1, s, 1).translate(0, s * (H + 0.02), 0));
  }
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2 + 0.4;
    const post = lathe(
      Array.from({ length: 16 }, (_, i) => {
        const t = i / 15;
        const y = -H + t * 2 * H;
        return [0.045 + 0.03 * Math.abs(Math.sin(t * Math.PI * 5)), y] as [number, number];
      }),
      16,
    );
    parts.push(post.translate(Math.cos(a) * 0.8, 0, Math.sin(a) * 0.8));
  }
  return parts;
}

/* ─── Circinus · tools: dividers open over a set square ─── */

export function circinus(): THREE.BufferGeometry[] {
  const parts: THREE.BufferGeometry[] = [];
  const hinge = new THREE.Vector3(0, 2.0, 0.2);
  const spread = 0.42;
  for (const side of [-1, 1]) {
    const leg = new THREE.CylinderGeometry(0.07, 0.012, 2.6, 16).translate(0, -1.3, 0);
    leg.rotateZ(side * spread).translate(hinge.x, hinge.y, hinge.z + side * 0.03);
    parts.push(leg);
  }
  parts.push(new THREE.CylinderGeometry(0.2, 0.2, 0.14, 32).rotateX(Math.PI / 2).translate(hinge.x, hinge.y, hinge.z));
  parts.push(new THREE.CylinderGeometry(0.05, 0.08, 0.45, 16).translate(hinge.x, hinge.y + 0.3, hinge.z));
  parts.push(new THREE.SphereGeometry(0.09, 16, 12).translate(hinge.x, hinge.y + 0.55, hinge.z));
  // Quadrant arc joining the legs, with its thumbscrew.
  const arc: [number, number, number][] = [];
  for (let k = 0; k <= 16; k++) {
    const a = -spread + (k / 16) * spread * 2;
    arc.push([Math.sin(a) * 1.15, hinge.y - Math.cos(a) * 1.15, hinge.z]);
  }
  parts.push(tube(arc, 0.025, 40, 6));
  parts.push(new THREE.CylinderGeometry(0.07, 0.07, 0.1, 16).rotateX(Math.PI / 2).translate(Math.sin(spread) * 1.15, hinge.y - Math.cos(spread) * 1.15, hinge.z + 0.06));

  // Set square lying behind, with its cut-out.
  const sq = new THREE.Shape();
  sq.moveTo(-1.9, -0.9);
  sq.lineTo(1.6, -0.9);
  sq.lineTo(-1.9, 1.3);
  sq.closePath();
  const cut = new THREE.Path();
  cut.moveTo(-1.55, -0.62);
  cut.lineTo(0.62, -0.62);
  cut.lineTo(-1.55, 0.74);
  cut.closePath();
  sq.holes.push(cut);
  parts.push(extrude(sq, 0.05, 0.01, 1).rotateX(-1.25).translate(0, -0.15, -0.4));
  // Graduations along the square's edge.
  for (let k = 0; k <= 28; k++) {
    const len = k % 5 === 0 ? 0.14 : 0.07;
    parts.push(box(0.012, len, 0.02, -1.85 + k * 0.12, -0.9 + len / 2, 0.03).rotateX(-1.25).translate(0, -0.15, -0.4));
  }
  return parts;
}
