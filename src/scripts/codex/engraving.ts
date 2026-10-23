import * as THREE from 'three';
import { gsap } from 'gsap';
import { PLATES, buildModel, disposeModel } from './models';

// Copper-plate engraving of 3D models, in three passes:
//   1. ink:     each surface is drawn as parallel engraved lines that wrap the form;
//               line weight follows the light, and a second, crossing set of
//               lines comes in where it is darkest. Armillary rings draw as fine lines.
//   2. normals: view normals + depth, for outlines.
//   3. paper:   cream stock with grain and engraved stars; ink and outlines on top.
// The lamp follows the pointer, so moving it re-cuts the shading live.

export interface Engraving {
  show(index: number): void;
  intro(): void;
  dispose(): void;
}

interface Options {
  /** Lettered on the banderole. */
  name: string;
  /** Plate to open on (index into PLATES). */
  initial?: number;
  reducedMotion: boolean;
  onContextLost?: () => void;
}

const PAPER = 0xefe6d0;
const INK = 0x1b2419;

// sRGB values passed straight through to the canvas.
const raw = (hex: number) => new THREE.Color().setHex(hex, THREE.LinearSRGBColorSpace);

const engraveVertex = /* glsl */ `
  uniform mat4 uObjectInverse;
  varying vec3 vObj;
  varying vec3 vNormal;
  varying vec3 vView;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vObj = (uObjectInverse * world).xyz;
    vNormal = normalize(normalMatrix * normal);
    vec4 mv = viewMatrix * world;
    vView = -mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`;

const engraveFragment = /* glsl */ `
  uniform vec3 uLight;      // view space
  uniform float uFreq;      // lines per unit
  uniform float uReveal;    // 0 = blank plate, 1 = fully engraved
  uniform sampler2D uText;  // lettering, for the banderole
  uniform float uHasText;
  varying vec3 vObj;
  varying vec3 vNormal;
  varying vec3 vView;
  varying vec2 vUv;

  float hash(float n) { return fract(sin(n) * 43758.5453); }

  // One family of engraved lines. Returns ink coverage 0..1.
  float lines(float coord, float halfWidth, float along) {
    float id = floor(coord);
    float f = abs(fract(coord) - 0.5);
    float w = fwidth(coord);
    // Each line is cut progressively along its length as the plate is revealed.
    float cut = step(hash(id * 1.31) * 0.45 + fract(along * 0.13 + hash(id) ) * 0.55, uReveal * 1.02);
    return cut * (1.0 - smoothstep(halfWidth - w, halfWidth + w, f)) * step(0.004, halfWidth);
  }

  void main() {
    vec3 n = normalize(vNormal);
    if (!gl_FrontFacing) n = -n;
    vec3 v = normalize(vView);
    float lambert = max(dot(n, normalize(uLight)), 0.0);
    float rim = pow(1.0 - max(dot(n, v), 0.0), 2.0);
    // A little fill so faces turned from the lamp still read as form, not solid ink.
    float tone = clamp(0.22 + lambert * 0.9 - rim * 0.4, 0.0, 1.0);
    float dark = pow(1.0 - tone, 0.85);

    // Swelling, slightly wavering lines, as a burin leaves them.
    float wobble = sin(dot(vObj, vec3(1.7, 0.3, 2.3)) * 3.0) * 0.18;
    float c1 = dot(vObj, normalize(vec3(0.15, 1.0, 0.25))) * uFreq + wobble;
    float c2 = dot(vObj, normalize(vec3(1.0, -0.35, 0.6))) * uFreq * 0.9;
    float c3 = dot(vObj, normalize(vec3(-0.6, 0.4, 1.0))) * uFreq * 0.7;

    float ink = lines(c1, clamp(dark * 0.5, 0.0, 0.44), c2);
    ink = max(ink, lines(c2, clamp((dark - 0.45) * 0.55, 0.0, 0.36), c1));
    ink = max(ink, lines(c3, clamp((dark - 0.8) * 0.8, 0.0, 0.25), c1));

    // Bare highlights stay paper.
    ink *= smoothstep(0.0, 0.12, dark);

    // Lettering on the front of the banderole, cut left to right; the ribbon's
    // own hatching is kept light so the name reads.
    if (uHasText > 0.5) {
      float letters = gl_FrontFacing ? texture2D(uText, vUv).a : 0.0;
      letters *= step(vUv.x, uReveal * 1.15 - 0.08);
      ink = max(ink * 0.6, letters);
    }
    gl_FragColor = vec4(vec3(0.0), ink);
  }
`;

const compositeVertex = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const compositeFragment = /* glsl */ `
  uniform sampler2D tInk;
  uniform sampler2D tNormal;
  uniform sampler2D tDepth;
  uniform vec2 uResolution;
  uniform float uNear;
  uniform float uFar;
  uniform float uPixel;
  uniform float uReveal;
  uniform vec3 uPaper;
  uniform vec3 uInk;
  uniform vec3 uRed;
  varying vec2 vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  float linearDepth(vec2 uv) {
    float z = texture2D(tDepth, uv).x * 2.0 - 1.0;
    return (2.0 * uNear * uFar) / (uFar + uNear - z * (uFar - uNear));
  }

  // An engraved star: a dot with four fine rays.
  float star(vec2 px) {
    float cell = 46.0 * uPixel;
    vec2 id = floor(px / cell);
    float h = hash(id);
    if (h < 0.86) return 0.0;
    vec2 c = (id + 0.2 + 0.6 * vec2(hash(id + 3.1), hash(id + 7.7))) * cell;
    vec2 d = abs(px - c);
    float r = (0.8 + 1.6 * hash(id + 1.3)) * uPixel;
    float dotv = 1.0 - smoothstep(r - 0.5, r + 0.5, length(px - c));
    float len = r * (2.5 + 3.0 * hash(id + 5.5));
    float rays = max(
      (1.0 - smoothstep(0.35 * uPixel, 0.75 * uPixel, d.x)) * (1.0 - smoothstep(len * 0.6, len, d.y)),
      (1.0 - smoothstep(0.35 * uPixel, 0.75 * uPixel, d.y)) * (1.0 - smoothstep(len * 0.6, len, d.x))
    );
    return max(dotv, rays * 0.85);
  }

  void main() {
    vec2 px = vUv * uResolution;
    vec2 t = 1.0 / uResolution;

    // Paper: warm stock, fibres, gentle darkening toward the plate edge.
    float grain = noise(px * 0.9) * 0.5 + noise(px * 0.08) * 0.5;
    vec3 col = uPaper * (0.955 + 0.06 * grain);
    col *= 1.0 - 0.12 * pow(length(vUv - 0.5) * 1.3, 3.0);

    // Ink: hatching and rings from the first pass, overprinted on the paper.
    float ink = texture2D(tInk, vUv).a;

    // Outlines from normal and depth discontinuities.
    float o = 1.2 * uPixel;
    vec3 n0 = texture2D(tNormal, vUv).xyz;
    float d0 = linearDepth(vUv);
    float edge = 0.0;
    for (int i = 0; i < 4; i++) {
      vec2 off = (i == 0 ? vec2(o, 0) : i == 1 ? vec2(-o, 0) : i == 2 ? vec2(0, o) : vec2(0, -o)) * t;
      vec3 n1 = texture2D(tNormal, vUv + off).xyz;
      float d1 = linearDepth(vUv + off);
      edge = max(edge, smoothstep(0.25, 0.45, length(n1 - n0)));
      edge = max(edge, smoothstep(0.04, 0.1, abs(d1 - d0) / d0));
    }
    edge *= step(0.002, uReveal);
    float covered = texture2D(tNormal, vUv).a;

    float s = star(px) * (1.0 - covered) * 0.75;
    float coverage = clamp(max(max(ink, edge), s), 0.0, 1.0);
    // Ink sits a little unevenly on the plate.
    coverage *= 0.86 + 0.14 * noise(px * 0.35);
    col = mix(col, uInk, coverage);
    gl_FragColor = vec4(col, 1.0);
  }
`;

/** Name set in Fell small caps, black on transparent, for the banderole's middle stretch. */
function letteringTexture(text: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 2400;
  canvas.height = 200;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#000';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const spaced = text.toUpperCase().split('').join('\u200A');
  let size = 150;
  ctx.font = `${size}px "IM Fell English SC", serif`;
  // Fit the lettering to the flat middle of the ribbon (its ends twist away).
  const max = canvas.width * 0.62;
  const width = ctx.measureText(spaced).width;
  if (width > max) {
    size *= max / width;
    ctx.font = `${size}px "IM Fell English SC", serif`;
  }
  ctx.fillText(spaced, canvas.width / 2, canvas.height / 2 + size * 0.06);
  // Flourish rules either side of the name.
  const half = Math.min(max, ctx.measureText(spaced).width) / 2;
  ctx.fillRect(canvas.width / 2 - half - 170, canvas.height / 2 - 1.5, 120, 3);
  ctx.fillRect(canvas.width / 2 + half + 50, canvas.height / 2 - 1.5, 120, 3);
  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 8;
  return texture;
}

/** A ribbon bowed toward the viewer, its ends twisting back as banderoles do in old plates. */
function banderole(width = 7.6, height = 0.66) {
  const geo = new THREE.PlaneGeometry(1, 1, 220, 6);
  const p = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const u = p.getX(i) + 0.5;
    const v = p.getY(i);
    const s = u * 2 - 1;
    const x = s * width * 0.5;
    const y = -3.05 + 0.16 * Math.sin(u * Math.PI * 3) + 0.25 * s * s;
    const z = 2.3 - 1.4 * s * s;
    // Twist toward the tails: 0 in the middle, up to ~150° at the ends.
    const end = THREE.MathUtils.smoothstep(Math.abs(s), 0.62, 1);
    const twist = Math.sign(s) * end * 2.6;
    p.setXYZ(i, x - Math.sign(s) * end * 0.25, y + v * height * Math.cos(twist), z + v * height * Math.sin(twist) - end * 0.4);
  }
  geo.computeVertexNormals();
  return geo;
}

export function createEngraving(canvas: HTMLCanvasElement, { name, initial = 0, reducedMotion, onContextLost }: Options): Engraving | null {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false });
  } catch {
    return null;
  }
  const pixel = Math.min(window.devicePixelRatio, 2);
  renderer.setPixelRatio(pixel);
  renderer.autoClear = true;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 1, 60);
  camera.position.set(0, 0.35, 15);
  camera.lookAt(0, 0, 0);
  camera.layers.enable(1);

  /* ── Materials ── */

  const engraveUniforms = {
    uLight: { value: new THREE.Vector3(0.5, 0.6, 0.8) },
    uFreq: { value: 15 },
    uReveal: { value: 1 },
    uObjectInverse: { value: new THREE.Matrix4() },
    uText: { value: null as THREE.Texture | null },
    uHasText: { value: 0 },
  };
  const engrave = new THREE.ShaderMaterial({
    uniforms: engraveUniforms,
    vertexShader: engraveVertex,
    fragmentShader: engraveFragment,
    side: THREE.DoubleSide,
    transparent: false,
  });
  const normalMat = new THREE.MeshNormalMaterial({ side: THREE.DoubleSide });

  /* ── The model on a turntable ── */

  const turntable = new THREE.Group();
  scene.add(turntable);
  let current = initial;
  let model = buildModel(PLATES[current], engrave);
  turntable.add(model);

  /* ── Armillary sphere: engraved rings around the plate ── */

  const ringMat = new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 1 });
  const armillary = new THREE.Group();
  const ring = (r: number, segments = 256) =>
    new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(
        Array.from({ length: segments }, (_, i) => new THREE.Vector3(Math.cos((i / segments) * Math.PI * 2) * r, 0, Math.sin((i / segments) * Math.PI * 2) * r)),
      ),
      ringMat,
    );
  const ticks = (r: number, n: number) =>
    new THREE.LineSegments(
      new THREE.BufferGeometry().setFromPoints(
        Array.from({ length: n }, (_, i) => {
          const a = (i / n) * Math.PI * 2;
          const len = i % 5 === 0 ? 0.16 : 0.07;
          return [new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r), new THREE.Vector3(Math.cos(a) * (r + len), 0, Math.sin(a) * (r + len))];
        }).flat(),
      ),
      ringMat,
    );
  const equator = new THREE.Group().add(ring(3.35), ring(3.45), ticks(3.45, 72));
  equator.rotation.set(0.32, 0, 0.18);
  const ecliptic = new THREE.Group().add(ring(3.62), ring(3.69));
  ecliptic.rotation.set(0.32 + 0.41, 0, 0.18 - 0.2);
  const meridian = new THREE.Group().add(ring(3.85));
  meridian.rotation.set(Math.PI / 2, 0.2, 0);
  armillary.add(equator, ecliptic, meridian);
  armillary.traverse((o) => o.layers.set(1));
  scene.add(armillary);

  /* ── Banderole: a ribbon across the plate carrying the name ── */

  const nameTexture = letteringTexture(name);
  const ribbonUniforms = {
    uLight: engraveUniforms.uLight,
    uFreq: { value: 22 },
    uReveal: { value: 1 },
    uObjectInverse: { value: new THREE.Matrix4() },
    uText: { value: nameTexture },
    uHasText: { value: 1 },
  };
  const ribbonMat = new THREE.ShaderMaterial({
    uniforms: ribbonUniforms,
    vertexShader: engraveVertex,
    fragmentShader: engraveFragment,
    side: THREE.DoubleSide,
  });
  const ribbon = new THREE.Mesh(banderole(), ribbonMat);
  scene.add(ribbon);
  turntable.position.y = 0.45;

  /* ── Targets and the paper pass ── */

  const inkTarget = new THREE.WebGLRenderTarget(1, 1);
  const normalTarget = new THREE.WebGLRenderTarget(1, 1, { depthTexture: new THREE.DepthTexture(1, 1) });

  const compositeUniforms = {
    tInk: { value: inkTarget.texture },
    tNormal: { value: normalTarget.texture },
    tDepth: { value: normalTarget.depthTexture },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uNear: { value: camera.near },
    uFar: { value: camera.far },
    uPixel: { value: pixel },
    uReveal: { value: 1 },
    uPaper: { value: raw(PAPER) },
    uInk: { value: raw(INK) },
    uRed: { value: raw(0x9b2d20) },
  };
  const quad = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.ShaderMaterial({ uniforms: compositeUniforms, vertexShader: compositeVertex, fragmentShader: compositeFragment, depthTest: false, depthWrite: false }),
  );
  const quadScene = new THREE.Scene();
  quadScene.add(quad);
  const quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

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
    camera.aspect = w / h;
    // Keep the whole armillary in frame whichever way the plate is shaped.
    const fit = 8.4;
    camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(fit / 2 / camera.position.z / Math.min(1, camera.aspect)));
    camera.updateProjectionMatrix();
    if (!running) render();
  };

  /* ── Lamp and drag ── */

  const lampTarget = new THREE.Vector2(0.55, 0.55);
  const lamp = new THREE.Vector2(0.55, 0.55);
  // The plate sways around its best angle; dragging adds an offset that eases back.
  let spin = 0;
  let offset = 0;
  let sway = 0;
  let dragging = false;
  let lastX = 0;

  const LAMP_REST = new THREE.Vector2(0.55, 0.55);
  const onPointerMove = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 2 - 1;
    const y = -(((e.clientY - r.top) / r.height) * 2 - 1);
    // Only the cursor over the plate holds the lamp; elsewhere it drifts back to its rest.
    if (Math.abs(x) <= 1 && Math.abs(y) <= 1) lampTarget.set(x, y);
    else lampTarget.copy(LAMP_REST);
    if (dragging) {
      offset += (e.clientX - lastX) * 0.008;
      lastX = e.clientX;
    }
  };
  const onDown = (e: PointerEvent) => {
    dragging = true;
    lastX = e.clientX;
    canvas.setPointerCapture(e.pointerId);
  };
  const onUp = () => {
    dragging = false;
  };

  /* ── Loop ── */

  let running = false;
  let raf = 0;
  const timer = new THREE.Timer();
  const objInv = new THREE.Matrix4();

  const render = () => {
    turntable.rotation.y = spin;
    turntable.updateMatrixWorld(true);
    objInv.copy(turntable.matrixWorld).invert();
    engraveUniforms.uObjectInverse.value.copy(objInv);
    engraveUniforms.uLight.value.set(lamp.x * 1.5 + 0.25, lamp.y * 1.2 + 0.3, 0.8).normalize();
    compositeUniforms.uReveal.value = engraveUniforms.uReveal.value;

    // 1 · ink
    scene.overrideMaterial = null;
    renderer.setRenderTarget(inkTarget);
    renderer.setClearColor(0x000000, 0);
    camera.layers.enable(1);
    renderer.render(scene, camera);

    // 2 · normals + depth (model only)
    scene.overrideMaterial = normalMat;
    renderer.setRenderTarget(normalTarget);
    renderer.setClearColor(0x000000, 0);
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
    lamp.lerp(lampTarget, 0.06);
    if (!reducedMotion) sway += dt;
    if (!dragging) offset *= 1 - Math.min(1, dt * 0.6);
    spin = Math.sin(sway * 0.3) * 0.5 + offset;
    if (!reducedMotion) armillary.rotation.y += dt * 0.03;
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

  /* ── Plates ── */

  let busy = false;
  let pending: number | null = null;

  const swap = (index: number) => {
    turntable.remove(model);
    disposeModel(model);
    current = index;
    model = buildModel(PLATES[index], engrave);
    turntable.add(model);
  };

  const show = (index: number) => {
    if (index === current && !busy) return;
    if (busy) {
      pending = index;
      return;
    }
    if (reducedMotion) {
      swap(index);
      render();
      return;
    }
    busy = true;
    gsap
      .timeline({
        onComplete: () => {
          busy = false;
          if (pending !== null && pending !== current) {
            const next = pending;
            pending = null;
            show(next);
          }
          pending = null;
        },
      })
      .to(engraveUniforms.uReveal, { value: 0, duration: 0.7, ease: 'power2.in' })
      .add(() => swap(index))
      .to(engraveUniforms.uReveal, { value: 1, duration: 2.2, ease: 'power1.out' });
  };

  const intro = () => {
    if (reducedMotion) return;
    engraveUniforms.uReveal.value = 0;
    ribbonUniforms.uReveal.value = 0;
    gsap.to(engraveUniforms.uReveal, { value: 1, duration: 2.8, ease: 'power1.out', delay: 0.5 });
    gsap.to(ribbonUniforms.uReveal, { value: 1, duration: 2.4, ease: 'power1.inOut', delay: 1.4 });
  };

  window.addEventListener('resize', resize);
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  canvas.addEventListener('pointerdown', onDown);
  window.addEventListener('pointerup', onUp);
  document.addEventListener('visibilitychange', onVisibility);
  canvas.addEventListener('webglcontextlost', onLost);

  resize();
  render();
  start();

  return {
    show,
    intro,
    dispose() {
      stop();
      gsap.killTweensOf([engraveUniforms.uReveal, ribbonUniforms.uReveal]);
      ribbon.geometry.dispose();
      ribbonMat.dispose();
      nameTexture.dispose();
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      document.removeEventListener('visibilitychange', onVisibility);
      canvas.removeEventListener('webglcontextlost', onLost);
      disposeModel(model);
      armillary.traverse((o) => {
        if (o instanceof THREE.Line) o.geometry.dispose();
      });
      [engrave, normalMat, ringMat, quad.material as THREE.Material].forEach((m) => m.dispose());
      quad.geometry.dispose();
      inkTarget.dispose();
      normalTarget.dispose();
      renderer.dispose();
    },
  };
}
