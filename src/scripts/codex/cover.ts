import * as THREE from 'three';
import { gsap } from 'gsap';
import { INK, PAPER } from './engraving';

// Re-draws an album cover as a line engraving: tone becomes the weight of
// diagonal lines that bend slightly with the image, crossing lines come in
// for the shadows, and edges are inked. Renders only when something changes.

const fragment = /* glsl */ `
  uniform sampler2D tImage;
  uniform vec2 uResolution;
  uniform float uPixel;
  uniform float uReveal;
  uniform vec3 uPaper;
  uniform vec3 uInk;
  varying vec2 vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float luma(vec2 uv) { return dot(texture2D(tImage, uv).rgb, vec3(0.299, 0.587, 0.114)); }

  float lines(float coord, float halfWidth) {
    float f = abs(fract(coord) - 0.5);
    float w = fwidth(coord);
    return (1.0 - smoothstep(halfWidth - w, halfWidth + w, f)) * step(0.01, halfWidth);
  }

  void main() {
    vec2 px = vUv * uResolution;
    float L = luma(vUv);
    // Lift contrast so covers read as an engraving, not a grey wash.
    // Album art is mostly dark: lift the midtones before hatching.
    L = pow(clamp((L - 0.04) * 1.3, 0.0, 1.0), 0.55);
    float dark = 1.0 - L;

    float spacing = 4.2 * uPixel;
    float c1 = (px.x + px.y) * 0.7071 / spacing + L * 1.4;
    float c2 = (px.x - px.y) * 0.7071 / spacing;
    float c3 = px.y / (spacing * 0.9);

    // Mid-darks stay single-direction; crossing lines only for the deepest shadow.
    float ink = lines(c1, dark * 0.46);
    ink = max(ink, lines(c2, (dark - 0.66) * 0.6));
    ink = max(ink, lines(c3, (dark - 0.88) * 0.8));

    // Inked contours.
    vec2 t = 1.0 / uResolution * 1.5 * uPixel;
    float gx = luma(vUv + vec2(t.x, 0.0)) - luma(vUv - vec2(t.x, 0.0));
    float gy = luma(vUv + vec2(0.0, t.y)) - luma(vUv - vec2(0.0, t.y));
    ink = max(ink, smoothstep(0.18, 0.4, length(vec2(gx, gy))));

    // Drawn in on a diagonal sweep.
    ink *= step(vUv.x * 0.5 + (1.0 - vUv.y) * 0.5 + hash(floor(px / 3.0)) * 0.08, uReveal * 1.1);

    float grain = hash(floor(px));
    vec3 paper = uPaper * (0.96 + 0.05 * grain);
    gl_FragColor = vec4(mix(paper, uInk, ink * (0.88 + 0.12 * grain)), 1.0);
  }
`;

const raw = (hex: number) => new THREE.Color().setHex(hex, THREE.LinearSRGBColorSpace);

export function createCoverEngraving(canvas: HTMLCanvasElement, { reducedMotion }: { reducedMotion: boolean }) {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
  } catch {
    return null;
  }
  const pixel = Math.min(window.devicePixelRatio, 2);
  renderer.setPixelRatio(pixel);

  const uniforms = {
    tImage: { value: null as THREE.Texture | null },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uPixel: { value: pixel },
    uReveal: { value: 0 },
    uPaper: { value: raw(PAPER) },
    uInk: { value: raw(INK) },
  };
  const scene = new THREE.Scene();
  const quad = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.ShaderMaterial({
      uniforms,
      vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
      fragmentShader: fragment,
    }),
  );
  scene.add(quad);
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const render = () => renderer.render(scene, camera);

  const resize = () => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    uniforms.uResolution.value.set(w * pixel, h * pixel);
    render();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  const loader = new THREE.TextureLoader().setCrossOrigin('anonymous');
  let currentUrl = '';

  return {
    /** Engrave a new cover; resolves false if the image can't be loaded. */
    set(url: string) {
      if (url === currentUrl) return Promise.resolve(true);
      return new Promise<boolean>((resolve) => {
        loader.load(
          url,
          (tex) => {
            tex.colorSpace = THREE.SRGBColorSpace;
            uniforms.tImage.value?.dispose();
            uniforms.tImage.value = tex;
            currentUrl = url;
            resize();
            if (reducedMotion) {
              uniforms.uReveal.value = 1;
              render();
            } else {
              uniforms.uReveal.value = 0;
              gsap.to(uniforms.uReveal, { value: 1, duration: 1.8, ease: 'power1.inOut', onUpdate: render });
            }
            resolve(true);
          },
          undefined,
          () => resolve(false),
        );
      });
    },
    dispose() {
      ro.disconnect();
      gsap.killTweensOf(uniforms.uReveal);
      uniforms.tImage.value?.dispose();
      quad.geometry.dispose();
      (quad.material as THREE.Material).dispose();
      renderer.dispose();
    },
  };
}
