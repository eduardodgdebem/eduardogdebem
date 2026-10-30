// Caesar turning: a 3D scan of a statue of him rendered all the way round in
// headless Chrome (three.js), each view dithered in one ink like the other
// pictures, and laid out as one sheet of frames that the hero steps through as
// the page scrolls (src/scripts/site.ts). Run with `npm run turn`.
//
// The scan: "Statua di Giulio Cesare" by massimo.riccioni, Sketchfab, CC BY
// (https://sketchfab.com/3d-models/statua-di-giulio-cesare-7fc6bfd0ea0643f6bd66baeaa8e3c2e3),
// a photo scan of the bronze on Via dei Fori Imperiali, Rome (a copy of the
// marble in the Palazzo Senatorio). Its source download is a .rar holding an
// OBJ; extracted into art-src/caesar-rome/source/x/ (kept out of the repo).
import sharp from "sharp";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { spawn } from "node:child_process";

const DIR = "art-src/caesar-rome/source/x";
const MODEL = "untitled.obj";
const MATERIALS = "untitled.mtl";
const OUT = "public/art/caesar-turn.png";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

/** Frames all the way round, the sheet's columns, a frame's size in px, and the dither's pixel. */
const FRAMES = 48;
const COLS = 8;
const W = 680;
const H = 840;
const DOT = 2;
/**
 * The axis he turns on (x, z, in the model's units: the figure's middle, not
 * the pedestal's), the heights the frame shows (from over his head to below
 * the knees: a close view, no pedestal), and where the scan faces us, in turns.
 */
const AXIS = [-0.02, -0.03];
const SHOW = [0.28, 1.09];
/** Where the scan of his head stops: it has only sky above. */
const CROWN = 1.025;
/** The top of his head, rebuilt: a half ellipsoid at the centre and radii of the head just below the cut (x, y, z). */
const DOME = { at: [-0.005, 0.998, 0.033], r: [0.053, 0.046, 0.06] };
const FRONT = -30 / 360; // turned a little toward the headline
/** The longest side a triangle of the scan may have, in the model's units. */
const MAX_EDGE = 0.03;
/** Bronze is dark: a triangle whose texture is brighter than this (0 to 1) is sky the scan caught, and goes. */
const MAX_BRIGHT = 0.5;
/** The tone before dithering. */
const GAMMA = 1.8;
const GAIN = 1.1;

const BAYER = [
  [0, 32, 8, 40, 2, 34, 10, 42],
  [48, 16, 56, 24, 50, 18, 58, 26],
  [12, 44, 4, 36, 14, 46, 6, 38],
  [60, 28, 52, 20, 62, 30, 54, 22],
  [3, 35, 11, 43, 1, 33, 9, 41],
  [51, 19, 59, 27, 49, 17, 57, 25],
  [15, 47, 7, 39, 13, 45, 5, 37],
  [63, 31, 55, 23, 61, 29, 53, 21],
];

const ROWS = Math.ceil(FRAMES / COLS);

// The page that renders it: the statue in a cold museum light (a key from the
// upper left, a weaker fill, a rim from behind), turned a step for each frame,
// drawn into one greyscale sheet and posted back.
const PAGE = `<!doctype html>
<script type="importmap">{ "imports": { "three": "/three/build/three.module.js", "three/addons/": "/three/examples/jsm/" } }</script>
<script type="module">
import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';
const [W, H, FRAMES, COLS, ROWS, FRONT] = [${W}, ${H}, ${FRAMES}, ${COLS}, ${ROWS}, ${FRONT}];
const [AX, AZ, LO, HI] = [${AXIS[0]}, ${AXIS[1]}, ${SHOW[0]}, ${SHOW[1]}];
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setSize(W, H);
renderer.setClearColor(0x000000, 0);
renderer.toneMapping = THREE.NoToneMapping;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(18, W / H, 0.1, 100);
scene.add(new THREE.AmbientLight(0xffffff, 0.05));
const key = new THREE.DirectionalLight(0xffffff, 5);
key.position.set(-2.5, 3, 3);
const fill = new THREE.DirectionalLight(0xffffff, 0.5);
fill.position.set(3, 0.5, 2);
const rim = new THREE.DirectionalLight(0xffffff, 1.6);
rim.position.set(1.5, 2, -3);
scene.add(key, fill, rim);
// Its textures, loaded before anything is drawn.
const info = (await new MTLLoader().setPath('/model/').loadAsync('${MATERIALS}')).materialsInfo;
const lit = {};
const tiles = [];
const bright = (u, v) => {
  const t = tiles[Math.min(tiles.length - 1, Math.floor(u))];
  const x = Math.floor((u % 1) * 255), y = Math.floor((1 - v) * 255);
  const i = (y * 256 + x) * 4;
  return (t[i] + t[i + 1] + t[i + 2]) / 765;
};
for (const [name, m] of Object.entries(info)) {
  const map = await new THREE.TextureLoader().loadAsync('/model/' + m.map_kd);
  const cv = Object.assign(document.createElement('canvas'), { width: 256, height: 256 });
  const c2 = cv.getContext('2d');
  c2.drawImage(map.image, 0, 0, 256, 256);
  tiles[m.map_kd.match(/(\\d{4})\\./)[1] - 1001] = c2.getImageData(0, 0, 256, 256).data;
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping; // the UVs run 0 to 3, one unit for each of the scan's textures
  lit[name] = new THREE.MeshStandardMaterial({ map, metalness: 0, roughness: 0.8, side: THREE.DoubleSide });
}
const statue = await new OBJLoader().setPath('/model/').loadAsync('${MODEL}');
statue.traverse((o) => {
  if (!o.isMesh) return;
  o.material = Array.isArray(o.material) ? o.material.map((m) => lit[m.name]) : lit[o.material.name];
  // A photo scan leaves long slivers stretched between far points, and bits of the sky: drop them.
  const g = o.geometry;
  const pos = g.attributes.position;
  const keep = [];
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (let i = 0; i < pos.count; i += 3) {
    a.fromBufferAttribute(pos, i); b.fromBufferAttribute(pos, i + 1); c.fromBufferAttribute(pos, i + 2);
    if (Math.max(a.distanceTo(b), b.distanceTo(c), c.distanceTo(a)) >= ${MAX_EDGE}) continue;
    if (Math.max(a.y, b.y, c.y) > ${CROWN}) continue;
    const uv = g.attributes.uv;
    if (bright((uv.getX(i) + uv.getX(i + 1) + uv.getX(i + 2)) / 3, (uv.getY(i) + uv.getY(i + 1) + uv.getY(i + 2)) / 3) > ${MAX_BRIGHT}) continue;
    keep.push(i);
  }
  const groups = g.groups.length ? g.groups : [{ start: 0, count: pos.count, materialIndex: 0 }];
  const out = new THREE.BufferGeometry();
  for (const key of Object.keys(g.attributes)) {
    const src = g.attributes[key];
    const dst = new Float32Array(keep.length * 3 * src.itemSize);
    let k = 0;
    for (const i of keep) for (let j = 0; j < 3; j++) for (let d = 0; d < src.itemSize; d++) dst[k++] = src.array[(i + j) * src.itemSize + d];
    out.setAttribute(key, new THREE.BufferAttribute(dst, src.itemSize));
  }
  // Keep each material's run of triangles.
  let at = 0;
  for (const gr of groups) {
    const n = keep.filter((i) => i >= gr.start && i < gr.start + gr.count).length * 3;
    out.addGroup(at, n, gr.materialIndex);
    at += n;
  }
  out.computeVertexNormals();
  o.geometry = out;
});
// The top of his head, which the scan lost: a dome, a little rough like cast hair, in the colour of the head below the cut.
let tone = 0, n = 0;
statue.traverse((o) => {
  if (!o.isMesh) return;
  const p = o.geometry.attributes.position, uv = o.geometry.attributes.uv;
  for (let i = 0; i < p.count; i += 3) if (p.getY(i) > ${CROWN} - 0.06 && Math.hypot(p.getX(i) - ${DOME.at[0]}, p.getZ(i) - ${DOME.at[2]}) < 0.07) (tone += bright(uv.getX(i), uv.getY(i))), n++;
});
const dome = new THREE.SphereGeometry(1, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2);
const dp = dome.attributes.position;
for (let i = 0; i < dp.count; i++) {
  const k = 1 + (Math.sin(dp.getX(i) * 90) * Math.sin(dp.getZ(i) * 80) + Math.sin(dp.getY(i) * 70 + dp.getX(i) * 40)) * 0.012;
  dp.setXYZ(i, dp.getX(i) * ${DOME.r[0]} * k, dp.getY(i) * ${DOME.r[1]} * k, dp.getZ(i) * ${DOME.r[2]} * k);
}
dome.computeVertexNormals();
const grey = Math.round((tone / n) * 255);
const cap = new THREE.Mesh(dome, new THREE.MeshStandardMaterial({ color: new THREE.Color(\`rgb(\${grey},\${grey},\${grey})\`), metalness: 0, roughness: 0.8 }));
cap.position.set(${DOME.at[0]}, ${DOME.at[1]}, ${DOME.at[2]});
statue.add(cap);

// Turned on the figure's own axis; the camera level with the middle of what it shows, far enough to fit it.
statue.position.set(-AX, -(LO + HI) / 2, -AZ);
const turn = new THREE.Group();
turn.add(statue);
scene.add(turn);
const dist = (HI - LO) / 2 / Math.tan((camera.fov * Math.PI) / 360);
camera.position.set(0, 0, dist);
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

const TYPES = {
  js: "text/javascript",
  obj: "text/plain",
  mtl: "text/plain",
  jpg: "image/jpeg",
  html: "text/html",
};
let done;
const sheetPng = new Promise((r) => (done = r));
const server = createServer((req, res) => {
  if (req.method === "POST") {
    const parts = [];
    req.on("data", (c) => parts.push(c));
    req.on("end", () => (res.end(), done(Buffer.concat(parts))));
    return;
  }
  const url = decodeURIComponent(req.url);
  const path =
    url === "/"
      ? null
      : url.startsWith("/model/")
        ? `${DIR}/${url.slice(7)}`
        : url.startsWith("/three/")
          ? `node_modules${url}`
          : undefined;
  if (path === undefined) return res.writeHead(404).end();
  res.writeHead(200, {
    "content-type": TYPES[(path ?? "x.html").split(".").pop()],
  });
  // A stray line element ('l') would make three's OBJLoader draw the whole object as lines.
  res.end(
    !path
      ? PAGE
      : path.endsWith(".obj")
        ? readFileSync(path, "utf8").replace(/^l .*$/gm, "")
        : readFileSync(path),
  );
}).listen(0);
const port = server.address().port;
const chrome = spawn(
  CHROME,
  [
    "--headless",
    "--use-angle=metal",
    "--enable-gpu",
    "--remote-debugging-port=0",
    `--user-data-dir=${process.env.TMPDIR}turn-chrome`,
    `http://localhost:${port}/`,
  ],
  { stdio: "ignore" },
);
const png = await Promise.race([
  sheetPng,
  new Promise((_, no) =>
    setTimeout(() => no(new Error("the render timed out")), 120000).unref(),
  ),
]).finally(() => {
  chrome.kill();
  server.close();
});

// The render as it came, to look at.
await sharp(png).toFile("art-src/caesar-turn-raw.png");

// One tone for every frame (so he doesn't flicker as he turns), then the dither.
const SW = (W * COLS) / DOT;
const SH = (H * ROWS) / DOT;
const { data } = await sharp(png)
  .resize(SW, SH)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const lum = new Float32Array(SW * SH);
const seen = [];
for (let i = 0; i < SW * SH; i++) {
  const a = data[i * 4 + 3] / 255;
  const v =
    (0.3 * data[i * 4] + 0.59 * data[i * 4 + 1] + 0.11 * data[i * 4 + 2]) / 255;
  lum[i] = a > 0.5 ? v : -1;
  if (a > 0.5 && i % 7 === 0) seen.push(v);
}
// Stretched between its 1st and 99th percentiles, so a few bright specks don't flatten the rest.
seen.sort((p, q) => p - q);
const lo = seen[Math.floor(seen.length * 0.01)];
const hi = seen[Math.floor(seen.length * 0.99)];
const out = Buffer.alloc(W * COLS * H * ROWS * 4);
for (let y = 0; y < H * ROWS; y++) {
  for (let x = 0; x < W * COLS; x++) {
    const cx = Math.floor(x / DOT);
    const cy = Math.floor(y / DOT);
    const l = lum[cy * SW + cx];
    const v =
      l < 0
        ? 0
        : Math.pow(Math.min(1, Math.max(0, (l - lo) / (hi - lo))), GAMMA) *
          GAIN;
    const i = (y * W * COLS + x) * 4;
    out[i] = out[i + 1] = out[i + 2] = 255;
    out[i + 3] = v > (BAYER[cy % 8][cx % 8] + 0.5) / 64 ? 255 : 0;
  }
}
await sharp(out, { raw: { width: W * COLS, height: H * ROWS, channels: 4 } })
  .png({ palette: true, colours: 2, compressionLevel: 9 })
  .toFile(OUT);
console.log("caesar-turn", `${FRAMES} frames of ${W}×${H}, ${COLS}×${ROWS}`);
