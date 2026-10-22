import * as THREE from 'three';
import { gsap } from 'gsap';
import { SHAPES, sampleShape } from './shapes';

export interface HoloStage {
  /** Morph to shape `index`. Requests made mid-morph are queued (latest wins). */
  show(index: number): void;
  /** Play the gather-from-the-void entrance. */
  intro(): void;
  /** Re-measure the frame box, e.g. after web fonts change the copy's size. */
  layout(): void;
  dispose(): void;
}

interface Options {
  reducedMotion: boolean;
  /** Viewport-pixel box the object should fit inside, so it never sits under the copy. */
  frame: () => { left: number; top: number; right: number; bottom: number };
  onContextLost?: () => void;
}

const VOID = 0x0c0f0b;

// Raw sRGB values: the particle shader writes colour straight to the canvas.
const rawColor = (hex: number) => new THREE.Color().setHex(hex, THREE.LinearSRGBColorSpace);

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uProgress;
  uniform float uIntro;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform float uPointerStrength;
  uniform float uScanY;
  uniform int uFrom;
  uniform int uTo;
  uniform vec3 uPointer;

  attribute vec3 aP0;
  attribute vec3 aP1;
  attribute vec3 aP2;
  attribute vec3 aDir;
  attribute vec4 aRand; // x: sweep delay, y: size, z: rotation, w: seed

  varying float vAlpha;
  varying float vRot;
  varying float vGlow;
  varying float vHollow;

  vec3 pick(int i) {
    if (i == 0) return aP0;
    if (i == 1) return aP1;
    return aP2;
  }

  void main() {
    float t = clamp(uProgress * 1.6 - aRand.x * 0.6, 0.0, 1.0);
    t = t * t * (3.0 - 2.0 * t);
    float mid = sin(3.14159265 * t);

    vec3 pos = mix(pick(uFrom), pick(uTo), t);

    // Mid-morph the particles lift off and swirl around the vertical axis.
    float ang = mid * (0.9 + aRand.w);
    float c = cos(ang), s = sin(ang);
    pos.xz = mat2(c, -s, s, c) * pos.xz;
    pos += aDir * mid * (0.5 + aRand.w * 1.1);

    pos += aDir * sin(uTime * 1.3 + aRand.w * 40.0) * 0.012;

    // Entrance: gather in from a wide nebula.
    pos = mix(aDir * (7.0 + aRand.w * 7.0), pos, uIntro);

    vec3 away = pos - uPointer;
    float push = (1.0 - smoothstep(0.0, 1.1, length(away))) * uPointerStrength;
    pos += normalize(away + 1e-4) * push * 0.45;

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * aRand.y * uPixelRatio / -mv.z;

    float scan = exp(-pow((pos.y - uScanY) * 2.6, 2.0));
    float depth = clamp((-mv.z - 8.0) / 4.5, 0.0, 1.0);

    vGlow = scan * 0.75 + mid * 0.5 + push * 0.9;
    vRot = aRand.z * 6.2831853 + uTime * 0.4 * (aRand.w - 0.5);
    vHollow = step(0.7, aRand.w);
    vAlpha = (0.5 + 0.3 * aRand.y) * (1.0 - 0.6 * depth) * smoothstep(0.0, 0.35, uIntro);
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uBase;
  uniform vec3 uHot;

  varying float vAlpha;
  varying float vRot;
  varying float vGlow;
  varying float vHollow;

  // Inigo Quilez — signed distance to an equilateral triangle.
  float sdTri(vec2 p) {
    const float k = 1.7320508;
    p.x = abs(p.x) - 1.0;
    p.y = p.y + 1.0 / k;
    if (p.x + k * p.y > 0.0) p = vec2(p.x - k * p.y, -k * p.x - p.y) / 2.0;
    p.x -= clamp(p.x, -2.0, 0.0);
    return -length(p) * sign(p.y);
  }

  void main() {
    vec2 p = gl_PointCoord * 2.0 - 1.0;
    p.y = -p.y;
    float c = cos(vRot), s = sin(vRot);
    p = mat2(c, -s, s, c) * p;

    float d = sdTri(p * 1.6);
    float fill = 1.0 - smoothstep(-0.05, 0.05, d);
    float edge = smoothstep(-0.36, -0.26, d) * (1.0 - smoothstep(-0.02, 0.06, d));
    float shape = mix(fill, edge, vHollow);
    if (shape < 0.01) discard;

    vec3 col = mix(uBase, uHot, clamp(vGlow, 0.0, 1.0));
    gl_FragColor = vec4(col, shape * vAlpha);
  }
`;

export function createHoloStage(canvas: HTMLCanvasElement, { reducedMotion, frame, onContextLost }: Options): HoloStage | null {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  } catch {
    return null;
  }

  const small = window.innerWidth < 768;
  const COUNT = small ? 9000 : 16000;
  const pixelRatio = Math.min(window.devicePixelRatio, small ? 1.5 : 2);
  renderer.setPixelRatio(pixelRatio);
  renderer.setClearColor(VOID);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(VOID, 0.06);
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.set(0, 0, 10);

  /* ── Particle constellation ── */

  const geometry = new THREE.BufferGeometry();
  const shapes = SHAPES.map((id) => sampleShape(id, COUNT));
  geometry.setAttribute('position', new THREE.BufferAttribute(shapes[0], 3));
  shapes.forEach((arr, i) => geometry.setAttribute(`aP${i}`, new THREE.BufferAttribute(arr, 3)));

  const dir = new Float32Array(COUNT * 3);
  const rnd = new Float32Array(COUNT * 4);
  const v = new THREE.Vector3();
  for (let i = 0; i < COUNT; i++) {
    v.randomDirection();
    dir.set([v.x, v.y, v.z], i * 3);
    // Shapes are sorted along X, so index order doubles as a left-to-right sweep.
    rnd.set([(i / COUNT) * 0.75 + Math.random() * 0.25, 0.6 + Math.random() ** 2 * 1.1, Math.random(), Math.random()], i * 4);
  }
  geometry.setAttribute('aDir', new THREE.BufferAttribute(dir, 3));
  geometry.setAttribute('aRand', new THREE.BufferAttribute(rnd, 4));

  const uniforms = {
    uTime: { value: 0 },
    uProgress: { value: 0 },
    uIntro: { value: 1 },
    uSize: { value: 30 },
    uPixelRatio: { value: pixelRatio },
    uPointerStrength: { value: 0 },
    uScanY: { value: -10 },
    uFrom: { value: 0 },
    uTo: { value: 0 },
    uPointer: { value: new THREE.Vector3(99, 99, 99) },
    uBase: { value: rawColor(0x6f9a2c) },
    uHot: { value: rawColor(0xe4ead8) },
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;

  /* ── Holotable: projector rings beneath the object ── */

  const ringMat = new THREE.LineBasicMaterial({ color: 0x8fb339, transparent: true, opacity: 0.22 });
  const table = new THREE.Group();
  const circle = (r: number) =>
    new THREE.BufferGeometry().setFromPoints(
      Array.from({ length: 129 }, (_, i) => new THREE.Vector3(Math.cos((i / 128) * Math.PI * 2) * r, 0, Math.sin((i / 128) * Math.PI * 2) * r)),
    );
  const ticks = new THREE.BufferGeometry().setFromPoints(
    Array.from({ length: 72 }, (_, i) => {
      const a = (i / 72) * Math.PI * 2;
      const len = i % 6 === 0 ? 0.22 : 0.08;
      return [new THREE.Vector3(Math.cos(a) * 2.2, 0, Math.sin(a) * 2.2), new THREE.Vector3(Math.cos(a) * (2.2 + len), 0, Math.sin(a) * (2.2 + len))];
    }).flat(),
  );
  table.add(new THREE.Line(circle(1.7), ringMat), new THREE.Line(circle(2.2), ringMat), new THREE.LineSegments(ticks, ringMat));
  table.position.y = -2.55;

  const spin = new THREE.Group();
  spin.add(points);
  const stage = new THREE.Group();
  stage.add(spin, table);
  scene.add(stage);

  /* ── Wireframe terrain far below: the planet surface ── */

  const SEGS = small ? 40 : 64;
  const terrainGeo = new THREE.PlaneGeometry(44, 30, SEGS, SEGS).rotateX(-Math.PI / 2);
  const terrain = new THREE.Mesh(
    terrainGeo,
    new THREE.MeshBasicMaterial({ color: 0x4a5c3f, wireframe: true, transparent: true, opacity: 0.32 }),
  );
  terrain.frustumCulled = false;
  terrain.position.set(0, -4.4, -9);
  scene.add(terrain);
  const tArr = terrainGeo.attributes.position.array as Float32Array;

  /* ── Drifting dust ── */

  const dustGeo = new THREE.BufferGeometry();
  const dustArr = new Float32Array(500 * 3);
  for (let i = 0; i < dustArr.length; i += 3) {
    dustArr[i] = (Math.random() - 0.5) * 30;
    dustArr[i + 1] = (Math.random() - 0.5) * 16;
    dustArr[i + 2] = -Math.random() * 18 + 3;
  }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustArr, 3));
  const dust = new THREE.Points(
    dustGeo,
    new THREE.PointsMaterial({ color: 0x8fb339, size: 0.035, transparent: true, opacity: 0.45, depthWrite: false }),
  );
  scene.add(dust);

  /* ── Layout: fit the object (plus its holotable) into the frame box ── */

  const OBJECT_W = 4.8;
  const OBJECT_H = 5.4; // shape height + the rings hanging beneath it

  const resize = () => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();

    const visH = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
    const visW = visH * camera.aspect;
    const f = frame();
    const fw = ((f.right - f.left) / w) * visW;
    const fh = ((f.bottom - f.top) / h) * visH;
    const scale = Math.min(fw / OBJECT_W, fh / OBJECT_H);
    stage.scale.setScalar(scale);
    stage.position.set(
      (((f.left + f.right) / 2) / w - 0.5) * visW,
      (0.5 - ((f.top + f.bottom) / 2) / h) * visH + 0.3 * scale, // rings sit low; lift slightly
      0,
    );

    uniforms.uSize.value = 30 * Math.min(1.25, Math.max(0.75, scale * 1.15));
    if (!running) render();
  };

  /* ── Pointer: tilts the stage and parts the particles ── */

  const ndc = new THREE.Vector2(0, 0);
  const tilt = new THREE.Vector2(0, 0);
  const raycaster = new THREE.Raycaster();
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const hit = new THREE.Vector3();
  let pointerActive = false;
  const strength = { value: 0 };

  const onPointerMove = (e: PointerEvent) => {
    ndc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
    if (!pointerActive) {
      pointerActive = true;
      gsap.to(strength, { value: 1, duration: 0.6, overwrite: true });
    }
  };
  const onPointerUp = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') onPointerLeave();
  };
  const onPointerLeave = () => {
    pointerActive = false;
    gsap.to(strength, { value: 0, duration: 0.8, overwrite: true });
  };

  /* ── Render loop ── */

  let running = false;
  let raf = 0;
  const timer = new THREE.Timer();

  const render = () => {
    renderer.render(scene, camera);
  };

  const tick = (now: number) => {
    raf = requestAnimationFrame(tick);
    timer.update(now);
    const dt = Math.min(timer.getDelta(), 0.05);
    const t = (uniforms.uTime.value += dt);

    tilt.lerp(ndc, 0.05);
    spin.rotation.y = Math.sin(t * 0.22) * 0.38 + tilt.x * 0.35;
    spin.rotation.x = -tilt.y * 0.16;
    table.rotation.y += dt * 0.08;
    dust.rotation.y += dt * 0.01;
    uniforms.uScanY.value = ((t * 0.9) % 7) - 3.5;

    stage.updateMatrixWorld();
    raycaster.setFromCamera(ndc, camera);
    if (raycaster.ray.intersectPlane(plane, hit)) uniforms.uPointer.value.copy(points.worldToLocal(hit));
    uniforms.uPointerStrength.value = strength.value;

    const w = t * 0.35;
    for (let i = 0; i < tArr.length; i += 3) {
      const x = tArr[i];
      const z = tArr[i + 2];
      tArr[i + 1] = Math.sin(x * 0.3 + w) * Math.cos(z * 0.28 - w * 0.65) * 0.9 + Math.sin(x * 0.15 + z * 0.2 - w * 0.42) * 0.5;
    }
    terrainGeo.attributes.position.needsUpdate = true;

    render();
  };

  const start = () => {
    if (running || reducedMotion || document.hidden) return;
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
  const onRestored = () => start();

  /* ── Morphing ── */

  let current = 0;
  let morph: gsap.core.Tween | null = null;
  let pending: number | null = null;

  const show = (index: number) => {
    if (morph) {
      pending = index;
      return;
    }
    if (index === current) return;
    uniforms.uFrom.value = current;
    uniforms.uTo.value = index;
    current = index;

    if (reducedMotion) {
      uniforms.uFrom.value = index;
      uniforms.uProgress.value = 0;
      render();
      return;
    }

    uniforms.uProgress.value = 0;
    morph = gsap.to(uniforms.uProgress, {
      value: 1,
      duration: 2.6,
      ease: 'power1.inOut',
      onComplete: () => {
        uniforms.uFrom.value = index;
        uniforms.uProgress.value = 0;
        morph = null;
        if (pending !== null) {
          const next = pending;
          pending = null;
          show(next);
        }
      },
    });
  };

  const intro = () => {
    if (reducedMotion) return;
    uniforms.uIntro.value = 0;
    gsap.to(uniforms.uIntro, { value: 1, duration: 3.2, ease: 'expo.out', delay: 0.15 });
  };

  window.addEventListener('resize', resize);
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('pointerup', onPointerUp);
  document.documentElement.addEventListener('pointerleave', onPointerLeave);
  window.addEventListener('blur', onPointerLeave);
  document.addEventListener('visibilitychange', onVisibility);
  canvas.addEventListener('webglcontextlost', onLost);
  canvas.addEventListener('webglcontextrestored', onRestored);

  resize();
  render();
  start();

  return {
    show,
    intro,
    layout: resize,
    dispose() {
      stop();
      gsap.killTweensOf([uniforms.uProgress, uniforms.uIntro, strength]);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      document.documentElement.removeEventListener('pointerleave', onPointerLeave);
      window.removeEventListener('blur', onPointerLeave);
      document.removeEventListener('visibilitychange', onVisibility);
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.Points || obj instanceof THREE.Line) {
          obj.geometry.dispose();
          (Array.isArray(obj.material) ? obj.material : [obj.material]).forEach((m) => m.dispose());
        }
      });
      renderer.dispose();
    },
  };
}
