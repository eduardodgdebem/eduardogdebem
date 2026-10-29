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
 */
const ART = {
  // The Tusculum portrait of Julius Caesar, 46-44 BC. Museo di Antichità, Turin. Photo: Marie-Lan Taÿ Pamart, public domain.
  caesar: { crop: [0.03, 0.03, 0.94, 0.78], width: 1400, dot: 3, gamma: 2.0, gain: 1.2, fade: 0.45, floor: 0.2 },
  // The Borghese Gladiator, by Agasias of Ephesus, c. 100 BC. Louvre. Photo CC BY 2.0 (see CREDITS in src/data/art.ts).
  gladiator: { crop: [0, 0, 1, 1], width: 1100, dot: 2, gamma: 1.15, gain: 1.1, fade: 0.15 },
  // The Venus de Milo, c. 150-125 BC. Louvre. Photo: Wilfredor, CC0.
  venus: { crop: [0.18, 0.03, 0.64, 0.7], width: 900, dot: 2, gamma: 1.2, gain: 1.1, fade: 0.35 },
  // Michelangelo, Moses, 1513-15. San Pietro in Vincoli, Rome. Photo: Perituss, CC0.
  moses: { crop: [0.08, 0.04, 0.84, 0.78], width: 900, dot: 2, gamma: 1.45, gain: 1.1, fade: 0.6, floor: 0.12 },
  // Antonio Canova, Psyche Revived by Cupid's Kiss, 1787-93. Louvre. Photo: Joe deSousa, CC0.
  psyche: { crop: [0.18, 0.0, 0.6, 0.92], width: 1000, dot: 2, gamma: 1.7, gain: 1.05, fade: 0.55, floor: 0.2 },
  // The Borghese Gladiator's head. Louvre. Photo: public domain.
  'gladiator-head': { crop: [0.06, 0.04, 0.88, 0.78], width: 900, dot: 2, gamma: 1.5, gain: 1.05, fade: 0.6, floor: 0.15 },
  // Laocoön and His Sons. Vatican Museums. Photo: Wilfredor, CC0.
  laocoon: { crop: [0.06, 0.04, 0.88, 0.86], width: 1000, dot: 2, gamma: 1.3, gain: 1.1, fade: 0.4 },
  // Engravings, the right way round: the paper is the ink, the lines are the night.
  // Albrecht Dürer, Melencolia I, 1514. The Met, CC0.
  melencolia: { crop: [0.06, 0.05, 0.88, 0.9], width: 1000, dot: 2, gamma: 1.6, gain: 1.0 },
  // Giovanni Battista Piranesi, Carceri VII, The Drawbridge, 1761. CC0.
  carceri: { crop: [0.04, 0.04, 0.92, 0.92], width: 1000, dot: 2, gamma: 1.3, gain: 1.0 },
  // Paintings, as wide bands of round dots.
  // Charles-Théodore Frère, Caravan at Sunset (19th c.), public domain.
  caravane: { crop: [0, 0.1, 1, 0.8], width: 1800, dot: 6, mode: 'halftone', gamma: 2.1, gain: 0.9 },
  // Gaspar van Wittel (1653-1736), a view in Italy, public domain.
  wittel: { crop: [0, 0, 1, 1], width: 1800, dot: 6, mode: 'halftone', gamma: 2.1, gain: 0.9 },
  // Canaletto, The River Thames (detail), public domain.
  thames: { crop: [0, 0.2, 1, 0.6], width: 1800, dot: 6, mode: 'halftone', gamma: 2.1, gain: 0.9 },
};

const BAYER = [
  [0, 32, 8, 40, 2, 34, 10, 42], [48, 16, 56, 24, 50, 18, 58, 26], [12, 44, 4, 36, 14, 46, 6, 38], [60, 28, 52, 20, 62, 30, 54, 22],
  [3, 35, 11, 43, 1, 33, 9, 41], [51, 19, 59, 27, 49, 17, 57, 25], [15, 47, 7, 39, 13, 45, 5, 37], [63, 31, 55, 23, 61, 29, 53, 21],
];

mkdirSync(OUT, { recursive: true });
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
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      let v = data[y * cw + x] / 255;
      if (a.invert) v = 1 - v;
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
