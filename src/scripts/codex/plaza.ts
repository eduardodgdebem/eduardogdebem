import * as THREE from 'three';
import { gsap } from 'gsap';
import { arcus, cypress, matrona, statua, togatus } from './forum-models';
import { buildModel, type PlateId } from './models';
import { basis, bench, capsa, medicus, pavingRings, porticus } from './plaza-models';
import { createBanner, createInk, createPasses, fine, inscriptionTexture, merge } from './passes';
import { createWalker } from './walker';

// The about page's plate: the author's plaza. The citizen comes in from the
// Via Sacra through an arch; the author's statue stands in the middle, ringed
// by monuments, one for each marginal note (the old plates, set on columns).
// Walk up to one and it turns and is named. And now and then, a blue box
// arrives out of nowhere, someone in a long scarf has a look round, and it
// goes again.

export interface Monument {
  /** Which engraved object stands on it. */
  plate: PlateId;
  /** Cut in the pedestal. */
  inscription: string;
}

/** What a label is pinned over: a monument (its index), the statue, the way out, the box, its traveller. */
export type Subject = number | 'statua' | 'exitus' | 'capsa' | 'medicus';

export interface Plaza {
  /** Pick a monument out and bring it into view (null: none). */
  highlight(index: number | null): void;
  /** Walk out through the arch; resolves at the threshold. */
  leave(): Promise<void>;
  reset(): void;
  intro(after?: Promise<void>): void;
  dispose(): void;
}

interface Options {
  monuments: Monument[];
  name: string;
  reducedMotion: boolean;
  /** Bring the box round sooner and oftener (for the curious: ?tardis). */
  eager?: boolean;
  onContextLost?: () => void;
  /** The monument in focus changed. */
  onFocus?: (index: number | null) => void;
  /** Enter, or a click, at the arch. */
  onExit?: () => void;
  /** The box has come (true) or gone (false). */
  onVisitor?: (here: boolean) => void;
  onTag?: (subject: Subject | null, x: number, y: number) => void;
}

const R = 6.4; // the plaza's radius
const RING = 4.5; // where the monuments stand
const SPEED = 3.0;
const LINE_FREQ = 13;

const VIEW_DIR = new THREE.Vector3(2.5, 7.5, 15).normalize();
const VIEW_DIST = 40;
const VIEW_Y = 1.6;
const FIT_H = 10.5;
const FIT_W = 9.5;

export function createPlaza(canvas: HTMLCanvasElement, { monuments, name, reducedMotion, eager = false, onContextLost, onFocus, onExit, onVisitor, onTag }: Options): Plaza | null {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false });
  } catch {
    return null;
  }
  const pixel = Math.min(window.devicePixelRatio, 2);
  renderer.setPixelRatio(pixel);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 100);
  scene.add(camera);

  const { shared, material, materials, textures } = createInk(LINE_FREQ);
  const stone = material();
  const fineMat = new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.4 });
  const proxyMat = new THREE.MeshBasicMaterial();
  materials.push(fineMat, proxyMat);

  const build = (parts: THREE.BufferGeometry[], x = 0, z = 0, turn = 0, m: THREE.Material = stone) => {
    const mesh = new THREE.Mesh(merge(parts), m);
    mesh.position.set(x, 0, z);
    mesh.rotation.y = turn;
    scene.add(mesh);
    return mesh;
  };
  const inscribe = (parent: THREE.Object3D, text: string, w: number, h: number, at: THREE.Vector3, m?: (tex: THREE.Texture) => THREE.Material) => {
    const tex = inscriptionTexture(text, w, h);
    textures.push(tex);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m ? m(tex) : material(undefined, tex));
    mesh.position.copy(at);
    parent.add(mesh);
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

  /* ── The square: a round slab among the stars, a colonnade behind, an arch in from the street ── */

  const floor = material();
  floor.uniforms.uPale = { value: 0.6 };
  build([new THREE.CylinderGeometry(R + 2.2, R + 2.2, 0.6, 96).translate(0, -0.3, 0)], 0, 0, 0, floor);
  scene.add(fine(new THREE.LineSegments(pavingRings(R), fineMat)));
  const GATE = -Math.PI / 2; // the arch, at the back
  build(porticus(R + 1.0, Math.PI + 0.3, GATE - 0.42, 6));
  build(porticus(R + 1.0, GATE + 0.42, 2 * Math.PI - 0.3, 6));
  const gate = build(arcus(1).parts, 0, -(R + 1.0), Math.PI / 2);
  gate.scale.setScalar(0.62);
  proxy(new THREE.Vector3(3.2, 3.4, 1.4), new THREE.Vector3(0, 1.7, -(R + 1.0)), { exitus: true });
  for (const a of [Math.PI + 0.12, -0.12, Math.PI * 0.62, Math.PI * 0.38]) build(cypress(2.6), Math.cos(a) * (R + 0.9), Math.sin(a) * (R + 0.9));

  /* ── The statue in the middle ── */

  const statue = statua();
  const statueMesh = build(statue.parts, 0, 0);
  statueMesh.scale.setScalar(1.25);
  inscribe(statueMesh, 'EDVARDVS', statue.inscription.w, statue.inscription.h, new THREE.Vector3(0, statue.inscription.y, statue.inscription.z + 0.012));
  proxy(new THREE.Vector3(2.4, 4.6, 2.4), new THREE.Vector3(0, 2.3, 0), { statua: true });

  /* ── The monuments, round the statue; benches between ── */

  // Seven places round the ring: the arch's side is left clear, the monuments take the rest.
  const slot = (k: number) => GATE + ((k + 1) * Math.PI * 2) / (monuments.length + 1);
  type Mon = { group: THREE.Group; object: THREE.Object3D; glow: { value: number }; at: THREE.Vector3; spin: { value: number } };
  const mons: Mon[] = monuments.map((m, k) => {
    const a = slot(k);
    const at = new THREE.Vector3(Math.cos(a) * RING, 0, Math.sin(a) * RING);
    const glow = { value: 0 };
    const mat = material(glow);
    const group = new THREE.Group();
    group.position.copy(at);
    const base = basis();
    group.add(new THREE.Mesh(merge(base.parts), mat));
    inscribe(group, m.inscription, base.panel.w, base.panel.h, new THREE.Vector3(0, base.panel.y, base.panel.z + 0.01), (tex) => material(glow, tex));
    const object = buildModel(m.plate, mat, 1.15);
    object.position.y = base.top + 0.62;
    group.add(object);
    scene.add(group);
    proxy(new THREE.Vector3(1.3, 2.6, 1.3), new THREE.Vector3(0, 1.3, 0), { monument: k }, group);
    // A bench on the far side of each, facing the statue.
    const ba = a + Math.PI / (monuments.length + 1);
    build(bench(1.5), Math.cos(ba) * (R - 0.6), Math.sin(ba) * (R - 0.6), -ba - Math.PI / 2);
    return { group, object, glow, at, spin: { value: 0 } };
  });

  /* ── A few people about ── */

  const figures = { civis: merge(togatus('walker')), matrona: merge(matrona()) };
  const people: { mesh: THREE.Mesh; phase: number }[] = [];
  const person = (kind: keyof typeof figures, x: number, z: number, facing: number) => {
    const mesh = new THREE.Mesh(figures[kind], stone);
    mesh.position.set(x, 0, z);
    mesh.rotation.y = facing;
    scene.add(mesh);
    people.push({ mesh, phase: x * 1.7 + z });
    return mesh;
  };
  // Two admiring the statue, one reading a pedestal.
  person('matrona', 1.9, 2.2, Math.atan2(-1.9, -2.2));
  person('civis', 2.5, 1.5, Math.atan2(-2.5, -1.5));
  {
    const m = mons[Math.min(2, mons.length - 1)];
    const out = m.at.clone().setY(0).normalize();
    person('civis', m.at.x + out.x * 1.0, m.at.z + out.z * 1.0, Math.atan2(-out.x, -out.z));
  }
  // One strolling round the ring.
  const stroller = person('matrona', 0, 0, 0);
  let strollAngle = 0.8;

  /* ── The visitor: a blue box, and its traveller ── */

  const boxReveal = { value: 0 };
  const blue = (text?: THREE.Texture) => {
    const m = material(undefined, text);
    m.uniforms.uReveal = boxReveal; // it engraves itself in and out on its own
    m.uniforms.uBlue = { value: 1 };
    return m;
  };
  const visitor = new THREE.Group();
  const box = capsa();
  visitor.add(new THREE.Mesh(merge(box.parts), blue()));
  for (const s of box.signs) {
    const sign = inscribe(visitor, 'POLICE  BOX', s.w, s.h, new THREE.Vector3(0, s.y, s.z), (tex) => blue(tex));
    sign.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), s.turn);
    sign.rotation.y = s.turn;
  }
  visitor.visible = false;
  scene.add(visitor);
  const doctor = new THREE.Group();
  const dr = medicus();
  doctor.add(new THREE.Mesh(merge(dr.body), stone));
  doctor.add(new THREE.Mesh(merge(dr.scarf), material({ value: 1 })));
  doctor.visible = false;
  scene.add(doctor);
  const visitorProxy = proxy(new THREE.Vector3(1.3, 3.0, 1.3), new THREE.Vector3(0, 1.5, 0), { capsa: true }, visitor);
  proxy(new THREE.Vector3(0.7, 1.8, 0.7), new THREE.Vector3(0, 0.9, 0), { medicus: true }, doctor);
  // Not solid until it has fully arrived: no outlines, nothing to pick.
  const solid = (yes: boolean) => {
    visitor.traverse((o) => {
      if (o !== visitorProxy && o instanceof THREE.Mesh) o.layers.set(yes ? 0 : 1);
    });
  };

  /* ── The citizen, in through the arch ── */

  const citizen = new THREE.Mesh(figures.civis, material());
  scene.add(citizen);
  const obstacles = () => [
    { at: new THREE.Vector3(), r: 1.6 },
    ...mons.map((m) => ({ at: m.at, r: 0.95 })),
    ...(visitor.visible ? [{ at: visitor.position, r: 0.9 }] : []),
  ];
  const clampToPlaza = (p: THREE.Vector3) => {
    // Inside the rim, and round the statue, the monuments and any box.
    const len = Math.hypot(p.x, p.z);
    const rim = R - 0.5;
    if (len > rim) {
      // Out through the arch is the only way past the rim.
      if (!(Math.abs(p.x) < 1.1 && p.z < 0)) p.multiplyScalar(rim / len);
      else p.z = Math.max(p.z, -(R + 0.6));
    }
    for (const o of obstacles()) {
      const dx = p.x - o.at.x;
      const dz = p.z - o.at.z;
      const d = Math.hypot(dx, dz);
      if (d < o.r && d > 1e-4) {
        p.x = o.at.x + (dx / d) * o.r;
        p.z = o.at.z + (dz / d) * o.r;
      }
    }
  };
  let atExit = false;
  let busy = false;
  const walker = createWalker(citizen, {
    speed: SPEED,
    clamp: clampToPlaza,
    reducedMotion,
    onEnterKey: () => {
      if (busy) return;
      if (atExit) onExit?.();
      else if (near !== null && typeof near === 'number') turnOnce(near);
    },
  });
  const arrive = () => {
    citizen.position.set(0, 0, -(R - 1.0));
    walker.face(0);
    citizen.visible = true;
    citizen.scale.setScalar(1);
  };
  arrive();

  const banner = createBanner(camera, name, shared.uLight);
  const passes = createPasses(renderer, camera, pixel);

  /* ── Focus ── */

  let pointed: Subject | null = null;
  let listed: number | null = null;
  let near: Subject | null = null;
  let focusedMon: number | null = null;

  const refocus = () => {
    const index = listed ?? (typeof pointed === 'number' ? pointed : null) ?? (typeof near === 'number' ? near : null);
    if (index === focusedMon) return;
    focusedMon = index;
    mons.forEach((m, k) => gsap.to(m.glow, { value: k === index ? 1 : 0, duration: reducedMotion ? 0 : 0.35, overwrite: true }));
    onFocus?.(index);
  };

  /** A monument's object turns once round, for a closer look. */
  const turnOnce = (k: number) => {
    if (reducedMotion) return;
    gsap.to(mons[k].spin, { value: mons[k].spin.value + Math.PI * 2, duration: 1.6, ease: 'power2.inOut' });
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
    if (typeof d.monument === 'number') return d.monument;
    for (const k of ['statua', 'exitus', 'capsa', 'medicus'] as const) if (d[k]) return k;
    return null;
  };
  const pickAt = (e: PointerEvent) => {
    aimRay(e);
    // The box and its traveller can only be picked while they're here.
    const hits = ray.intersectObjects(pickables, false).filter((h) => h.object.parent?.visible !== false);
    return subjectOf(hits[0]);
  };
  const onPointerMove = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 2 - 1;
    const y = -(((e.clientY - r.top) / r.height) * 2 - 1);
    const inside = Math.abs(x) <= 1 && Math.abs(y) <= 1;
    tiltTarget.set(inside ? x : 0, inside ? y : 0);
    if (e.pointerType !== 'mouse' || busy) return;
    const subject = inside ? pickAt(e) : null;
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
    if (!downAt || busy) return;
    const moved = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y);
    downAt = null;
    if (moved > 8) return;
    const subject = pickAt(e);
    if (typeof subject === 'number') turnOnce(subject);
    else if (subject === 'exitus') onExit?.();
    else {
      const spot = ray.ray.intersectPlane(floorPlane, new THREE.Vector3());
      if (spot) walker.walkTo(spot);
    }
  };
  const onLeave = () => {
    tiltTarget.set(0, 0);
    if (pointed !== null) {
      pointed = null;
      refocus();
    }
  };

  /* ── Going out ── */

  const leave = () => {
    try {
      sessionStorage.setItem('forum-at', 'statua');
    } catch {}
    busy = true;
    canvas.style.cursor = '';
    return walker.follow([new THREE.Vector3(0, 0, -(R - 0.8)), new THREE.Vector3(0, 0, -(R + 1.6))], { intoDoorway: true });
  };

  const reset = () => {
    walker.halt();
    busy = false;
    listed = null;
    pointed = null;
    arrive();
    focusedMon = -1;
    refocus();
  };

  const highlight = (index: number | null) => {
    if (busy) return;
    listed = index;
    refocus();
  };

  /* ── The visitor's comings and goings ── */

  let visit: gsap.core.Timeline | null = null;
  let nextVisit: gsap.core.Tween | null = null;
  // Where it may land: between the monuments, halfway in to the statue.
  const spots = Array.from({ length: monuments.length + 1 }, (_, k) => {
    const a = GATE + ((k + 0.5) * Math.PI * 2) / (monuments.length + 1);
    return new THREE.Vector3(Math.cos(a) * 2.9, 0, Math.sin(a) * 2.9);
  });
  const schedule = () => {
    const wait = eager ? 4 + Math.random() * 4 : 25 + Math.random() * 50;
    nextVisit = gsap.delayedCall(wait, arriveVisitor);
  };
  const arriveVisitor = () => {
    // Somewhere clear of the citizen, doors turned out toward us.
    const free = spots.filter((s) => s.distanceTo(citizen.position) > 2.2);
    const at = free[Math.floor(Math.random() * free.length)] ?? spots[0];
    visitor.position.copy(at);
    visitor.rotation.y = Math.atan2(at.x, at.z) * 0.35;
    const out = new THREE.Vector3(Math.sin(visitor.rotation.y), 0, Math.cos(visitor.rotation.y));
    doctor.position.copy(at);
    doctor.rotation.y = visitor.rotation.y;
    solid(false);
    boxReveal.value = 0;
    visitor.visible = true;
    onVisitor?.(true);
    const wheeze = (from: number, to: number) => {
      // In and out of being, the way it does: three surges, each surer than the last.
      const steps = from < to ? [0.5, 0.2, 0.75, 0.45, 1] : [0.55, 0.8, 0.3, 0.5, 0];
      const tl = gsap.timeline();
      steps.forEach((v) => tl.to(boxReveal, { value: v, duration: 0.55, ease: 'sine.inOut' }));
      return tl;
    };
    const step = { t: 0 };
    visit = gsap
      .timeline({ onComplete: () => ((visit = null), schedule()) })
      .add(wheeze(0, 1))
      .call(() => {
        solid(true);
        doctor.visible = true;
      })
      // Out of the door, a good look round, a word if you're near, and back in.
      .to(step, {
        t: 1,
        duration: 1.0,
        ease: 'power1.out',
        onUpdate: () => doctor.position.copy(at).addScaledVector(out, 0.2 + step.t * 1.0),
      })
      .to(doctor.rotation, { y: doctor.rotation.y + 0.9, duration: 1.4, ease: 'sine.inOut' }, '+=0.6')
      .to(doctor.rotation, { y: doctor.rotation.y - 0.8, duration: 1.8, ease: 'sine.inOut' }, '+=1.2')
      .to(doctor.rotation, { y: doctor.rotation.y + Math.PI, duration: 0.5 }, '+=3.2')
      .to(step, {
        t: 0,
        duration: 0.9,
        ease: 'power1.in',
        onUpdate: () => doctor.position.copy(at).addScaledVector(out, 0.2 + step.t * 1.0),
      })
      .call(() => {
        doctor.visible = false;
        solid(false);
      })
      .add(wheeze(1, 0))
      .call(() => {
        visitor.visible = false;
        onVisitor?.(false);
      });
  };
  if (!reducedMotion) schedule();

  /* ── Each frame ── */

  const step = (dt: number) => {
    walker.step(dt);
    if (busy) return;
    const p = citizen.position;
    let next: Subject | null = null;
    if (doctor.visible && p.distanceTo(doctor.position) < 1.8) next = 'medicus';
    else if (visitor.visible && p.distanceTo(visitor.position) < 1.9) next = 'capsa';
    else {
      const k = mons.findIndex((m) => p.distanceTo(m.at) < 1.65);
      if (k >= 0) next = k;
      else if (Math.hypot(p.x, p.z) < 2.6) next = 'statua';
    }
    atExit = Math.abs(p.x) < 1.6 && p.z < -(R - 1.4);
    if (atExit && next === null) next = 'exitus';
    if (next !== near) {
      near = next;
      refocus();
    }
  };

  let halfW = FIT_W / 2;
  let halfH = FIT_H / 2;
  const view = new THREE.Vector2(citizen.position.x, citizen.position.z);
  const target = new THREE.Vector3();
  const lean = new THREE.Vector3();
  const follow = (dt: number) => {
    const goal = listed !== null && !busy ? mons[listed].at : citizen.position;
    const limX = Math.max(0, R + 1.8 - halfW);
    const k = reducedMotion ? 1 : 1 - Math.exp(-dt * 3);
    view.x += (THREE.MathUtils.clamp(goal.x, -limX, limX) - view.x) * k;
    view.y += (THREE.MathUtils.clamp(goal.z, -3.2, 2.2) - view.y) * k;
    if (!reducedMotion) tilt.lerp(tiltTarget, 1 - Math.exp(-dt * 4));
    target.set(view.x, VIEW_Y, view.y - 0.8);
    lean.set(tilt.x * 0.1, -tilt.y * 0.055, 0).add(VIEW_DIR).normalize();
    camera.position.copy(target).addScaledVector(lean, VIEW_DIST);
    camera.lookAt(target);
    const pxPerUnit = passes.uniforms.uResolution.value.x / (halfW * 2);
    passes.uniforms.uStarShift.value.set(view.x * 0.12 * pxPerUnit, -view.y * 0.12 * pxPerUnit);
  };

  const resize = () => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    passes.setSize(w, h);
    const aspect = w / h;
    halfH = Math.max(FIT_H / 2, FIT_W / 2 / aspect);
    halfW = halfH * aspect;
    Object.assign(camera, { left: -halfW, right: halfW, top: halfH, bottom: -halfH });
    camera.updateProjectionMatrix();
    shared.uFreq.value = LINE_FREQ * (FIT_H / 2 / halfH);
    banner.place(halfW, halfH, 6);
    if (!running) render();
  };

  /* ── Labels ── */

  const anchor = new THREE.Vector3();
  let pinned = '';
  const pinTag = () => {
    if (!onTag) return;
    const subject: Subject | null = focusedMon !== null && focusedMon >= 0 ? focusedMon : (pointed ?? near);
    if (subject === null) {
      if (pinned) onTag(null, 0, 0);
      pinned = '';
      return;
    }
    if (typeof subject === 'number') anchor.copy(mons[subject].at).setY(2.75);
    else if (subject === 'statua') anchor.set(0, 4.7, 0);
    else if (subject === 'exitus') anchor.set(0, 3.6, -(R + 1.0));
    else if (subject === 'capsa') anchor.copy(visitor.position).setY(3.05);
    else anchor.copy(doctor.position).setY(1.95);
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
    mons.forEach((m, k) => {
      // The focused monument's object turns slowly on its column.
      m.object.rotation.y = m.spin.value + (k === focusedMon ? clock * 0.6 : 0);
    });
    camera.updateMatrixWorld(true);
    banner.update();
    shared.uLight.value.set(lamp.x * 1.5 + 0.25, lamp.y * 1.2 + 0.3, 0.8).normalize();
    passes.uniforms.uReveal.value = shared.uReveal.value;
    passes.render(scene);
  };

  const tick = (now: number) => {
    raf = requestAnimationFrame(tick);
    timer.update(now);
    const dt = Math.min(timer.getDelta(), 0.05);
    if (!reducedMotion) {
      clock += dt;
      strollAngle += dt * 0.09;
      stroller.position.set(Math.cos(strollAngle) * (R - 1.5), Math.abs(Math.sin(clock * 5)) * 0.04, Math.sin(strollAngle) * (R - 1.5));
      stroller.rotation.y = -strollAngle;
      for (const p of people) if (p.mesh !== stroller) p.mesh.rotation.z = Math.sin(clock * 1.2 + p.phase) * 0.02;
    }
    step(dt);
    follow(dt);
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
  const onVisibility = () => {
    if (document.hidden) {
      stop();
      nextVisit?.pause();
      visit?.pause();
    } else {
      start();
      nextVisit?.resume();
      visit?.resume();
    }
  };
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
      gsap.to(banner.uniforms.uReveal, { value: 1, duration: 2.2, ease: 'power1.inOut', delay: 1.0 });
    });
  };

  window.addEventListener('resize', resize);
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointerleave', onLeave);
  document.addEventListener('visibilitychange', onVisibility);
  canvas.addEventListener('webglcontextlost', onLost);

  resize();
  follow(1);
  render();
  start();

  return {
    highlight,
    leave,
    reset,
    intro,
    dispose() {
      stop();
      walker.dispose();
      visit?.kill();
      nextVisit?.kill();
      gsap.killTweensOf([shared.uReveal, banner.uniforms.uReveal, boxReveal, ...mons.flatMap((m) => [m.glow, m.spin])]);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointerleave', onLeave);
      document.removeEventListener('visibilitychange', onVisibility);
      canvas.removeEventListener('webglcontextlost', onLost);
      banner.dispose();
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh || o instanceof THREE.Line) o.geometry.dispose();
      });
      passes.dispose();
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
      renderer.dispose();
    },
  };
}
