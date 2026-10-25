import * as THREE from 'three';
import { fine } from './passes';

// The fountain on the Via Sacra, alive: wavelets shimmer on the water, drops
// fall from the upper bowl and ring where they land, and a coin thrown in arcs
// from the citizen's hand, splashes (a crown of droplets, rings spreading to
// the rim) and settles on the bottom with the others. All of it is fine ink,
// drawn in the ink pass only, as the braziers' flames are; the coins in red.

export interface Fountain {
  /** Throw a coin from `hand` into the basin; resolves once it has splashed. */
  toss(hand: THREE.Vector3): Promise<void>;
  update(dt: number, t: number): void;
  dispose(): void;
}

// The basin of fons() in forum-models.ts: water just under the rim.
const WATER_Y = 0.3;
const POOL = 0.8; // the water's radius
const BOWL = { r: 0.33, y: 1.06 }; // the upper bowl's lip, where the drops fall from
const STREAMS = 8;
const COINS = 24; // kept on the bottom; the oldest is lost under the rest
const GRAVITY = 9;

export function createFountain(scene: THREE.Object3D, at: THREE.Vector3, reducedMotion: boolean): Fountain {
  const root = new THREE.Group();
  root.position.copy(at);
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const ink = (opacity = 1, red = false) => {
    const m = new THREE.LineBasicMaterial({ color: red ? 0xff0000 : 0x000000, transparent: true, opacity, depthWrite: false });
    materials.push(m);
    return m;
  };
  const lines = (count: number, material: THREE.Material) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 6), 3));
    geometries.push(g);
    const l = new THREE.LineSegments(g, material);
    root.add(l);
    return g.attributes.position as THREE.BufferAttribute;
  };

  /* ── The water: wavelets, a few broken lines across it ── */

  const ROWS = 7;
  const DASHES = 4;
  const waves = lines(ROWS * DASHES, ink(0.75));
  const drawWater = (t: number) => {
    let n = 0;
    for (let row = 0; row < ROWS; row++) {
      const z = -POOL + ((row + 0.5) / ROWS) * POOL * 2;
      const half = Math.sqrt(POOL * POOL - z * z) * 0.92;
      for (let k = 0; k < DASHES; k++) {
        // Dashes drift along their row and swell a little.
        const u = ((k + 0.5) / DASHES + 0.04 * Math.sin(t * 0.9 + row * 1.7 + k)) * 2 - 1;
        const len = (0.1 + 0.05 * Math.sin(t * 1.3 + row + k * 2.1)) * half;
        const x = u * half * 0.85;
        waves.setXYZ(n++, x - len / 2, WATER_Y, z);
        waves.setXYZ(n++, x + len / 2, WATER_Y, z);
      }
    }
    waves.needsUpdate = true;
  };

  /* ── Rings: where a drop lands, and the coin's splash ── */

  type Ring = { at: THREE.Vector2; age: number; life: number; reach: number; line: THREE.LineLoop; mat: THREE.LineBasicMaterial };
  const RING_PTS = 40;
  const ringGeo = () => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(RING_PTS * 3), 3));
    geometries.push(g);
    return g;
  };
  const rings: Ring[] = [];
  const ripple = (x: number, z: number, reach: number, life: number, delay = 0) => {
    const mat = ink(0);
    const line = fine(new THREE.LineLoop(ringGeo(), mat));
    root.add(line);
    rings.push({ at: new THREE.Vector2(x, z), age: -delay, life, reach, line, mat });
  };
  const drawRings = (dt: number) => {
    for (let i = rings.length - 1; i >= 0; i--) {
      const ring = rings[i];
      ring.age += dt;
      const k = ring.age / ring.life;
      if (k >= 1) {
        root.remove(ring.line);
        ring.line.geometry.dispose();
        ring.mat.dispose();
        geometries.splice(geometries.indexOf(ring.line.geometry), 1);
        materials.splice(materials.indexOf(ring.mat), 1);
        rings.splice(i, 1);
        continue;
      }
      if (k < 0) continue;
      const r = ring.reach * (1 - (1 - k) ** 2);
      ring.mat.opacity = Math.min(1, k * 8) * (1 - k * k);
      const pos = ring.line.geometry.attributes.position as THREE.BufferAttribute;
      for (let p = 0; p < RING_PTS; p++) {
        const a = (p / RING_PTS) * Math.PI * 2;
        let x = ring.at.x + Math.cos(a) * r;
        let z = ring.at.y + Math.sin(a) * r;
        // A ring meeting the rim runs along it.
        const d = Math.hypot(x, z);
        if (d > POOL) [x, z] = [(x / d) * POOL, (z / d) * POOL];
        pos.setXYZ(p, x, WATER_Y + 0.004, z);
      }
      pos.needsUpdate = true;
    }
  };

  /* ── Drops from the upper bowl ── */

  const PER = 3; // drops in the air on each stream
  const drops = lines(STREAMS * PER, ink(0.8));
  const fall = Math.sqrt((2 * (BOWL.y - WATER_Y)) / GRAVITY); // s, lip to water
  const landed = new Array(STREAMS).fill(0);
  const drawDrops = (t: number) => {
    let n = 0;
    for (let s = 0; s < STREAMS; s++) {
      const a = (s / STREAMS) * Math.PI * 2 + 0.2;
      const out = new THREE.Vector2(Math.cos(a), Math.sin(a));
      for (let d = 0; d < PER; d++) {
        // Each stream's drops are a fall apart, set off from the others.
        const phase = (t / fall + d / PER + s * 0.37) % 1;
        const time = phase * fall;
        const y = BOWL.y - 0.5 * GRAVITY * time * time;
        const r = BOWL.r + 0.12 * time / fall;
        const len = 0.05 + 0.05 * phase;
        drops.setXYZ(n++, out.x * r, y + len, out.y * r);
        drops.setXYZ(n++, out.x * r, y, out.y * r);
      }
      // A drop reaching the water rings it now and then.
      const cycle = Math.floor(t / fall + s * 0.37);
      if (cycle !== landed[s]) {
        landed[s] = cycle;
        if (!reducedMotion && Math.random() < 0.35) ripple(out.x * (BOWL.r + 0.12), out.y * (BOWL.r + 0.12), 0.12, 0.9);
      }
    }
    drops.needsUpdate = true;
  };

  /* ── The splash: a crown of droplets, each a little drop of ink ── */

  type Spray = { p: THREE.Vector3; v: THREE.Vector3 };
  const SPRAY = 22;
  const dropGeo = new THREE.SphereGeometry(0.045, 6, 4);
  geometries.push(dropGeo);
  const dropMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
  materials.push(dropMat);
  const droplets = new THREE.InstancedMesh(dropGeo, dropMat, SPRAY);
  droplets.count = 0;
  root.add(droplets);
  const sprays: Spray[] = [];
  const splash = (x: number, z: number) => {
    sprays.length = 0;
    for (let i = 0; i < SPRAY; i++) {
      const a = (i / SPRAY) * Math.PI * 2 + Math.random() * 0.3;
      const out = 0.4 + Math.random() * 0.6;
      sprays.push({ p: new THREE.Vector3(x, WATER_Y, z), v: new THREE.Vector3(Math.cos(a) * out, 2.2 + Math.random() * 1.2, Math.sin(a) * out) });
    }
    ripple(x, z, 0.9, 1.8);
    ripple(x, z, 0.65, 1.7, 0.2);
    ripple(x, z, 0.4, 1.5, 0.4);
  };
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const stretch = new THREE.Vector3();
  const drawSpray = (dt: number) => {
    let n = 0;
    for (const s of sprays) {
      s.v.y -= GRAVITY * dt;
      s.p.addScaledVector(s.v, dt);
      if (s.p.y < WATER_Y) continue;
      // Drawn out along its flight, as a falling drop is.
      q.setFromUnitVectors(up, stretch.copy(s.v).normalize());
      m4.compose(s.p, q, new THREE.Vector3(1, 1 + s.v.length() * 0.6, 1));
      droplets.setMatrixAt(n++, m4);
    }
    droplets.count = n;
    droplets.instanceMatrix.needsUpdate = true;
  };

  /* ── Coins: one in flight, the rest on the bottom ── */

  const coinGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.02, 18);
  geometries.push(coinGeo);
  const coinMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
  materials.push(coinMat);
  const bottom: THREE.Mesh[] = [];
  type Flight = { coin: THREE.Mesh; from: THREE.Vector3; to: THREE.Vector3; age: number; time: number; done: () => void; sinking: boolean };
  let flight: Flight | null = null;
  // Laid flat on the bottom, among the others.
  const settle = (f: Flight) => {
    f.coin.position.set(f.to.x, 0.135, f.to.z);
    f.coin.rotation.set(0, Math.random() * Math.PI, 0);
    bottom.push(f.coin);
    if (bottom.length > COINS) bottom.shift()!.removeFromParent();
    flight = null;
  };

  const toss = (hand: THREE.Vector3) =>
    new Promise<void>((done) => {
      // One coin in the air at a time.
      if (flight && !flight.sinking) return done();
      if (flight) settle(flight);
      const coin = new THREE.Mesh(coinGeo, coinMat);
      fine(coin);
      root.add(coin);
      // Somewhere on the water, short of the column.
      const a = Math.random() * Math.PI * 2;
      const r = 0.3 + Math.random() * 0.35;
      const to = new THREE.Vector3(Math.cos(a) * r, WATER_Y, Math.sin(a) * r);
      const from = hand.clone().sub(at);
      const time = reducedMotion ? 0 : 0.75;
      flight = { coin, from, to, age: 0, time, done, sinking: false };
    });

  const drawCoin = (dt: number) => {
    if (!flight) return;
    const f = flight;
    f.age += dt;
    if (!f.sinking) {
      const k = f.time ? Math.min(1, f.age / f.time) : 1;
      f.coin.position.lerpVectors(f.from, f.to, k);
      // Up and over: an arc half a step above the higher end.
      f.coin.position.y += Math.sin(k * Math.PI) * (0.9 + Math.abs(f.from.y - f.to.y) * 0.3);
      f.coin.rotation.x += dt * 14;
      f.coin.rotation.z += dt * 5;
      if (k >= 1) {
        f.sinking = true;
        f.age = 0;
        if (!reducedMotion) splash(f.to.x, f.to.z);
        f.done();
      }
      return;
    }
    // Down through the water to lie flat on the bottom.
    const k = reducedMotion ? 1 : Math.min(1, f.age / 0.8);
    f.coin.position.set(f.to.x, WATER_Y - (WATER_Y - 0.135) * k, f.to.z);
    f.coin.rotation.x *= 1 - k;
    f.coin.rotation.z *= 1 - k;
    if (k >= 1) settle(f);
  };

  fine(root);
  scene.add(root);
  drawWater(0);
  drawDrops(0);
  drawSpray(0);

  return {
    toss,
    update(dt, t) {
      if (!reducedMotion) {
        drawWater(t);
        drawDrops(t);
      }
      drawRings(dt);
      drawSpray(dt);
      drawCoin(dt);
    },
    dispose() {
      root.removeFromParent();
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
    },
  };
}
