// The pictures, each reduced to one ink by `npm run art` (scripts/art.mjs,
// sources in art-src/, kept out of the repo) and saved at public/art/<id>.png.
// The page colours them through a CSS mask, so it needs each one's size.
// Credits are shown at the foot of the page.

export interface Art {
  /** What it is, for its caption and its alt text. */
  name: string;
  /** Where it is, or who made it. */
  where: string;
  w: number;
  h: number;
  /** The photo's or print's licence, and its page on Wikimedia Commons (or where the painting is from). */
  credit: string;
  source?: string;
}

export const ART = {
  caesar: { name: 'Julius Caesar', where: 'The Tusculum portrait · Turin', w: 1400, h: 1746, credit: 'Photo: Marie-Lan Taÿ Pamart, public domain', source: 'https://commons.wikimedia.org/wiki/File:Head_of_Julius_Caesar_from_Tusculum_MAntTorino_2089_n02.jpg' },
  // A 3D photo scan, rendered all the way round by `npm run turn` (scripts/turn.mjs) into 48 frames on one sheet.
  'caesar-turn': { name: 'Julius Caesar', where: 'Via dei Fori Imperiali, Rome · 3D scan', w: 680, h: 840, credit: 'Scan: massimo.riccioni, CC BY', source: 'https://sketchfab.com/3d-models/statua-di-giulio-cesare-7fc6bfd0ea0643f6bd66baeaa8e3c2e3' },
  melencolia: { name: 'Melencolia I', where: 'Albrecht Dürer, 1514', w: 1000, h: 1322, credit: 'The Met, CC0', source: 'https://commons.wikimedia.org/wiki/File:Melencolia_I_MET_DP815743.jpg' },
  'gladiator-head': { name: 'The Borghese Gladiator', where: 'Agasias of Ephesus · Louvre, Paris', w: 900, h: 1062, credit: 'Photo: public domain', source: 'https://commons.wikimedia.org/wiki/File:Borghese_Gladiator_Louvre_Ma_527_n3.jpg' },
  laocoon: { name: 'Laocoön and His Sons', where: 'Vatican Museums', w: 2000, h: 1063, credit: 'Photo: Wilfredor, CC0', source: 'https://commons.wikimedia.org/wiki/File:Laoco%C3%B6n_and_his_sons_group.jpg' },
  mercury: { name: 'Mercury', where: 'Giambologna, c. 1580 · The Met', w: 1000, h: 1634, credit: 'CC0', source: 'https://commons.wikimedia.org/wiki/File:Mercury_MET_DP-733-001.jpg' },
} satisfies Record<string, Art>;

export type ArtId = keyof typeof ART;
