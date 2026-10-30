// Caesar turning: a 3D scan of a statue of him rendered all the way round in
// headless Chrome (three.js), each view dithered in one ink like the other
// pictures, and laid out as one sheet of frames that the hero steps through as
// the page scrolls (src/scripts/site.ts). Run with `npm run turn`.
//
// The scan: "Caio Giulio Cesare" by alessio.langella, Sketchfab, CC BY
// (https://sketchfab.com/3d-models/caio-giulio-cesare-c0768bea587e421e86a4f86de23abb3e),
// unzipped into art-src/caesar-3d/ (kept out of the repo).
import sharp from 'sharp';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';

const MODEL = 'art-src/caesar-3d/source/model.glb';
const OUT = 'public/art/caesar-turn.png';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

/** Frames all the way round, the sheet's columns, a frame's size in px, and the dither's pixel. */
const FRAMES = 48;
const COLS = 8;
const W = 480;
const H = 960;
const DOT = 2;
/** Where the scan faces us, in turns, and the tone before dithering. */
const FRONT = 0;
const GAMMA = 1.5;
const GAIN = 1.1;

const BAYER = [
  [0, 32, 8, 40, 2, 34, 10, 42], [48, 16, 56, 24, 50, 18, 58, 26], [12, 44, 4, 36, 14, 46, 6, 38], [60, 28, 52, 20, 62, 30, 54, 22],
  [3, 35, 11, 43, 1, 33, 9, 41], [51, 19, 59, 27, 49, 17, 57, 25], [15, 47, 7, 39, 13, 45, 5, 37], [63, 31, 55, 23, 61, 29, 53, 21],
];

const ROWS = Math.ceil(FRAMES / COLS);

// The page that renders it: the statue in a cold museum light (a key from the
// upper left, a weaker fill, a rim from behind), turned a step for each frame,
// drawn into one greyscale sheet and posted back.
const PAGE = `<!doctype html>
<script type="importmap">{ "imports": { "three": "/three/build/three.module.js", "three/addons/": "/three/examples/jsm/" } }</script>
<script type="module">
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
const [W, H, FRAMES, COLS, ROWS, FRONT] = [${W}, ${H}, ${FRAMES}, ${COLS}, ${ROWS}, ${FRONT}];
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setSize(W, H);
renderer.setClearColor(0x000000, 0);
renderer.toneMapping = THREE.NoToneMapping;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(18, W / H, 0.1, 100);
scene.add(new THREE.AmbientLight(0xffffff, 0.15));
const key = new THREE.DirectionalLight(0xffffff, 3.2);
key.position.set(-2.5, 3, 3);
const fill = new THREE.DirectionalLight(0xffffff, 0.5);
fill.position.set(3, 0.5, 2);
const rim = new THREE.DirectionalLight(0xffffff, 1.6);
rim.position.set(1.5, 2, -3);
scene.add(key, fill, rim);
const { scene: statue } = await new GLTFLoader().loadAsync('/model.glb');
statue.traverse((o) => {
  if (!o.isMesh) return;
  const m = o.material;
  o.material = new THREE.MeshStandardMaterial({ map: m.map, normalMap: m.normalMap, metalness: 0, roughness: 0.75, side: THREE.DoubleSide });
});
const box = new THREE.Box3().setFromObject(statue);
const centre = box.getCenter(new THREE.Vector3());
const size = box.getSize(new THREE.Vector3());
statue.position.sub(centre);
const turn = new THREE.Group();
turn.add(statue);
scene.add(turn);
// Far enough that the whole figure fits however it's turned, with a little room.
const dist = (size.y * 1.06) / 2 / Math.tan((camera.fov * Math.PI) / 360);
camera.position.set(0, size.y * 0.04, dist);
camera.lookAt(0, 0, 0);
const sheet = document.createElement('canvas');
sheet.width = W * COLS;
sheet.height = H * ROWS;
const ctx = sheet.getContext('2d');
for (let i = 0; i < FRAMES; i++) {
  turn.rotation.y = (FRONT + i / FRAMES) * Math.PI * 2;
  renderer.render(scene, camera);
  ctx.drawImage(renderer.domElement, (i % COLS) * W, Math.floor(i / COLS) * H);
}
const blob = await new Promise((r) => sheet.toBlob(r, 'image/png'));
await fetch('/done', { method: 'POST', body: blob });
</script>`;

const TYPES = { js: 'text/javascript', glb: 'model/gltf-binary', html: 'text/html' };
let done;
const sheetPng = new Promise((r) => (done = r));
const server = createServer((req, res) => {
  if (req.method === 'POST') {
    const parts = [];
    req.on('data', (c) => parts.push(c));
    req.on('end', () => (res.end(), done(Buffer.concat(parts))));
    return;
  }
  const path = req.url === '/' ? null : req.url === '/model.glb' ? MODEL : req.url.startsWith('/three/') ? `node_modules${req.url}` : undefined;
  if (path === undefined) return res.writeHead(404).end();
  res.writeHead(200, { 'content-type': TYPES[(path ?? 'x.html').split('.').pop()] });
  res.end(path ? readFileSync(path) : PAGE);
}).listen(0);
const port = server.address().port;
const chrome = spawn(CHROME, ['--headless', '--use-angle=metal', '--enable-gpu', '--remote-debugging-port=0', `--user-data-dir=${process.env.TMPDIR}turn-chrome`, `http://localhost:${port}/`], { stdio: 'ignore' });
const png = await Promise.race([sheetPng, new Promise((_, no) => setTimeout(() => no(new Error('the render timed out')), 120000).unref())]).finally(() => {
  chrome.kill();
  server.close();
});

// The render as it came, to look at.
await sharp(png).toFile('art-src/caesar-turn-raw.png');

// One tone for every frame (so he doesn't flicker as he turns), then the dither.
const SW = (W * COLS) / DOT;
const SH = (H * ROWS) / DOT;
const { data } = await sharp(png).resize(SW, SH).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const lum = new Float32Array(SW * SH);
let lo = 1;
let hi = 0;
for (let i = 0; i < SW * SH; i++) {
  const a = data[i * 4 + 3] / 255;
  const v = ((0.3 * data[i * 4] + 0.59 * data[i * 4 + 1] + 0.11 * data[i * 4 + 2]) / 255) * a;
  lum[i] = a > 0.5 ? v : -1;
  if (a > 0.5) (lo = Math.min(lo, v)), (hi = Math.max(hi, v));
}
const out = Buffer.alloc(W * COLS * H * ROWS * 4);
for (let y = 0; y < H * ROWS; y++) {
  for (let x = 0; x < W * COLS; x++) {
    const cx = Math.floor(x / DOT);
    const cy = Math.floor(y / DOT);
    const l = lum[cy * SW + cx];
    const v = l < 0 ? 0 : Math.pow((l - lo) / (hi - lo), GAMMA) * GAIN;
    const i = (y * W * COLS + x) * 4;
    out[i] = out[i + 1] = out[i + 2] = 255;
    out[i + 3] = v > (BAYER[cy % 8][cx % 8] + 0.5) / 64 ? 255 : 0;
  }
}
await sharp(out, { raw: { width: W * COLS, height: H * ROWS, channels: 4 } }).png({ palette: true, colours: 2, compressionLevel: 9 }).toFile(OUT);
console.log('caesar-turn', `${FRAMES} frames of ${W}×${H}, ${COLS}×${ROWS}`);
