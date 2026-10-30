// The pictures, each reduced to one ink by `npm run art` (scripts/art.mjs,
// sources in art-src/, kept out of the repo) and saved at public/art/<id>.png.
// The page colours them through a CSS mask, so it needs each one's size.
// Credits are shown at the foot of the page.

import type { T } from './site';

export interface Art {
  /** What it is, for its caption and its alt text. */
  name: T;
  /** Where it is, or who made it. */
  where: T;
  w: number;
  h: number;
  /** The photo's or print's licence, and its page on Wikimedia Commons (or where the painting is from). */
  credit: T;
  source?: string;
}

export const ART = {
  // A 3D photo scan, rendered all the way round by `npm run turn` (scripts/turn.mjs) into 48 frames on one sheet.
  'caesar-turn': { name: { en: 'Julius Caesar', pt: 'Júlio César' }, where: { en: 'Via dei Fori Imperiali, Rome · 3D scan', pt: 'Via dei Fori Imperiali, Roma · escaneamento 3D' }, w: 680, h: 840, credit: { en: 'Scan: massimo.riccioni, CC BY', pt: 'Escaneamento: massimo.riccioni, CC BY' }, source: 'https://sketchfab.com/3d-models/statua-di-giulio-cesare-7fc6bfd0ea0643f6bd66baeaa8e3c2e3' },
  melencolia: { name: { en: 'Melencolia I', pt: 'Melencolia I' }, where: { en: 'Albrecht Dürer, 1514', pt: 'Albrecht Dürer, 1514' }, w: 1000, h: 1322, credit: { en: 'Print: The Met, CC0', pt: 'Gravura: The Met, CC0' }, source: 'https://commons.wikimedia.org/wiki/File:Melencolia_I_MET_DP815743.jpg' },
  'gladiator-head': { name: { en: 'The Borghese Gladiator', pt: 'Gladiador Borghese' }, where: { en: 'Agasias of Ephesus · Louvre, Paris', pt: 'Agasias de Éfeso · Louvre, Paris' }, w: 900, h: 1062, credit: { en: 'Photo: public domain', pt: 'Foto: domínio público' }, source: 'https://commons.wikimedia.org/wiki/File:Borghese_Gladiator_Louvre_Ma_527_n3.jpg' },
  laocoon: { name: { en: 'Laocoön and His Sons', pt: 'Laocoonte e seus filhos' }, where: { en: 'Vatican Museums', pt: 'Museus Vaticanos' }, w: 2000, h: 1063, credit: { en: 'Photo: Wilfredor, CC0', pt: 'Foto: Wilfredor, CC0' }, source: 'https://commons.wikimedia.org/wiki/File:Laoco%C3%B6n_and_his_sons_group.jpg' },
  mercury: { name: { en: 'Mercury', pt: 'Mercúrio' }, where: { en: 'Giambologna, c. 1580 · The Met', pt: 'Giambologna, c. 1580 · The Met' }, w: 1000, h: 1634, credit: { en: 'Photo: The Met, CC0', pt: 'Foto: The Met, CC0' }, source: 'https://commons.wikimedia.org/wiki/File:Mercury_MET_DP-733-001.jpg' },
} satisfies Record<string, Art>;

export type ArtId = keyof typeof ART;
