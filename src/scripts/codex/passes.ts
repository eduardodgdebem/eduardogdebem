import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  BLUE,
  INK,
  PAPER,
  RUBRIC,
  compositeFragment,
  compositeVertex,
  engraveFragment,
  engraveVertex,
  raw,
} from './engraving';

// The pieces every engraved scene (the forum, the shelf) is drawn with: the
// hatching material and the three passes (ink, normals + depth, paper). The
// banderole at the head of the plate is in banner.ts.

/* ── Ink: one set of hatching uniforms, a material per thing that can glow red ── */

export interface Ink {
  shared: {
    uLight: { value: THREE.Vector3 };
    uFreq: { value: number };
    uReveal: { value: number };
    uObjectInverse: { value: THREE.Matrix4 };
  };
  /** A hatching material. `glow` (shared, so a whole building lights together) picks it out in red. */
  material(glow?: { value: number }, text?: THREE.Texture): THREE.ShaderMaterial;
  /** Everything to dispose with the scene. */
  materials: THREE.Material[];
  textures: THREE.Texture[];
}

export function createInk(freq: number): Ink {
  const shared = {
    uLight: { value: new THREE.Vector3(0.5, 0.6, 0.8) },
    uFreq: { value: freq },
    uReveal: { value: 1 },
    uObjectInverse: { value: new THREE.Matrix4() }, // hatch in world space
  };
  const materials: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];
  const material = (glow = { value: 0 }, text?: THREE.Texture) => {
    const m = new THREE.ShaderMaterial({
      // Every uniform the shader has is set here, even at its default: materials
      // share one program, and an unset uniform keeps the last material's value.
      uniforms: { ...shared, uGlow: glow, uText: { value: text ?? null }, uHasText: { value: text ? 1 : 0 }, uPale: { value: 0 }, uBlue: { value: 0 } },
      vertexShader: engraveVertex,
      fragmentShader: engraveFragment,
      side: THREE.DoubleSide,
    });
    materials.push(m);
    return m;
  };
  return { shared, material, materials, textures };
}

/** A carved inscription, capitals on transparent, sized to its panel. */
export function inscriptionTexture(text: string, w: number, h: number, colour = '#000') {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = Math.max(32, Math.round((1024 * h) / w));
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = colour;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const spaced = text.split('').join(' ');
  let size = canvas.height * 0.78;
  ctx.font = `600 ${size}px Cinzel, serif`;
  const width = ctx.measureText(spaced).width;
  if (width > canvas.width * 0.92) {
    size *= (canvas.width * 0.92) / width;
    ctx.font = `600 ${size}px Cinzel, serif`;
  }
  ctx.fillText(spaced, canvas.width / 2, canvas.height / 2 + size * 0.04);
  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 8;
  return texture;
}

/** One geometry from many, so a whole building (or cabinet) is a single draw. */
export function merge(parts: THREE.BufferGeometry[]) {
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

/** Keep an object out of the outline pass: it is drawn in the ink pass only. */
export function fine<T extends THREE.Object3D>(o: T) {
  o.traverse((c) => {
    c.layers.set(1);
    c.frustumCulled = false;
  });
  return o;
}

/* ── The three passes ── */

export interface Passes {
  /** The paper pass's uniforms (uReveal, uStarShift, uResolution…). */
  uniforms: Record<string, { value: unknown }> & {
    uReveal: { value: number };
    uStarShift: { value: THREE.Vector2 };
    uResolution: { value: THREE.Vector2 };
  };
  /** Size the canvas and targets, in CSS px. */
  setSize(w: number, h: number): void;
  render(scene: THREE.Scene): void;
  dispose(): void;
}

/** `cutout`: only what's drawn is inked on paper; the rest of the canvas is left clear. */
export function createPasses(renderer: THREE.WebGLRenderer, camera: THREE.OrthographicCamera | THREE.PerspectiveCamera, pixel: number, { cutout = false } = {}): Passes {
  const inkTarget = new THREE.WebGLRenderTarget(1, 1);
  const normalTarget = new THREE.WebGLRenderTarget(1, 1, { depthTexture: new THREE.DepthTexture(1, 1) });
  const normalMat = new THREE.MeshNormalMaterial({ side: THREE.DoubleSide });
  const uniforms = {
    tInk: { value: inkTarget.texture },
    tNormal: { value: normalTarget.texture },
    tDepth: { value: normalTarget.depthTexture },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uNear: { value: camera.near },
    uFar: { value: camera.far },
    uOrtho: { value: camera instanceof THREE.OrthographicCamera ? 1 : 0 },
    uStarShift: { value: new THREE.Vector2() },
    uPixel: { value: pixel },
    uReveal: { value: 1 },
    uPaper: { value: raw(PAPER) },
    uInk: { value: raw(INK) },
    uRed: { value: raw(RUBRIC) },
    uBlue: { value: raw(BLUE) },
  };
  const quadMat = new THREE.ShaderMaterial({
    uniforms,
    defines: cutout ? { CUTOUT: '' } : {},
    vertexShader: compositeVertex,
    fragmentShader: compositeFragment,
    depthTest: false,
    depthWrite: false,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), quadMat);
  const quadScene = new THREE.Scene().add(quad);
  const quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  return {
    uniforms,
    setSize(w, h) {
      renderer.setSize(w, h, false);
      const pw = Math.floor(w * pixel);
      const ph = Math.floor(h * pixel);
      inkTarget.setSize(pw, ph);
      normalTarget.setSize(pw, ph);
      uniforms.uResolution.value.set(pw, ph);
    },
    render(scene) {
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
    },
    dispose() {
      quad.geometry.dispose();
      quadMat.dispose();
      normalMat.dispose();
      inkTarget.dispose();
      normalTarget.dispose();
    },
  };
}

/* ── Small screens ── */

/**
 * How much of a walkable scene to show for a plate this wide (CSS px): on a
 * phone the plate is half the width, so the view closes in, and follows the
 * citizen up and down the scene as well as along it.
 */
export const plateZoom = (width: number) => (width < 560 ? 0.7 : 1);
