import * as THREE from 'three';
import { createBanner } from './banner';
import { gsap } from 'gsap';
import { createInk, createPasses, fine, inscriptionTexture, merge, plateZoom } from './passes';
import { amphitheatrum } from './ludus-models';
import { createWalker } from './walker';
import { createZoom } from './zoom';
import {
  arcus,
  basilica,
  bibliotheca,
  columnaHonoraria,
  curia,
  cypress,
  fabrica,
  foculus,
  fons,
  insula,
  matrona,
  miles,
  pavingLines,
  planet,
  stall,
  statua,
  templum,
  laurea,
  tholos,
  togatus,
  vexillum,
} from './forum-models';

// The home plate: the Via Sacra, engraved with the same three passes as
// engraving.ts, on a slab of street floating among the stars. It is 2.5D: a
// fixed, raised, orthographic view that follows the reader's citizen along the
// street. Walk with the arrow keys or WASD, or click the street; three of the
// buildings are pages (library, statue, forge). Stand at one's door and press
// Enter, or click the building, to go in, and the page turns.

export type Place = 'bibliotheca' | 'fabrica' | 'statua' | 'amphitheatrum';

export interface Forum {
  /** Pick a place out in red and bring it into view (null: none). */
  highlight(place: Place | null): void;
  /** Walk the citizen to a place and in at its door; resolves on arrival. */
  walk(place: Place): Promise<void>;
  /** Back out onto the street (after returning from the back/forward cache). */
  reset(): void;
  /** Blank the plate now and engrave it once `after` resolves. */
  intro(after?: Promise<void>): void;
  dispose(): void;
}

interface Options {
  /** Lettered on the banderole. */
  name: string;
  reducedMotion: boolean;
  onContextLost?: () => void;
  /** The place in focus changed: under the pointer, or the door the citizen stands at. */
  onFocus?: (place: Place | null, atDoor: boolean) => void;
  /** The citizen is to go in at a place: clicked in the scene, or walked into. */
  onEnter?: (place: Place) => void;
  /**
   * Where to pin a label, in CSS px within the canvas: over the focused place,
   * or over the orator when the citizen comes near him (null: hide it).
   */
  onTag?: (subject: Place | 'orator' | null, x: number, y: number) => void;
}

/* ── The street ── */

const STREET = 1.8; // half-width of the basalt roadway
const WALK = 1.2; // the pavements either side
const FRONT = -(STREET + WALK); // where the north frontages stand
const END = 24; // the arches, at either end
// The slab runs on past the eastern arch, to the Colosseum.
const SLAB = 38; // half-length
const BOUNDS = { x: 33, zMin: FRONT + 0.35, zMax: STREET + WALK - 0.4 };
const SPEED = 3.4;

// Each place's x along the street; its door is on the pavement in front.
const AT: Record<Place, number> = { bibliotheca: -12.5, statua: -2, fabrica: 17, amphitheatrum: 31.5 };
const doorOf = (place: Place) => new THREE.Vector3(AT[place], 0, FRONT + 0.45);
const DOOR_REACH = 1.3;
// The orator's platform on the south pavement; come within earshot to hear him.
const ORATOR = new THREE.Vector3(-6.4, 0, 3.3);
const EARSHOT = 2.6;

/* ── The view: raised, turned a little down the street, orthographic ── */

const VIEW_DIR = new THREE.Vector3(3.5, 8.5, 15).normalize();
const VIEW_DIST = 45;
const VIEW_Y = 3.6;
const VIEW_Z = -1;
// World units kept in frame up, and at least across.
const FIT_H = 14;
const FIT_W = 11;
const LINE_FREQ = 13;


export function createForum(canvas: HTMLCanvasElement, { name, reducedMotion, onContextLost, onFocus, onEnter, onTag }: Options): Forum | null {
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

  /* ── Materials: shared hatching, a red glow per place ── */

  const { shared, material, materials, textures } = createInk(LINE_FREQ);
  const stone = material({ value: 0 });
  const jointMat = new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.42 });
  const fineMat = new THREE.LineBasicMaterial({ color: 0x000000 });
  materials.push(jointMat, fineMat);

  const build = (parts: THREE.BufferGeometry[], at: [number, number], turn = 0, m: THREE.Material = stone) => {
    const mesh = new THREE.Mesh(merge(parts), m);
    mesh.position.set(at[0], 0, at[1]);
    mesh.rotation.y = turn;
    scene.add(mesh);
    return mesh;
  };
  const inscribe = (parent: THREE.Object3D, text: string, w: number, h: number, place: (g: THREE.PlaneGeometry) => void, glow = { value: 0 }) => {
    const tex = inscriptionTexture(text, w, h);
    textures.push(tex);
    const g = new THREE.PlaneGeometry(w, h);
    place(g);
    parent.add(new THREE.Mesh(g, material(glow, tex)));
  };

  /* ── The slab of street, and what stands on it ── */

  // A slab: its cut front edge shows at the foot of the plate, and past its
  // back edge there is only sky.
  const slab = material({ value: 0 });
  (slab as THREE.ShaderMaterial).uniforms.uPale = { value: 0.55 };
  build([new THREE.BoxGeometry(SLAB * 2, 0.8, 17.6).translate(0, -0.4, -2.3)], [0, 0], 0, slab);
  scene.add(fine(new THREE.LineSegments(pavingLines(SLAB - 2, STREET, WALK), jointMat)));

  // North frontage, west to east.
  const backRow = (built: { parts: THREE.BufferGeometry[]; front: number }, x: number) => build(built.parts, [x, FRONT - built.front]);
  backRow(tholos(), -18.5);
  backRow(insula(4.0, 3), -6.8);
  backRow(basilica(), 4.6);
  backRow(curia(), 11);
  backRow(insula(3.4, 2), 21.2);
  backRow(insula(3.0, 3), -25.6);
  for (const x of [-3.7, -0.3]) build(cypress(2.9), [x, FRONT - 1.0]);
  // Narrow houses filling the gaps in the frontage.
  backRow(insula(1.4, 3), -15.4);
  backRow(insula(1.5, 2), -9.6);
  backRow(insula(1.6, 3), 14.2);
  backRow(insula(3.0, 3), -29.6);

  // Behind the frontage: a second row of houses, kept low so the sky still shows,
  // and a great temple over the basilica. Nothing stands behind the statue, so
  // it reads against the sky.
  const BACK = FRONT - 4;
  const deep = (built: { parts: THREE.BufferGeometry[]; front: number }, x: number, size = 1) => {
    const mesh = build(built.parts, [x, BACK - built.front * size]);
    mesh.scale.setScalar(size);
    return mesh;
  };
  deep(templum(), 7.6, 0.85);
  // Behind the statue, a garden kept low: an exedra with its bench, and cypresses.
  build(
    [
      new THREE.CylinderGeometry(2.6, 2.6, 1.1, 40, 1, true, -Math.PI / 2, Math.PI).rotateY(Math.PI).translate(0, 0.55, 0),
      new THREE.CylinderGeometry(2.75, 2.75, 0.1, 40, 1, false, -Math.PI / 2, Math.PI).rotateY(Math.PI).translate(0, 1.15, 0),
      new THREE.CylinderGeometry(2.3, 2.3, 0.42, 40, 1, false, -Math.PI / 2, Math.PI).rotateY(Math.PI).translate(0, 0.21, 0),
    ],
    [-2, BACK - 2.2],
  );
  for (const [x, z] of [[-5.4, -1.2], [-4.6, -3.2], [1.4, -1.2], [0.6, -3.2], [-3.3, -4.6], [-0.7, -4.6], [2.6, -2.4], [-6.6, -2.4]]) {
    build(cypress(1.5 + Math.abs(x % 1) * 0.6), [x, BACK + z]);
  }
  for (const [x, w, n] of [
    [-27, 3.6, 3], [-22.4, 4.2, 2], [-17.6, 3.8, 3], [-13, 4.0, 2], [-8.6, 3.4, 3],
    [13.6, 3.4, 2], [18.2, 4.2, 3], [23, 3.8, 2],
  ] as const) deep(insula(w, n), x);

  // The arches across the street: Titus's at the west end, Severus's at the east.
  for (const [bays, x] of [[1, -END], [3, END]] as const) {
    const arch = arcus(bays);
    const mesh = build(arch.parts, [x, 0]);
    // SPQR on the attic, on the face toward the view.
    inscribe(mesh, bays === 1 ? 'SENATVS POPVLVSQVE ROMANVS' : 'S·P·Q·R', arch.attic.w * 0.9, arch.attic.h * 0.5, (g) =>
      g.rotateY(Math.PI / 2).translate(arch.attic.depth / 2 + 0.06, arch.attic.y, 0),
    );
  }

  // The south side is kept low so the street can be seen: cypresses and a column.
  build(columnaHonoraria(), [-9, 4.0]);
  for (const x of [-21, -15, -4.5, 7.5, 14.5, 20]) build(cypress(2.6 + (Math.abs(x) % 3) * 0.3), [x, 3.9]);
  // Market stalls facing the street, a fountain, and the speaker's platform.
  for (const x of [-17, -12.6, 10.6]) build(stall(), [x, 3.75], Math.PI);
  build(fons(), [2.6, 4.0]);
  build([new THREE.BoxGeometry(1.6, 0.45, 1.0).translate(0, 0.225, 0), new THREE.BoxGeometry(1.75, 0.08, 1.15).translate(0, 0.49, 0)], [-6.4, 3.2]);

  /* ── The places ── */

  type Built = { mesh: THREE.Mesh; glow: { value: number } };
  const places = {} as Record<Place, Built>;
  const pickables: THREE.Mesh[] = [];
  const proxyMat = new THREE.MeshBasicMaterial();
  materials.push(proxyMat);

  // The three that are pages stand a little larger than the rest, and fly red standards.
  const GRAND = 1.12;
  const dyed = material({ value: 1 });
  const cloths: { mesh: THREE.Mesh; base: Float32Array; phase: number }[] = [];
  const flames: { line: THREE.Line; at: THREE.Vector3; phase: number }[] = [];
  const flameMat = new THREE.LineBasicMaterial({ color: 0xff0000 }); // red, read as rubric by the paper pass
  materials.push(flameMat);

  const addPlace = (id: Place, built: { parts: THREE.BufferGeometry[] }, front: number, panel: { text: string; y: number; z: number; w: number; h: number }) => {
    const glow = { value: 0 };
    const mesh = build(built.parts, [AT[id], FRONT - front * GRAND], 0, material(glow));
    mesh.scale.setScalar(GRAND);
    inscribe(mesh, panel.text, panel.w, panel.h, (g) => g.translate(0, panel.y, panel.z + 0.012), glow);
    // A box to pick it by, on a layer that is never drawn.
    mesh.geometry.computeBoundingBox();
    const b = mesh.geometry.boundingBox!.clone();
    b.min.multiplyScalar(GRAND);
    b.max.multiplyScalar(GRAND);
    // Standards flank the door; on a building as wide as the Colosseum, they stay near it.
    const half = Math.min(2.4, (b.max.x - b.min.x) / 2);
    for (const side of [-1, 1]) {
      const std = vexillum();
      build(std.pole, [AT[id] + side * (half + 0.3), FRONT + 0.15]);
      const cloth = new THREE.Mesh(std.cloth, dyed);
      cloth.position.set(AT[id] + side * (half + 0.3), 0, FRONT + 0.15);
      cloth.frustumCulled = false;
      scene.add(cloth);
      cloths.push({ mesh: cloth, base: Float32Array.from(std.cloth.attributes.position.array), phase: Math.random() * 6 });
      const fire = foculus();
      const at = new THREE.Vector3(AT[id] + side * (half - 0.35), 0, FRONT + 0.75);
      build(fire.parts, [at.x, at.z]);
      for (let k = 0; k < 4; k++) {
        const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 6 }, () => new THREE.Vector3())), flameMat);
        scene.add(fine(line));
        flames.push({ line, at: at.clone().add(fire.flame), phase: k * 1.7 + side });
      }
    }
    const proxy = new THREE.Mesh(new THREE.BoxGeometry(...b.getSize(new THREE.Vector3()).toArray()), proxyMat);
    proxy.position.copy(b.getCenter(new THREE.Vector3())).add(mesh.position);
    proxy.layers.set(2);
    proxy.userData.place = id;
    scene.add(proxy);
    pickables.push(proxy);
    places[id] = { mesh, glow };
  };

  const lib = bibliotheca();
  addPlace('bibliotheca', lib, 2.3, { text: 'BIBLIOTHECA', ...lib.frieze });
  const forge = fabrica();
  addPlace('fabrica', forge, 2.1, { text: 'FABRICA', ...forge.sign });
  const statue = statua();
  addPlace('statua', statue, 0.95, { text: 'EDVARDVS', ...statue.inscription });
  // Past the Arch of Severus, the games.
  const arena = amphitheatrum();
  addPlace('amphitheatrum', arena, arena.front, { text: 'AMPHITHEATRVM', ...arena.panel });

  // The street itself can be clicked, to walk there.
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(BOUNDS.x * 2, 12).rotateX(-Math.PI / 2), proxyMat);
  ground.layers.set(2);
  scene.add(ground);
  pickables.push(ground);

  // Smoke: threads from the forge chimney, redrawn each frame.
  const SMOKE_POINTS = 36;
  const chimney = forge.chimney.clone().multiplyScalar(GRAND).add(places.fabrica.mesh.position);
  const sources: [THREE.Vector3, number][] = [[chimney, 3]];
  const smoke = sources.flatMap(([from, n]) =>
    Array.from({ length: n }, (_, k) => {
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(Array.from({ length: SMOKE_POINTS }, () => from.clone())), fineMat);
      scene.add(fine(line));
      return { line, from, k: n === 1 ? 1 : k, height: n === 1 ? 1.6 : 2.4 };
    }),
  );
  const drawSmoke = (t: number) => {
    smoke.forEach(({ line, from, k, height }, j) => {
      const p = line.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < SMOKE_POINTS; i++) {
        const f = i / (SMOKE_POINTS - 1);
        const drift = f * f * 1.6;
        p.setXYZ(
          i,
          from.x + Math.sin(t * 0.9 + f * 5 + k * 2.1 + j) * 0.18 * f + drift * 0.9 + (k - 1) * 0.06,
          from.y + f * height,
          from.z + Math.cos(t * 0.7 + f * 4 + k + j) * 0.12 * f - drift * 0.3,
        );
      }
      p.needsUpdate = true;
    });
  };

  // The standards stir; the braziers' flames lick and flicker.
  const drawLife = (t: number) => {
    for (const { mesh, base, phase } of cloths) {
      const p = mesh.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < p.count; i++) {
        const x = base[i * 3];
        const y = base[i * 3 + 1];
        const hang = (2.6 - y) / 1.05; // 0 at the crossbar, 1 at the hem
        p.setZ(i, base[i * 3 + 2] + Math.sin(t * 2.2 + y * 4 + x * 3 + phase) * 0.07 * hang);
        p.setX(i, x + Math.sin(t * 1.3 + phase) * 0.04 * hang);
      }
      p.needsUpdate = true;
      mesh.geometry.computeVertexNormals();
    }
    for (const { line, at, phase } of flames) {
      const p = line.geometry.attributes.position as THREE.BufferAttribute;
      const tall = 0.35 + 0.12 * Math.sin(t * 7 + phase * 3);
      for (let i = 0; i < 6; i++) {
        const f = i / 5;
        p.setXYZ(i, at.x + Math.sin(t * 9 + f * 6 + phase) * 0.07 * f + Math.cos(phase) * 0.12 * (1 - f), at.y + f * tall, at.z + Math.sin(phase) * 0.12 * (1 - f));
      }
      p.needsUpdate = true;
    }
  };

  /* ── A ringed world, hung in the sky; it keeps its place as the view moves ── */

  const world = new THREE.Group();
  world.add(new THREE.Mesh(planet()[0], stone));
  const rings = new THREE.Group();
  for (const r of [5.6, 5.95, 6.1, 6.9]) {
    rings.add(
      new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints(Array.from({ length: 200 }, (_, i) => new THREE.Vector3(Math.cos((i / 200) * Math.PI * 2) * r, 0, Math.sin((i / 200) * Math.PI * 2) * r))),
        fineMat,
      ),
    );
  }
  rings.rotation.set(0.32, 0, 0.3);
  world.add(fine(rings));
  world.scale.setScalar(0.42);
  scene.add(world);

  /* ── The reader's citizen ── */

  const citizenGlow = { value: 0 };
  const citizen = build(togatus('walker'), [0, 0], Math.PI, material(citizenGlow));
  // Crowned in red laurel, so the reader can find himself in the crowd.
  citizen.add(new THREE.Mesh(merge(laurea()), material({ value: 1 })));
  // Back on the street where we went in, if we went in somewhere this visit.
  const outside = () => {
    let from: Place | null = null;
    try {
      from = sessionStorage.getItem('forum-at') as Place | null;
    } catch {}
    if (from && from in AT) {
      citizen.position.copy(doorOf(from)).setZ(FRONT + 1.1);
      citizen.rotation.y = 0;
    } else {
      citizen.position.set(-0.4, 0, 0.6);
      citizen.rotation.y = Math.PI * 0.85;
    }
    citizen.visible = true;
    citizen.scale.setScalar(1);
  };
  outside();

  /* ── Townspeople: passers-by, a squad on the march, a crowd round an orator ── */

  const FIGURES = {
    civis: merge(togatus('walker')),
    orator: merge(togatus('orator')),
    matrona: merge(matrona()),
    miles: merge(miles()),
  };
  type Kind = keyof typeof FIGURES;
  const person = (kind: Kind, x: number, z: number, facing: number, size = 1) => {
    const m = new THREE.Mesh(FIGURES[kind], stone);
    m.position.set(x, 0, z);
    m.rotation.y = facing;
    m.scale.setScalar(size);
    scene.add(m);
    return m;
  };
  const rand = (() => {
    let seed = 7;
    return () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  })();

  type Passer = { mesh: THREE.Mesh; dir: number; speed: number; min: number; max: number; pause: number; stride: number };
  const passers: Passer[] = [];
  const pass = (kind: Kind, x: number, z: number, dir: number, speed: number, size = 1, span = 27) => {
    const mesh = person(kind, x, z, dir > 0 ? Math.PI / 2 : -Math.PI / 2, size);
    passers.push({ mesh, dir, speed, min: -span, max: span, pause: 0, stride: rand() * 6 });
  };
  const KINDS: Kind[] = ['civis', 'matrona', 'civis', 'matrona', 'civis'];
  for (let i = 0; i < 16; i++) {
    const lane = rand();
    // On the roadway they can pass under the arches; on the pavements they keep between them.
    const onWalk = lane > 0.6;
    const z = onWalk ? (rand() > 0.5 ? STREET + 0.6 : -STREET - 0.55) : -1.4 + rand() * 3.0;
    const child = rand() > 0.85;
    pass(KINDS[i % KINDS.length], -26 + rand() * 52, z, rand() > 0.5 ? 1 : -1, 0.55 + rand() * 0.6, child ? 0.62 : 0.92 + rand() * 0.14, onWalk ? 21 : 27);
  }
  // A contubernium on the march, in step.
  for (let k = 0; k < 4; k++) pass('miles', 8 + k * 0.75, -0.2 + (k % 2) * 0.55, -1, 1.0, 1, 27);

  // Standing: the orator on his platform and his crowd; merchants at their stalls;
  // two matrons by the fountain; a sentry at each arch.
  type Stander = { mesh: THREE.Mesh; phase: number; sway: number };
  const standers: Stander[] = [];
  const stand = (kind: Kind, x: number, z: number, facing: number, sway = 0.03, size = 1, y = 0) => {
    const mesh = person(kind, x, z, facing, size);
    mesh.position.y = y;
    standers.push({ mesh, phase: rand() * 6, sway });
  };
  stand('orator', ORATOR.x, ORATOR.z, Math.PI, 0.12, 1, 0.53);
  for (const [dx, dz] of [[-1.2, -0.9], [-0.4, -1.2], [0.5, -1.15], [1.25, -0.8], [0.05, -1.75]]) {
    stand(rand() > 0.4 ? 'civis' : 'matrona', -6.4 + dx, 3.2 + dz, Math.atan2(-dx, -dz), 0.02, 0.9 + rand() * 0.1);
  }
  for (const x of [-17, -12.6, 10.6]) {
    stand(rand() > 0.5 ? 'civis' : 'matrona', x + 0.2, 4.35, Math.PI, 0.03, 0.95);
    stand('matrona', x - 0.4, 2.85, 0, 0.02, 0.92);
  }
  stand('matrona', 1.6, 3.2, Math.PI * 0.75, 0.04, 0.93);
  stand('matrona', 2.3, 2.85, -Math.PI * 0.9, 0.04, 0.9);
  for (const x of [-END + 1.4, END - 1.5]) stand('miles', x, -2.5, Math.PI / 2 * Math.sign(-x), 0.01);

  const drawPeople = (dt: number, t: number) => {
    for (const p of passers) {
      if (p.pause > 0) {
        p.pause -= dt;
        p.mesh.position.y *= 0.8;
        continue;
      }
      p.mesh.position.x += p.dir * p.speed * dt;
      if (p.mesh.position.x > p.max || p.mesh.position.x < p.min) {
        p.dir = -p.dir;
        p.mesh.position.x = THREE.MathUtils.clamp(p.mesh.position.x, p.min, p.max);
        p.mesh.rotation.y = p.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      }
      // Now and then someone stops to look about.
      if (rand() < dt * 0.04) p.pause = 1 + rand() * 2.5;
      p.stride += dt * p.speed * 7;
      p.mesh.position.y = Math.abs(Math.sin(p.stride)) * 0.05;
      p.mesh.rotation.z = Math.sin(p.stride) * 0.035;
    }
    for (const s of standers) s.mesh.rotation.z = Math.sin(t * 1.3 + s.phase) * s.sway;
  };

  /* ── Birds wheeling over the roofs ── */

  const birds = Array.from({ length: 9 }, (_, i) => {
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()]), fineMat);
    scene.add(fine(line));
    return { line, cx: -20 + (i % 5) * 10 + rand() * 4, cz: FRONT - 2 - rand() * 4, r: 1.5 + rand() * 2.5, y: 7 + rand() * 2, speed: (0.25 + rand() * 0.3) * (i % 2 ? 1 : -1), phase: rand() * 6 };
  });
  const drawBirds = (t: number) => {
    for (const b of birds) {
      const a = t * b.speed + b.phase;
      const x = b.cx + Math.cos(a) * b.r;
      const z = b.cz + Math.sin(a) * b.r * 0.5;
      const y = b.y + Math.sin(a * 2) * 0.3;
      const flap = Math.sin(t * 10 + b.phase) * 0.09;
      const p = b.line.geometry.attributes.position as THREE.BufferAttribute;
      p.setXYZ(0, x - 0.16, y + flap, z);
      p.setXYZ(1, x, y - 0.04, z);
      p.setXYZ(2, x + 0.16, y + flap, z);
      p.needsUpdate = true;
    }
  };

  /* ── Banderole: carried with the view, across the head of the plate ── */

  const banner = createBanner(canvas, name, shared.uLight);

  /* ── The passes ── */

  const passes = createPasses(renderer, camera, pixel);

  let halfW = FIT_W / 2;
  let halfH = FIT_H / 2;
  let small = 1; // closer on a phone's narrow plate
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
    // Line spacing follows the plate's scale, so it holds on screen.
    shared.uFreq.value = LINE_FREQ * (FIT_H / 2 / halfH);
    if (!running) render();
  };

  /* ── Walking: keys, a clicked spot, or on his own to a door ── */

  const clampToStreet = (p: THREE.Vector3) => {
    p.x = THREE.MathUtils.clamp(p.x, -BOUNDS.x, BOUNDS.x);
    p.z = THREE.MathUtils.clamp(p.z, BOUNDS.zMin, BOUNDS.zMax);
    return p;
  };
  let atDoor: Place | null = null; // the citizen's
  const walker = createWalker(citizen, {
    speed: SPEED,
    clamp: clampToStreet,
    reducedMotion,
    onEnterKey: () => atDoor && onEnter?.(atDoor),
  });
  let entering = false;
  let nearOrator = false;

  /* ── Pointer: picks places, picks a spot to walk to, tilts the view ── */

  // The lamp stands still, up and to the right, as in the old plates.
  const lamp = new THREE.Vector2(0.55, 0.55);
  const ray = new THREE.Raycaster();
  ray.layers.set(2);
  const ndc = new THREE.Vector2();
  let pointed: Place | null = null; // under the pointer
  let indexed: Place | null = null; // from the index
  let downAt: { x: number; y: number } | null = null;

  const pick = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1));
    ray.setFromCamera(ndc, camera);
    return ray.intersectObjects(pickables, false)[0] ?? null;
  };

  const onPointerMove = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 2 - 1;
    const y = -(((e.clientY - r.top) / r.height) * 2 - 1);
    const inside = Math.abs(x) <= 1 && Math.abs(y) <= 1;
    // Over the plate, the view leans a little toward a mouse (a finger would
    // leave it leaning wherever it last touched).
    if (inside && e.pointerType === 'mouse') tiltTarget.set(x, y);
    else tiltTarget.set(0, 0);
    if (e.pointerType !== 'mouse' || entering) return;
    const hit = inside ? pick(e) : null;
    pointed = (hit?.object.userData.place as Place) ?? null;
    canvas.style.cursor = hit ? 'pointer' : '';
    refocus();
  };
  const onDown = (e: PointerEvent) => {
    downAt = { x: e.clientX, y: e.clientY };
  };
  const onUp = (e: PointerEvent) => {
    if (!downAt || entering || zoom.gesturing) return;
    const moved = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y);
    downAt = null;
    if (moved > 8) return;
    const hit = pick(e);
    if (!hit) return;
    const place = hit.object.userData.place as Place | undefined;
    if (place) onEnter?.(place);
    else walker.walkTo(hit.point);
  };
  const onLeave = () => {
    tiltTarget.set(0, 0);
    pointed = null;
    refocus();
  };

  /* ── Focus: what is picked out in red, and told to the page ── */

  let focused: Place | null = null;
  let focusedDoor = false;
  const refocus = () => {
    const place = indexed ?? pointed ?? atDoor;
    const door = place !== null && place === atDoor;
    if (place === focused && door === focusedDoor) return;
    focused = place;
    focusedDoor = door;
    (Object.keys(places) as Place[]).forEach((id) =>
      gsap.to(places[id].glow, { value: id === place ? 1 : 0, duration: reducedMotion ? 0 : 0.35, ease: 'power1.out', overwrite: true }),
    );
    onFocus?.(place, door);
  };

  /* ── Going in ── */

  const walk = (place: Place) => {
    try {
      sessionStorage.setItem('forum-at', place);
      // In at the library's front door, not back at the last roll read.
      if (place === 'bibliotheca') sessionStorage.removeItem('library-at');
    } catch {}
    indexed = place;
    refocus();
    if (reducedMotion) return Promise.resolve();
    entering = true;
    canvas.style.cursor = '';
    // Along the street to the door, then in.
    const door = doorOf(place);
    return walker.follow([door, door.clone().setZ(FRONT - 0.9)], { intoDoorway: true });
  };

  const reset = () => {
    walker.halt();
    entering = false;
    indexed = null;
    pointed = null;
    outside();
    walker.face(citizen.rotation.y);
    view.x = citizen.position.x;
    refocus();
    if (!running) render();
  };

  const highlight = (place: Place | null) => {
    if (entering) return;
    indexed = place;
    refocus();
  };

  const step = (dt: number) => {
    walker.step(dt);
    if (entering) return;
    nearOrator = Math.hypot(citizen.position.x - ORATOR.x, citizen.position.z - ORATOR.z) < EARSHOT;

    // At a door?
    const door = (Object.keys(AT) as Place[]).find((p) => Math.abs(citizen.position.x - AT[p]) < DOOR_REACH && citizen.position.z < FRONT + 1.4) ?? null;
    if (door !== atDoor) {
      atDoor = door;
      refocus();
    }
  };

  /* ── The view follows the citizen (or the place named in the index) ── */

  const view = { x: citizen.position.x, z: 0 };
  const target = new THREE.Vector3();
  const tilt = new THREE.Vector2();
  const tiltTarget = new THREE.Vector2();
  const lean = new THREE.Vector3();
  const follow = (dt: number) => {
    const goal = indexed && !entering ? AT[indexed] : citizen.position.x;
    // As far as the slab goes: past the eastern arch stands the Colosseum.
    const limit = SLAB - halfW;
    const x = THREE.MathUtils.clamp(goal, -limit, limit);
    const k = reducedMotion ? 1 : 1 - Math.exp(-dt * 3);
    view.x += (x - view.x) * k;
    // Closed in on a phone: follow him across the street too.
    view.z += ((small < 1 ? citizen.position.z * 0.6 : 0) - view.z) * k;
    target.set(view.x, VIEW_Y, VIEW_Z + view.z);
    // A few degrees of tilt toward the pointer: round the street, and up or down it.
    if (!reducedMotion) tilt.lerp(tiltTarget, 1 - Math.exp(-dt * 4));
    lean.set(tilt.x * 0.1, -tilt.y * 0.055, 0).add(VIEW_DIR).normalize();
    camera.position.copy(target).addScaledVector(lean, VIEW_DIST);
    camera.lookAt(target);
    // The sky is far off: the world and the stars drift slowly behind the street.
    world.position.set(view.x * 0.82 - 3.6 + halfW * 0.35, 1.2, -16);
    const pxPerUnit = passes.uniforms.uResolution.value.x / (halfW * 2);
    passes.uniforms.uStarShift.value.set(view.x * 0.12 * pxPerUnit, 0);
  };

  /* ── The focused place's label: pinned over the top of its building ── */

  const anchor = new THREE.Vector3();
  let pinned = '';
  const pinTag = () => {
    if (!onTag) return;
    const subject = focused ?? (nearOrator && !entering ? 'orator' : null);
    if (!subject) {
      if (pinned) onTag(null, 0, 0);
      pinned = '';
      return;
    }
    if (subject === 'orator') {
      anchor.copy(ORATOR).setY(2.45);
    } else {
      const proxy = pickables.find((m) => m.userData.place === subject)!;
      const size = (proxy.geometry as THREE.BoxGeometry).parameters.height;
      anchor.copy(proxy.position).setY(proxy.position.y + size / 2);
    }
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
    drawSmoke(clock);
    drawLife(clock);
    drawBirds(clock);
    if (!reducedMotion) drawPeople(dt, clock);
    if (!reducedMotion) rings.rotation.y += dt * 0.02;
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
      gsap.to(shared.uReveal, { value: 1, duration: 3.2, ease: 'power1.out', delay: 0.4 });
      gsap.to(banner.uniforms.uReveal, { value: 1, duration: 2.4, ease: 'power1.inOut', delay: 1.2 });
    });
  };

  window.addEventListener('resize', resize);
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointerleave', onLeave);
  document.addEventListener('visibilitychange', onVisibility);
  canvas.addEventListener('webglcontextlost', onLost);

  drawSmoke(0);
  drawLife(0);
  drawBirds(0);
  resize();
  follow(1);
  render();
  start();

  return {
    highlight,
    walk,
    reset,
    intro,
    dispose() {
      stop();
      gsap.killTweensOf([shared.uReveal, banner.uniforms.uReveal, ...Object.values(places).map((p) => p.glow)]);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointerMove);
      walker.dispose();
      zoom.dispose();
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointerleave', onLeave);
      document.removeEventListener('visibilitychange', onVisibility);
      canvas.removeEventListener('webglcontextlost', onLost);
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh || o instanceof THREE.Line) o.geometry.dispose();
      });
      banner.dispose();
      passes.dispose();
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
      renderer.dispose();
    },
  };
}
