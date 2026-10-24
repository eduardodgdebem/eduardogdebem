import * as THREE from 'three';
import { banderole, engraveFragment, engraveVertex, letteringTexture } from './engraving';
import { createPasses } from './passes';

// The banderole at the head of every plate. It's drawn on a canvas of its own,
// laid over the plate and a little wider and higher than it, so the ribbon
// spills past the plate mark onto the page; only the ribbon (and its shadow)
// is inked, the rest of that canvas is clear. It waves in a slow wind.

export interface Banner {
  uniforms: { uReveal: { value: number } };
  dispose(): void;
}

// The ribbon, in the banderole's own units: a fuller band than the plates' old one.
const WIDTH = 7.6;
const HEIGHT = 0.84;
/** Engraved line spacing on the ribbon, in CSS px. */
const SPACING = 3.4;

export function createBanner(plate: HTMLCanvasElement, name: string, light: { value: THREE.Vector3 }): Banner {
  const frame = plate.parentElement!;
  const canvas = document.createElement('canvas');
  canvas.className = 'plate-banner';
  canvas.setAttribute('aria-hidden', 'true');
  frame.append(canvas);

  const uniforms = { uReveal: { value: 1 } };
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, premultipliedAlpha: true });
  } catch {
    canvas.remove();
    return { uniforms, dispose() {} };
  }
  const pixel = Math.min(window.devicePixelRatio, 2);
  renderer.setPixelRatio(pixel);

  // Pixel units: one unit is a CSS px, so the ribbon is placed and hatched in px.
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 4000);
  camera.layers.enable(1);
  const scene = new THREE.Scene();
  const passes = createPasses(renderer, camera, pixel, { cutout: true });

  const texture = letteringTexture(name, Math.round((2400 * HEIGHT) / WIDTH));
  const ribbonUniforms = {
    uLight: light,
    uFreq: { value: 22 },
    // Inked in full from the first frame: it's the unrolling that brings the name into view.
    uReveal: { value: 1 },
    uObjectInverse: { value: new THREE.Matrix4() },
    uText: { value: texture },
    uHasText: { value: 1 },
    uGlow: { value: 0 },
    uPale: { value: 0 },
    uBlue: { value: 0 },
  };
  const material = new THREE.ShaderMaterial({ uniforms: ribbonUniforms, vertexShader: engraveVertex, fragmentShader: engraveFragment, side: THREE.DoubleSide });
  const geometry = banderole(WIDTH, HEIGHT);
  geometry.computeBoundingBox();
  geometry.translate(...geometry.boundingBox!.getCenter(new THREE.Vector3()).negate().toArray());
  geometry.computeBoundingBox();
  const size = geometry.boundingBox!.getSize(new THREE.Vector3());
  const ribbon = new THREE.Mesh(geometry, material);
  ribbon.frustumCulled = false;
  // Tipped back a little, so its twist reads in depth.
  ribbon.rotation.x = -0.25;
  scene.add(ribbon);

  // The wind: a wave running along the ribbon, still at the middle (where the
  // name is) and freest at the tails, which flutter. And the unrolling: while
  // `open` < 1, the ribbon beyond ±open (of its half-length) is wound into a
  // roll at either end, rolled toward the viewer, and the two rolls run out to
  // the tails as it opens.
  const position = geometry.attributes.position as THREE.BufferAttribute;
  const rest = Float32Array.from(position.array as Float32Array);
  const uv = geometry.attributes.uv as THREE.BufferAttribute;
  const ROLL = 0.12;
  // The banderole's bow (see banderole()), to carry a rolled point to where its roll sits.
  const bowY = (s: number, u: number) => 0.16 * Math.sin(u * Math.PI * 3) + 0.25 * s * s;
  const bowZ = (s: number) => -1.4 * s * s;
  // How far along the ribbon a point is, with the swallowtails' V cut back as
  // banderole() cuts it, so a roll winds the tails up in their own shape.
  const cut = (u: number, v: number) => {
    const e = Math.min(u, 1 - u);
    if (e >= 0.05) return u;
    const e2 = e + ((0.05 - e) / 0.05) * 0.035 * (1 - 2 * Math.abs(v));
    return u < 0.5 ? e2 : 1 - e2;
  };
  const shape = (t: number, open: number) => {
    const p = position.array as Float32Array;
    for (let i = 0; i < position.count; i++) {
      const v = uv.getY(i) - 0.5;
      const u = cut(uv.getX(i), v);
      const signed = u * 2 - 1;
      const s = Math.abs(signed);
      let x = rest[i * 3];
      let y = rest[i * 3 + 1];
      let z = rest[i * 3 + 2];
      if (s > open) {
        const side = Math.sign(signed);
        const theta = ((s - open) * WIDTH) / 2 / ROLL;
        // Each turn a little tighter, so the turns don't overprint.
        const r = ROLL * Math.max(0.35, 1 - 0.07 * (theta / (Math.PI * 2)));
        const ue = (side * open + 1) / 2;
        x += side * (((open - s) * WIDTH) / 2 + r * Math.sin(theta));
        y += bowY(open, ue) - bowY(s, u);
        z += bowZ(open) - bowZ(s) + r * (1 - Math.cos(theta));
      } else if (t >= 0) {
        const free = (0.12 + 0.88 * s ** 1.6) * THREE.MathUtils.smoothstep(open - s, 0, 0.25);
        const phase = u * Math.PI * 3.2 - t * 1.9;
        y += free * 0.07 * Math.sin(phase * 0.8 + 0.6);
        z += free * (0.22 * Math.sin(phase) + v * 0.5 * s ** 2 * Math.sin(phase * 1.7 - 1.1));
      }
      p[i * 3] = x;
      p[i * 3 + 1] = y;
      p[i * 3 + 2] = z;
    }
    position.needsUpdate = true;
    geometry.computeVertexNormals();
  };
  // It unrolls as the scene tweens uReveal from 0 to 1, done a little before the tween is.
  const opening = () => 1 - (1 - Math.min(1, uniforms.uReveal.value * 1.5)) ** 3;

  // The ribbon runs past the plate mark on both sides and over its head, by
  // as much as the page's margin allows.
  const resize = () => {
    const fw = frame.clientWidth;
    const fh = frame.clientHeight;
    if (!fw || !fh) return;
    // Measured from inside the frame's ornamented border, which the ribbon also covers.
    const room = roomAround(frame);
    const band = frame.clientLeft;
    const side = Math.max(0, Math.round(band + Math.min(fw * 0.075, room.left, room.right) - 2));
    const w = fw + side * 2;
    // Across the plate, but no longer than the plate is high (a spread plate is wide).
    const k = Math.min(Math.min(w * 0.98, fh * 1.15) / size.x, (fh * 0.3) / size.y);
    const ribbonH = size.y * k;
    const over = Math.max(0, Math.round(band + Math.min(ribbonH * 0.3, 22, room.top - 2)));
    const h = Math.ceil(ribbonH * 1.18 + 8);
    Object.assign(canvas.style, { left: `${-side}px`, top: `${-over}px`, width: `${w}px`, height: `${h}px` });
    passes.setSize(w, h);
    Object.assign(camera, { left: -w / 2, right: w / 2, top: h / 2, bottom: -h / 2 });
    camera.updateProjectionMatrix();
    ribbon.scale.setScalar(k);
    ribbon.position.set(0, h / 2 - ribbonH * 0.59 - 2, -size.z * k * 3);
    camera.far = size.z * k * 6;
    camera.updateProjectionMatrix();
    ribbonUniforms.uFreq.value = k / SPACING;
    draw();
  };

  const draw = () => {
    ribbon.updateMatrixWorld(true);
    ribbonUniforms.uObjectInverse.value.copy(ribbon.matrixWorld).invert();
    passes.render(scene);
  };

  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let raf = 0;
  let onScreen = true;
  const t0 = performance.now();
  const tick = () => {
    raf = 0;
    if (!onScreen || document.hidden) return;
    shape((performance.now() - t0) / 1000, opening());
    draw();
    raf = requestAnimationFrame(tick);
  };
  const start = () => {
    if (!raf && !still) raf = requestAnimationFrame(tick);
  };
  // Without the wind, the ribbon is still drawn while it's cut in.
  let lastReveal = -1;
  const watch = still
    ? window.setInterval(() => {
        if (uniforms.uReveal.value !== lastReveal) {
          lastReveal = uniforms.uReveal.value;
          shape(-1, opening());
          draw();
        }
      }, 50)
    : 0;

  const sizes = new ResizeObserver(resize);
  sizes.observe(frame);
  const seen = new IntersectionObserver(([e]) => {
    onScreen = e.isIntersecting;
    start();
  });
  seen.observe(canvas);
  document.addEventListener('visibilitychange', start);
  if (still) shape(-1, opening());
  resize();
  start();

  return {
    uniforms,
    dispose() {
      cancelAnimationFrame(raf);
      clearInterval(watch);
      sizes.disconnect();
      seen.disconnect();
      document.removeEventListener('visibilitychange', start);
      passes.dispose();
      geometry.dispose();
      material.dispose();
      texture.dispose();
      renderer.dispose();
      canvas.remove();
    },
  };
}

/** How far past the frame there is to draw before the nearest ancestor that clips. */
function roomAround(el: HTMLElement) {
  const r = el.getBoundingClientRect();
  for (let a = el.parentElement; a; a = a.parentElement) {
    const o = getComputedStyle(a);
    if (o.overflowX === 'visible' && o.overflowY === 'visible') continue;
    const c = a.getBoundingClientRect();
    return { left: r.left - c.left, right: c.right - r.right, top: r.top - c.top + a.scrollTop };
  }
  return { left: r.left, right: innerWidth - r.right, top: r.top + scrollY };
}
