// The pictures on the page: classical engravings, statues and paintings,
// reduced to one ink on the night as the Nous sites do (an ordered dither in
// coarse pixels, or a halftone of round dots), and saved as transparent PNGs
// (white where there's ink) that the page colours with CSS masks.
// Sources are kept out of the repo, in art-src/ (see ART below for where each
// came from and its licence). Run with `npm run art`.
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const SRC = 'art-src';
const OUT = 'public/art';

/**
 * crop: [left, top, width, height] as fractions of the source.
 * width: output px (the dither is computed at width / dot, then scaled up).
 * invert: an engraving (dark lines on paper): its lines become the ink.
 * gamma, gain: tone before dithering (gain > 1 pushes toward ink).
 * fade: how much the edges fade to the night (an ellipse), 0 for none.
 * mode: 'dither' (Bayer) or 'halftone'.
 * wall: subtract the background's tone row by row (read from the crop's left and right edges), for a statue before an unevenly lit wall.
 */
const ART = {
  // Giambologna, Mercury, c. 1580. The Met, CC0. Dark bronze on a light wall: inverted, so the bronze is the ink.
  mercury: { crop: [0.12, 0.06, 0.76, 0.92], width: 1000, dot: 2, invert: true, wall: true, gamma: 0.9, gain: 1.3 },
  // The Tusculum portrait of Julius Caesar, 46-44 BC. Museo di Antichità, Turin. Photo: Marie-Lan Taÿ Pamart, public domain.
  caesar: { crop: [0.03, 0.03, 0.94, 0.78], width: 1400, dot: 3, gamma: 2.0, gain: 1.2, fade: 0.45, floor: 0.2 },
  // Antonio Canova, Psyche Revived by Cupid's Kiss, 1787-93. Louvre. Photo: Joe deSousa, CC0.
  psyche: { crop: [0.18, 0.0, 0.6, 0.92], width: 1000, dot: 2, gamma: 1.7, gain: 1.05, fade: 0.55, floor: 0.2 },
  // The Borghese Gladiator's head. Louvre. Photo: public domain.
  'gladiator-head': { crop: [0.06, 0.04, 0.88, 0.78], width: 900, dot: 2, gamma: 1.5, gain: 1.05, fade: 0.6, floor: 0.15 },
  // Engravings, the right way round: the paper is the ink, the lines are the night.
  // Albrecht Dürer, Melencolia I, 1514. The Met, CC0.
  melencolia: { crop: [0.06, 0.05, 0.88, 0.9], width: 1000, dot: 2, gamma: 1.6, gain: 1.0 },
};

const BAYER = [
  [0, 32, 8, 40, 2, 34, 10, 42], [48, 16, 56, 24, 50, 18, 58, 26], [12, 44, 4, 36, 14, 46, 6, 38], [60, 28, 52, 20, 62, 30, 54, 22],
  [3, 35, 11, 43, 1, 33, 9, 41], [51, 19, 59, 27, 49, 17, 57, 25], [15, 47, 7, 39, 13, 45, 5, 37], [63, 31, 55, 23, 61, 29, 53, 21],
];

mkdirSync(OUT, { recursive: true });

/**
 * Monochrome pictures, as Hermes sets its own: the photograph in greys toward
 * the page's ink, darkened to the night at its edges, with a heavy film grain
 * baked in. Saved as JPEGs.
 */
const MONO = {
  // Laocoön and His Sons. Vatican Museums. Photo: Wilfredor, CC0.
  laocoon: { crop: [0.1, 0, 0.8, 0.43], width: 1800, grain: 46, gamma: 2.1, strip: [0.2, 0.46, 0.36, 0.46] },
};

const only0 = process.argv.slice(2);
for (const [name, m] of Object.entries(MONO)) {
  if (only0.length && !only0.includes(name)) continue;
  const { width: W, height: H } = await sharp(`${SRC}/${name}.jpg`).metadata();
  const [l, t, w, h] = m.crop;
  const box = { left: Math.round(l * W), top: Math.round(t * H), width: Math.round(w * W), height: Math.round(h * H) };
  const ow = m.width;
  const oh = Math.round((ow * box.height) / box.width);
  const { data } = await sharp(`${SRC}/${name}.jpg`).extract(box).resize(ow, oh).greyscale().normalise().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(ow * oh * 3);
  // Night #040a07 to ink #e3ebe4.
  const lo = [4, 10, 7];
  const hi = [227, 235, 228];
  for (let y = 0; y < oh; y++) {
    for (let x = 0; x < ow; x++) {
      let v = Math.pow(data[y * ow + x] / 255, m.gamma);
      const dx = (x / ow - 0.5) * 2;
      const dy = (y / oh - 0.5) * 2;
      v *= 1 - 0.75 * Math.min(1, Math.pow(Math.hypot(dx, dy * 0.9) / 1.3, 2.5));
      v += ((Math.random() + Math.random() + Math.random()) / 1.5 - 1) * (m.grain / 255);
      v = Math.min(1, Math.max(0, v));
      for (let c = 0; c < 3; c++) out[(y * ow + x) * 3 + c] = lo[c] + (hi[c] - lo[c]) * v;
    }
  }
  await sharp(out, { raw: { width: ow, height: oh, channels: 3 } }).jpeg({ quality: 74, mozjpeg: true }).toFile(`${OUT}/${name}-mono.jpg`);
  console.log(name, 'mono', `${ow}×${oh}`);
  // A strip of it with no wall in it, for letters cut out of the marble.
  if (m.strip) {
    const [sl, st, sw, sh] = m.strip;
    await sharp(`${OUT}/${name}-mono.jpg`)
      .extract({ left: Math.round(sl * ow), top: Math.round(st * oh), width: Math.round(sw * ow), height: Math.round(sh * oh) })
      .resize(2000, 520, { fit: 'fill' })
      .modulate({ brightness: 1.25 })
      .jpeg({ quality: 72, mozjpeg: true })
      .toFile(`${OUT}/${name}-strip.jpg`);
  }
}

const only = process.argv.slice(2);
for (const [name, a] of Object.entries(ART)) {
  if (only.length && !only.includes(name)) continue;
  const src = sharp(`${SRC}/${name}.jpg`);
  const { width: W, height: H } = await src.metadata();
  const [l, t, w, h] = a.crop;
  const box = { left: Math.round(l * W), top: Math.round(t * H), width: Math.round(w * W), height: Math.round(h * H) };
  const cw = Math.round(a.width / a.dot);
  const ch = Math.round((cw * box.height) / box.width);
  const { data } = await sharp(`${SRC}/${name}.jpg`).extract(box).resize(cw, ch).greyscale().normalise().raw().toBuffer({ resolveWithObject: true });
  const ink = new Uint8Array(cw * ch);
  const tone = (x, y) => (a.invert ? 1 - data[y * cw + x] / 255 : data[y * cw + x] / 255);
  // The wall's tone on each row: the median of its outer tenths.
  const wallAt = (y) => {
    const edge = Math.max(2, Math.round(cw * 0.1));
    const vals = [];
    for (let x = 0; x < edge; x++) vals.push(tone(x, y), tone(cw - 1 - x, y));
    vals.sort((p, q) => p - q);
    return vals[vals.length >> 1];
  };
  for (let y = 0; y < ch; y++) {
    const wall = a.wall ? wallAt(y) : 0;
    for (let x = 0; x < cw; x++) {
      let v = tone(x, y);
      if (a.wall) v = Math.max(0, (v - wall - 0.04) / (1 - wall));
      if (a.floor) v = Math.max(0, (v - a.floor) / (1 - a.floor)); // a light wall behind falls away
      v = Math.pow(v, a.gamma ?? 1) * (a.gain ?? 1);
      if (a.fade) {
        const dx = (x / cw - 0.5) * 2;
        const dy = (y / ch - 0.5) * 2;
        v *= 1 - a.fade * Math.min(1, Math.pow(Math.hypot(dx, dy) / 1.25, 3));
      }
      ink[y * cw + x] = v * 255;
    }
  }
  const out = Buffer.alloc(a.width * Math.round(ch * a.dot) * 4);
  const OW = a.width;
  const OH = Math.round(ch * a.dot);
  for (let y = 0; y < OH; y++) {
    for (let x = 0; x < OW; x++) {
      let on;
      if (a.mode === 'halftone') {
        // A dot a cell, its radius by the cell's tone.
        const cx = Math.min(cw - 1, Math.floor(x / a.dot));
        const cy = Math.min(ch - 1, Math.floor(y / a.dot));
        const v = ink[cy * cw + cx] / 255;
        const fx = (x % a.dot) + 0.5 - a.dot / 2;
        const fy = (y % a.dot) + 0.5 - a.dot / 2;
        on = Math.hypot(fx, fy) < (a.dot / 2) * Math.sqrt(v) * 1.15;
      } else {
        const cx = Math.min(cw - 1, Math.floor(x / a.dot));
        const cy = Math.min(ch - 1, Math.floor(y / a.dot));
        on = ink[cy * cw + cx] / 255 > (BAYER[cy % 8][cx % 8] + 0.5) / 64;
      }
      const i = (y * OW + x) * 4;
      out[i] = out[i + 1] = out[i + 2] = 255;
      out[i + 3] = on ? 255 : 0;
    }
  }
  await sharp(out, { raw: { width: OW, height: OH, channels: 4 } }).png({ palette: true, colours: 2, compressionLevel: 9 }).toFile(`${OUT}/${name}.png`);
  console.log(name, `${OW}×${OH}`);
}
