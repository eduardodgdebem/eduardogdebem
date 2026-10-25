import * as THREE from 'three';
import { createBanner, redrawOnSpread } from './banner';
import { gsap } from 'gsap';
import { laurea, matrona, togatus } from './forum-models';
import {
  CABINET,
  MENSA,
  armarium,
  bibliothecarius,
  cogitator,
  imago,
  lector,
  lucerna,
  mensa,
  openRoll,
  paries,
  pilaster,
  rollParts,
  spiral,
} from './library-models';
import { createInk, createPasses, fine, inscriptionTexture, merge, plateZoom } from './passes';
import { createWalker } from './walker';
import { createZoom } from './zoom';

// The field notes' plate: inside the Bibliotheca. The reader's citizen comes in
// from the Via Sacra and walks the reading room (arrow keys, WASD, or a click),
// in the same raised 2.5D view as the street. Scroll cabinets line the back
// wall, and every post is a roll with a red tag, put away in a hole of its own
// among the plain rolls; the room grows more cabinets as posts are added.
// Walk up to a roll and it is drawn out and named; Enter (or a click) opens it
// and the page turns. Readers sit at the tables; a Thinker broods, rather early.

export interface Roll {
  /** The post's id, so it keeps its place on the shelves as others are added. */
  id: string;
  /** Chapter numeral for the tag, e.g. "IV". */
  numeral: string;
}

/** What a label is pinned over: a roll (its index), the door out, or the Thinker. */
export type Subject = number | 'exitus' | 'cogitator';

export interface Library {
  /** Draw a roll out and bring it into view (null: put it back). */
  highlight(index: number | null): void;
  /** Walk to a roll and draw it right out; resolves when it's clear of the shelf. */
  open(index: number): Promise<void>;
  /** Walk out of the door to the Via Sacra; resolves at the threshold. */
  leave(): Promise<void>;
  /** Everything back in place (after the back/forward cache). */
  reset(): void;
  /** Blank the plate now and engrave it once `after` resolves. */
  intro(after?: Promise<void>): void;
  dispose(): void;
}

interface Options {
  rolls: Roll[];
  /** Lettered on the banderole. */
  name: string;
  reducedMotion: boolean;
  onContextLost?: () => void;
  /** The roll in focus changed (near the citizen, or under the pointer). */
  onFocus?: (index: number | null) => void;
  /** Enter, or a click, on a roll. */
  onOpen?: (index: number) => void;
  /** Enter, or a click, at the door out. */
  onExit?: () => void;
  /** Where to pin a label, in CSS px within the canvas (null: hide it). */
  onTag?: (subject: Subject | null, x: number, y: number) => void;
}

/* ── The room ── */

const BACK = -5.5; // the back wall's face
const PITCH = 2.6; // cabinet to cabinet
const ROLL_R = 0.12;
const ROLL_L = 0.95;
const SPEED = 3.0;
const REACH = 0.75; // how far along the shelves a roll can be reached from
const LINE_FREQ = 14;

/* ── The view: as on the street, a little lower, to look into the holes ── */

const VIEW_DIR = new THREE.Vector3(2.5, 6.5, 15).normalize();
const VIEW_DIST = 40;
const VIEW_Y = 2.4;
const VIEW_Z = -2.0;
const FIT_H = 9.8;
const FIT_W = 9;

/** A stable number for a string, so a post keeps its hole as others are added. */
const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};

export function createLibrary(canvas: HTMLCanvasElement, { rolls, name, reducedMotion, onContextLost, onFocus, onOpen, onExit, onTag }: Options): Library | null {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false });
  } catch {
    return null;
  }
  const pixel = Math.min(window.devicePixelRatio, 2);
  renderer.setPixelRatio(pixel);
  // Wheel, pinch or the plate's buttons bring the view closer or further.
  const zoom = createZoom(canvas, { min: 0.7, max: 2.2, onChange: () => resize() });

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 100);
  scene.add(camera);

  const { shared, material, materials, textures } = createInk(LINE_FREQ);
  const wood = material();
  const fineMat = new THREE.LineBasicMaterial({ color: 0x000000 });
  const flameMat = new THREE.LineBasicMaterial({ color: 0xff0000 }); // red, read as rubric by the paper pass
  const proxyMat = new THREE.MeshBasicMaterial();
  materials.push(fineMat, flameMat, proxyMat);

  // The walls in a lighter cut than the furniture, so the room reads before its stone.
  const wall = material();
  wall.uniforms.uPale = { value: 0.35 };
  const build = (parts: THREE.BufferGeometry[], x = 0, z = 0, turn = 0, m: THREE.Material = wood) => {
    const mesh = new THREE.Mesh(merge(parts), m);
    mesh.position.set(x, 0, z);
    mesh.rotation.y = turn;
    scene.add(mesh);
    return mesh;
  };
  const inscribe = (text: string, w: number, h: number, at: THREE.Vector3, glow = { value: 0 }) => {
    const tex = inscriptionTexture(text, w, h);
    textures.push(tex);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material(glow, tex));
    mesh.position.copy(at);
    scene.add(mesh);
    return mesh;
  };
  const pickables: THREE.Mesh[] = [];
  const proxy = (size: THREE.Vector3, at: THREE.Vector3, data: Record<string, unknown>, parent: THREE.Object3D = scene) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), proxyMat);
    m.position.copy(at);
    m.layers.set(2);
    Object.assign(m.userData, data);
    parent.add(m);
    pickables.push(m);
    return m;
  };

  /* ── Cabinets enough that the posts are a scattering, not a crowd ── */

  const cab = armarium();
  const cellsEach = CABINET.cols * CABINET.rows;
  const cabinets = Math.max(5, Math.ceil((rolls.length * 3) / cellsEach));
  const half = cabinets * (PITCH / 2) + 2.0;
  const doorX = -half + 0.95;
  const cabinetX = (i: number) => doorX + 1.0 + cab.W / 2 + 0.25 + i * PITCH;
  const cabFront = BACK + 0.02 + cab.front;

  // Floor, a slab among the stars like the street's, with a mosaic border and lattice.
  const floorMat = material();
  floorMat.uniforms.uPale = { value: 0.6 };
  const floorFront = 2.6;
  build([new THREE.BoxGeometry(half * 2 + 1.0, 0.6, floorFront - BACK + 0.4).translate(0, -0.3, (floorFront + BACK - 0.4) / 2)], 0, 0, 0, floorMat);
  {
    const pts: THREE.Vector3[] = [];
    const y = 0.005;
    const rect = (x0: number, z0: number, x1: number, z1: number) =>
      pts.push(
        new THREE.Vector3(x0, y, z0), new THREE.Vector3(x1, y, z0),
        new THREE.Vector3(x1, y, z0), new THREE.Vector3(x1, y, z1),
        new THREE.Vector3(x1, y, z1), new THREE.Vector3(x0, y, z1),
        new THREE.Vector3(x0, y, z1), new THREE.Vector3(x0, y, z0),
      );
    const [x0, z0, x1, z1] = [-half + 0.4, cabFront + 0.25, half - 0.4, floorFront - 0.35];
    rect(x0, z0, x1, z1);
    rect(x0 + 0.18, z0 + 0.18, x1 - 0.18, z1 - 0.18);
    // A lattice of lozenges inside the border, clipped to it.
    const [ix0, iz0, ix1, iz1] = [x0 + 0.5, z0 + 0.5, x1 - 0.5, z1 - 0.5];
    rect(ix0, iz0, ix1, iz1);
    const clip = (c: number, sign: number) => {
      // The line z = sign * (x - c) + iz0 inside the inner rectangle.
      const ends: THREE.Vector3[] = [];
      for (const x of [ix0, ix1]) {
        const z = iz0 + sign * (x - c);
        if (z >= iz0 - 1e-6 && z <= iz1 + 1e-6) ends.push(new THREE.Vector3(x, y, z));
      }
      for (const z of [iz0, iz1]) {
        const x = c + (z - iz0) / sign;
        if (x >= ix0 - 1e-6 && x <= ix1 + 1e-6) ends.push(new THREE.Vector3(x, y, z));
      }
      if (ends.length >= 2) pts.push(ends[0], ends[ends.length - 1]);
    };
    for (let c = ix0 - (iz1 - iz0); c <= ix1 + (iz1 - iz0); c += 0.9) {
      clip(c, 1);
      clip(c, -1);
    }
    scene.add(fine(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.38 }))));
  }

  // The back wall: windows over the cabinets (stars through them), the door out at the far end.
  const windows = Array.from({ length: cabinets }, (_, i) => cabinetX(i));
  build(paries(half * 2, 5.4, doorX, windows), 0, BACK, 0, wall);
  for (let i = 0; i <= cabinets; i++) build(pilaster(cabinetX(i) - PITCH / 2, 3.92), 0, BACK, 0, wall);
  inscribe('EXITVS', 1.0, 0.13, new THREE.Vector3(doorX, 2.62, BACK + 0.11));
  inscribe('COMMENTARII', 3.6, 0.1, new THREE.Vector3(cabinetX((cabinets - 1) / 2), 3.92, BACK + 0.2));
  proxy(new THREE.Vector3(1.4, 2.6, 0.6), new THREE.Vector3(doorX, 1.3, BACK + 0.2), { exitus: true });
  // Low side walls, cut away so the room can be seen into.
  for (const s of [-1, 1]) build([new THREE.BoxGeometry(0.3, 1.1, floorFront - BACK - 0.5).translate(s * (half + 0.15), 0.55, (floorFront + BACK - 0.5) / 2)], 0, 0, 0, wall);

  /* ── The cabinets and their rolls ── */

  const cabParts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < cabinets; i++) {
    for (const g of cab.parts) cabParts.push(g.clone().translate(cabinetX(i), 0, BACK + 0.02));
    // A portrait bust on every other cabinet.
    if (i % 2 === 0) for (const g of imago()) cabParts.push(g.translate(cabinetX(i), cab.top, BACK + 0.55));
  }
  cab.parts.forEach((g) => g.dispose());
  build(cabParts);

  // Each post takes a hole by its id; collisions step along.
  const total = cabinets * cellsEach;
  const taken = new Map<number, number>(); // hole → roll index
  rolls.forEach((roll, k) => {
    let hole = hash(roll.id) % total;
    while (taken.has(hole)) hole = (hole + 7) % total;
    taken.set(hole, k);
  });
  const holeAt = (hole: number) => {
    const i = Math.floor(hole / cellsEach);
    const c = hole % CABINET.cols;
    const r = Math.floor((hole % cellsEach) / CABINET.cols);
    const { x, floor } = cab.cell(c, r);
    return { x: cabinetX(i) + x, floor };
  };

  const rand = (() => {
    let seed = 23;
    return () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  })();
  const plain: THREE.BufferGeometry[] = [];
  const ends: THREE.Vector3[] = [];
  const rollBack = BACK + 0.06;
  for (let hole = 0; hole < total; hole++) {
    if (taken.has(hole) || rand() < 0.12) continue;
    const { x, floor } = holeAt(hole);
    const r = 0.085;
    for (const [dx, layer] of [[-1, 0], [0, 0], [1, 0], [-0.5, 1], [0.5, 1]] as const) {
      if (rand() < (layer ? 0.35 : 0.12)) continue;
      const len = 0.8 + rand() * 0.15;
      const cx = x + dx * r * 2.05;
      const cy = floor + r + layer * r * 1.75;
      const z = rollBack + len / 2 + rand() * 0.06;
      for (const g of rollParts(r, len)) plain.push(g.translate(cx, cy, z));
      spiral(r, cx, cy, z + len / 2 + 0.002, ends);
    }
  }
  if (plain.length) build(plain);
  if (ends.length) scene.add(fine(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(ends), fineMat)));

  type Post = { group: THREE.Group; glow: { value: number }; pull: { value: number }; home: number; x: number };
  const posts: Post[] = [];
  rolls.forEach((roll, k) => {
    const hole = [...taken].find(([, v]) => v === k)![0];
    const { x, floor } = holeAt(hole);
    const glow = { value: 0 };
    const group = new THREE.Group();
    group.add(new THREE.Mesh(merge(rollParts(ROLL_R, ROLL_L)), material(glow)));
    // The sillybos: a parchment tag hanging from the roll's end, its numeral in red.
    const tex = inscriptionTexture(roll.numeral, 0.22, 0.12);
    textures.push(tex);
    const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.15).translate(0, -0.075, 0).rotateX(-0.12), material({ value: 1 }, tex));
    tag.position.set(0, -ROLL_R * 0.5, ROLL_L / 2 + 0.01);
    group.add(tag);
    const end: THREE.Vector3[] = [];
    spiral(ROLL_R, 0, 0, ROLL_L / 2 + 0.002, end);
    group.add(fine(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(end), fineMat)));
    proxy(new THREE.Vector3(ROLL_R * 3, ROLL_R * 3.4, ROLL_L), new THREE.Vector3(), { roll: k }, group);
    // Its end stands a little proud of the shelf, so the tag hangs clear.
    const home = cabFront + 0.08 - ROLL_L / 2;
    group.position.set(x, floor + ROLL_R, home);
    scene.add(group);
    posts.push({ group, glow, pull: { value: 0 }, home, x });
  });

  /* ── Tables, readers, lamps; the Thinker; the librarian and a few browsers ── */

  const tableZ = -1.5;
  const tables = [-1, 1].map((s) => s * Math.max(4.0, half * 0.48));
  const flames: { line: THREE.Line; at: THREE.Vector3; phase: number }[] = [];
  const readers: { mesh: THREE.Mesh; phase: number }[] = [];
  const reader = lector();
  const readerGeo = merge(reader);
  for (const tx of tables) {
    build(mensa(), tx, tableZ);
    const lamp = lucerna(tx, tableZ);
    build(lamp.parts);
    for (let k = 0; k < 3; k++) {
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 5 }, () => new THREE.Vector3())), flameMat);
      scene.add(fine(line));
      flames.push({ line, at: lamp.flame, phase: k * 2.1 + tx });
    }
    // Readers along the far bench facing us, one on the near bench with his back to us.
    const seats: [number, number][] = [[-0.75, 1], [0.75, 1], [0.3, -1]];
    for (const [dx, side] of seats) {
      const benchZ = tableZ - side * (MENSA.d / 2 + 0.38);
      const mesh = new THREE.Mesh(readerGeo, wood);
      mesh.position.set(tx + dx, 0, benchZ);
      mesh.rotation.y = side > 0 ? 0 : Math.PI;
      scene.add(mesh);
      readers.push({ mesh, phase: rand() * 6 });
      build(openRoll(tx + dx, tableZ - side * 0.2, side > 0 ? 0 : Math.PI));
    }
  }

  const thinker = cogitator();
  const thinkerAt = new THREE.Vector3(0, 0, tableZ - 0.2);
  build(thinker.parts, thinkerAt.x, thinkerAt.z);
  inscribe('COGITATOR', thinker.panel.w, thinker.panel.h, new THREE.Vector3(thinkerAt.x, thinker.panel.y, thinkerAt.z + thinker.panel.z + 0.01));
  proxy(new THREE.Vector3(1.4, 2.7, 1.3), new THREE.Vector3(thinkerAt.x, 1.35, thinkerAt.z), { cogitator: true });

  const librarianAt = new THREE.Vector3(half - 1.0, 0, cabFront + 0.9);
  build(bibliothecarius(), librarianAt.x, librarianAt.z, -Math.PI / 2);
  const standers: { mesh: THREE.Mesh; phase: number }[] = [];
  const figures = { civis: merge(togatus('walker')), matrona: merge(matrona()) };
  // Browsers at the shelves, their backs to us.
  for (const [i, kind] of [[1, 'civis'], [3, 'matrona']] as const) {
    if (i >= cabinets) continue;
    const mesh = new THREE.Mesh(figures[kind], wood);
    mesh.position.set(cabinetX(i) + 0.4, 0, cabFront + 0.45);
    mesh.rotation.y = Math.PI;
    scene.add(mesh);
    standers.push({ mesh, phase: rand() * 6 });
  }
  // A slave carrying rolls along the room, to and fro.
  const porter = new THREE.Mesh(figures.civis, wood);
  porter.add(new THREE.Mesh(merge([...rollParts(0.07, 0.6).map((g) => g.rotateY(Math.PI / 2).translate(0, 1.0, 0.25)), ...rollParts(0.07, 0.6).map((g) => g.rotateY(Math.PI / 2).translate(0, 1.13, 0.25))]), wood));
  porter.position.set(-2, 0, 1.6);
  scene.add(porter);
  let porterDir = 1;

  /* ── The citizen, in from the street ── */

  const citizen = new THREE.Mesh(figures.civis, material());
  citizen.add(new THREE.Mesh(merge(laurea()), material({ value: 1 }))); // his red laurel, as on the street
  scene.add(citizen);
  const obstacles = [
    ...tables.map((tx) => ({ x0: tx - MENSA.w / 2 - 0.3, x1: tx + MENSA.w / 2 + 0.3, z0: tableZ - MENSA.d / 2 - 0.9, z1: tableZ + MENSA.d / 2 + 0.9 })),
    { x0: thinkerAt.x - 1.0, x1: thinkerAt.x + 1.0, z0: thinkerAt.z - 0.95, z1: thinkerAt.z + 0.95 },
    { x0: librarianAt.x - 0.6, x1: librarianAt.x + 0.8, z0: librarianAt.z - 0.6, z1: librarianAt.z + 0.6 },
  ];
  const clampToRoom = (p: THREE.Vector3) => {
    p.x = THREE.MathUtils.clamp(p.x, -half + 0.5, half - 0.5);
    p.z = THREE.MathUtils.clamp(p.z, cabFront + 0.3, floorFront - 0.6);
    // Step round the furniture: out by the nearest side.
    for (const o of obstacles) {
      if (p.x <= o.x0 || p.x >= o.x1 || p.z <= o.z0 || p.z >= o.z1) continue;
      const out = [p.x - o.x0, o.x1 - p.x, p.z - o.z0, o.z1 - p.z];
      const k = out.indexOf(Math.min(...out));
      if (k === 0) p.x = o.x0;
      else if (k === 1) p.x = o.x1;
      else if (k === 2) p.z = o.z0;
      else p.z = o.z1;
    }
  };
  let atRoll: number | null = null;
  let atExit = false;
  let nearThinker = false;
  const walker = createWalker(citizen, {
    speed: SPEED,
    clamp: clampToRoom,
    reducedMotion,
    onEnterKey: () => {
      if (busy) return;
      if (atRoll !== null) onOpen?.(atRoll);
      else if (atExit) onExit?.();
    },
  });
  const standAt = (x: number) => new THREE.Vector3(x, 0, cabFront + 0.45);
  const arrive = () => {
    // Back from a post: standing at its roll. Otherwise just in at the door.
    let from = -1;
    try {
      from = Number(sessionStorage.getItem('library-at') ?? -1);
    } catch {}
    if (from >= 0 && from < posts.length) {
      citizen.position.copy(standAt(posts[from].x));
      walker.face(0);
    } else {
      citizen.position.set(doorX + 0.5, 0, cabFront + 1.6);
      walker.face(Math.PI * 0.3);
    }
    citizen.visible = true;
    citizen.scale.setScalar(1);
  };
  arrive();

  const banner = createBanner(canvas, name, shared.uLight);

  const stopRedraw = redrawOnSpread(canvas, shared.uReveal, banner);
  const passes = createPasses(renderer, camera, pixel);

  /* ── Focus: the roll the citizen stands at, the pointer's, or the list's ── */

  let pointed: Subject | null = null;
  let listed: number | null = null;
  let focused: number | null = null;
  let busy = false;

  const refocus = () => {
    const index = listed ?? (typeof pointed === 'number' ? pointed : null) ?? atRoll;
    if (index === focused) return;
    focused = index;
    posts.forEach((p, k) => {
      const on = k === index;
      const d = reducedMotion ? 0 : 0.4;
      gsap.to(p.glow, { value: on ? 1 : 0, duration: d * 0.7, overwrite: true });
      gsap.to(p.pull, { value: on ? 1 : 0, duration: d, ease: on ? 'back.out(1.6)' : 'power2.inOut', overwrite: true });
    });
    onFocus?.(index);
  };

  /* ── Pointer: picks, a spot to walk to, the tilt ── */

  const lamp = new THREE.Vector2(0.55, 0.55);
  const ray = new THREE.Raycaster();
  ray.layers.set(2);
  const ndc = new THREE.Vector2();
  const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const tilt = new THREE.Vector2();
  const tiltTarget = new THREE.Vector2();
  let downAt: { x: number; y: number } | null = null;

  const aimRay = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1));
    ray.setFromCamera(ndc, camera);
  };
  const subjectOf = (hit: THREE.Intersection | undefined): Subject | null => {
    if (!hit) return null;
    const d = hit.object.userData;
    return typeof d.roll === 'number' ? d.roll : d.exitus ? 'exitus' : d.cogitator ? 'cogitator' : null;
  };
  const onPointerMove = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 2 - 1;
    const y = -(((e.clientY - r.top) / r.height) * 2 - 1);
    const inside = Math.abs(x) <= 1 && Math.abs(y) <= 1;
    // The view leans toward a mouse only: a finger would leave it leaning wherever it last touched.
    const leaning = inside && e.pointerType === 'mouse';
    tiltTarget.set(leaning ? x : 0, leaning ? y : 0);
    if (e.pointerType !== 'mouse' || busy) return walker.aim(null);
    let subject: Subject | null = null;
    if (inside) {
      aimRay(e);
      subject = subjectOf(ray.intersectObjects(pickables, false)[0]);
    }
    // Over the floor, where he'd go is marked on it.
    walker.aim(inside && subject === null ? ray.ray.intersectPlane(floorPlane, new THREE.Vector3()) : null);
    canvas.style.cursor = subject !== null ? 'pointer' : '';
    if (subject !== pointed) {
      pointed = subject;
      refocus();
    }
  };
  const onDown = (e: PointerEvent) => {
    downAt = { x: e.clientX, y: e.clientY };
  };
  const onUp = (e: PointerEvent) => {
    if (!downAt || busy || zoom.gesturing) return;
    const moved = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y);
    downAt = null;
    if (moved > 8) return;
    aimRay(e);
    const subject = subjectOf(ray.intersectObjects(pickables, false)[0]);
    if (typeof subject === 'number') onOpen?.(subject);
    else if (subject === 'exitus') onExit?.();
    else {
      const spot = ray.ray.intersectPlane(floorPlane, new THREE.Vector3());
      if (spot) walker.walkTo(spot);
    }
  };
  const onLeave = () => {
    tiltTarget.set(0, 0);
    walker.aim(null);
    if (pointed !== null) {
      pointed = null;
      refocus();
    }
  };

  /* ── Going to a roll; going out ── */

  const open = (index: number) => {
    try {
      sessionStorage.setItem('library-at', String(index));
    } catch {}
    listed = index;
    refocus();
    busy = true;
    canvas.style.cursor = '';
    if (reducedMotion) return Promise.resolve();
    return walker.follow([standAt(posts[index].x)]).then(() => {
      walker.face(Math.PI);
      return new Promise<void>((resolve) => {
        gsap.to(posts[index].pull, { value: 2.4, duration: 0.5, ease: 'power2.in', overwrite: true, onComplete: resolve });
      });
    });
  };

  const leave = () => {
    try {
      sessionStorage.removeItem('library-at');
      sessionStorage.setItem('forum-at', 'bibliotheca');
    } catch {}
    busy = true;
    canvas.style.cursor = '';
    return walker.follow([new THREE.Vector3(doorX, 0, cabFront + 0.35), new THREE.Vector3(doorX, 0, BACK - 0.3)], { intoDoorway: true });
  };

  const reset = () => {
    walker.halt();
    busy = false;
    listed = null;
    pointed = null;
    arrive();
    view.x = citizen.position.x;
    focused = -1;
    refocus();
  };

  const highlight = (index: number | null) => {
    if (busy) return;
    listed = index;
    refocus();
  };

  const step = (dt: number) => {
    walker.step(dt);
    if (busy) return;
    const p = citizen.position;
    // At the shelves: the nearest roll within reach along them.
    let near: number | null = null;
    if (p.z < cabFront + 1.0) {
      let best = REACH;
      posts.forEach((post, k) => {
        const d = Math.abs(post.x - p.x);
        if (d < best) {
          best = d;
          near = k;
        }
      });
    }
    atExit = near === null && Math.abs(p.x - doorX) < 0.8 && p.z < cabFront + 1.0;
    nearThinker = Math.hypot(p.x - thinkerAt.x, p.z - (thinkerAt.z + 1.0)) < 1.4;
    if (near !== atRoll) {
      atRoll = near;
      refocus();
    }
  };

  /* ── The view follows the citizen (or the roll named in the list) ── */

  let halfW = FIT_W / 2;
  let halfH = FIT_H / 2;
  const view = { x: citizen.position.x, z: 0 };
  let small = 1; // closer on a phone's narrow plate
  const target = new THREE.Vector3();
  const lean = new THREE.Vector3();
  const follow = (dt: number) => {
    const goal = listed !== null && !busy ? posts[listed].x : citizen.position.x;
    const limit = Math.max(0, half + 0.6 - halfW);
    const x = THREE.MathUtils.clamp(goal, -limit, limit);
    const k = reducedMotion ? 1 : 1 - Math.exp(-dt * 3);
    view.x += (x - view.x) * k;
    // Closed in on a phone: follow him from the shelves to the front of the room too.
    view.z += ((small < 1 ? (citizen.position.z - VIEW_Z) * 0.5 : 0) - view.z) * k;
    if (!reducedMotion) tilt.lerp(tiltTarget, 1 - Math.exp(-dt * 4));
    target.set(view.x, VIEW_Y, VIEW_Z + view.z);
    lean.set(tilt.x * 0.1, -tilt.y * 0.055, 0).add(VIEW_DIR).normalize();
    camera.position.copy(target).addScaledVector(lean, VIEW_DIST);
    camera.lookAt(target);
    const pxPerUnit = passes.uniforms.uResolution.value.x / (halfW * 2);
    passes.uniforms.uStarShift.value.set(view.x * 0.12 * pxPerUnit, 0);
  };

  const resize = () => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    passes.setSize(w, h);
    const aspect = w / h;
    small = plateZoom(w);
    halfH = Math.max((FIT_H * small) / 2, (FIT_W * small) / 2 / aspect) / zoom.value;
    halfW = halfH * aspect;
    Object.assign(camera, { left: -halfW, right: halfW, top: halfH, bottom: -halfH });
    camera.updateProjectionMatrix();
    shared.uFreq.value = LINE_FREQ * (FIT_H / 2 / halfH);
    if (!running) render();
  };

  /* ── Life: lamps flicker, readers lean into their reading, the porter goes to and fro ── */

  const drawLife = (dt: number, t: number) => {
    for (const { line, at, phase } of flames) {
      const p = line.geometry.attributes.position as THREE.BufferAttribute;
      const tall = 0.16 + 0.05 * Math.sin(t * 7 + phase * 3);
      for (let i = 0; i < 5; i++) {
        const f = i / 4;
        p.setXYZ(i, at.x + Math.sin(t * 9 + f * 6 + phase) * 0.025 * f + Math.cos(phase) * 0.03 * (1 - f), at.y + f * tall, at.z + Math.sin(phase) * 0.03 * (1 - f));
      }
      p.needsUpdate = true;
    }
    for (const r of readers) r.mesh.rotation.x = Math.sin(t * 0.6 + r.phase) * 0.03;
    for (const s of standers) s.mesh.rotation.z = Math.sin(t * 1.1 + s.phase) * 0.02;
    porter.position.x += porterDir * 0.7 * dt;
    if (Math.abs(porter.position.x) > half - 2) {
      porterDir = -porterDir;
      porter.position.x = Math.sign(porter.position.x) * (half - 2);
    }
    porter.rotation.y = porterDir > 0 ? Math.PI / 2 : -Math.PI / 2;
    porter.position.y = Math.abs(Math.sin(t * 5)) * 0.04;
  };

  /* ── Labels: over the focused roll, the door, the Thinker ── */

  const anchor = new THREE.Vector3();
  let pinned = '';
  const pinTag = () => {
    if (!onTag) return;
    const subject: Subject | null =
      focused !== null && focused >= 0
        ? focused
        : pointed === 'exitus' || pointed === 'cogitator'
          ? pointed
          : atExit && !busy
            ? 'exitus'
            : nearThinker && !busy
              ? 'cogitator'
              : null;
    if (subject === null) {
      if (pinned) onTag(null, 0, 0);
      pinned = '';
      return;
    }
    if (typeof subject === 'number') anchor.set(0, ROLL_R + 0.04, ROLL_L / 2).applyMatrix4(posts[subject].group.matrixWorld);
    else if (subject === 'exitus') anchor.set(doorX, 2.8, BACK + 0.2);
    else anchor.set(thinkerAt.x, 2.75, thinkerAt.z);
    anchor.project(camera);
    const x = ((anchor.x + 1) / 2) * canvas.clientWidth;
    const y = ((1 - anchor.y) / 2) * canvas.clientHeight;
    const key = `${subject}:${x.toFixed(0)}:${y.toFixed(0)}`;
    if (key === pinned) return;
    pinned = key;
    onTag(subject, x, y);
  };

  /* ── Loop ── */

  let running = false;
  let raf = 0;
  const timer = new THREE.Timer();
  let clock = 0;

  const render = () => {
    for (const p of posts) {
      // Drawn out of its hole, tipped a touch, as a hand would.
      p.group.position.z = p.home + p.pull.value * 0.42;
      p.group.rotation.z = Math.sin(Math.min(p.pull.value, 1) * Math.PI * 0.5) * 0.08;
    }
    camera.updateMatrixWorld(true);
    shared.uLight.value.set(lamp.x * 1.5 + 0.25, lamp.y * 1.2 + 0.3, 0.8).normalize();
    passes.uniforms.uReveal.value = shared.uReveal.value;
    passes.render(scene);
  };

  const tick = (now: number) => {
    raf = requestAnimationFrame(tick);
    timer.update(now);
    const dt = Math.min(timer.getDelta(), 0.05);
    if (!reducedMotion) clock += dt;
    step(dt);
    follow(dt);
    if (!reducedMotion) drawLife(dt, clock);
    render();
    pinTag();
  };

  const start = () => {
    if (running || document.hidden) return;
    running = true;
    timer.reset();
    raf = requestAnimationFrame(tick);
  };
  const stop = () => {
    running = false;
    cancelAnimationFrame(raf);
  };
  const onVisibility = () => (document.hidden ? stop() : start());
  const onLost = (e: Event) => {
    e.preventDefault();
    stop();
    onContextLost?.();
  };

  const intro = (after: Promise<void> = Promise.resolve()) => {
    if (reducedMotion) return;
    shared.uReveal.value = 0;
    banner.uniforms.uReveal.value = 0;
    after.then(() => {
      gsap.to(shared.uReveal, { value: 1, duration: 2.8, ease: 'power1.out', delay: 0.3 });
      gsap.to(banner.uniforms.uReveal, { value: 1, duration: 1.8, ease: 'power1.inOut', delay: 0.2 });
    });
  };

  window.addEventListener('resize', resize);
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointerleave', onLeave);
  document.addEventListener('visibilitychange', onVisibility);
  canvas.addEventListener('webglcontextlost', onLost);

  drawLife(0, 0);
  resize();
  follow(1);
  render();
  start();

  return {
    highlight,
    open,
    leave,
    reset,
    intro,
    dispose() {
      stop();
      walker.dispose();
      zoom.dispose();
      gsap.killTweensOf([shared.uReveal, banner.uniforms.uReveal, ...posts.flatMap((p) => [p.glow, p.pull])]);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointerleave', onLeave);
      document.removeEventListener('visibilitychange', onVisibility);
      canvas.removeEventListener('webglcontextlost', onLost);
      banner.dispose();
      stopRedraw();
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh || o instanceof THREE.Line) {
          o.geometry.dispose();
          if (o.material instanceof THREE.Material && !materials.includes(o.material)) o.material.dispose();
        }
      });
      passes.dispose();
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
      renderer.dispose();
    },
  };
}
