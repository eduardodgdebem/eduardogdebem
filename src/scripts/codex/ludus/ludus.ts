import * as THREE from 'three';
import { createBanner, redrawOnSpread } from '../banner';
import { gsap } from 'gsap';
import {
  SAND,
  aper,
  arena,
  crowd,
  equesGallus,
  equesRomanus,
  funditor,
  gallus,
  hastatusGallus,
  legionarius,
  sagittarius,
  signum,
  triarius,
} from '../ludus-models';
import { createInk, createPasses, fine, merge, plateZoom } from '../passes';
import { createZoom } from '../zoom';
import { GAULS, SLOTS, STATS, STEP, battle, type Battle, type Cohort, type Event as BattleEvent, type Formation, type Kind, type Plan } from './sim';

// The arena plate on /ludus/: the sand seen from the stands, engraved like
// the rest of the book. While the reader plans, the cohorts they have placed
// stand at their places; when they give the order, the battle in sim.ts is
// fought out here, a man at a time: each eases toward his place in his
// cohort's formation, the fallen lie where they fell, volleys fly as lines.

/** Where a cohort is on the plate, for the page to pin its badge over. */
export interface Marker {
  /** The place it stands at while planning; its cohort id in battle. */
  id: number;
  side: Cohort['side'];
  kind: Kind;
  formation: Formation;
  /** CSS px within the canvas. */
  x: number;
  y: number;
  /** Men left, 0..1. */
  strength: number;
  broken: boolean;
}

export interface Ludus {
  /** Show a plan, with one of its places picked out (planning only). */
  setPlan(plan: Plan, selected: number | null): void;
  /** The place under a point on screen (client px), if any. */
  slotAt(x: number, y: number): number | null;
  /** Ring a place in red (while something is dragged over it). */
  hover(slot: number | null): void;
  /** Fight it. Events come to `onEvent` as they happen. */
  fight(plan: Plan): Battle;
  /** The one horn call; false if it's been used, or the battle isn't on. */
  sound(call: 'signum' | 'receptui'): boolean;
  /** Back to planning, the sand cleared. */
  reset(): void;
  intro(after?: Promise<void>): void;
  dispose(): void;
}

interface Options {
  name: string;
  reducedMotion: boolean;
  onContextLost?: () => void;
  /** A place on the near half was clicked or tapped. */
  onPick?: (slot: number) => void;
  onEvent?: (event: BattleEvent, battle: Battle) => void;
  /** Every frame: where each cohort is, for its badge. */
  onMarkers?: (markers: Marker[]) => void;
}

const SCALE = 0.5; // soldiers, from life size to the arena's
const VIEW_DIR = new THREE.Vector3(1.2, 9, 11).normalize();
const VIEW_DIST = 60;
// Centred a little toward the near side, so the sand fills the plate and the stands rise behind.
const LOOK = new THREE.Vector3(0, 0.6, -2.5);
const FIT_W = 29;
const FIT_H = 17;
const LINE_FREQ = 16;

const MODELS: Record<Kind, () => THREE.BufferGeometry[]> = {
  legionarius,
  sagittarius,
  eques: equesRomanus,
  triarius,
  gallus,
  funditor,
  equesGallus,
  hastatus: hastatusGallus,
};

/** Where each man of a cohort stands, in its own frame: x across the front, z toward the rear. */
function places(formation: Formation, men: number, cavalry: boolean): [number, number][] {
  const out: [number, number][] = [];
  const gap = cavalry ? 0.62 : 0.42;
  if (formation === 'testudo') {
    const cols = 4;
    for (let i = 0; i < men; i++) out.push([((i % cols) - (cols - 1) / 2) * 0.3, Math.floor(i / cols) * 0.3]);
  } else if (formation === 'cuneus') {
    // The wedge: one man at the point, then two, three, four.
    let row = 0;
    let inRow = 0;
    for (let i = 0; i < men; i++) {
      out.push([(inRow - row / 2) * gap, row * gap * 0.8 - 0.6]);
      if (++inRow > row) {
        row++;
        inRow = 0;
      }
    }
  } else if (formation === 'orbis') {
    for (let i = 0; i < men; i++) {
      const a = (i / men) * Math.PI * 2;
      out.push([Math.cos(a) * 0.62, Math.sin(a) * 0.62]);
    }
  } else {
    const rows = cavalry ? 2 : men > 10 ? 2 : 1;
    const cols = Math.ceil(men / rows);
    for (let i = 0; i < men; i++) out.push([((i % cols) - (cols - 1) / 2) * gap, Math.floor(i / cols) * gap - (rows - 1) * gap * 0.5]);
  }
  return out;
}

/** The short way round from one heading to another. */
const angleTo = (from: number, to: number) => {
  let d = (to - from) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
};

const rand = (() => {
  let seed = 17;
  return () => (seed = (seed * 16807) % 2147483647) / 2147483647;
})();

export function createLudus(canvas: HTMLCanvasElement, { name, reducedMotion, onContextLost, onPick, onEvent, onMarkers }: Options): Ludus | null {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false });
  } catch {
    return null;
  }
  const pixel = Math.min(window.devicePixelRatio, 2);
  renderer.setPixelRatio(pixel);
  // The arena can be looked at closely: wheel, pinch, the plate's buttons; drag the sand to look around.
  const zoom = createZoom(canvas, { min: 0.9, max: 3, onChange: () => resize() });
  const pan = new THREE.Vector2();

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 140);
  scene.add(camera);

  const { shared, material, materials, textures } = createInk(LINE_FREQ);
  const stone = material();
  // The stands in a lighter cut, so the crowd on them reads.
  const tiers = material();
  tiers.uniforms.uPale = { value: 0.45 };
  const sandMat = material();
  sandMat.uniforms.uPale = { value: 0.75 };
  const dyed = material({ value: 1 });
  const fineMat = new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35 });
  const slotMat = new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.55 });
  const slotLit = new THREE.LineBasicMaterial({ color: 0xff0000 }); // red: read as rubric by the paper pass
  const arrowMat = new THREE.LineBasicMaterial({ color: 0x000000 });
  materials.push(fineMat, slotMat, slotLit, arrowMat);

  /* ── The arena ── */

  const built = arena();
  scene.add(new THREE.Mesh(merge(built.sand), sandMat));
  scene.add(new THREE.Mesh(merge(built.stone), tiers));
  scene.add(new THREE.Mesh(merge(built.awning), dyed));
  // The crowd in two halves, every other seat, so it can rise in waves.
  const stands = [0, 1].map((part) => {
    const mesh = new THREE.Mesh(merge(crowd(3, part as 0 | 1)), stone);
    scene.add(mesh);
    return mesh;
  });
  /** Who won, and since when: the survivors leap and the crowd rises. */
  let cheer: { side: Cohort['side']; t0: number } | null = null;
  // How loud the stands are (0 quiet, 1 on their feet): each blow on the sand
  // raises it, and it dies away. The flags wave with it, the camera shakes with
  // the biggest.
  let roar = 0;
  let shake = 0;

  // Flags in the stands: red for Rome, blue for the Gauls, each on a pole held
  // up by someone in the crowd, its cloth waving.
  const redCloth = material({ value: 1 });
  const blueCloth = material();
  blueCloth.uniforms.uBlue.value = 1;
  const CLOTH = { w: 1.0, h: 0.62, segs: 8 };
  const flags = Array.from({ length: 22 }, (_, i) => {
    const tier = 1 + ((i * 5) % 6);
    const a = Math.PI + 0.22 + ((i + 0.5) / 22) * (Math.PI - 0.44) + Math.sin(i * 12.9) * 0.03;
    const rx = SAND.rx + 0.6 + tier * 0.85 - 0.35;
    const rz = SAND.rz + 0.6 + tier * 0.85 - 0.35;
    const g = new THREE.Group();
    g.position.set(Math.cos(a) * rx, 1.2 + tier * 0.55 + 0.2, Math.sin(a) * rz);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.5, 5).translate(0, 0.75, 0), stone);
    const geo = new THREE.PlaneGeometry(CLOTH.w, CLOTH.h, CLOTH.segs, 1).translate(CLOTH.w / 2, 1.5 - CLOTH.h / 2, 0);
    const cloth = new THREE.Mesh(geo, i % 3 === 2 ? blueCloth : redCloth);
    g.add(pole, cloth);
    // Leaning, as an arm holds it up.
    g.rotation.z = (i % 2 ? 1 : -1) * 0.12;
    scene.add(g);
    return { g, geo, rest: Float32Array.from(geo.attributes.position.array as Float32Array), part: i % 2, phase: i * 1.9, base: g.position.y, lean: g.rotation.z };
  });
  const waveFlags = (t: number) => {
    const speed = 3 + roar * 7;
    const amp = 0.04 + roar * 0.12;
    for (const f of flags) {
      const pos = f.geo.attributes.position as THREE.BufferAttribute;
      for (let v = 0; v < pos.count; v++) {
        const x = f.rest[v * 3];
        const along = x / CLOTH.w;
        pos.setZ(v, Math.sin(t * speed - along * 5 + f.phase) * amp * along);
        pos.setY(v, f.rest[v * 3 + 1] + Math.sin(t * speed * 0.7 - along * 4 + f.phase) * amp * 0.4 * along);
      }
      pos.needsUpdate = true;
      f.geo.computeVertexNormals();
      // Raised higher, and swung, the louder it gets.
      const lift = Math.max(0, Math.sin(t * (2 + roar * 4) + f.phase)) * roar * 0.25;
      f.g.position.y = f.base + stands[f.part].position.y + lift;
      f.g.rotation.z = f.lean + Math.sin(t * (1.5 + roar * 5) + f.phase) * (0.05 + roar * 0.3);
    }
  };
  // The sand raked in rings, and a slab of floor under it all.
  {
    const pts: THREE.Vector3[] = [];
    for (const k of [0.35, 0.62, 0.86]) {
      for (let i = 0; i < 96; i++) {
        const a0 = (i / 96) * Math.PI * 2;
        const a1 = ((i + 1) / 96) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(a0) * SAND.rx * k, 0.01, Math.sin(a0) * SAND.rz * k), new THREE.Vector3(Math.cos(a1) * SAND.rx * k, 0.01, Math.sin(a1) * SAND.rz * k));
      }
    }
    scene.add(fine(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), fineMat)));
  }

  // The places a cohort can be set, ringed on the near half while planning.
  const slotRings = SLOTS.map((s) => {
    const ring = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(Array.from({ length: 40 }, (_, i) => new THREE.Vector3(Math.cos((i / 40) * Math.PI * 2) * 1.1, 0.02, Math.sin((i / 40) * Math.PI * 2) * 0.8))),
      slotMat,
    );
    ring.position.set(s.x, 0, s.z);
    scene.add(fine(ring));
    return ring;
  });

  /* ── The men: one instanced mesh a kind, the living and the fallen together ── */

  const CAP = 200;
  const troops = {} as Record<Kind, THREE.InstancedMesh>;
  for (const kind of Object.keys(MODELS) as Kind[]) {
    const geo = merge(MODELS[kind]().map((g) => g.scale(SCALE, SCALE, SCALE)));
    const mesh = new THREE.InstancedMesh(geo, stone, CAP);
    mesh.count = 0;
    mesh.frustumCulled = false;
    mesh.setColorAt(0, new THREE.Color(0, 0, 0));
    scene.add(mesh);
    troops[kind] = mesh;
  }
  const standards = {
    pole: new THREE.InstancedMesh(merge(signum().pole.map((g) => g.scale(SCALE * 1.15, SCALE * 1.15, SCALE * 1.15))), stone, 12),
    cloth: new THREE.InstancedMesh(merge(signum().cloth.map((g) => g.scale(SCALE * 1.15, SCALE * 1.15, SCALE * 1.15))), dyed, 12),
    boar: new THREE.InstancedMesh(merge(aper().map((g) => g.scale(SCALE * 1.15, SCALE * 1.15, SCALE * 1.15))), stone, 12),
  };
  for (const m of Object.values(standards)) {
    m.count = 0;
    m.frustumCulled = false;
    scene.add(m);
  }

  // Each cohort's men, where they are now (they ease toward their places).
  type Man = { x: number; z: number; yaw: number; bob: number };
  const men = new Map<number, Man[]>();
  const fallen: { kind: Kind; x: number; z: number; yaw: number }[] = [];

  /* ── Volleys: arrows and sling-stones, as short lines in flight ── */

  const ARROWS = 160;
  const arrowGeo = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(ARROWS * 6), 3));
  const arrowLines = new THREE.LineSegments(arrowGeo, arrowMat);
  scene.add(fine(arrowLines));
  type Arrow = { x0: number; z0: number; x1: number; z1: number; t0: number };
  let arrows: Arrow[] = [];
  let seenVolleys = 0;

  const banner = createBanner(canvas, name, shared.uLight);

  const stopRedraw = redrawOnSpread(canvas, shared.uReveal, banner);
  const passes = createPasses(renderer, camera, pixel);

  /* ── Planning and fighting ── */

  let plan: Plan = SLOTS.map(() => null);
  let selected: number | null = null;
  let fight: Battle | null = null;
  let seenEvents = 0;
  let acc = 0;

  /** The cohorts to draw: the battle's, or, while planning, the plan's and the Gauls' as they will stand. */
  const resting = (id: number, side: Cohort['side'], kind: Kind, formation: Formation, x: number, z: number): Cohort => ({
    id, side, kind, formation, n: 0, x, z, fx: 0, fz: side === 'roma' ? -1 : 1, hp: 1,
    men: STATS[kind].men, maxMen: STATS[kind].men, morale: 1, state: 'ready', target: -1, reload: 0,
    charged: false, chargeT: 0, fallbackT: 0, met: new Set(),
  });
  const host = GAULS.map((g, i) => resting(100 + i, 'gallia', g.kind, 'acies', g.x, g.z));
  const shown = (): Cohort[] => {
    if (fight) return fight.cohorts;
    return [...plan.flatMap((p, i) => (p ? [resting(i, 'roma', p.kind, p.formation, SLOTS[i].x, SLOTS[i].z)] : [])), ...host];
  };

  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const lying = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
  const pos = new THREE.Vector3();
  const one = new THREE.Vector3(1, 1, 1);
  // Romans in red ink, Gauls in blue; a picked-out cohort deeper red; the fallen in plain ink.
  type Tone = 'roma' | 'gallia' | 'lit' | 'fallen';
  const TONES: Record<Tone, THREE.Color> = {
    roma: new THREE.Color(0.6, 0, 0),
    gallia: new THREE.Color(0, 0.85, 0),
    lit: new THREE.Color(1, 0, 0),
    fallen: new THREE.Color(0, 0, 0),
  };

  const drawMen = (dt: number) => {
    const counts = {} as Record<Kind, number>;
    for (const k of Object.keys(troops) as Kind[]) counts[k] = 0;
    const put = (kind: Kind, x: number, y: number, z: number, yaw: number, down: boolean, tone: Tone) => {
      const mesh = troops[kind];
      const i = counts[kind]++;
      if (i >= CAP) return;
      q.setFromAxisAngle(up, yaw);
      if (down) q.multiply(lying);
      m4.compose(pos.set(x, y, z), q, one);
      mesh.setMatrixAt(i, m4);
      mesh.setColorAt(i, TONES[tone]);
    };
    const k = reducedMotion ? 1 : 1 - Math.exp(-dt * 5);
    let poles = 0;
    let boars = 0;
    for (const c of shown()) {
      const s = STATS[c.kind];
      const cav = s.role === 'cavalry';
      // Half as many figures as the men they stand for: a cohort reads as a block.
      const figures = (n: number) => Math.ceil(n / 2);
      let list = men.get(c.id);
      const spots = places(c.formation, figures(c.maxMen), cav);
      const yaw = Math.atan2(c.fx, c.fz);
      const cos = Math.cos(yaw);
      const sin = Math.sin(yaw);
      // A cohort's men, placed at its formation (rotated to its facing).
      const at = (i: number) => {
        const [lx, lz] = spots[i];
        return { x: c.x + lx * cos - lz * sin, z: c.z - lx * sin - lz * cos };
      };
      if (!list) {
        list = spots.map((_, i) => ({ ...at(i), yaw, bob: rand() * 6 }));
        men.set(c.id, list);
      }
      // The fallen: those beyond its strength now lie where they stood.
      while (list.length > figures(c.men)) {
        const m = list.pop()!;
        if (c.state !== 'gone' || c.men === 0) fallen.push({ kind: c.kind, x: m.x, z: m.z, yaw: m.yaw + (rand() - 0.5) * 1.5 });
      }
      if (c.state === 'gone') continue;
      const lit = !fight && selected === c.id ? 'lit' : c.side;
      list.forEach((m, i) => {
        const goal = at(i);
        const jitter = c.state === 'fight' ? Math.sin(clock * 9 + i) * 0.05 : 0;
        const dx = goal.x + jitter - m.x;
        const dz = goal.z - m.z;
        m.x += dx * k;
        m.z += dz * k;
        m.yaw += angleTo(m.yaw, yaw) * k;
        const moving = Math.hypot(dx, dz) > 0.02 || c.state === 'fight';
        if (moving && !reducedMotion) m.bob += dt * (cav ? 12 : 9);
        // The winners leap, each to his own beat.
        const leap = cheer && cheer.side === c.side && !reducedMotion ? Math.abs(Math.sin((clock - cheer.t0) * 7 + i * 1.7)) * 0.35 : 0;
        put(c.kind, m.x, (moving ? Math.abs(Math.sin(m.bob)) * 0.05 : 0) + leap, m.z, m.yaw, false, lit);
      });
      // The standard, behind the middle of the line.
      const back = at(Math.min(spots.length - 1, Math.floor(spots.length / 2)));
      const sx = (back.x + c.x) / 2 - c.fx * 0.25;
      const sz = (back.z + c.z) / 2 - c.fz * 0.25;
      q.setFromAxisAngle(up, yaw);
      m4.compose(pos.set(sx, 0, sz), q, one);
      if (c.side === 'roma') {
        standards.pole.setMatrixAt(poles, m4);
        standards.cloth.setMatrixAt(poles, m4);
        poles++;
      } else {
        standards.boar.setMatrixAt(boars++, m4);
      }
    }
    for (const f of fallen) put(f.kind, f.x, 0.04, f.z, f.yaw, true, 'fallen');
    for (const kind of Object.keys(troops) as Kind[]) {
      const mesh = troops[kind];
      mesh.count = Math.min(CAP, counts[kind]);
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
    // Where each cohort's badge goes: over its middle, a little above the men.
    if (onMarkers) {
      const markers: Marker[] = [];
      for (const c of shown()) {
        if (c.state === 'gone') continue;
        const list = men.get(c.id);
        if (!list?.length) continue;
        const mx = list.reduce((a, m) => a + m.x, 0) / list.length;
        const mz = list.reduce((a, m) => a + m.z, 0) / list.length;
        pos.set(mx, 1.5, mz).project(camera);
        markers.push({
          id: c.id, side: c.side, kind: c.kind, formation: c.formation,
          x: ((pos.x + 1) / 2) * canvas.clientWidth,
          y: ((1 - pos.y) / 2) * canvas.clientHeight,
          strength: c.men / c.maxMen,
          broken: c.state === 'rout',
        });
      }
      onMarkers(markers);
    }
    standards.pole.count = standards.cloth.count = poles;
    standards.boar.count = boars;
    for (const m of Object.values(standards)) m.instanceMatrix.needsUpdate = true;
  };

  const drawArrows = () => {
    if (fight) {
      for (; seenVolleys < fight.volleys.length; seenVolleys++) {
        const v = fight.volleys[seenVolleys];
        for (let i = 0; i < 7; i++) {
          arrows.push({ x0: v.from.x + (rand() - 0.5) * 1.2, z0: v.from.z + (rand() - 0.5) * 0.6, x1: v.to.x + (rand() - 0.5) * 1.4, z1: v.to.z + (rand() - 0.5) * 0.9, t0: clock + rand() * 0.25 });
        }
      }
    }
    const FLIGHT = 0.9;
    arrows = arrows.filter((a) => clock - a.t0 < FLIGHT).slice(-ARROWS);
    const p = arrowGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < ARROWS; i++) {
      const a = arrows[i];
      if (!a || clock < a.t0) {
        p.setXYZ(i * 2, 0, -50, 0);
        p.setXYZ(i * 2 + 1, 0, -50, 0);
        continue;
      }
      const f = (clock - a.t0) / FLIGHT;
      const g = Math.min(1, f + 0.06);
      const arc = (u: number) => Math.sin(u * Math.PI) * 2.6 + 0.4;
      p.setXYZ(i * 2, a.x0 + (a.x1 - a.x0) * f, arc(f), a.z0 + (a.z1 - a.z0) * f);
      p.setXYZ(i * 2 + 1, a.x0 + (a.x1 - a.x0) * g, arc(g), a.z0 + (a.z1 - a.z0) * g);
    }
    p.needsUpdate = true;
  };

  /* ── The view: from the stands on the near side, a little round to the east ── */

  let halfW = FIT_W / 2;
  let halfH = FIT_H / 2;
  const tilt = new THREE.Vector2();
  const tiltTarget = new THREE.Vector2();
  const lean = new THREE.Vector3();
  const look = new THREE.Vector3();
  const aim = (dt: number) => {
    if (!reducedMotion) tilt.lerp(tiltTarget, 1 - Math.exp(-dt * 4));
    lean.set(tilt.x * 0.08, -tilt.y * 0.04, 0).add(VIEW_DIR).normalize();
    look.set(LOOK.x + pan.x, LOOK.y, LOOK.z + pan.y);
    camera.position.copy(look).addScaledVector(lean, VIEW_DIST);
    camera.lookAt(look);
  };
  const resize = () => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    passes.setSize(w, h);
    const aspect = w / h;
    // The whole arena in view, whatever the plate's shape (a phone gets a little closer).
    const phone = plateZoom(w) < 1 ? 0.9 : 1;
    clampPan();
    halfH = Math.max((FIT_H * phone) / 2, (FIT_W * phone) / 2 / aspect) / zoom.value;
    halfW = halfH * aspect;
    Object.assign(camera, { left: -halfW, right: halfW, top: halfH, bottom: -halfH });
    camera.updateProjectionMatrix();
    shared.uFreq.value = LINE_FREQ * (FIT_H / 2 / halfH);
    if (!running) render();
  };

  /* ── Pointer: pick a place on the near half ── */

  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  let downAt: { x: number; y: number; panned: boolean } | null = null;
  let hovered: number | null = null;
  let dragged: number | null = null; // a ring something is being dragged over
  /** Keep the view over the arena: the closer it is, the further it may look. */
  const clampPan = () => {
    const room = 1 - 1 / zoom.value;
    pan.x = THREE.MathUtils.clamp(pan.x, -SAND.rx * room, SAND.rx * room);
    pan.y = THREE.MathUtils.clamp(pan.y, -SAND.rz * room * 1.2, SAND.rz * room * 1.2);
  };
  const slotAt = (e: { clientX: number; clientY: number }) => {
    const r = canvas.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) return null;
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1));
    ray.setFromCamera(ndc, camera);
    const p = ray.ray.intersectPlane(floor, new THREE.Vector3());
    if (!p) return null;
    let best: number | null = null;
    let d = 1.5;
    SLOTS.forEach((s, i) => {
      const di = Math.hypot((p.x - s.x) / 1.4, (p.z - s.z) / 1.0);
      if (di < d) {
        d = di;
        best = i;
      }
    });
    return best;
  };
  const onMove = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 2 - 1;
    const y = -(((e.clientY - r.top) / r.height) * 2 - 1);
    const inside = Math.abs(x) <= 1 && Math.abs(y) <= 1;
    const leaning = inside && e.pointerType === 'mouse';
    tiltTarget.set(leaning ? x : 0, leaning ? y : 0);
    // Dragging the sand looks around (once the view is closer than the whole arena).
    if (downAt && e.buttons && !zoom.gesturing) {
      const dx = e.clientX - downAt.x;
      const dy = e.clientY - downAt.y;
      if (downAt.panned || Math.hypot(dx, dy) > 8) {
        const perPx = (halfW * 2) / canvas.clientWidth;
        pan.x -= e.movementX * perPx;
        pan.y -= e.movementY * perPx * 1.3;
        clampPan();
        downAt.panned = true;
      }
    }
    if (fight || e.pointerType !== 'mouse') return;
    hovered = inside ? slotAt(e) : null;
    canvas.style.cursor = hovered !== null ? 'pointer' : '';
  };
  const onDown = (e: PointerEvent) => {
    downAt = { x: e.clientX, y: e.clientY, panned: false };
  };
  const onUp = (e: PointerEvent) => {
    if (!downAt) return;
    const tap = !downAt.panned && !zoom.gesturing;
    downAt = null;
    if (!tap || fight) return;
    const slot = slotAt(e);
    if (slot !== null) onPick?.(slot);
  };
  const onLeave = () => {
    tiltTarget.set(0, 0);
    hovered = null;
  };

  /* ── Loop ── */

  let running = false;
  let raf = 0;
  const timer = new THREE.Timer();
  let clock = 0;
  const lamp = new THREE.Vector2(0.55, 0.55);

  const render = () => {
    slotRings.forEach((r, i) => {
      r.visible = !fight;
      r.material = i === hovered || i === selected || i === dragged ? slotLit : slotMat;
    });
    camera.updateMatrixWorld(true);
    shared.uLight.value.set(lamp.x * 1.5 + 0.25, lamp.y * 1.2 + 0.3, 0.8).normalize();
    passes.uniforms.uReveal.value = shared.uReveal.value;
    passes.render(scene);
  };

  const tick = (now: number) => {
    raf = requestAnimationFrame(tick);
    timer.update(now);
    const dt = Math.min(timer.getDelta(), 0.05);
    clock += dt;
    if (fight && !fight.result) {
      acc += dt;
      while (acc >= STEP && !fight.result) {
        fight.step();
        acc -= STEP;
      }
    }
    if (fight)
      for (; seenEvents < fight.events.length; seenEvents++) {
        const e = fight.events[seenEvents];
        // The crowd answers what happens on the sand.
        const loud = { start: 0.6, contact: 0.25, flank: 0.45, rear: 0.55, broken: 0.6, destroyed: 0.75, horn: 0.8, end: 1 }[e.type] ?? 0;
        roar = Math.min(1, roar + loud);
        if (e.type === 'broken' || e.type === 'destroyed' || e.type === 'horn' || e.type === 'end') shake = Math.max(shake, e.type === 'end' ? 0.5 : 0.3);
        onEvent?.(e, fight);
      }
    roar = cheer ? 1 : roar * Math.exp(-dt * 0.45);
    shake *= Math.exp(-dt * 6);
    if (fight?.result && !cheer && fight.result !== 'aequum') cheer = { side: fight.result === 'vicisti' ? 'roma' : 'gallia', t0: clock };
    // The stands on their feet, half after half.
    stands.forEach((m, i) => {
      const t = cheer && !reducedMotion ? clock - cheer.t0 : 0;
      // Short of a victory, they still bob in their seats when the fight's loud.
      const stir = reducedMotion ? 0 : Math.max(0, Math.sin(clock * 6 + i * Math.PI)) * roar * 0.08;
      m.position.y = t > 0 ? Math.max(0, Math.sin(t * 5 + i * Math.PI)) * 0.22 * Math.min(1, t) : stir;
    });
    aim(dt);
    if (shake > 0.01 && !reducedMotion) {
      camera.position.x += (Math.random() - 0.5) * shake;
      camera.position.y += (Math.random() - 0.5) * shake * 0.6;
    }
    if (!reducedMotion) waveFlags(clock);
    drawMen(dt);
    drawArrows();
    render();
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

  const clear = () => {
    men.clear();
    fallen.length = 0;
    arrows = [];
    seenVolleys = 0;
    seenEvents = 0;
    acc = 0;
  };

  window.addEventListener('resize', resize);
  window.addEventListener('pointermove', onMove, { passive: true });
  canvas.addEventListener('pointerdown', onDown);
  window.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointerleave', onLeave);
  document.addEventListener('visibilitychange', onVisibility);
  canvas.addEventListener('webglcontextlost', onLost);

  resize();
  aim(1);
  drawMen(1);
  render();
  start();

  return {
    setPlan(next, sel) {
      plan = next;
      selected = sel;
      // Cohorts are keyed by their place while planning: drop the men of any that moved or went.
      for (const id of [...men.keys()]) if (id < 100 && !plan[id]) men.delete(id);
      for (const [id, list] of men) if (id < 100 && plan[id] && list.length !== STATS[plan[id]!.kind].men) men.delete(id);
    },
    fight(next) {
      plan = next;
      clear();
      cheer = null;
      fight = battle(next);
      return fight;
    },
    slotAt: (x, y) => slotAt({ clientX: x, clientY: y }),
    hover(slot) {
      dragged = slot;
    },
    sound: (call) => fight?.sound(call) ?? false,
    reset() {
      fight = null;
      selected = null;
      cheer = null;
      roar = 0;
      clear();
    },
    intro(after = Promise.resolve()) {
      if (reducedMotion) return;
      shared.uReveal.value = 0;
      banner.uniforms.uReveal.value = 0;
      after.then(() => {
        gsap.to(shared.uReveal, { value: 1, duration: 2.6, ease: 'power1.out', delay: 0.3 });
        gsap.to(banner.uniforms.uReveal, { value: 1, duration: 1.8, ease: 'power1.inOut', delay: 0.2 });
      });
    },
    dispose() {
      stop();
      gsap.killTweensOf([shared.uReveal, banner.uniforms.uReveal]);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      zoom.dispose();
      canvas.removeEventListener('pointerleave', onLeave);
      document.removeEventListener('visibilitychange', onVisibility);
      canvas.removeEventListener('webglcontextlost', onLost);
      banner.dispose();
      stopRedraw();
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh || o instanceof THREE.Line) o.geometry.dispose();
        if (o instanceof THREE.InstancedMesh) o.dispose();
      });
      passes.dispose();
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
      renderer.dispose();
    },
  };
}
