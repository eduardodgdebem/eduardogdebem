import type { Lang } from '../i18n/strings';

// The work shown in the Officina (/projects/, /pt/projetos/): each project is a
// piece on a bench in the workshop, and an entry on the facing page. `work` is
// the engraved object that stands for it (see officina-models.ts). Order is
// the order of the benches, left to right; the last stands on the anvil.

export type Work = 'forfex' | 'caput' | 'tabula' | 'ouroboros';

export interface Project {
  id: string;
  /** Latin name on the label and the bench. */
  latin: string;
  name: string;
  url: string;
  /** The address as shown (no scheme). */
  host: string;
  /** The source, when it's public. */
  code?: string;
  year: number;
  work: Work;
  stack: string[];
  kind: Record<Lang, string>;
  summary: Record<Lang, string>;
  note?: Record<Lang, string>;
}

export const PROJECTS: Project[] = [
  {
    id: 'brazilian-hair-studio',
    latin: 'Tonstrina',
    name: 'Brazilian Hair Studio',
    url: 'https://brazilian-hair-studio.com/',
    host: 'brazilian-hair-studio.com',
    year: 2026,
    work: 'forfex',
    stack: ['Astro', 'Tailwind CSS', 'Cloudflare Workers'],
    kind: { en: 'A salon’s site', pt: 'Site de um salão' },
    summary: {
      en: 'For a hair salon in Fort Myers, Florida, with 25 years behind it in Criciúma. In English, Portuguese and Spanish, its content kept in plain files, no CMS.',
      pt: 'Para um salão em Fort Myers, na Flórida, com 25 anos de história em Criciúma. Em inglês, português e espanhol, com o conteúdo em arquivos simples, sem CMS.',
    },
  },
  {
    id: 'cabelos-e-formas',
    latin: 'Ornatrix',
    name: 'Cabelos e Formas',
    url: 'https://cbf.jeffersonrdebem.workers.dev/',
    host: 'cbf.jeffersonrdebem.workers.dev',
    year: 2026,
    work: 'caput',
    stack: ['Astro', 'Tailwind CSS', 'GSAP', 'Cloudflare Workers'],
    kind: { en: 'A chain of salons', pt: 'Uma rede de salões' },
    summary: {
      en: 'Four salons in Criciúma and Içara: their services, bridal packages, and each location with its map and WhatsApp. Ratings come from Google at build time.',
      pt: 'Quatro salões em Criciúma e Içara: os serviços, os pacotes de noiva e cada unidade com mapa e WhatsApp. As avaliações vêm do Google na hora do build.',
    },
    note: { en: 'At a temporary address for now.', pt: 'Num endereço provisório, por enquanto.' },
  },
  {
    id: 'debem-consultoria',
    latin: 'Consilium',
    name: 'De Bem Consultoria',
    url: 'https://debemconsultoria.com/',
    host: 'debemconsultoria.com',
    year: 2026,
    work: 'tabula',
    stack: ['Astro', 'Tailwind CSS', 'GSAP', 'Cloudflare'],
    kind: { en: 'A consultancy’s site', pt: 'Site de uma consultoria' },
    summary: {
      en: 'A management consultancy: strategic planning, structure, processes and people. In Portuguese and English, drawn to the brand’s own blueprint of sharp lines.',
      pt: 'Uma consultoria de gestão: planejamento estratégico, estrutura, processos e pessoas. Em português e inglês, desenhado no próprio projeto gráfico da marca, de linhas retas.',
    },
  },
  {
    id: 'ode',
    latin: 'Ode',
    name: 'Ode',
    url: 'https://github.com/eduardodgdebem/ode',
    host: 'github.com/eduardodgdebem/ode',
    code: 'https://github.com/eduardodgdebem/ode',
    year: 2026,
    work: 'ouroboros',
    stack: ['Ode', 'LLVM', 'C'],
    kind: { en: 'A programming language', pt: 'Uma linguagem de programação' },
    summary: {
      en: 'A small, statically typed language that compiles to native code through LLVM. Its compiler is written in Ode and compiles itself: the snake with its tail in its mouth.',
      pt: 'Uma linguagem pequena, de tipagem estática, que compila para código nativo via LLVM. O compilador é escrito em Ode e compila a si mesmo: a serpente com a cauda na boca.',
    },
    note: { en: 'Field notes on how it was made, to come.', pt: 'Notas de campo sobre como foi feita, em breve.' },
  },
];
