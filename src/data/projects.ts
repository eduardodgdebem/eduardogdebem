import type { Lang } from './site';

// The projects on the page (the Projects section of src/views/Site.astro),
// in this order within each type.

/** What kind of thing it is. The page shows them in this order: his own work first, then the sites made for others. */
export const TYPES = ['language', 'app', 'site'] as const;
export type Type = (typeof TYPES)[number];

export interface Project {
  id: string;
  name: string;
  url: string;
  /** The address as shown (no scheme). */
  host: string;
  /** The source, when it's public. */
  code?: string;
  /** A screenshot of it (in public/), toned green on the page. Retaken with `npm run previews`. */
  preview?: string;
  year: number;
  type: Type;
  stack: string[];
  summary: Record<Lang, string>;
  /** One line, for the page. */
  short: Record<Lang, string>;
  /** A few real lines of its source, shown in its window instead of a screenshot. */
  snippet?: { file: string; code: string };
}

export const PROJECTS: Project[] = [
  {
    id: 'brazilian-hair-studio',
    preview: '/projects/brazilian-hair-studio.webp',
    name: 'Brazilian Hair Studio',
    url: 'https://brazilian-hair-studio.com/',
    host: 'brazilian-hair-studio.com',
    year: 2026,
    type: 'site',
    stack: ['Astro', 'Tailwind CSS', 'Cloudflare Workers'],
    short: { en: 'A salon in Fort Myers, in three languages.', pt: 'Um salão em Fort Myers, em três línguas.' },
    summary: {
      en: 'For a hair salon in Fort Myers, Florida, with 25 years behind it in Criciúma. In English, Portuguese and Spanish, its content kept in plain files, no CMS.',
      pt: 'Para um salão em Fort Myers, na Flórida, com 25 anos de história em Criciúma. Em inglês, português e espanhol, com o conteúdo em arquivos simples, sem CMS.',
    },
  },
  {
    id: 'cabelos-e-formas',
    preview: '/projects/cabelos-e-formas.webp',
    name: 'Cabelos e Formas',
    url: 'https://cbf.jeffersonrdebem.workers.dev/',
    host: 'cbf.jeffersonrdebem.workers.dev',
    year: 2026,
    type: 'site',
    stack: ['Astro', 'Tailwind CSS', 'GSAP', 'Cloudflare Workers'],
    short: { en: 'Four salons in Criciúma and Içara.', pt: 'Quatro salões em Criciúma e Içara.' },
    summary: {
      en: 'Four salons in Criciúma and Içara: their services, bridal packages, and each location with its map and WhatsApp. Ratings come from Google at build time.',
      pt: 'Quatro salões em Criciúma e Içara: os serviços, os pacotes de noiva e cada unidade com mapa e WhatsApp. As avaliações vêm do Google na hora do build.',
    },
  },
  {
    id: 'debem-consultoria',
    preview: '/projects/debem-consultoria.webp',
    name: 'De Bem Consultoria',
    url: 'https://debemconsultoria.com/',
    host: 'debemconsultoria.com',
    year: 2026,
    type: 'site',
    stack: ['Astro', 'Tailwind CSS', 'GSAP', 'Cloudflare'],
    short: { en: 'A management consultancy, drawn in sharp lines.', pt: 'Uma consultoria de gestão, em linhas retas.' },
    summary: {
      en: 'A management consultancy: strategic planning, structure, processes and people. In Portuguese and English, drawn to the brand’s own blueprint of sharp lines.',
      pt: 'Uma consultoria de gestão: planejamento estratégico, estrutura, processos e pessoas. O site, em português e inglês, segue a identidade visual da marca, de linhas retas.',
    },
  },
  {
    id: 'ode-city',
    preview: '/projects/ode-city.webp',
    name: 'Ode City',
    url: 'https://eduardodgdebem.github.io/ode-city/',
    host: 'eduardodgdebem.github.io/ode-city',
    code: 'https://github.com/eduardodgdebem/ode-city',
    year: 2026,
    type: 'app',
    stack: ['Ode', 'WebAssembly', 'WebGL2'],
    snippet: {
      file: 'src/timer.ode',
      code: `export enum Phase {
  Idle,
  Focus,
  ShortBreak,
  LongBreak,
}

let MINUTE: f64 = 60000.0;`,
    },
    short: { en: 'A focus timer that builds a city while you work.', pt: 'Um timer de foco que constrói uma cidade enquanto você trabalha.' },
    summary: {
      en: 'A focus timer that builds a city while you work: the longer the session, the bigger the building, and giving up leaves a ruin. Written in Ode, compiled to WebAssembly, drawn with WebGL2; it installs and runs offline.',
      pt: 'Um timer de foco que constrói uma cidade enquanto você trabalha: quanto mais longa a sessão, maior o prédio, e desistir deixa uma ruína. Escrito em Ode, compilado para WebAssembly, renderizado com WebGL2; pode ser instalado e funciona offline.',
    },
  },
  {
    id: 'ode',
    name: 'Ode',
    url: 'https://github.com/eduardodgdebem/ode',
    host: 'github.com/eduardodgdebem/ode',
    code: 'https://github.com/eduardodgdebem/ode',
    year: 2026,
    type: 'language',
    stack: ['Ode', 'LLVM', 'C'],
    snippet: {
      file: 'README.md',
      code: `struct Counter {
  hits: i32,

  fn bump(self: *Counter): void {
    self.hits = self.hits + 1;
  }
}`,
    },
    short: { en: 'A small language that compiles itself.', pt: 'Uma linguagem pequena que compila a si mesma.' },
    summary: {
      en: 'A small, statically typed language that compiles to native code through LLVM. Its compiler is written in Ode and compiles itself: the snake with its tail in its mouth.',
      pt: 'Uma linguagem pequena, de tipagem estática, que compila para código nativo via LLVM. O compilador é escrito em Ode e compila a si mesmo: a serpente com a cauda na boca.',
    },
  },
];
