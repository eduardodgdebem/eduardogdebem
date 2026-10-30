// Everything the one page says, in English and Portuguese. The page is
// src/views/Site.astro; the projects are in projects.ts, the pictures' credits
// in art.ts.

export type Lang = 'en' | 'pt';
export type T = Record<Lang, string>;

export const PATHS: Record<Lang, string> = { en: '/', pt: '/pt/' };

/** The page's sections, in order: the nav follows them. */
export const SECTIONS = ['overview', 'projects', 'about', 'contact'] as const;
export type Section = (typeof SECTIONS)[number];

export const NAV: Record<Section, T> = {
  overview: { en: 'Overview', pt: 'Início' },
  projects: { en: 'Projects', pt: 'Projetos' },
  about: { en: 'About', pt: 'Sobre' },
  contact: { en: 'Contact', pt: 'Contato' },
};

export const META: Record<Lang, { title: string; description: string }> = {
  en: {
    title: 'Eduardo de Bem — Full Stack Developer in Florianópolis',
    description:
      'Eduardo de Bem, full stack developer in Florianópolis, Brazil. TypeScript, Angular, React, Node.js and .NET; data pipelines for BMW Europe at Zallpy.',
  },
  pt: {
    title: 'Eduardo de Bem — Desenvolvedor Full Stack em Florianópolis',
    description:
      'Eduardo de Bem, desenvolvedor full stack em Florianópolis. TypeScript, Angular, React, Node.js e .NET; pipelines de dados para a BMW Europa na Zallpy.',
  },
};

export const UI = {
  role: { en: 'Full stack developer', pt: 'Desenvolvedor full stack' },
  place: { en: 'Florianópolis, Brazil', pt: 'Florianópolis, Brasil' },
  headline: { en: 'Eduardo de Bem', pt: 'Eduardo de Bem' },
  lede: { en: 'I build web software end to end. Right now, on BMW Europe at Zallpy.', pt: 'Construo software para a web de ponta a ponta. Agora, na BMW Europa pela Zallpy.' },
  ctaContact: { en: 'Get in touch', pt: 'Fale comigo' },
  ctaCv: { en: 'Download CV', pt: 'Baixar currículo' },
  workTitle: { en: 'Where I’ve worked', pt: 'Onde trabalhei' },
  projectsTitle: { en: 'Things I’ve Made', pt: 'Coisas que Fiz' },
  projectsLede: { en: 'A language and an app of my own, then sites for people I know.', pt: 'Uma linguagem e um app meus, depois sites para pessoas que conheço.' },
  stackTitle: { en: 'What I work with', pt: 'Com o que trabalho' },
  aboutTitle: { en: 'About Me', pt: 'Sobre Mim' },
  contactTitle: { en: 'Get in Touch', pt: 'Fale Comigo' },
  contactLede: { en: 'Email is the quickest way. I answer within a day or two.', pt: 'E-mail é o jeito mais rápido. Respondo em um ou dois dias.' },
  copy: { en: 'Copy', pt: 'Copiar' },
  copied: { en: 'Copied', pt: 'Copiado' },
  sitesKind: { en: 'Sites', pt: 'Sites' },
  sitesTitle: { en: 'For people I know', pt: 'Para quem eu conheço' },
  visit: { en: 'Visit the site', pt: 'Visitar o site' },
  openApp: { en: 'Open the app', pt: 'Abrir o app' },
  readCode: { en: 'Read the code', pt: 'Ler o código' },
  menu: { en: 'Menu', pt: 'Menu' },
  skip: { en: 'Skip to content', pt: 'Pular para o conteúdo' },
  top: { en: 'Back to top', pt: 'Voltar ao topo' },
  scroll: { en: 'Scroll', pt: 'Role' },
  festina: { en: 'Make haste slowly. Augustus’ motto, and a fair rule for software.', pt: 'Apressa-te devagar. O lema de Augusto, e uma boa regra para software.' },
  motto: { en: 'Built to last, as the Romans built.', pt: 'Feito para durar, como construíam os romanos.' },
  close: { en: 'Close', pt: 'Fechar' },
  explore: { en: 'Explore', pt: 'Explorar' },
  elsewhere: { en: 'Elsewhere', pt: 'Em outros lugares' },
  credits: { en: 'Pictures', pt: 'Imagens' },
  language: { en: 'Language', pt: 'Idioma' },
  notFound: { en: 'Nothing Here but Marble', pt: 'Só Mármore Aqui' },
  notFoundText: { en: 'This page doesn’t exist, or doesn’t any more.', pt: 'Esta página não existe, ou não existe mais.' },
  back: { en: 'Back to the start', pt: 'Voltar ao início' },
} satisfies Record<string, T>;

export interface Job {
  org: string;
  title: T;
  /** Where it sits in the story (no dates the site doesn't know). */
  when: T;
  summary: T;
  stack: string[];
}

export const WORK: Job[] = [
  {
    org: 'Zallpy · BMW Europe',
    title: { en: 'Data pipelines', pt: 'Pipelines de dados' },
    when: { en: 'Now', pt: 'Agora' },
    summary: { en: 'Data pipelines and the background jobs around them.', pt: 'Pipelines de dados e os jobs em segundo plano em volta deles.' },
    stack: ['Node.js', 'PostgreSQL', 'BullMQ'],
  },
  {
    org: 'Zallpy · BMW USA',
    title: { en: 'A financial platform', pt: 'Uma plataforma financeira' },
    when: { en: 'Before that', pt: 'Antes disso' },
    summary: { en: 'An Angular front end, from over ten seconds to load to under one.', pt: 'Um front-end em Angular, de mais de dez segundos para carregar a menos de um.' },
    stack: ['Angular', '.NET', 'MuleSoft'],
  },
  {
    org: 'Dema',
    title: { en: 'Social programs, found', pt: 'Programas sociais, encontrados' },
    when: { en: 'Also', pt: 'Também' },
    summary: { en: 'Showing people in Brazil the social programs they can get.', pt: 'Mostra às pessoas no Brasil os programas sociais a que têm direito.' },
    stack: ['React', 'NestJS', 'RabbitMQ', 'PostgreSQL'],
  },
  {
    org: 'eTopocart',
    title: { en: 'Geoprocessing for city halls', pt: 'Geoprocessamento para prefeituras' },
    when: { en: 'First job', pt: 'Primeiro emprego' },
    summary: { en: 'Geoprocessing for city halls around Brazil.', pt: 'Geoprocessamento para prefeituras de todo o Brasil.' },
    stack: ['Angular', 'AWS Lambda', 'Maps'],
  },
];

export const STACK: { group: T; items: string[] }[] = [
  { group: { en: 'Front end', pt: 'Front-end' }, items: ['TypeScript', 'Angular', 'React', 'Astro', 'Tailwind CSS', 'WebGL · Three.js'] },
  { group: { en: 'Back end', pt: 'Back-end' }, items: ['Node.js', 'NestJS', '.NET', 'MuleSoft'] },
  { group: { en: 'Data & queues', pt: 'Dados e filas' }, items: ['PostgreSQL', 'SQL Server', 'RabbitMQ', 'BullMQ'] },
  { group: { en: 'Cloud', pt: 'Nuvem' }, items: ['AWS Lambda', 'API Gateway', 'Cloudflare Workers'] },
];

export const ABOUT: Record<Lang, string[]> = {
  en: [
    'A full stack developer in Florianópolis, mostly in TypeScript. I started at Zallpy as an intern in 2024; I’m finishing Computer Science at UNISUL this year.',
  ],
  pt: [
    'Desenvolvedor full stack em Florianópolis, principalmente em TypeScript. Entrei na Zallpy como estagiário em 2024; termino Ciência da Computação na UNISUL este ano.',
  ],
}

export const NOTES: { head: T; items: T }[] = [
  { head: { en: 'Off the clock', pt: 'Fora do trabalho' }, items: { en: 'Formula 1 · MMA · Sci-fi · The violin, once', pt: 'Fórmula 1 · MMA · Ficção científica · O violino, um dia' } },
  { head: { en: 'Languages', pt: 'Línguas' }, items: { en: 'Portuguese · English · Spanish', pt: 'Português · Inglês · Espanhol' } },
]

export const CONTACT = {
  email: 'eduardogdebem@gmail.com',
  linkedin: 'https://linkedin.com/in/eduardogdebem',
  github: 'https://github.com/eduardodgdebem',
  based: { en: 'Florianópolis, Brazil · UTC−3', pt: 'Florianópolis, Brasil · UTC−3' },
};

export const t = (lang: Lang) => (v: T) => v[lang];
