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
  hercules: { name: 'The Great Hercules', where: 'Hendrik Goltzius, 1589', w: 1000, h: 1316, credit: 'National Gallery of Art, CC0', source: 'https://commons.wikimedia.org/wiki/File:Hendrik_Goltzius,_The_Great_Hercules,_1589,_NGA_70311.jpg' },
  moses: { name: 'Moses', where: 'Michelangelo · San Pietro in Vincoli, Rome', w: 900, h: 1254, credit: 'Photo: Perituss, CC0', source: 'https://commons.wikimedia.org/wiki/File:Moses_Michelangelo_2014_02.jpg' },
  melencolia: { name: 'Melencolia I', where: 'Albrecht Dürer, 1514', w: 1000, h: 1322, credit: 'The Met, CC0', source: 'https://commons.wikimedia.org/wiki/File:Melencolia_I_MET_DP815743.jpg' },
  carceri: { name: 'Carceri VII, The Drawbridge', where: 'Giovanni Battista Piranesi, 1761', w: 1000, h: 1350, credit: 'CC0', source: 'https://commons.wikimedia.org/wiki/File:Piranesi-Carceri-07Zugbr%C3%BCcke.jpg' },
  'gladiator-head': { name: 'The Borghese Gladiator', where: 'Agasias of Ephesus · Louvre, Paris', w: 900, h: 1062, credit: 'Photo: public domain', source: 'https://commons.wikimedia.org/wiki/File:Borghese_Gladiator_Louvre_Ma_527_n3.jpg' },
  venus: { name: 'Venus de Milo', where: 'Louvre, Paris', w: 900, h: 1300, credit: 'Photo: Wilfredor, CC0', source: 'https://commons.wikimedia.org/wiki/File:Venus_de_Milo_from_Paris_Project,_44.jpg' },
  laocoon: { name: 'Laocoön and His Sons', where: 'Vatican Museums', w: 1000, h: 1062, credit: 'Photo: Wilfredor, CC0', source: 'https://commons.wikimedia.org/wiki/File:Laoco%C3%B6n_and_his_sons_group.jpg' },
  gladiator: { name: 'The Borghese Gladiator', where: 'Agasias of Ephesus · Louvre, Paris', w: 1100, h: 1516, credit: 'Photo: Ryan Bauman, CC BY 2.0', source: 'https://commons.wikimedia.org/wiki/File:Borghese_Gladiator,_Louvre_Museum,_Paris_2_October_2014.jpg' },
  caravane: { name: 'Caravan at Sunset', where: 'Charles-Théodore Frère', w: 1800, h: 600, credit: 'Public domain' },
  wittel: { name: 'A View in Italy', where: 'Gaspar van Wittel', w: 1800, h: 756, credit: 'Public domain' },
  thames: { name: 'The River Thames', where: 'Canaletto (detail)', w: 1800, h: 810, credit: 'Public domain' },
} satisfies Record<string, Art>;

export type ArtId = keyof typeof ART;

/** The picture on the right while each section is read. */
export const RAIL: Record<string, ArtId> = {
  overview: 'hercules',
  work: 'moses',
  projects: 'melencolia',
  stack: 'carceri',
  about: 'gladiator-head',
  contact: 'venus',
};
