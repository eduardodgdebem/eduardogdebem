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
  melencolia: { name: 'Melencolia I', where: 'Albrecht Dürer, 1514', w: 1000, h: 1322, credit: 'The Met, CC0', source: 'https://commons.wikimedia.org/wiki/File:Melencolia_I_MET_DP815743.jpg' },
  'gladiator-head': { name: 'The Borghese Gladiator', where: 'Agasias of Ephesus · Louvre, Paris', w: 900, h: 1062, credit: 'Photo: public domain', source: 'https://commons.wikimedia.org/wiki/File:Borghese_Gladiator_Louvre_Ma_527_n3.jpg' },
  venus: { name: 'Venus de Milo', where: 'Louvre, Paris', w: 900, h: 1300, credit: 'Photo: Wilfredor, CC0', source: 'https://commons.wikimedia.org/wiki/File:Venus_de_Milo_from_Paris_Project,_44.jpg' },
  thames: { name: 'The River Thames', where: 'Canaletto (detail)', w: 1800, h: 810, credit: 'Public domain' },
} satisfies Record<string, Art>;

export type ArtId = keyof typeof ART;
