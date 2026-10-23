import * as THREE from 'three';
import { gsap } from 'gsap';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  INK,
  PAPER,
  RUBRIC,
  banderole,
  compositeFragment,
  compositeVertex,
  engraveFragment,
  engraveVertex,
  letteringTexture,
  raw,
} from './engraving';
import {
  arcus,
  basilica,
  bibliotheca,
  columnaHonoraria,
  curia,
  cypress,
  fabrica,
  insula,
  pavingLines,
  planet,
  statua,
  tholos,
  togatus,
} from './forum-models';

// The home plate: the Via Sacra, engraved with the same three passes as
// engraving.ts, on a slab of street floating among the stars. It is 2.5D: a
// fixed, raised, orthographic view that follows the reader's citizen along the
// street. Walk with the arrow keys or WASD, or click the street; three of the
// buildings are pages (library, statue, forge). Stand at one's door and go up
// (or press Enter) to go in, and the page turns.

export type Place = 'bibliotheca' | 'fabrica' | 'statua';

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
}

/* ── The street ── */

const STREET = 1.8; // half-width of the basalt roadway
const WALK = 1.2; // the pavements either side
const FRONT = -(STREET + WALK); // where the north frontages stand
const END = 24; // the arches, at either end
const BOUNDS = { x: 29, zMin: FRONT + 0.35, zMax: STREET + WALK - 0.4 };
const SPEED = 3.4;

// Each place's x along the street; its door is on the pavement in front.
const AT: Record<Place, number> = { bibliotheca: -12.5, statua: -2, fabrica: 17 };
const doorOf = (place: Place) => new THREE.Vector3(AT[place], 0, FRONT + 0.45);
const DOOR_REACH = 1.3;

/* ── The view: raised, turned a little down the street, orthographic ── */

const VIEW_DIR = new THREE.Vector3(3.5, 8.5, 15).normalize();
const VIEW_DIST = 45;
const VIEW_Y = 3.6;
const VIEW_Z = -1;
// World units kept in frame up, and at least across.
const FIT_H = 14;
const FIT_W = 11;
const LINE_FREQ = 13;

/** A carved inscription, black capitals on transparent, sized to its panel. */
function inscriptionTexture(text: string, w: number, h: number) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = Math.max(32, Math.round((1024 * h) / w));
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#000';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const spaced = text.split('').join(' ');
  let size = canvas.height * 0.78;
  ctx.font = `600 ${size}px Cinzel, "IM Fell English SC", serif`;
  const width = ctx.measureText(spaced).width;
  if (width > canvas.width * 0.92) {
    size *= (canvas.width * 0.92) / width;
    ctx.font = `600 ${size}px Cinzel, "IM Fell English SC", serif`;
  }
  ctx.fillText(spaced, canvas.width / 2, canvas.height / 2 + size * 0.04);
  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 8;
  return texture;
}

/** One geometry from many, so each building is a single draw. */
function merge(parts: THREE.BufferGeometry[]) {
  const flat = parts.map((g) => {
    const n = g.index ? g.toNonIndexed() : g;
    if (n !== g) g.dispose();
    for (const name of Object.keys(n.attributes)) if (!['position', 'normal', 'uv'].includes(name)) n.deleteAttribute(name);
    return n;
  });
  const merged = mergeGeometries(flat, false)!;
  flat.forEach((g) => g.dispose());
  return merged;
}

const angleTo = (from: number, to: number) => {
  let d = (to - from) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
};

export function createForum(canvas: HTMLCanvasElement, { name, reducedMotion, onContextLost, onFocus, onEnter }: Options): Forum | null {
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

  /* ── Materials: shared hatching, a red glow per place ── */

  const shared = {
    uLight: { value: new THREE.Vector3(0.5, 0.6, 0.8) },
    uFreq: { value: LINE_FREQ },
    uReveal: { value: 1 },
    uObjectInverse: { value: new THREE.Matrix4() }, // the street hatches in world space
  };
  const materials: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];
  const material = (glow: { value: number }, text?: THREE.Texture) => {
    const m = new THREE.ShaderMaterial({
      uniforms: { ...shared, uGlow: glow, uText: { value: text ?? null }, uHasText: { value: text ? 1 : 0 } },
      vertexShader: engraveVertex,
      fragmentShader: engraveFragment,
      side: THREE.DoubleSide,
    });
    materials.push(m);
    return m;
  };
  const stone = material({ value: 0 });
  const jointMat = new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.42 });
  const fineMat = new THREE.LineBasicMaterial({ color: 0x000000 });
  materials.push(jointMat, fineMat);

  const fine = (o: THREE.Object3D) => {
    o.traverse((c) => {
      c.layers.set(1); // ink pass only: no outlines
      c.frustumCulled = false;
    });
    return o;
  };
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
  build([new THREE.BoxGeometry(66, 0.8, 13.5).translate(0, -0.4, -0.25)], [0, 0], 0, slab);
  scene.add(fine(new THREE.LineSegments(pavingLines(END + 6, STREET, WALK), jointMat)));

  // North frontage, west to east.
  const backRow = (built: { parts: THREE.BufferGeometry[]; front: number }, x: number) => build(built.parts, [x, FRONT - built.front]);
  backRow(tholos(), -18.5);
  backRow(insula(4.0, 3), -6.8);
  backRow(basilica(), 4.6);
  backRow(curia(), 11);
  backRow(insula(3.4, 2), 21.2);
  backRow(insula(3.0, 3), -25.6);
  backRow(insula(3.6, 2), 26.4);
  for (const x of [-3.7, -0.3]) build(cypress(2.9), [x, FRONT - 1.0]);

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

  /* ── The places ── */

  type Built = { mesh: THREE.Mesh; glow: { value: number } };
  const places = {} as Record<Place, Built>;
  const pickables: THREE.Mesh[] = [];
  const proxyMat = new THREE.MeshBasicMaterial();
  materials.push(proxyMat);

  const addPlace = (id: Place, built: { parts: THREE.BufferGeometry[] }, front: number, panel: { text: string; y: number; z: number; w: number; h: number }) => {
    const glow = { value: 0 };
    const mesh = build(built.parts, [AT[id], FRONT - front], 0, material(glow));
    inscribe(mesh, panel.text, panel.w, panel.h, (g) => g.translate(0, panel.y, panel.z + 0.012), glow);
    // A box to pick it by, on a layer that is never drawn.
    mesh.geometry.computeBoundingBox();
    const b = mesh.geometry.boundingBox!;
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

  // The street itself can be clicked, to walk there.
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(BOUNDS.x * 2, 12).rotateX(-Math.PI / 2), proxyMat);
  ground.layers.set(2);
  scene.add(ground);
  pickables.push(ground);

  // Smoke from the forge chimney: a few wavering threads, redrawn each frame.
  const chimney = forge.chimney.clone().add(places.fabrica.mesh.position);
  const SMOKE_POINTS = 36;
  const smoke = Array.from({ length: 3 }, () => {
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(Array.from({ length: SMOKE_POINTS }, () => chimney.clone())), fineMat);
    scene.add(fine(line));
    return line;
  });
  const drawSmoke = (t: number) => {
    smoke.forEach((line, k) => {
      const p = line.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < SMOKE_POINTS; i++) {
        const f = i / (SMOKE_POINTS - 1);
        const drift = f * f * 1.6;
        p.setXYZ(
          i,
          chimney.x + Math.sin(t * 0.9 + f * 5 + k * 2.1) * 0.18 * f + drift * 0.9 + (k - 1) * 0.06,
          chimney.y + f * 2.4,
          chimney.z + Math.cos(t * 0.7 + f * 4 + k) * 0.12 * f - drift * 0.3,
        );
      }
      p.needsUpdate = true;
    });
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

  /* ── Banderole: carried with the view, across the head of the plate ── */

  const nameTexture = letteringTexture(name);
  textures.push(nameTexture);
  const ribbonUniforms = {
    uLight: shared.uLight,
    uFreq: { value: 22 },
    uReveal: { value: 1 },
    uObjectInverse: { value: new THREE.Matrix4() },
    uText: { value: nameTexture },
    uHasText: { value: 1 },
    uGlow: { value: 0 },
  };
  const ribbonMat = new THREE.ShaderMaterial({ uniforms: ribbonUniforms, vertexShader: engraveVertex, fragmentShader: engraveFragment, side: THREE.DoubleSide });
  materials.push(ribbonMat);
  const ribbonGeo = banderole();
  ribbonGeo.computeBoundingBox();
  ribbonGeo.translate(...ribbonGeo.boundingBox!.getCenter(new THREE.Vector3()).negate().toArray());
  ribbonGeo.computeBoundingBox();
  const ribbonSize = ribbonGeo.boundingBox!.getSize(new THREE.Vector3());
  const ribbon = new THREE.Mesh(ribbonGeo, ribbonMat);
  // Tipped back a little, so its twist reads in depth against the flat view.
  ribbon.rotation.x = -0.25;
  camera.add(ribbon);

  /* ── Targets and the paper pass ── */

  const inkTarget = new THREE.WebGLRenderTarget(1, 1);
  const normalTarget = new THREE.WebGLRenderTarget(1, 1, { depthTexture: new THREE.DepthTexture(1, 1) });
  const normalMat = new THREE.MeshNormalMaterial({ side: THREE.DoubleSide });
  materials.push(normalMat);
  const compositeUniforms = {
    tInk: { value: inkTarget.texture },
    tNormal: { value: normalTarget.texture },
    tDepth: { value: normalTarget.depthTexture },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uNear: { value: camera.near },
    uFar: { value: camera.far },
    uOrtho: { value: 1 },
    uPixel: { value: pixel },
    uReveal: { value: 1 },
    uPaper: { value: raw(PAPER) },
    uInk: { value: raw(INK) },
    uRed: { value: raw(RUBRIC) },
  };
  const quadMat = new THREE.ShaderMaterial({ uniforms: compositeUniforms, vertexShader: compositeVertex, fragmentShader: compositeFragment, depthTest: false, depthWrite: false });
  materials.push(quadMat);
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), quadMat);
  const quadScene = new THREE.Scene().add(quad);
  const quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  let halfW = FIT_W / 2;
  let halfH = FIT_H / 2;
  const resize = () => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    const pw = Math.floor(w * pixel);
    const ph = Math.floor(h * pixel);
    inkTarget.setSize(pw, ph);
    normalTarget.setSize(pw, ph);
    compositeUniforms.uResolution.value.set(pw, ph);
    const aspect = w / h;
    halfH = Math.max(FIT_H / 2, FIT_W / 2 / aspect);
    halfW = halfH * aspect;
    Object.assign(camera, { left: -halfW, right: halfW, top: halfH, bottom: -halfH });
    camera.updateProjectionMatrix();
    // Line spacing follows the plate's scale, so it holds on screen.
    shared.uFreq.value = LINE_FREQ * (FIT_H / 2 / halfH);
    // The ribbon spans the plate and sits at its head.
    const k = Math.min((halfW * 2 * 0.98) / ribbonSize.x, (halfH * 0.24) / ribbonSize.y);
    ribbon.scale.setScalar(k);
    ribbon.position.set(0, halfH - (ribbonSize.y * k) / 2 - halfH * 0.025, -6);
    if (!running) render();
  };

  /* ── Input: keys walk; the pointer moves the lamp, picks places, picks a spot to walk to ── */

  const keys = new Set<string>();
  const KEYMAP: Record<string, [number, number]> = {
    ArrowLeft: [-1, 0], KeyA: [-1, 0],
    ArrowRight: [1, 0], KeyD: [1, 0],
    ArrowUp: [0, -1], KeyW: [0, -1],
    ArrowDown: [0, 1], KeyS: [0, 1],
  };
  const typing = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey || typing(e.target)) return;
    if (KEYMAP[e.code]) {
      e.preventDefault();
      keys.add(e.code);
      autoWalk?.kill();
      autoWalk = null;
      stroll = null;
    } else if (e.code === 'Enter' && atDoor && !(e.target instanceof HTMLAnchorElement || e.target instanceof HTMLButtonElement)) {
      e.preventDefault();
      onEnter?.(atDoor);
    }
  };
  const onKeyUp = (e: KeyboardEvent) => keys.delete(e.code);
  const onBlur = () => keys.clear();

  const lampTarget = new THREE.Vector2(0.55, 0.55);
  const lamp = new THREE.Vector2(0.55, 0.55);
  const LAMP_REST = new THREE.Vector2(0.55, 0.55);
  const ray = new THREE.Raycaster();
  ray.layers.set(2);
  const ndc = new THREE.Vector2();
  let pointed: Place | null = null; // under the pointer
  let indexed: Place | null = null; // from the index
  let atDoor: Place | null = null; // the citizen's
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
    // Only the cursor over the plate holds the lamp; elsewhere it drifts back to its rest.
    if (inside) lampTarget.set(x, y);
    else lampTarget.copy(LAMP_REST);
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
    if (!downAt || entering) return;
    const moved = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y);
    downAt = null;
    if (moved > 8) return;
    const hit = pick(e);
    if (!hit) return;
    const place = hit.object.userData.place as Place | undefined;
    if (place) onEnter?.(place);
    else walkTo(hit.point);
  };
  const onLeave = () => {
    lampTarget.copy(LAMP_REST);
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

  /* ── Walking ── */

  const velocity = new THREE.Vector3();
  const heading = { value: citizen.rotation.y };
  let stride = 0;
  let stroll: THREE.Vector3 | null = null; // a spot clicked on the street
  let autoWalk: gsap.core.Tween | null = null; // walking in at a door
  let entering = false;

  const clampToStreet = (p: THREE.Vector3) => {
    p.x = THREE.MathUtils.clamp(p.x, -BOUNDS.x, BOUNDS.x);
    p.z = THREE.MathUtils.clamp(p.z, BOUNDS.zMin, BOUNDS.zMax);
    return p;
  };
  const walkTo = (point: THREE.Vector3) => {
    stroll = clampToStreet(point.clone().setY(0));
  };

  const walk = (place: Place) => {
    try {
      sessionStorage.setItem('forum-at', place);
    } catch {}
    indexed = place;
    refocus();
    if (reducedMotion) return Promise.resolve();
    entering = true;
    stroll = null;
    keys.clear();
    autoWalk?.kill();
    canvas.style.cursor = '';
    // Along the street to the door, then in.
    const door = doorOf(place);
    const inside = door.clone().setZ(FRONT - 0.9);
    const path = new THREE.CurvePath<THREE.Vector3>();
    const from = citizen.position.clone();
    if (from.distanceTo(door) > 0.05) path.add(new THREE.LineCurve3(from, door));
    path.add(new THREE.LineCurve3(door, inside));
    const length = path.getLength();
    const state = { t: 0 };
    const tangent = new THREE.Vector3();
    return new Promise<void>((resolve) => {
      autoWalk = gsap.to(state, {
        t: 1,
        duration: THREE.MathUtils.clamp(length / SPEED, 0.6, 3.2),
        ease: 'power1.inOut',
        onUpdate: () => {
          path.getPointAt(state.t, citizen.position);
          path.getTangentAt(Math.min(state.t, 0.999), tangent);
          heading.value = Math.atan2(tangent.x, tangent.z);
          stride += 0.25;
          // Into the shadow of the doorway.
          const fade = THREE.MathUtils.smoothstep(state.t, 0.8, 1);
          citizen.scale.setScalar(1 - fade * 0.15);
          citizen.visible = fade < 0.98;
        },
        onComplete: resolve,
      });
    });
  };

  const reset = () => {
    autoWalk?.kill();
    autoWalk = null;
    entering = false;
    stroll = null;
    keys.clear();
    indexed = null;
    pointed = null;
    outside();
    heading.value = citizen.rotation.y;
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
    if (entering) {
      citizen.rotation.y += angleTo(citizen.rotation.y, heading.value) * Math.min(1, dt * 10);
      citizen.position.y = Math.abs(Math.sin(stride)) * 0.06;
      return;
    }
    // Keys, or a spot on the street to make for.
    const want = new THREE.Vector3();
    keys.forEach((k) => {
      const [dx, dz] = KEYMAP[k];
      want.x += dx;
      want.z += dz;
    });
    if (stroll) {
      want.subVectors(stroll, citizen.position).setY(0);
      if (want.length() < 0.1) stroll = null;
    }
    if (want.lengthSq() > 0) want.normalize().multiplyScalar(SPEED);
    velocity.lerp(want, Math.min(1, dt * 9));
    const moving = velocity.length() > 0.05;

    // Walking up into a door goes in.
    if (atDoor && keys.size && want.z < 0 && Math.abs(want.x) < 0.01 && citizen.position.z <= BOUNDS.zMin + 0.02) {
      keys.clear();
      onEnter?.(atDoor);
      return;
    }

    citizen.position.addScaledVector(velocity, dt);
    clampToStreet(citizen.position);
    if (moving) {
      heading.value = Math.atan2(velocity.x, velocity.z);
      stride += dt * 9;
    }
    citizen.rotation.y += angleTo(citizen.rotation.y, heading.value) * Math.min(1, dt * 10);
    citizen.position.y = moving ? Math.abs(Math.sin(stride)) * 0.06 : citizen.position.y * 0.8;
    citizen.rotation.z = moving ? Math.sin(stride) * 0.04 : 0;

    // At a door?
    const door = (Object.keys(AT) as Place[]).find((p) => Math.abs(citizen.position.x - AT[p]) < DOOR_REACH && citizen.position.z < FRONT + 1.4) ?? null;
    if (door !== atDoor) {
      atDoor = door;
      refocus();
    }
  };

  /* ── The view follows the citizen (or the place named in the index) ── */

  const view = { x: citizen.position.x };
  const target = new THREE.Vector3();
  const follow = (dt: number) => {
    const goal = indexed && !entering ? AT[indexed] : citizen.position.x;
    const limit = END + 4 - halfW;
    const x = THREE.MathUtils.clamp(goal, -limit, limit);
    view.x += (x - view.x) * (reducedMotion ? 1 : 1 - Math.exp(-dt * 3));
    target.set(view.x, VIEW_Y, VIEW_Z);
    camera.position.copy(target).addScaledVector(VIEW_DIR, VIEW_DIST);
    camera.lookAt(target);
    // The world hangs far off: it holds its place on the plate while the street passes.
    world.position.set(view.x - 3.6 + halfW * 0.35, 1.2, -16);
  };

  /* ── Loop ── */

  let running = false;
  let raf = 0;
  const timer = new THREE.Timer();
  let clock = 0;
  const ribbonInv = new THREE.Matrix4();

  const render = () => {
    camera.updateMatrixWorld(true);
    ribbonUniforms.uObjectInverse.value.copy(ribbonInv.copy(ribbon.matrixWorld).invert());
    shared.uLight.value.set(lamp.x * 1.5 + 0.25, lamp.y * 1.2 + 0.3, 0.8).normalize();
    compositeUniforms.uReveal.value = shared.uReveal.value;

    // 1 · ink
    renderer.setRenderTarget(inkTarget);
    renderer.setClearColor(0x000000, 0);
    camera.layers.enable(1);
    renderer.render(scene, camera);

    // 2 · normals + depth (solid forms only)
    scene.overrideMaterial = normalMat;
    renderer.setRenderTarget(normalTarget);
    camera.layers.disable(1);
    renderer.render(scene, camera);
    scene.overrideMaterial = null;
    camera.layers.enable(1);

    // 3 · paper
    renderer.setRenderTarget(null);
    renderer.render(quadScene, quadCamera);
  };

  const tick = (now: number) => {
    raf = requestAnimationFrame(tick);
    timer.update(now);
    const dt = Math.min(timer.getDelta(), 0.05);
    if (!reducedMotion) clock += dt;
    lamp.lerp(lampTarget, 0.06);
    step(dt);
    follow(dt);
    drawSmoke(clock);
    if (!reducedMotion) rings.rotation.y += dt * 0.02;
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

  const intro = (after: Promise<void> = Promise.resolve()) => {
    if (reducedMotion) return;
    shared.uReveal.value = 0;
    ribbonUniforms.uReveal.value = 0;
    after.then(() => {
      gsap.to(shared.uReveal, { value: 1, duration: 3.2, ease: 'power1.out', delay: 0.4 });
      gsap.to(ribbonUniforms.uReveal, { value: 1, duration: 2.4, ease: 'power1.inOut', delay: 1.2 });
    });
  };

  window.addEventListener('resize', resize);
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointerleave', onLeave);
  document.addEventListener('visibilitychange', onVisibility);
  canvas.addEventListener('webglcontextlost', onLost);

  drawSmoke(0);
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
      autoWalk?.kill();
      gsap.killTweensOf([shared.uReveal, ribbonUniforms.uReveal, ...Object.values(places).map((p) => p.glow)]);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointerleave', onLeave);
      document.removeEventListener('visibilitychange', onVisibility);
      canvas.removeEventListener('webglcontextlost', onLost);
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh || o instanceof THREE.Line) o.geometry.dispose();
      });
      quad.geometry.dispose();
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
      inkTarget.dispose();
      normalTarget.dispose();
      renderer.dispose();
    },
  };
}
