import * as THREE from 'three';
import { createBanner, redrawOnSpread } from './banner';
import { gsap } from 'gsap';
import { laurea, matrona, togatus } from './forum-models';
import { paries, pilaster } from './library-models';
import { ANVIL_TOP, BENCH, caminus, faber, incus, instrumenta, opus, scamnum } from './officina-models';
import { createInk, createPasses, fine, inscriptionTexture, merge, plateZoom } from './passes';
import { createWalker } from './walker';
import { createZoom } from './zoom';
import type { Work } from '../../data/projects';

// The projects' plate: inside the Fabrica, the forge on the Via Sacra. The
// reader's citizen comes in from the street and walks the workshop, in the
// same raised 2.5D view as the street and the library. Each project is a work
// on a bench (the last one on the anvil, by the forge): walk up to it, or point
// at it, and it lifts and turns, picked out in red, and is named; Enter (or a
// click) opens it. The fire burns, and the smith keeps at his anvil.

export interface Piece {
  /** Lettered on the front of its bench. */
  latin: string;
  work: Work;
}

/** What a label is pinned over: a work (its index), the door out, or the smith. */
export type Subject = number | 'exitus' | 'faber';

export interface Officina {
  /** Pick a work out and bring it into view (null: none). */
  highlight(index: number | null): void;
  /** Walk up to a work; resolves on arrival. */
  visit(index: number): Promise<void>;
  /** Walk out of the door to the Via Sacra; resolves at the threshold. */
  leave(): Promise<void>;
  /** Everything back in place (after the back/forward cache). */
  reset(): void;
  /** Blank the plate now and engrave it once `after` resolves. */
  intro(after?: Promise<void>): void;
  dispose(): void;
}

interface Options {
  pieces: Piece[];
  /** Lettered on the banderole. */
  name: string;
  reducedMotion: boolean;
  onContextLost?: () => void;
  /** The work in focus changed (near the citizen, or under the pointer). */
  onFocus?: (index: number | null) => void;
  /** Enter, or a click, on a work. */
  onOpen?: (index: number) => void;
  /** Enter, or a click, at the door out. */
  onExit?: () => void;
  /** Where to pin a label, in CSS px within the canvas (null: hide it). */
  onTag?: (subject: Subject | null, x: number, y: number) => void;
}

/* ── The room ── */

const BACK = -5.5; // the back wall's face
const HALF = 8.5; // half the room's width
const FRONT = 2.6; // the floor's front edge
const SPEED = 3.0;
const REACH = 1.0; // how near a work he must stand
const LINE_FREQ = 14;
const BENCH_Z = BACK + 1.25;
const FORGE_X = 5.4;
const ANVIL = new THREE.Vector3(3.7, 0, -2.7);

/* ── The view: as in the library ── */

const VIEW_DIR = new THREE.Vector3(2.5, 6.5, 15).normalize();
const VIEW_DIST = 40;
const VIEW_Y = 2.2;
const VIEW_Z = -2.0;
const FIT_H = 9.8;
const FIT_W = 9;

export function createOfficina(canvas: HTMLCanvasElement, { pieces, name, reducedMotion, onContextLost, onFocus, onOpen, onExit, onTag }: Options): Officina | null {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false });
  } catch {
    return null;
  }
  const pixel = Math.min(window.devicePixelRatio, 2);
  renderer.setPixelRatio(pixel);
  const zoom = createZoom(canvas, { min: 0.7, max: 2.2, onChange: () => resize() });

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 100);
  scene.add(camera);

  const { shared, material, materials, textures } = createInk(LINE_FREQ);
  const wood = material();
  const fineMat = new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.38 });
  const flameMat = new THREE.LineBasicMaterial({ color: 0xff0000 }); // red, read as rubric by the paper pass
  const proxyMat = new THREE.MeshBasicMaterial();
  materials.push(fineMat, flameMat, proxyMat);
  const wall = material();
  wall.uniforms.uPale = { value: 0.35 };

  const build = (parts: THREE.BufferGeometry[], x = 0, z = 0, turn = 0, m: THREE.Material = wood, y = 0) => {
    const mesh = new THREE.Mesh(merge(parts), m);
    mesh.position.set(x, y, z);
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
  const proxy = (size: THREE.Vector3, at: THREE.Vector3, data: Record<string, unknown>) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), proxyMat);
    m.position.copy(at);
    m.layers.set(2);
    Object.assign(m.userData, data);
    scene.add(m);
    pickables.push(m);
    return m;
  };

  /* ── Floor, walls, the forge ── */

  const floorMat = material();
  floorMat.uniforms.uPale = { value: 0.6 };
  build([new THREE.BoxGeometry(HALF * 2 + 1.0, 0.6, FRONT - BACK + 0.4).translate(0, -0.3, (FRONT + BACK - 0.4) / 2)], 0, 0, 0, floorMat);
  {
    // Floorboards, running across the room, with their joints staggered.
    const pts: THREE.Vector3[] = [];
    const y = 0.005;
    for (let z = BACK + 0.4, row = 0; z < FRONT - 0.3; z += 0.42, row++) {
      pts.push(new THREE.Vector3(-HALF + 0.3, y, z), new THREE.Vector3(HALF - 0.3, y, z));
      for (let x = -HALF + 0.3 + (row % 2) * 1.1; x < HALF - 0.3; x += 2.2) pts.push(new THREE.Vector3(x, y, z), new THREE.Vector3(x, y, Math.min(z + 0.42, FRONT - 0.3)));
    }
    scene.add(fine(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), fineMat)));
  }

  const doorX = -HALF + 0.95;
  const benchX = pieces.slice(0, -1).map((_, i, all) => -4.6 + i * (all.length > 1 ? 8.6 / Math.max(3, all.length) : 0));
  build(paries(HALF * 2, 5.4, doorX, benchX), 0, BACK, 0, wall);
  for (const x of [-HALF + 2.2, 0, HALF - 0.6]) build(pilaster(x, 3.92), 0, BACK, 0, wall);
  inscribe('EXITVS', 1.0, 0.13, new THREE.Vector3(doorX, 2.62, BACK + 0.11));
  inscribe('OFFICINA', 2.6, 0.1, new THREE.Vector3(-1.4, 3.92, BACK + 0.2));
  proxy(new THREE.Vector3(1.4, 2.6, 0.6), new THREE.Vector3(doorX, 1.3, BACK + 0.2), { exitus: true });
  for (const s of [-1, 1]) build([new THREE.BoxGeometry(0.3, 1.1, FRONT - BACK - 0.5).translate(s * (HALF + 0.15), 0.55, (FRONT + BACK - 0.5) / 2)], 0, 0, 0, wall);

  const forge = caminus();
  build(forge.parts, FORGE_X, BACK);
  const fire = forge.fire.clone().add(new THREE.Vector3(FORGE_X, 0, BACK));
  build(instrumenta(), -0.1, BACK + 0.06, 0, wood, 2.55);
  build(incus(), ANVIL.x, ANVIL.z);
  // A trough for quenching, by the anvil.
  build([new THREE.BoxGeometry(0.9, 0.45, 0.5).translate(0, 0.225, 0)], ANVIL.x + 1.4, ANVIL.z + 0.2);

  /* ── The works ── */

  type Placed = { group: THREE.Group; glow: { value: number }; lift: { value: number }; stand: THREE.Vector3; base: number; spin: number };
  const placed: Placed[] = pieces.map((piece, i) => {
    const onAnvil = i === pieces.length - 1 && piece.work === 'ouroboros';
    const glow = { value: 0 };
    const group = new THREE.Group();
    group.add(new THREE.Mesh(merge(opus(piece.work)), material(glow)));
    const x = onAnvil ? ANVIL.x - 0.1 : benchX[i];
    const z = onAnvil ? ANVIL.z : BENCH_Z;
    const base = onAnvil ? ANVIL_TOP : BENCH.h;
    group.position.set(x, base, z);
    // Bigger than life, so each reads across the room.
    group.scale.setScalar(onAnvil ? 2.3 : 1.55);
    scene.add(group);
    if (!onAnvil) {
      build(scamnum(), x, z);
      inscribe(piece.latin.toUpperCase(), 0.9, 0.08, new THREE.Vector3(x, BENCH.h - 0.05, z + BENCH.d / 2 + 0.006), glow);
    }
    proxy(new THREE.Vector3(onAnvil ? 1.0 : BENCH.w, 2.0, 1.0), new THREE.Vector3(x, 1.0, z), { work: i });
    const stand = new THREE.Vector3(x, 0, z + (onAnvil ? 0.95 : BENCH.d / 2 + 0.55));
    return { group, glow, lift: { value: 0 }, stand, base, spin: 0 };
  });

  /* ── The smith at the anvil; an apprentice; someone looking at the work ── */

  const smith = faber();
  const smithAt = new THREE.Vector3(ANVIL.x + 0.45, 0, ANVIL.z - 0.6);
  const smithMesh = build(smith.parts, smithAt.x, smithAt.z, -0.5);
  const arm = new THREE.Mesh(merge(smith.arm), wood);
  arm.position.copy(smith.shoulder);
  smithMesh.add(arm);
  proxy(new THREE.Vector3(0.8, 1.5, 0.8), new THREE.Vector3(smithAt.x, 0.75, smithAt.z), { faber: true });
  const strikeAt = new THREE.Vector3(ANVIL.x + 0.25, ANVIL_TOP, ANVIL.z);

  const figures = { civis: merge(togatus('walker')), matrona: merge(matrona()) };
  const apprentice = new THREE.Mesh(figures.civis, wood);
  apprentice.add(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.9).translate(0, 1.0, 0.1), wood)); // a bar of iron on his shoulder
  apprentice.position.set(-2, 0, 1.4);
  scene.add(apprentice);
  let apprenticeDir = 1;
  const visitor = new THREE.Mesh(figures.matrona, wood);
  if (benchX.length > 1) {
    visitor.position.set(benchX[1] + 0.75, 0, BENCH_Z + 1.05);
    visitor.rotation.y = Math.PI * 0.85;
    scene.add(visitor);
  }

  /* ── The citizen, in from the street ── */

  const citizen = new THREE.Mesh(figures.civis, material());
  citizen.add(new THREE.Mesh(merge(laurea()), material({ value: 1 })));
  scene.add(citizen);
  const obstacles = [
    ...benchX.map((x) => ({ x0: x - BENCH.w / 2 - 0.2, x1: x + BENCH.w / 2 + 0.2, z0: BACK, z1: BENCH_Z + BENCH.d / 2 + 0.25 })),
    { x0: ANVIL.x - 0.6, x1: ANVIL.x + 0.7, z0: ANVIL.z - 1.1, z1: ANVIL.z + 0.55 },
    { x0: ANVIL.x + 0.9, x1: ANVIL.x + 1.9, z0: ANVIL.z - 0.1, z1: ANVIL.z + 0.55 },
    { x0: FORGE_X - 1.9, x1: FORGE_X + 1.1, z0: BACK, z1: BACK + 1.4 },
    { x0: visitor.position.x - 0.35, x1: visitor.position.x + 0.35, z0: visitor.position.z - 0.35, z1: visitor.position.z + 0.35 },
  ];
  const clampToRoom = (p: THREE.Vector3) => {
    p.x = THREE.MathUtils.clamp(p.x, -HALF + 0.5, HALF - 0.5);
    p.z = THREE.MathUtils.clamp(p.z, BACK + 0.6, FRONT - 0.6);
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
  let atWork: number | null = null;
  let atExit = false;
  let nearSmith = false;
  const walker = createWalker(citizen, {
    speed: SPEED,
    clamp: clampToRoom,
    reducedMotion,
    onEnterKey: () => {
      if (busy) return;
      if (atWork !== null) onOpen?.(atWork);
      else if (atExit) onExit?.();
    },
  });
  const arrive = () => {
    let from = -1;
    try {
      from = Number(sessionStorage.getItem('officina-at') ?? -1);
    } catch {}
    if (from >= 0 && from < placed.length) {
      citizen.position.copy(placed[from].stand);
      walker.face(Math.PI);
    } else {
      citizen.position.set(doorX + 0.5, 0, BACK + 1.8);
      walker.face(Math.PI * 0.3);
    }
    citizen.visible = true;
    citizen.scale.setScalar(1);
  };
  arrive();

  const banner = createBanner(canvas, name, shared.uLight);
  const stopRedraw = redrawOnSpread(canvas, shared.uReveal, banner);
  const passes = createPasses(renderer, camera, pixel);

  /* ── Focus: the work he stands at, the pointer's, or the list's ── */

  let pointed: Subject | null = null;
  let listed: number | null = null;
  let focused: number | null = null;
  let busy = false;

  const refocus = () => {
    const index = listed ?? (typeof pointed === 'number' ? pointed : null) ?? atWork;
    if (index === focused) return;
    focused = index;
    placed.forEach((p, k) => {
      const on = k === index;
      const d = reducedMotion ? 0 : 0.4;
      gsap.to(p.glow, { value: on ? 1 : 0, duration: d * 0.7, overwrite: true });
      gsap.to(p.lift, { value: on ? 1 : 0, duration: d, ease: on ? 'back.out(1.6)' : 'power2.inOut', overwrite: true });
    });
    onFocus?.(index);
  };

  /* ── Pointer ── */

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
    return typeof d.work === 'number' ? d.work : d.exitus ? 'exitus' : d.faber ? 'faber' : null;
  };
  const onPointerMove = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 2 - 1;
    const y = -(((e.clientY - r.top) / r.height) * 2 - 1);
    const inside = Math.abs(x) <= 1 && Math.abs(y) <= 1;
    const leaning = inside && e.pointerType === 'mouse';
    tiltTarget.set(leaning ? x : 0, leaning ? y : 0);
    if (e.pointerType !== 'mouse' || busy) return walker.aim(null);
    let subject: Subject | null = null;
    if (inside) {
      aimRay(e);
      subject = subjectOf(ray.intersectObjects(pickables, false)[0]);
    }
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

  /* ── Going to a work; going out ── */

  const visit = (index: number) => {
    try {
      sessionStorage.setItem('officina-at', String(index));
    } catch {}
    listed = index;
    refocus();
    if (reducedMotion) return Promise.resolve();
    return walker.follow([placed[index].stand]).then(() => {
      walker.face(Math.PI);
      listed = null;
    });
  };

  const leave = () => {
    try {
      sessionStorage.removeItem('officina-at');
      sessionStorage.setItem('forum-at', 'fabrica');
    } catch {}
    busy = true;
    canvas.style.cursor = '';
    return walker.follow([new THREE.Vector3(doorX, 0, BACK + 0.9), new THREE.Vector3(doorX, 0, BACK - 0.3)], { intoDoorway: true });
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
    let near: number | null = null;
    let best = REACH;
    placed.forEach((w, k) => {
      const d = Math.hypot(w.stand.x - p.x, w.stand.z - p.z);
      if (d < best) {
        best = d;
        near = k;
      }
    });
    atExit = near === null && Math.abs(p.x - doorX) < 0.8 && p.z < BACK + 1.6;
    nearSmith = near === null && Math.hypot(p.x - smithAt.x, p.z - (smithAt.z + 1.3)) < 1.2;
    if (near !== atWork) {
      atWork = near;
      refocus();
    }
  };

  /* ── The view ── */

  let halfW = FIT_W / 2;
  let halfH = FIT_H / 2;
  const view = { x: citizen.position.x, z: 0 };
  let closing = 0;
  let small = 1;
  const target = new THREE.Vector3();
  const lean = new THREE.Vector3();
  const follow = (dt: number) => {
    const goal = listed !== null && !busy ? placed[listed].group.position.x : citizen.position.x;
    const limit = Math.max(0, HALF + 0.6 - halfW);
    const x = THREE.MathUtils.clamp(goal, -limit, limit);
    const k = reducedMotion ? 1 : 1 - Math.exp(-dt * 3);
    view.x += (x - view.x) * k;
    // Closer in, on a phone or zoomed: follow him across the room too.
    closing += (THREE.MathUtils.clamp((zoom.value - 1) / 1.2, 0, 1) - closing) * k;
    const deep = small < 1 ? (citizen.position.z - VIEW_Z) * 0.5 : 0;
    view.z += (THREE.MathUtils.lerp(deep, citizen.position.z - VIEW_Z, closing) - view.z) * k;
    if (!reducedMotion) tilt.lerp(tiltTarget, 1 - Math.exp(-dt * 4));
    target.set(view.x, THREE.MathUtils.lerp(VIEW_Y, 0.9, closing), VIEW_Z + view.z);
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

  /* ── Life: the fire, the hammer and its sparks, the apprentice ── */

  const flames = Array.from({ length: 7 }, (_, k) => {
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 6 }, () => new THREE.Vector3())), flameMat);
    scene.add(fine(line));
    return { line, dx: (k - 3) * 0.17, phase: k * 1.9 };
  });
  const SPARKS = 14;
  const sparkGeo = new THREE.BufferGeometry();
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(SPARKS * 6), 3));
  scene.add(fine(new THREE.LineSegments(sparkGeo, flameMat)));
  const sparks = Array.from({ length: SPARKS }, () => ({ p: new THREE.Vector3(0, -10, 0), v: new THREE.Vector3(), age: 9 }));
  const BEAT = 1.15; // s between blows
  let lastBlow = -1;

  const drawLife = (dt: number, t: number) => {
    for (const f of flames) {
      const p = f.line.geometry.attributes.position as THREE.BufferAttribute;
      const tall = 0.32 + 0.12 * Math.sin(t * 6 + f.phase * 3);
      for (let i = 0; i < 6; i++) {
        const u = i / 5;
        p.setXYZ(i, fire.x + f.dx * (1 - u * 0.6) + Math.sin(t * 8 + u * 5 + f.phase) * 0.05 * u, fire.y + u * tall, fire.z + Math.cos(f.phase) * 0.15 * (1 - u));
      }
      p.needsUpdate = true;
    }
    // The hammer: raised slowly, brought down fast, a beat at a time.
    const phase = (t % BEAT) / BEAT;
    const raise = phase < 0.75 ? Math.sin((phase / 0.75) * Math.PI * 0.5) : 1 - (phase - 0.75) / 0.25;
    arm.rotation.x = -0.2 - raise * 1.6;
    const blow = Math.floor(t / BEAT);
    if (blow !== lastBlow && phase < 0.1) {
      lastBlow = blow;
      for (const s of sparks) {
        const a = Math.random() * Math.PI * 2;
        const out = 0.6 + Math.random() * 1.4;
        s.p.copy(strikeAt);
        s.v.set(Math.cos(a) * out, 1.2 + Math.random() * 1.8, Math.sin(a) * out);
        s.age = 0;
      }
    }
    const sp = sparkGeo.attributes.position as THREE.BufferAttribute;
    sparks.forEach((s, i) => {
      s.age += dt;
      s.v.y -= 9 * dt;
      s.p.addScaledVector(s.v, dt);
      const gone = s.age > 0.55 || s.p.y < 0;
      const tail = s.p.clone().addScaledVector(s.v, -0.03);
      sp.setXYZ(i * 2, s.p.x, gone ? -10 : s.p.y, s.p.z);
      sp.setXYZ(i * 2 + 1, tail.x, gone ? -10 : tail.y, tail.z);
    });
    sp.needsUpdate = true;
    apprentice.position.x += apprenticeDir * 0.7 * dt;
    if (Math.abs(apprentice.position.x + 1) > 4.5) {
      apprenticeDir = -apprenticeDir;
      apprentice.position.x = -1 + Math.sign(apprentice.position.x + 1) * 4.5;
    }
    apprentice.rotation.y = apprenticeDir > 0 ? Math.PI / 2 : -Math.PI / 2;
    apprentice.position.y = Math.abs(Math.sin(t * 5)) * 0.04;
    visitor.rotation.z = Math.sin(t * 1.1) * 0.02;
  };

  /* ── Labels ── */

  const anchor = new THREE.Vector3();
  let pinned = '';
  const pinTag = () => {
    if (!onTag) return;
    const subject: Subject | null =
      focused !== null && focused >= 0
        ? focused
        : pointed === 'exitus' || pointed === 'faber'
          ? pointed
          : atExit && !busy
            ? 'exitus'
            : nearSmith && !busy
              ? 'faber'
              : null;
    if (subject === null) {
      if (pinned) onTag(null, 0, 0);
      pinned = '';
      return;
    }
    if (typeof subject === 'number') anchor.copy(placed[subject].group.position).setY(placed[subject].base + 1.3);
    else if (subject === 'exitus') anchor.set(doorX, 2.8, BACK + 0.2);
    else anchor.set(smithAt.x, 1.9, smithAt.z);
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
    // A work in focus lifts a little and turns this way and that on its place,
    // never so far that a flat one (the board, the ring) is seen edge on.
    for (const p of placed) {
      p.spin += dt * p.lift.value;
      p.group.rotation.y = reducedMotion ? 0 : Math.sin(p.spin * 1.3) * 0.6 * p.lift.value;
      p.group.position.y = p.base + p.lift.value * 0.12;
    }
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

  drawLife(0, 0.3);
  resize();
  follow(1);
  render();
  start();

  return {
    highlight,
    visit,
    leave,
    reset,
    intro,
    dispose() {
      stop();
      walker.dispose();
      zoom.dispose();
      gsap.killTweensOf([shared.uReveal, banner.uniforms.uReveal, ...placed.flatMap((p) => [p.glow, p.lift])]);
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
